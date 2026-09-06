# Phase-Wise Implementation Plan: AI Travel Planner

This implementation plan outlines the sequential phases to build the Multi-Agent Travel Planner system, transitioning from foundational setup to a fully functional DAG-based agent architecture.

## Phase 1: Foundation & Core Infrastructure
**Goal:** Establish the project repository, base environment, and shared data models.
* **1.1 Project Initialization:** Initialize a Python backend (FastAPI) or Next.js project. Setup linting, formatting, and environment variables (`.env` for API keys).
* **1.2 Define Data Models:** Implement the `TripState` schema using Pydantic or TypeScript interfaces. This includes user constraints, agent outputs, and the final itinerary structure.
* **1.3 Mock API Setup:** Create a simple REST endpoint (`POST /plan-trip`) that accepts natural language text and returns a dummy response to validate the network plumbing.

## Phase 2: Orchestrator & State Graph Construction
**Goal:** Implement the central coordinator and the directed acyclic graph (DAG) framework.
* **2.1 Framework Integration:** Integrate LangGraph (Python/JS) or AutoGen into the project.
* **2.2 Orchestrator Agent (V1):** Connect the primary LLM (Groq). Prompt the orchestrator to extract constraints (budget, days, preferences, avoidances) from the initial prompt and populate the initial `TripState`.
* **2.3 Define the State Graph:** Map out the nodes (Orchestrator, Destination, Logistics, Budget, Review) and edges (transitions) in the graph framework, ensuring parallel branching is supported.

## Phase 3: Worker Agents (Wikivoyage Data Integration)
**Goal:** Implement the parallel worker agents and configure them to extract intelligence from Wikivoyage (e.g., `https://en.wikivoyage.org/wiki/Dubai#Budget`) rather than using mock data.
* **3.1 Destination Agent:** Build the logic to ingest Wikivoyage text and output curated POIs matching user preferences.
* **3.2 Logistics Agent:** Extract transit and accommodation details directly from the region's Wikivoyage page to sequence daily activities.
* **3.3 Budget Agent:** Scrape the specific `#Budget` and `#Eat` sections of Wikivoyage to formulate realistic cost estimates and alternatives.
* **3.4 Parallel Execution:** Configure the graph to run these three agents concurrently (powered by Groq) and aggregate their outputs back into the `TripState`.

## Phase 4: Live API Integrations
**Goal:** Enhance the base Wikivoyage data with dynamic, real-world intelligence from external APIs.
* **4.1 Destination Intelligence:** Integrate Google Search API for real-time attraction data and Yelp/TripAdvisor for food/reviews.
* **4.2 Logistics Intelligence:** Integrate Google Maps API (Distance Matrix) to calculate actual travel times between suggested POIs to avoid backtracking. Integrate a mock or real transit API for Shinkansen schedules.
* **4.3 Budget Intelligence:** Integrate a Currency Exchange API (e.g., Fixer.io) and implement heuristics for estimating hotel/food costs based on standard pricing databases.

## Phase 5: Synthesis & Review Agent (The Feedback Loop)
**Goal:** Draft the final itinerary and implement the QA validation loop.
* **5.1 Draft Synthesis:** Add logic in the Orchestrator to take the parallel outputs and compile a cohesive day-by-day draft.
* **5.2 Review Agent:** Integrate the secondary LLM (Gemini 3.1 Pro (High)). Provide it with the original constraints and the draft itinerary to ensure an unbiased QA check.
* **5.3 The Feedback Loop:** Implement the cyclic edge in the graph: If the Review Agent sets `is_approved=false` due to an issue (e.g. over budget by $200), parse the feedback, update the `TripState`, and route back to the Orchestrator or specific worker agents to regenerate.
* **5.4 Loop Constraints:** Implement a `max_revisions` counter in the state to prevent infinite loops (e.g., cap at 3 revisions before failing gracefully).

## Phase 6: Frontend Interface & Final Polish
**Goal:** Provide a user-friendly way to interact with the system and view the results.
* **6.1 Chat/Form Interface:** Build a simple UI (Next.js/React) where the user can input their natural language request.
* **6.2 Loading States & Streaming:** Implement UI indicators that show which agent is currently "thinking" (e.g. "Budget Agent is reviewing costs...") to improve perceived latency.
* **6.3 Final Itinerary Render:** Build a clean, styled component to display the day-by-day plan, budget breakdown, and suggested accommodations.
* **6.4 End-to-End Testing:** Run full user prompts (like the original Japan trip prompt) and validate that the system consistently produces high-quality, constraint-abiding itineraries.

## Phase 7: Voice Input & Speech-to-Text
**Goal:** Allow users to dictate their travel requests instead of typing them.
* **7.1 Audio Capture (Frontend):** Add a microphone button to the UI that uses the browser's MediaRecorder API to capture the user's voice and send the audio file to the backend.
* **7.2 Transcription Endpoint (Backend):** Create a new FastAPI endpoint (e.g., `POST /transcribe`) that receives the audio upload.
* **7.3 Groq Integration:** Integrate the Groq Audio API using the `whisper-large-v3` (or `whisper-large-v3-turbo` for lower latency) model to transcribe the audio into text, which can then be used to populate the prompt input field or directly submitted to the orchestrator.
