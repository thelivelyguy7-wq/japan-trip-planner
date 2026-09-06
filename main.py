from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import json
import asyncio
import os
import requests
from models import TripState, TripConstraints, AgentOutputs, ReviewStatus
from agent_graph import app_graph

app = FastAPI(
    title="AI Travel Planner API",
    description="Multi-Agent system API for generating travel itineraries",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlanTripRequest(BaseModel):
    prompt: str

@app.post("/plan-trip", response_model=TripState)
async def plan_trip(request: PlanTripRequest):
    """
    Endpoint that triggers the LangGraph orchestrator synchronously (waits for full completion).
    """
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    initial_trip_state = TripState(
        trip_id=str(uuid.uuid4()),
        original_prompt=request.prompt,
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
    final_state = await app_graph.ainvoke(initial_state)
    
    return final_state["trip_state"]

@app.post("/stream-plan")
async def stream_plan(request: PlanTripRequest):
    """
    Endpoint that triggers LangGraph and streams the progress via Server-Sent Events (SSE).
    """
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    initial_trip_state = TripState(
        trip_id=str(uuid.uuid4()),
        original_prompt=request.prompt,
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

    async def event_generator():
        last_output = None
        # Iterate over the stream
        async for output in app_graph.astream(initial_state):
            last_output = output
            for node_name, state in output.items():
                if node_name != "__end__":
                    # Send an event indicating which node just finished
                    yield f"data: {json.dumps({'node': node_name})}\n\n"
                    # Small sleep to ensure chunks flush properly
                    await asyncio.sleep(0.1)

        # After finishing, yield the final state
        if last_output and isinstance(last_output, dict):
            last_node = list(last_output.keys())[0]
            final_trip_state = last_output[last_node]["trip_state"].model_dump()
            yield f"data: {json.dumps({'node': 'complete', 'result': final_trip_state})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file and sends it to Groq Whisper for transcription.
    """
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}"
    }
    
    try:
        # Read the file content
        file_content = await audio.read()
        
        # Prepare the multipart form data for requests
        # (filename, fileobj, content_type)
        files = {
            "file": (audio.filename, file_content, audio.content_type)
        }
        data = {
            "model": "whisper-large-v3"
        }
        
        # Run synchronous requests in a thread pool using asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: requests.post(url, headers=headers, files=files, data=data)
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Groq API Error: {response.text}")
            
        result = response.json()
        return {"text": result.get("text", "")}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files at the root
os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
