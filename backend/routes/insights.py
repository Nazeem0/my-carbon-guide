import os
import json
import re
import logging
import datetime
from typing import Annotated, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from firebase_admin import firestore

from auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()

# We access the firestore db globally initialized in main.py
db = firestore.client()

LANGUAGE_MAP = {
    "en": "Respond in English",
    "hi": "Respond in Hindi (हिंदी)",
    "kn": "Respond in Kannada (ಕನ್ನಡ)",
}


def _sanitize_input(value: str, max_len: int = 200) -> str:
    """Strip control characters and enforce a length limit on user-provided strings."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", value)
    return cleaned[:max_len].strip()


class DailyInsightRequest(BaseModel):
    userId: str = Field(..., max_length=128)
    userName: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    todayKg: float = Field(..., ge=0, le=1000)
    weeklyAvg: float = Field(..., ge=0, le=1000)
    cityAvg: float = Field(..., ge=0, le=1000)
    topActivity: str = Field(..., max_length=100)
    streak: int = Field(..., ge=0, le=3650)
    language: str = Field(default="en", pattern=r"^(en|hi|kn)$")


@router.post("/daily")
async def generate_daily_insight(
    req: DailyInsightRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)
    language_instruction = LANGUAGE_MAP.get(req.language, "Respond in English")

    safe_name = _sanitize_input(req.userName)
    safe_city = _sanitize_input(req.city)
    safe_activity = _sanitize_input(req.topActivity)

    prompt = f"""
You are EcoLog's friendly AI carbon coach for Indian users.
Generate a short personalised carbon footprint insight.

User details:
- Name: {safe_name}
- City: {safe_city}
- Today's CO2: {req.todayKg} kg
- Their weekly average: {req.weeklyAvg} kg/day
- {safe_city} city average: {req.cityAvg} kg/day
- Biggest emission today: {safe_activity}
- Current logging streak: {req.streak} days

Rules:
- Exactly 2 sentences only
- Be specific with the numbers provided
- First sentence: what they did today vs average
- Second sentence: one specific actionable tip
- Sound encouraging and friendly, not preachy
- Reference Indian context where relevant
- {language_instruction}
- Output only the 2 sentences, nothing else
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"text": response.text.strip()}
    except Exception:
        logger.exception("Error generating daily insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")


class WeeklySummaryRequest(BaseModel):
    userId: str = Field(..., max_length=128)
    userName: str = Field(..., min_length=1, max_length=100)
    weeklyData: List[float] = Field(..., min_length=7, max_length=7)
    bestDay: str = Field(..., max_length=50)
    streak: int = Field(..., ge=0, le=3650)
    language: str = Field(default="en", pattern=r"^(en|hi|kn)$")


@router.post("/weekly")
async def generate_weekly_summary(
    req: WeeklySummaryRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)
    language_instruction = LANGUAGE_MAP.get(req.language, "Respond in English")

    safe_name = _sanitize_input(req.userName)
    avg = round(sum(req.weeklyData) / 7, 2)

    prompt = f"""
You are EcoLog's AI coach. Write a weekly carbon summary.

User: {safe_name}
This week's daily CO2: {', '.join(str(d) for d in req.weeklyData)} kg
Weekly average: {avg} kg/day
Best day: {_sanitize_input(req.bestDay)}
Current streak: {req.streak} days

Write exactly 3 sentences:
1. Overall week performance with specific numbers
2. What worked well this week
3. One focus area for next week
Be encouraging and specific.
Output only the 3 sentences.
{language_instruction}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"text": response.text.strip()}
    except Exception:
        logger.exception("Error generating weekly summary")
        raise HTTPException(status_code=500, detail="Failed to generate weekly summary")


class DetailedInsightRequest(BaseModel):
    userId: str = Field(..., max_length=128)
    userName: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    todayKg: float = Field(..., ge=0, le=1000)
    weeklyAvg: float = Field(..., ge=0, le=1000)
    cityAvg: float = Field(..., ge=0, le=1000)
    topActivity: str = Field(..., max_length=100)
    streak: int = Field(..., ge=0, le=3650)
    language: str = Field(default="en", pattern=r"^(en|hi|kn)$")


@router.post("/detailed")
async def generate_detailed_insight(
    req: DetailedInsightRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)

    language_instruction = LANGUAGE_MAP.get(req.language, "Respond in English")

    safe_name = _sanitize_input(req.userName)
    safe_city = _sanitize_input(req.city)
    safe_activity = _sanitize_input(req.topActivity)
    
    prompt = f"""
You are EcoLog AI, an intelligent sustainability assistant. Analyze the user's carbon footprint data.
Generate personalized insights that are short, actionable, and easy to understand.

User Data:
- Name: {safe_name}
- City: {safe_city}
- Today's Emissions: {req.todayKg} kg CO2
- Weekly Average: {req.weeklyAvg} kg CO2/day
- City Average: {req.cityAvg} kg CO2/day
- Main Contributor: {safe_activity}
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
        logger.exception("Error generating detailed insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")

class ChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(user|model)$")
    text: str = Field(..., max_length=2000)

class ChatRequest(BaseModel):
    userId: str = Field(..., max_length=128)
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(..., max_length=50)
    context: Dict[str, Any]
    language: str = Field(default="en", pattern=r"^(en|hi|kn)$")

@router.post("/chat")
async def chat_with_insight(
    req: ChatRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")

    client = genai.Client(api_key=api_key)

    language_instruction = LANGUAGE_MAP.get(req.language, "Respond in English")

    safe_context = {k: _sanitize_input(str(v), 500) for k, v in req.context.items()} if isinstance(req.context, dict) else {}
    safe_message = _sanitize_input(req.message, 2000)
    
    system_instruction = f"""
    You are EcoLog AI, an intelligent, friendly, and motivating sustainability assistant.
    The user is asking a question about their daily carbon footprint report.
    Here is the data from their current report:
    {json.dumps(safe_context, indent=2)}
    
    Keep your answers concise, encouraging, and directly related to their footprint data and sustainability. 
    Use a conversational tone. Do not use markdown syntax for bolding/italics heavily unless necessary.
    {language_instruction}
    """
    
    try:
        formatted_history = []
        for msg in req.history:
            formatted_history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [_sanitize_input(msg.text, 2000)]
            })
            
        chat = client.chats.create(
            model='gemini-2.5-flash',
            history=formatted_history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        response = chat.send_message(safe_message)
        
        return {"reply": response.text.strip()}
    except Exception as e:
        logger.exception("Error in chat")
        raise HTTPException(status_code=500, detail="Failed to process chat")
