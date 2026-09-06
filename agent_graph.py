import os
import uuid
import json
import copy
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from models import TripState, TripConstraints, AgentOutputs, ReviewStatus
from wikivoyage_client import fetch_wikivoyage_page
from search_client import search_google
from maps_client import get_travel_time
from currency_client import get_exchange_rate

load_dotenv()

def reduce_trip_state(left: TripState, right: TripState) -> TripState:
    if left is None:
        return right
    if right is None:
        return left
    
    if right.agent_outputs.destination_data:
        left.agent_outputs.destination_data.update(right.agent_outputs.destination_data)
    if right.agent_outputs.logistics_data:
        left.agent_outputs.logistics_data.update(right.agent_outputs.logistics_data)
    if right.agent_outputs.budget_data:
        left.agent_outputs.budget_data.update(right.agent_outputs.budget_data)
        
    left.draft_itinerary = right.draft_itinerary or left.draft_itinerary
    left.review_status = right.review_status if right.review_status.feedback else left.review_status
    left.revision_count = right.revision_count if right.revision_count > left.revision_count else left.revision_count
    
    if right.constraints.duration_days > 0:
        left.constraints = right.constraints
        
    return left

# Define the State for LangGraph
class GraphState(TypedDict):
    trip_state: Annotated[TripState, reduce_trip_state]

# Initialize the LLMs
llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=os.environ.get("GROQ_API_KEY")
)

gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    temperature=0,
    api_key=os.environ.get("GEMINI_API_KEY")
)

def orchestrator_node(state: GraphState):
    """
    Extracts constraints from the user prompt and updates the TripState.
    """
    trip_state = state["trip_state"]
    prompt = trip_state.original_prompt
    
    structured_llm = llm.with_structured_output(TripConstraints)
    
    system_prompt = """
    You are an expert travel planner. Extract the travel constraints from the user's prompt.
    If some constraints are not mentioned, make reasonable defaults:
    - duration_days: default to 7 if not specified
    - budget_usd: set to 0.0 if not specified (0.0 means unlimited budget)
    - destinations: list of cities or regions
    - preferences: list of likes
    - avoidances: list of dislikes
    """
    
    result = structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    
    trip_state.constraints = result
    
    return {"trip_state": trip_state}

class POI(BaseModel):
    name: str = Field(description="Name of the point of interest")
    description: str = Field(description="Short description of why it matches preferences")

class DestinationOutput(BaseModel):
    pois: List[POI] = Field(description="List of curated points of interest")

class LogisticsOutput(BaseModel):
    transit_tips: List[str] = Field(description="Tips for getting around (e.g. transit passes)")
    accommodation_areas: List[str] = Field(description="Recommended areas or specific places to stay")

class BudgetOutput(BaseModel):
    estimated_daily_food_cost_usd: float = Field(description="Estimated daily cost for food in USD")
    estimated_daily_accommodation_cost_usd: float = Field(description="Estimated daily cost for accommodation in USD")
    budget_tips: List[str] = Field(description="Tips for saving money")


def destination_node(state: GraphState):
    """Destination Worker using Wikivoyage & Google Search"""
    trip_state = copy.deepcopy(state["trip_state"])
    constraints = trip_state.constraints
    feedback = trip_state.review_status.feedback
    
    structured_llm = llm.with_structured_output(DestinationOutput)
    all_pois = {}
    
    for city in constraints.destinations:
        page_text = fetch_wikivoyage_page(city)
        page_text = page_text[:4000] # Safe context limit (Groq TPM budget)
        
        feedback_str = f"PREVIOUS FEEDBACK TO FIX: {feedback}" if feedback else ""
        
        system_prompt = f"""
        You are a travel destination expert. Extract Points of Interest (POIs) for {city} from the provided text.
        Preferences: {constraints.preferences}
        Avoidances: {constraints.avoidances}
        {feedback_str}
        Ensure the POIs match the preferences and do not conflict with avoidances.
        """
        
        result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=page_text)
        ])
        
        # Enrich with live search data
        for poi in result.pois:
            query = f"{poi.name} {city} reviews or closure status"
            snippet = search_google(query)
            poi.description += f"\n[Live Snippet: {snippet[:200]}...]"
            
        all_pois[city] = result.model_dump()
        
    trip_state.agent_outputs.destination_data = all_pois
    return {"trip_state": trip_state}

def logistics_node(state: GraphState):
    """Logistics Worker using Wikivoyage & Google Maps"""
    trip_state = copy.deepcopy(state["trip_state"])
    constraints = trip_state.constraints
    dest_data = trip_state.agent_outputs.destination_data
    feedback = trip_state.review_status.feedback
    
    structured_llm = llm.with_structured_output(LogisticsOutput)
    all_logistics = {}
    
    for city in constraints.destinations:
        page_text = fetch_wikivoyage_page(city)
        page_text = page_text[:4000]
        
        feedback_str = f"PREVIOUS FEEDBACK TO FIX: {feedback}" if feedback else ""
        
        system_prompt = f"""
        You are a travel logistics expert. Extract transit tips and accommodation recommendations for {city}.
        Consider the total trip duration is {constraints.duration_days} days.
        {feedback_str}
        """
        
        result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=page_text)
        ])
        
        # Calculate distances between suggested POIs for this city
        transit_times = []
        city_pois = dest_data.get(city, {}).get("pois", [])
        if len(city_pois) >= 2:
            origin = f"{city_pois[0]['name']}, {city}"
            destination = f"{city_pois[1]['name']}, {city}"
            time = get_travel_time(origin, destination)
            transit_times.append(f"Transit time from {city_pois[0]['name']} to {city_pois[1]['name']}: {time}")
            
        result.transit_tips.extend(transit_times)
        
        all_logistics[city] = result.model_dump()
        
    trip_state.agent_outputs.logistics_data = all_logistics
    return {"trip_state": trip_state}

def budget_node(state: GraphState):
    """Budget Worker using Wikivoyage & Currency API"""
    trip_state = copy.deepcopy(state["trip_state"])
    constraints = trip_state.constraints
    feedback = trip_state.review_status.feedback
    
    structured_llm = llm.with_structured_output(BudgetOutput)
    all_budget = {}
    
    target_currency = "JPY" 
    rate = get_exchange_rate('USD', target_currency)
    
    for city in constraints.destinations:
        page_text = fetch_wikivoyage_page(city)
        page_text = page_text[:4000]
        
        feedback_str = f"PREVIOUS FEEDBACK TO FIX: {feedback}" if feedback else ""
        
        system_prompt = f"""
        You are a travel budget expert. Estimate the daily food and accommodation costs for {city} in USD, and provide budget tips.
        The user has a total budget of {constraints.budget_usd} USD for the whole trip. (If 0.0, there is no budget limit, but you must still estimate realistic costs).
        Current exchange rate: 1 USD = {rate} {target_currency}. Provide insights using this rate.
        {feedback_str}
        """
        
        result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=page_text)
        ])
        
        dump = result.model_dump()
        dump['live_exchange_rate'] = f"1 USD = {rate} {target_currency}"
        all_budget[city] = dump
        
    trip_state.agent_outputs.budget_data = all_budget
    return {"trip_state": trip_state}

class DailyActivity(BaseModel):
    day: str = Field(description="The day identifier, e.g. 'Day 1'")
    activities: str = Field(description="Detailed activity string for the day")

class DraftItinerary(BaseModel):
    summary: str = Field(description="An overall summary of the drafted trip")
    day_by_day: List[DailyActivity] = Field(description="List of daily activities")
    total_estimated_cost_usd: float = Field(description="Total estimated cost of the entire trip in USD")

def synthesis_node(state: GraphState):
    """Compiles the draft itinerary from agent outputs"""
    trip_state = state["trip_state"]
    
    structured_llm = llm.with_structured_output(DraftItinerary)
    
    system_prompt = f"""
    You are a master travel synthesiser. Create a cohesive day-by-day draft itinerary based on the agent outputs.
    Constraints: {trip_state.constraints.model_dump_json()}
    Agent Data: {trip_state.agent_outputs.model_dump_json()}
    Ensure you create EXACTLY {trip_state.constraints.duration_days} entries in the day_by_day list, no more, no less. 
    IMPORTANT: The summary for each individual day MUST be detailed and contain at least 2 sentences describing the activities, logistics, and vibe. Do not include any empty or blank days.
    """
    
    result = structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Compile the itinerary now.")
    ])
    
    trip_state.draft_itinerary = result.model_dump()
    return {"trip_state": trip_state}

def review_node(state: GraphState):
    """Review Agent using Gemini to QA the draft"""
    trip_state = state["trip_state"]
    
    structured_llm = gemini_llm.with_structured_output(ReviewStatus)
    
    system_prompt = f"""
    You are an unbiased Quality Assurance Travel Reviewer.
    Review the proposed draft itinerary against the user's constraints.
    Constraints: {trip_state.constraints.model_dump_json()}
    Draft Itinerary: {json.dumps(trip_state.draft_itinerary)}
    
    Checklist:
    1. Does it exceed the budget of {trip_state.constraints.budget_usd}? (If budget is 0.0, ignore this check. Otherwise, check total_estimated_cost_usd).
    2. Does it span exactly {trip_state.constraints.duration_days} days? (Ensure there are exactly {trip_state.constraints.duration_days} entries in the day_by_day list, and NONE of them are empty or blank).
    3. Does it include avoidances: {trip_state.constraints.avoidances}?
    4. Are the preferences {trip_state.constraints.preferences} met?
    
    If it fails any of these, set is_approved to false and provide clear, actionable feedback.
    """
    
    result = structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Review the itinerary.")
    ])
    
    trip_state.review_status = result
    trip_state.revision_count += 1
    
    return {"trip_state": trip_state}

def should_continue(state: GraphState) -> List[str]:
    """Conditional edge to determine if we should loop back to parallel nodes or end."""
    trip_state = state["trip_state"]
    if trip_state.review_status.is_approved:
        return [END]
    if trip_state.revision_count >= 3:
        return [END]
    return ["destination", "logistics", "budget"]

# Build the Graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("destination", destination_node)
workflow.add_node("logistics", logistics_node)
workflow.add_node("budget", budget_node)
workflow.add_node("synthesis", synthesis_node)
workflow.add_node("review", review_node)

# Edges
workflow.add_edge(START, "orchestrator")
workflow.add_edge("orchestrator", "destination")
workflow.add_edge("orchestrator", "logistics")
workflow.add_edge("orchestrator", "budget")

workflow.add_edge("destination", "synthesis")
workflow.add_edge("logistics", "synthesis")
workflow.add_edge("budget", "synthesis")
workflow.add_edge("synthesis", "review")

# Conditional Feedback Loop Edge
workflow.add_conditional_edges(
    "review",
    should_continue
)

# Compile
app_graph = workflow.compile()
