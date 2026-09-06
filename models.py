from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TripConstraints(BaseModel):
    duration_days: int = Field(..., description="Number of days for the trip")
    budget_usd: float = Field(..., description="Total budget for the trip in USD")
    destinations: List[str] = Field(..., description="List of cities or regions to visit")
    preferences: List[str] = Field(default_factory=list, description="User's likes, e.g., 'food', 'temples'")
    avoidances: List[str] = Field(default_factory=list, description="User's dislikes, e.g., 'crowds'")

class AgentOutputs(BaseModel):
    destination_data: Dict[str, Any] = Field(default_factory=dict, description="POIs and activities from Destination Agent")
    logistics_data: Dict[str, Any] = Field(default_factory=dict, description="Routes and hotels from Logistics Agent")
    budget_data: Dict[str, Any] = Field(default_factory=dict, description="Cost estimates from Budget Agent")

class ReviewStatus(BaseModel):
    is_approved: bool = Field(default=False, description="Whether the Review Agent approved the itinerary")
    feedback: List[str] = Field(default_factory=list, description="List of feedback or rejection reasons")

class TripState(BaseModel):
    trip_id: str = Field(..., description="Unique identifier for the trip")
    original_prompt: str = Field(..., description="The user's original natural language request")
    constraints: TripConstraints = Field(..., description="Parsed constraints from the orchestrator")
    agent_outputs: AgentOutputs = Field(default_factory=AgentOutputs, description="Data gathered by worker agents")
    draft_itinerary: Dict[str, Any] = Field(default_factory=dict, description="The synthesized day-by-day itinerary")
    review_status: ReviewStatus = Field(default_factory=ReviewStatus, description="Status of the QA review loop")
    revision_count: int = Field(default=0, description="Counter for the QA feedback loop")

