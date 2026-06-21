"""
AI-powered insights API.

Endpoints:
  POST /api/insights/daily     → 2-sentence daily carbon insight via Gemini
  POST /api/insights/weekly    → 3-sentence weekly summary via Gemini
  POST /api/insights/detailed  → Full structured JSON analysis (saved to Firestore)
  POST /api/insights/chat      → Conversational chat about the user's footprint
"""

import os
import json
import re
import logging
import datetime
import asyncio
from typing import Annotated, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from auth import verify_token
from google.cloud.firestore_v1 import transactional
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_init import db

logger = logging.getLogger(__name__)

router = APIRouter()

LANGUAGE_MAP = {
    "en": "Respond in English",
    "hi": "Respond in Hindi (हिंदी)",
    "kn": "Respond in Kannada (ಕನ್ನಡ)",
}


def _sanitize_input(value: str, max_len: int = 200) -> str:
    """Strip control characters and enforce a length limit on user-provided strings."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", value)
    return cleaned[:max_len].strip()


def _get_gemini_client() -> genai.Client:
    """Check GEMINI_API_KEY env var and return a configured genai client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
    return genai.Client(api_key=api_key)


def _build_language_instruction(language: str) -> str:
    """Return the Gemini language instruction string for a given language code."""
    return LANGUAGE_MAP.get(language, "Respond in English")


INSIGHT_CACHE_COLLECTION = "insightCache"


def _today_str() -> str:
    """Return today's date as YYYY-MM-DD."""
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")


def _cache_key(user_id: str, insight_type: str) -> str:
    """Build a Firestore document ID for the cached insight e.g. 'abc123_daily_2026-06-21'."""
    return f"{user_id}_{insight_type}_{_today_str()}"


def _get_cached_insight(user_id: str, insight_type: str) -> str | None:
    """Return cached insight text for today if it exists, else None."""
    doc_ref = db.collection(INSIGHT_CACHE_COLLECTION).document(
        _cache_key(user_id, insight_type)
    )
    doc = doc_ref.get()
    if doc.exists:
        text = doc.to_dict().get("text")
        if isinstance(text, str) and text:
            return text
    return None


def _save_insight_cache(user_id: str, insight_type: str, text: str) -> None:
    """Persist generated insight text to Firestore with a TTL-aware timestamp."""
    doc_ref = db.collection(INSIGHT_CACHE_COLLECTION).document(
        _cache_key(user_id, insight_type)
    )
    doc_ref.set({
        "userId": user_id,
        "type": insight_type,
        "date": _today_str(),
        "text": text,
        "createdAt": datetime.datetime.now(datetime.timezone.utc),
    })


# ── Distributed lock (Firestore-based) ────────────────────────────────
# Prevents concurrent requests across multiple Cloud Run instances from
# both calling Gemini before the first one writes its result to cache.
# Uses Firestore transactions for atomicity and TTL for crash recovery.

LOCK_COLLECTION = "insightLocks"
LOCK_TTL_SECONDS = 30


def _acquire_lock(user_id: str, insight_type: str) -> bool:
    """Atomically acquire a Firestore distributed lock via transaction.

    Returns True if acquired (caller should call Gemini).
    Returns False if another request holds a non-stale lock.
    If the lock document is older than LOCK_TTL_SECONDS, it is considered
    stale (previous request crashed) and can be taken over.
    """
    key = f"{user_id}_{insight_type}"
    doc_ref = db.collection(LOCK_COLLECTION).document(key)
    now = datetime.datetime.now(datetime.timezone.utc)

    @transactional
    def _txn(transaction, doc_ref, now):
        snapshot = doc_ref.get(transaction=transaction)
        if snapshot.exists:
            locked_at = snapshot.get("locked_at")
            if isinstance(locked_at, datetime.datetime):
                age = (now - locked_at).total_seconds()
                if 0 <= age < LOCK_TTL_SECONDS:
                    return False
        transaction.set(doc_ref, {"locked_at": now})
        return True

    try:
        tr = db.transaction()
        return _txn(tr, doc_ref, now)
    except Exception:
        logger.warning("Lock transaction failed, proceeding as fallback", exc_info=True)
        return True  # fail-open: let caller proceed to Gemini


async def _wait_for_lock_release(
    user_id: str,
    insight_type: str,
    max_wait: float = 10.0,
    poll_interval: float = 0.3,
) -> str | None:
    """Poll the Firestore cache until it appears or times out.

    Used by requests that didn't acquire the lock — they wait for the
    request that holds the lock to finish and write its result to the cache.
    Returns the cached text if found, or None on timeout.
    """
    elapsed = 0.0
    while elapsed < max_wait:
        cached = _get_cached_insight(user_id, insight_type)
        if cached is not None:
            return cached
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval
    return None


def _release_lock(user_id: str, insight_type: str) -> None:
    """Delete the lock document from Firestore."""
    try:
        db.collection(LOCK_COLLECTION).document(
            f"{user_id}_{insight_type}"
        ).delete()
    except Exception:
        pass  # best-effort cleanup


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
    force_refresh: bool = Field(default=False)


@router.post("/daily")
async def generate_daily_insight(
    req: DailyInsightRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    """Generate a 2-sentence personalised daily carbon insight.

    Accepts the user's daily/ weekly/ city averages and returns {text: "..."}.
    """
    # ── Return cached insight unless force_refresh is requested ──
    if not req.force_refresh:
        cached = _get_cached_insight(req.userId, "daily")
        if cached is not None:
            return {"text": cached, "cached": True}

    # ── Distributed lock — prevent concurrent Gemini calls across instances ──
    acquired = _acquire_lock(req.userId, "daily")
    if not acquired:
        cached = await _wait_for_lock_release(req.userId, "daily")
        if cached is not None:
            return {"text": cached, "cached": True}
        # Timed out — lock holder may have crashed. Try stale takeover.
        acquired = _acquire_lock(req.userId, "daily")

    client = _get_gemini_client()
    language_instruction = _build_language_instruction(req.language)

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
        text = response.text.strip()
        _save_insight_cache(req.userId, "daily", text)
        return {"text": text, "cached": False}
    except genai_errors.ClientError as e:
        if e.code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI insight temporarily unavailable — daily limit reached, try again later",
            )
        logger.exception("Gemini client error generating daily insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")
    except Exception:
        logger.exception("Error generating daily insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")
    finally:
        if acquired:
            _release_lock(req.userId, "daily")


class WeeklySummaryRequest(BaseModel):
    userId: str = Field(..., max_length=128)
    userName: str | None = Field(default=None, max_length=100)
    weeklyData: List[float] | None = Field(default=None, min_length=7, max_length=7)
    bestDay: str | None = Field(default=None, max_length=50)
    streak: int | None = Field(default=None, ge=0, le=3650)
    language: str = Field(default="en", pattern=r"^(en|hi|kn)$")
    force_refresh: bool = Field(default=False)


def _compute_weekly_stats_from_firestore(uid: str) -> tuple[list[float], str, int, str]:
    """Compute the last 7 days of CO2 data, best day, streak, and user name from Firestore.

    Returns (weekly_data, best_day_label, streak, user_name).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    seven_days_ago = now - datetime.timedelta(days=7)

    snap = (
        db.collection("activities")
        .where(filter=FieldFilter("userId", "==", uid))
        .where(filter=FieldFilter("timestamp", ">=", seven_days_ago))
        .stream()
    )

    daily_totals: dict[str, float] = {}
    for doc in snap:
        data = doc.to_dict()
        ts = data.get("timestamp")
        if ts:
            day = ts.isoformat()[:10] if hasattr(ts, "isoformat") else str(ts)[:10]
            daily_totals[day] = daily_totals.get(day, 0) + data.get("co2_kg", 0.0)

    weekly_data = []
    for i in range(6, -1, -1):
        d = (now - datetime.timedelta(days=i))
        day_str = d.strftime("%Y-%m-%d")
        weekly_data.append(round(daily_totals.get(day_str, 0), 2))

    active = [(k, v) for k, v in daily_totals.items() if v > 0]
    best_day_label = min(active, key=lambda x: x[1])[0] if active else "N/A"

    user_doc = db.collection("users").document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    streak = user_data.get("streak", 0)
    user_name = user_data.get("name", "User")

    return weekly_data, best_day_label, streak, user_name


@router.post("/weekly")
async def generate_weekly_summary(
    req: WeeklySummaryRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    """Generate a 3-sentence weekly carbon summary.

    Accepts 7-day CO2 data and returns {text: "..."}.
    """
    # ── Return cached insight unless force_refresh is requested ──
    if not req.force_refresh:
        cached = _get_cached_insight(req.userId, "weekly")
        if cached is not None:
            return {"text": cached, "cached": True}

    # ── Distributed lock ──
    acquired = _acquire_lock(req.userId, "weekly")
    if not acquired:
        cached = await _wait_for_lock_release(req.userId, "weekly")
        if cached is not None:
            return {"text": cached, "cached": True}
        acquired = _acquire_lock(req.userId, "weekly")

    # ── Compute weekly stats from Firestore if not provided by client ──
    weekly_data = req.weeklyData
    best_day = req.bestDay
    streak = req.streak
    user_name = req.userName

    if weekly_data is None or best_day is None or streak is None:
        computed = _compute_weekly_stats_from_firestore(req.userId)
        weekly_data = computed[0]
        best_day = computed[1]
        streak = computed[2]
        if user_name is None:
            user_name = computed[3]

    client = _get_gemini_client()
    language_instruction = _build_language_instruction(req.language)

    safe_name = _sanitize_input(user_name or "User")
    avg = round(sum(weekly_data) / 7, 2)

    prompt = f"""
You are EcoLog's AI coach. Write a weekly carbon summary.

User: {safe_name}
This week's daily CO2: {', '.join(str(d) for d in weekly_data)} kg
Weekly average: {avg} kg/day
Best day: {_sanitize_input(best_day or "N/A")}
Current streak: {streak or 0} days

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
        text = response.text.strip()
        _save_insight_cache(req.userId, "weekly", text)
        return {"text": text, "cached": False}
    except genai_errors.ClientError as e:
        if e.code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI insight temporarily unavailable — daily limit reached, try again later",
            )
        logger.exception("Gemini client error generating weekly summary")
        raise HTTPException(status_code=500, detail="Failed to generate weekly summary")
    except Exception:
        logger.exception("Error generating weekly summary")
        raise HTTPException(status_code=500, detail="Failed to generate weekly summary")
    finally:
        if acquired:
            _release_lock(req.userId, "weekly")


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
    force_refresh: bool = Field(default=False)


@router.post("/detailed")
async def generate_detailed_insight(
    req: DetailedInsightRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    """Generate a full structured carbon analysis via Gemini JSON mode.

    Returns parsed JSON with todays_insight, main_contributor, predictions,
    recommendations and eco_score. Saves the result to Firestore.
    """
    # ── Return cached insight unless force_refresh is requested ──
    if not req.force_refresh:
        cached = _get_cached_insight(req.userId, "detailed")
        if cached is not None:
            insight_data = json.loads(cached)
            insight_data["cached"] = True
            return insight_data

    # ── Distributed lock ──
    acquired = _acquire_lock(req.userId, "detailed")
    if not acquired:
        cached = await _wait_for_lock_release(req.userId, "detailed")
        if cached is not None:
            insight_data = json.loads(cached)
            insight_data["cached"] = True
            return insight_data
        acquired = _acquire_lock(req.userId, "detailed")

    client = _get_gemini_client()
    language_instruction = _build_language_instruction(req.language)

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
        
        # Save to cache for today
        _save_insight_cache(req.userId, "detailed", json.dumps(insight_data))
        
        # Historical log
        doc_ref = db.collection("detailedInsights").document()
        doc_ref.set({
            "userId": req.userId,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "insight": insight_data,
        })
        
        insight_data["cached"] = False
        return insight_data

    except genai_errors.ClientError as e:
        if e.code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI insight temporarily unavailable — daily limit reached, try again later",
            )
        logger.exception("Gemini client error generating detailed insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")
    except Exception:
        logger.exception("Error generating detailed insight")
        raise HTTPException(status_code=500, detail="Failed to generate insight")
    finally:
        if acquired:
            _release_lock(req.userId, "detailed")

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
    """Conversational chat about the user's carbon footprint.

    Accepts message history and report context, returns {reply: "..."}.
    """
    client = _get_gemini_client()
    language_instruction = _build_language_instruction(req.language)

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
    except genai_errors.ClientError as e:
        if e.code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI insight temporarily unavailable — daily limit reached, try again later",
            )
        logger.exception("Gemini client error in chat")
        raise HTTPException(status_code=500, detail="Failed to process chat")
    except Exception:
        logger.exception("Error in chat")
        raise HTTPException(status_code=500, detail="Failed to process chat")
