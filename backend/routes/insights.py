import os
import json
import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from google import genai
from google.genai import types
from firebase_admin import firestore

router = APIRouter()

# We access the firestore db globally initialized in main.py
db = firestore.client()

class DetailedInsightRequest(BaseModel):
    userId: str
    userName: str
    city: str
    todayKg: float
    weeklyAvg: float
    cityAvg: float
    topActivity: str
    streak: int
    language: str = "en"

@router.post("/detailed")
async def generate_detailed_insight(req: DetailedInsightRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)

    language_map = {"en": "Respond in English", "hi": "Respond in Hindi (हिंदी)", "kn": "Respond in Kannada (ಕನ್ನಡ)"}
    language_instruction = language_map.get(req.language, "Respond in English")
    
    prompt = f"""
You are EcoLog AI, an intelligent sustainability assistant. Analyze the user's carbon footprint data.
Generate personalized insights that are short, actionable, and easy to understand.

User Data:
- Name: {req.userName}
- City: {req.city}
- Today's Emissions: {req.todayKg} kg CO2
- Weekly Average: {req.weeklyAvg} kg CO2/day
- City Average: {req.cityAvg} kg CO2/day
- Main Contributor: {req.topActivity}
- Streak: {req.streak} days

For each analysis:
Identify the largest emission source.
Compare current performance with previous days and weeks.
Highlight positive improvements.
Predict future emissions based on current trends.
Recommend 3 specific actions to reduce emissions.
Estimate potential CO₂ savings from each recommendation.
Assign an overall sustainability score from 0–100.
Use a friendly and motivating tone.
{language_instruction}

Return the response ONLY as a raw, valid JSON object with the following exact keys (no markdown formatting or backticks around it):
{{
  "todays_insight": "...",
  "main_contributor": "...",
  "trend_analysis": "...",
  "prediction": "...",
  "recommended_actions": [
    "action 1",
    "action 2",
    "action 3"
  ],
  "potential_savings": "...",
  "eco_score": "82/100 🌱"
}}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        insight_text = response.text.strip()
        
        # Parse it to ensure it's valid JSON
        insight_data = json.loads(insight_text)
        
        # Save to database
        doc_ref = db.collection("detailedInsights").document()
        doc_data = {
            "userId": req.userId,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "insight": insight_data
        }
        doc_ref.set(doc_data)
        
        return insight_data
        
    except Exception as e:
        print(f"Error generating insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    userId: str
    message: str
    history: List[ChatMessage]
    context: Dict[str, Any]
    language: str = "en"

@router.post("/chat")
async def chat_with_insight(req: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)

    language_map = {"en": "Respond in English", "hi": "Respond in Hindi (हिंदी)", "kn": "Respond in Kannada (ಕನ್ನಡ)"}
    language_instruction = language_map.get(req.language, "Respond in English")
    
    system_instruction = f"""
    You are EcoLog AI, an intelligent, friendly, and motivating sustainability assistant.
    The user is asking a question about their daily carbon footprint report.
    Here is the data from their current report:
    {json.dumps(req.context, indent=2)}
    
    Keep your answers concise, encouraging, and directly related to their footprint data and sustainability. 
    Use a conversational tone. Do not use markdown syntax for bolding/italics heavily unless necessary.
    {language_instruction}
    """
    
    try:
        formatted_history = []
        for msg in req.history:
            formatted_history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.text]
            })
            
        chat = client.chats.create(
            model='gemini-2.5-flash',
            history=formatted_history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        response = chat.send_message(req.message)
        
        return {"reply": response.text.strip()}
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
