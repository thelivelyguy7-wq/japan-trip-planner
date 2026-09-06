import asyncio
import json
import uuid
from models import TripState, TripConstraints, AgentOutputs, ReviewStatus
from agent_graph import app_graph

async def main():
    print("Initializing TripState...")
    initial_trip_state = TripState(
        trip_id=str(uuid.uuid4()),
        original_prompt="Plan a 5-day trip to Japan. Tokyo + Kyoto. $3000 budget. Love food and temples, hate crowds.",
        constraints=TripConstraints(
            duration_days=0,
            budget_usd=0.0,
            destinations=[],
            preferences=[],
            avoidances=[]
        ),
        agent_outputs=AgentOutputs(),
        draft_itinerary={},
        review_status=ReviewStatus()
    )
    
    initial_state = {"trip_state": initial_trip_state}
    
    print("Starting Stream...")
    async for output in app_graph.astream(initial_state):
        for node_name, state in output.items():
            if node_name != "__end__":
                print(f"--- Node Finished: {node_name} ---")
                
    print("\n\n--- Final State ---")
    # Get the last output from stream to see final state
    if isinstance(state, dict) and "trip_state" in state:
        final_state = state["trip_state"]
        print(f"Revision Count: {final_state.revision_count}")
        print(f"Is Approved: {final_state.review_status.is_approved}")
        print(f"Review Feedback: {final_state.review_status.feedback}")
        if final_state.draft_itinerary:
            print("\nDraft Itinerary Summary:")
            print(final_state.draft_itinerary.get("summary", ""))
            print(f"Total Cost: ${final_state.draft_itinerary.get('total_estimated_cost_usd', 0)}")
        else:
            print("No draft itinerary generated.")

if __name__ == "__main__":
    asyncio.run(main())
