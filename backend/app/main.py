from fastapi import FastAPI, UploadFile, File, Form
from typing import List
from pydantic import BaseModel
import asyncio
from datetime import datetime
from app.agents.dispatch_adapter import dispatch_help
from app.services.db_service import list_incidents, add_lost_found, list_lost_found, add_incident
import numpy as np
import cv2
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routes.camera import router as camera_router
from app.routes.realtime import router as realtime_router
import os


# NOTE: camera feed analyzer (cv2 + numpy) imports C-extensions that can fail
# during quick import checks (or on systems without compiled wheels). To allow
# the app to be imported and routes tested (e.g. with Postman) even when the
# native deps are missing, import the analyzer lazily inside the background
# task. If the import fails we log a warning and skip camera monitoring.

app = FastAPI(title="Event Rescue - Prototype")

# CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(camera_router, prefix="/camera", tags=["camera"])
app.include_router(realtime_router)

class Incident(BaseModel):
    zone: str
    type: str
    severity: float
    status: str
    lat: float | None = None
    lng: float | None = None

INCIDENTS = [
    {"zone": "A", "type": "crowd_surge", "severity": 0.8, "status": "critical"},
]


@app.get("/")
def root():
    return {"status": "ok", "message": "Event Rescue backend. See /docs for API."}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/incidents")
def get_incidents():
    # Return incidents detected via camera routes (in-memory DB)
    return {"incidents": list_incidents()}

# Programmatically add incidents (for live scan matches etc.)
@app.post("/api/incidents/add")
@app.post("/incidents/add")
async def add_incident_api(payload: dict):
    inc = add_incident(payload)
    return {"status": "ok", "incident": inc}


@app.post("/dispatch")
async def dispatch_endpoint(incident: Incident):
    result = await dispatch_help(incident.dict())
    return {"message": "Dispatch initiated", "details": result}

# Voice Alert endpoint for mobile participants
@app.post("/api/voice-alert")
@app.post("/voice-alert")
async def receive_voice_alert(alert_data: dict):
    """Receive voice alerts from mobile participants."""
    print(f"🚨 VOICE ALERT: {alert_data.get('type', 'unknown')} from device {alert_data.get('deviceId', 'unknown')}")
    print(f"📍 Location: {alert_data.get('location', {}).get('latitude', 0)}, {alert_data.get('location', {}).get('longitude', 0)}")
    print(f"🎤 Confidence: {alert_data.get('confidence', 0)}%")
    
    # Add to incidents list
    INCIDENTS.append({
        "zone": "Mobile Device",
        "type": f"voice_{alert_data.get('type', 'unknown')}",
        "severity": alert_data.get('confidence', 0) / 100,
        "status": "critical",
        "lat": alert_data.get('location', {}).get('latitude'),
        "lng": alert_data.get('location', {}).get('longitude')
    })
    
    # Auto-dispatch for voice alerts
    if alert_data.get('confidence', 0) > 70:
        await dispatch_help({
            "type": f"voice_{alert_data.get('type', 'unknown')}",
            "zone": "Mobile Device",
            "severity": alert_data.get('confidence', 0) / 100,
            "location": alert_data.get('location', {}),
            "deviceId": alert_data.get('deviceId')
        })
    
    return {"status": "received", "alert_id": alert_data.get('id')}

# Lost & Found endpoints
@app.post("/api/lostfound/report")
@app.post("/lostfound/report")
async def lostfound_report(
    reporter: str = Form(...),
    description: str = Form(""),
    image: UploadFile = File(...)
):
    # For demo: we don't persist the actual file to disk; store metadata only
    # Read image bytes and compute a compact color histogram for matching
    content = await image.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    hist_vec = None
    if img is not None:
        img_small = cv2.resize(img, (64, 64))
        # HSV histogram (H and S channels) flattened
        hsv = cv2.cvtColor(img_small, cv2.COLOR_BGR2HSV)
        h_hist = cv2.calcHist([hsv], [0], None, [32], [0, 180])
        s_hist = cv2.calcHist([hsv], [1], None, [32], [0, 256])
        hist = np.concatenate([h_hist.flatten(), s_hist.flatten()]).astype(float)
        hist /= (hist.sum() + 1e-6)
        hist_vec = hist.tolist()

    item = add_lost_found({
        "reporter": reporter,
        "description": description,
        "filename": image.filename,
        "status": "reported",
        "hist": hist_vec,
    })
    # Create an incident for authority visibility
    add_incident({
        "zone": "Lost&Found",
        "type": "lost_person_report",
        "severity": 0.6,
        "status": "active",
    })
    return {"status": "ok", "item": item}

@app.get("/api/lostfound")
@app.get("/lostfound")
async def lostfound_list():
    return {"items": list_lost_found()}

@app.post("/api/lostfound/match")
@app.post("/lostfound/match")
async def lostfound_match(image: UploadFile = File(...)):
    content = await image.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return {"matches": []}
    img_small = cv2.resize(img, (64, 64))
    hsv = cv2.cvtColor(img_small, cv2.COLOR_BGR2HSV)
    h_hist = cv2.calcHist([hsv], [0], None, [32], [0, 180])
    s_hist = cv2.calcHist([hsv], [1], None, [32], [0, 256])
    hist = np.concatenate([h_hist.flatten(), s_hist.flatten()]).astype(float)
    hist /= (hist.sum() + 1e-6)

    # naive cosine similarity against stored items that have hist
    items = list_lost_found()
    sims = []
    for it in items:
        ref = it.get("hist")
        if not ref:
            continue
        ref = np.array(ref, dtype=float)
        sim = float(np.dot(hist, ref) / (np.linalg.norm(hist) * np.linalg.norm(ref) + 1e-6))
        sims.append({"item": it, "similarity": sim})
    sims.sort(key=lambda x: x["similarity"], reverse=True)
    top = sims[:3]
    return {
        "matches": [
            {"id": t["item"]["id"], "reporter": t["item"].get("reporter"), "description": t["item"].get("description"), "score": t["similarity"]}
            for t in top
        ]
    }

# Participant join endpoint (notify authorities that a participant connected)
@app.post("/api/participant/join")
@app.post("/participant/join")
async def participant_join(join: dict):
    device_id = (join or {}).get("deviceId", "unknown")
    loc = (join or {}).get("location") or {}
    add_incident({
        "zone": "Participants",
        "type": "participant_joined",
        "severity": 0.1,
        "status": "info",
        "deviceId": device_id,
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
    })
    return {"status": "ok"}

# NLP summary using Puter AI
@app.get("/api/nlp/summary")
@app.get("/nlp/summary")
async def nlp_summary():
    incs = list_incidents()[-10:]
    if not incs:
        return {"summary": "No incidents yet. Monitoring active."}
    
    # Prepare context for AI
    context = {
        "incidents": incs,
        "timestamp": incs[-1].get("timestamp") if incs else None,
        "total_incidents": len(incs)
    }
    
    try:
        # Use Puter AI for intelligent summarization
        summary = await generate_ai_summary(context)
        return {"summary": summary}
    except Exception as e:
        print(f"AI summary failed: {e}")
        # Fallback to simple summary
        kinds = {}
        for i in incs:
            kinds[i.get("type", "unknown")] = kinds.get(i.get("type", "unknown"), 0) + 1
        top = sorted(kinds.items(), key=lambda x: x[1], reverse=True)
        s = ", ".join([f"{k} x{v}" for k, v in top])
        return {"summary": f"Recent activity: {s}. Stay vigilant and monitor critical zones."}

# AI-powered question answering with live camera analysis
@app.post("/api/nlp/ask")
@app.post("/nlp/ask")
async def ask_question(question_data: dict):
    question = question_data.get("question", "")
    if not question:
        return {"answer": "Please provide a question."}
    
    # Get current context
    incs = list_incidents()[-10:]
    lf_items = list_lost_found()[-5:]
    
    # Analyze live camera data if available
    live_camera_analysis = await analyze_live_camera_data()
    
    context = {
        "question": question,
        "incidents": incs,
        "lost_found_items": lf_items,
        "live_camera_analysis": live_camera_analysis,
        "timestamp": incs[-1].get("timestamp") if incs else None
    }
    
    try:
        answer = await generate_ai_answer(context)
        return {"answer": answer}
    except Exception as e:
        print(f"AI answer failed: {e}")
        return {"answer": "Unable to process question at this time. Please try again."}

# Live camera analysis endpoint
@app.post("/api/camera/analyze")
@app.post("/camera/analyze")
async def analyze_camera_frame(image: UploadFile = File(...)):
    """Analyze a live camera frame for AI insights"""
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
        
        # Perform comprehensive analysis
        analysis = await analyze_frame_content(frame)
        return {"status": "ok", "analysis": analysis}
    except Exception as e:
        return {"status": "error", "message": f"Analysis failed: {e}"}

# Puter AI integration functions
async def generate_ai_summary(context):
    """Generate AI summary using Puter AI"""
    incidents_text = "\n".join([
        f"- {inc.get('type', 'unknown')} in {inc.get('zone', 'unknown')} at {inc.get('timestamp', 'unknown')} (severity: {inc.get('severity', 0)})"
        for inc in context["incidents"]
    ])
    
    prompt = f"""
    You are an AI security analyst for an event management system. 
    Analyze these recent incidents and provide a concise, actionable summary:
    
    Incidents:
    {incidents_text}
    
    Total incidents: {context["total_incidents"]}
    
    Provide:
    1. Key patterns or trends
    2. Risk assessment
    3. Recommended actions
    4. Areas requiring attention
    
    Keep it under 200 words and professional.
    """
    
    # Try Perplexity AI if API key available, otherwise fallback to Puter simulator
    from os import getenv
    PERPLEXITY_API_KEY = getenv('PERPLEXITY_API_KEY')
    if PERPLEXITY_API_KEY:
        try:
            return await call_perplexity_api(prompt, PERPLEXITY_API_KEY)
        except Exception as e:
            print(f"Perplexity API failed: {e}")
    return await simulate_puter_ai(prompt)


async def call_perplexity_api(prompt: str, api_key: str) -> str:
    """Call Perplexity API (simple wrapper). Requires PERPLEXITY_API_KEY env var."""
    import httpx
    url = 'https://api.perplexity.ai/v1/answers'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'ApiKey {api_key}'
    }
    payload = {
        'query': prompt,
        'include_sources': False
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
        # Perplexity returns a field 'answer' or similar; adapt to actual response
        return data.get('answer') or data.get('text') or str(data)

async def generate_ai_answer(context):
    """Generate AI answer using Puter AI with live camera data"""
    incidents_text = "\n".join([
        f"- {inc.get('type', 'unknown')} in {inc.get('zone', 'unknown')} at {inc.get('timestamp', 'unknown')}"
        for inc in context["incidents"][-5:]
    ])
    
    lf_text = "\n".join([
        f"- {item.get('description', 'No description')} reported by {item.get('reporter', 'Unknown')}"
        for item in context["lost_found_items"]
    ])
    
    # Include live camera analysis
    camera_text = ""
    if context.get("live_camera_analysis"):
        analysis = context["live_camera_analysis"]
        camera_text = f"""
Live Camera Analysis:
- Crowd Density: {analysis.get('crowd_density', 'Unknown')}
- Fire/Smoke Detection: {analysis.get('fire_detected', False)}
- Panic Detection: {analysis.get('panic_detected', False)}
- People Count: {analysis.get('people_count', 'Unknown')}
- Activity Level: {analysis.get('activity_level', 'Unknown')}
- Safety Score: {analysis.get('safety_score', 'Unknown')}/10
"""
    
    prompt = f"""
    You are an AI assistant for an event security system. Answer this question based on current data including live camera analysis:
    
    Question: {context["question"]}
    
    Recent Incidents:
    {incidents_text}
    
    Lost & Found Reports:
    {lf_text}
    
    {camera_text}
    
    Provide a helpful, accurate answer based on the available data including live camera insights. If the question cannot be answered with current data, say so.
    """
    
    return await simulate_puter_ai(prompt)

# Live camera analysis functions
async def analyze_live_camera_data():
    """Analyze live camera data for AI context"""
    try:
        # This would connect to active camera feeds
        # For now, return mock analysis based on recent incidents
        incs = list_incidents()[-5:]
        
        # Simulate camera analysis based on incidents
        fire_detected = any(inc.get('type') in ['fire_detected', 'smoke_detected'] for inc in incs)
        crowd_surge = any(inc.get('type') == 'crowd_surge' for inc in incs)
        panic_detected = any(inc.get('type') == 'panic_detected' for inc in incs)
        
        # Calculate safety score based on incidents
        safety_score = 10
        for inc in incs:
            severity = inc.get('severity', 0)
            safety_score -= severity * 2
        
        return {
            "crowd_density": "High" if crowd_surge else "Normal",
            "fire_detected": fire_detected,
            "panic_detected": panic_detected,
            "people_count": "50-100" if crowd_surge else "20-50",
            "activity_level": "High" if len(incs) > 3 else "Normal",
            "safety_score": max(0, min(10, safety_score))
        }
    except Exception as e:
        print(f"Camera analysis failed: {e}")
        return {
            "crowd_density": "Unknown",
            "fire_detected": False,
            "panic_detected": False,
            "people_count": "Unknown",
            "activity_level": "Unknown",
            "safety_score": 5
        }

async def analyze_frame_content(frame):
    """Analyze a camera frame for AI insights"""
    try:
        # Convert to HSV for better analysis
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Basic analysis
        height, width = frame.shape[:2]
        total_pixels = height * width
        
        # Fire detection (red/orange colors)
        fire_lower = np.array([0, 50, 50])
        fire_upper = np.array([10, 255, 255])
        fire_mask = cv2.inRange(hsv, fire_lower, fire_upper)
        fire_pixels = cv2.countNonZero(fire_mask)
        fire_ratio = fire_pixels / total_pixels
        
        # Smoke detection (gray colors)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        smoke_threshold = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)[1]
        smoke_pixels = cv2.countNonZero(smoke_threshold)
        smoke_ratio = smoke_pixels / total_pixels
        
        # Crowd density (edge detection)
        edges = cv2.Canny(gray, 50, 150)
        edge_pixels = cv2.countNonZero(edges)
        edge_ratio = edge_pixels / total_pixels
        
        # Calculate metrics
        fire_detected = fire_ratio > 0.05
        smoke_detected = smoke_ratio > 0.3
        crowd_density = "High" if edge_ratio > 0.15 else "Normal" if edge_ratio > 0.08 else "Low"
        
        # Safety score calculation
        safety_score = 10
        if fire_detected: safety_score -= 4
        if smoke_detected: safety_score -= 2
        if edge_ratio > 0.15: safety_score -= 1
        
        return {
            "fire_detected": fire_detected,
            "smoke_detected": smoke_detected,
            "crowd_density": crowd_density,
            "people_count": "High" if edge_ratio > 0.15 else "Medium" if edge_ratio > 0.08 else "Low",
            "activity_level": "High" if edge_ratio > 0.12 else "Normal",
            "safety_score": max(0, min(10, safety_score)),
            "analysis_timestamp": "2024-01-01T00:00:00"
        }
    except Exception as e:
        print(f"Frame analysis failed: {e}")
        return {
            "fire_detected": False,
            "smoke_detected": False,
            "crowd_density": "Unknown",
            "people_count": "Unknown",
            "activity_level": "Unknown",
            "safety_score": 5,
            "analysis_timestamp": "2024-01-01T00:00:00"
        }

async def simulate_puter_ai(prompt):
    """Simulate Puter AI response with live camera data integration"""
    import asyncio
    await asyncio.sleep(0.5)  # Simulate API delay
    
    # Enhanced responses with camera data
    if "summary" in prompt.lower():
        if "fire" in prompt.lower() or "fire_detected" in prompt.lower():
            return "🚨 CRITICAL: Fire incidents detected in live camera feed. Immediate evacuation protocols activated. Fire department dispatched. Monitor all zones for smoke/fire spread. Ensure clear evacuation routes."
        elif "crowd" in prompt.lower() or "crowd_density" in prompt.lower():
            return "⚠️ HIGH RISK: Crowd surge patterns detected in live video. Deploy additional security personnel to congested areas. Monitor crowd density and flow patterns. Prepare crowd control measures."
        elif "voice" in prompt.lower():
            return "📢 ALERT: Multiple voice distress calls received. Security teams dispatched to reported locations. Verify caller locations and provide immediate assistance."
        else:
            return "📊 STATUS: System monitoring active with live camera analysis. Recent incidents show normal event patterns. Continue vigilant monitoring. All systems operational."
    else:
        # Enhanced question answering with camera data
        if "fire" in prompt.lower():
            return "Based on live camera analysis, fire detection systems are actively monitoring the area. Current safety protocols are in place and authorities have been notified of any fire-related alerts detected in the video feed."
        elif "crowd" in prompt.lower():
            return "Live camera analysis shows current crowd density levels. Security teams are positioned at key locations based on real-time video analysis. Crowd flow patterns are being monitored continuously."
        elif "lost" in prompt.lower():
            return "Lost & Found has active reports. Use Live Scan feature to match people with reported items using real-time camera analysis."
        elif "safety" in prompt.lower():
            return "Live camera analysis provides real-time safety monitoring. The system continuously analyzes crowd density, fire/smoke detection, and activity levels to ensure event safety."
        else:
            return "I can help answer questions about fire safety, crowd management, lost & found, voice alerts, and general event security using live camera analysis. What specific information do you need?"


# # 🔁 Camera Feed Background Task
# async def monitor_camera():
#     try:
#         # lazy import to avoid importing cv2/numpy at module import time
#         from app.camera_feed_analyzer import analyze_feed
#     except Exception as e:
#         print(f"⚠️ Camera analyzer not available, skipping monitoring: {e}")
#         return

#     async for event in analyze_feed(0, zone="A"):  # 0 = webcam; replace with RTSP/URL for CCTV
#         print(f"📡 Detected anomaly: {event}")
#         INCIDENTS.append({
#             "zone": event["zone"],
#             "type": event["type"],
#             "severity": event["severity"],
#             "status": "critical"
#         })
#         # Auto-dispatch critical incidents
#         if event["severity"] > 0.7:
#             await dispatch_help(event)


# @app.on_event("startup")
# async def start_background_tasks():
#     asyncio.create_task(monitor_camera())
#     print("🚀 Camera monitoring task started.")


# # Path to the built frontend files
# frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

# # Serve static files
# if os.path.exists(frontend_dir):
#     app.mount("/static", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="static")

# # API routes
# @app.get("/api/hello")
# def read_root():
#     return {"message": "Hello from FastAPI + React!"}

# # Serve React index.html for all other routes
# @app.get("/{full_path:path}")
# async def serve_frontend(full_path: str):
#     index_path = os.path.join(frontend_dir, "index.html")
#     if os.path.exists(index_path):
#         return FileResponse(index_path)
#     return {"error": "Frontend not built yet"}

# Remove duplicate app definition and legacy routes below. Frontend mounting handled elsewhere.