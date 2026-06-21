"""
Activities API.

REST:
  GET  /api/activities          → returns the user's full activity list
  POST /api/activities          → log a new activity

The real-time push channel (`/ws/sync`) lives in `routes/websockets.py` —
this module is REST-only.
"""

import asyncio
from datetime import timedelta, date, datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from firebase_init import db
from auth import verify_token
from carbon import calculate_co2, EMISSION_FACTORS
from google.cloud.firestore_v1.base_query import FieldFilter
from ws_manager import manager
from utils import serialize_activity

router = APIRouter()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ActivityIn(BaseModel):
    activityKey: str = Field(..., pattern=r"^[a-z_]+$", max_length=50)
    quantity: float = Field(..., gt=0, le=10000)


# ─── Helper: recalculate rank & streak, then broadcast ───────────────────────

def _today_str() -> str:
    return date.today().isoformat()


def _local_day(ts) -> str | None:
    """Convert a Firestore timestamp to a local calendar date (YYYY-MM-DD)."""
    if not ts:
        return None
    if hasattr(ts, "astimezone"):
        return ts.astimezone().date().isoformat()
    if hasattr(ts, "isoformat"):
        return ts.isoformat()[:10]
    return str(ts)[:10]


def _calculate_streak(all_dates: set[str]) -> int:
    """Match frontend useActivities.recalculateStreak — yesterday counts as active."""
    if not all_dates:
        return 0

    sorted_dates = sorted(all_dates, reverse=True)
    today = date.today()
    yesterday = today - timedelta(days=1)
    most_recent = date.fromisoformat(sorted_dates[0])

    if most_recent != today and most_recent != yesterday:
        return 0

    streak = 0
    expected = most_recent
    for ds in sorted_dates:
        d = date.fromisoformat(ds)
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break
    return streak


async def _recalculate_and_broadcast(uid: str):
    """
    After a new activity is saved:
    1. Sum today's activities → todayKg
    2. Save to dailyFootprint collection
    3. Recalculate global rank
    4. Recalculate streak
    5. Broadcast updated profile + activity list via WebSocket
    """
    payload = await asyncio.to_thread(_recalculate_sync, uid)
    await manager.broadcast(uid, payload)


def _recalculate_sync(uid: str) -> dict:
    today = _today_str()
    acts_ref = db.collection("activities").where(filter=FieldFilter("userId", "==", uid)).stream()
    today_total = 0.0
    all_dates: set[str] = set()
    all_activities = []

    for doc in acts_ref:
        data = doc.to_dict()
        ts = data.get("timestamp")
        if ts:
            day = _local_day(ts)
            if day:
                all_dates.add(day)
                if day == today:
                    today_total += data.get("co2_kg", 0.0)
        all_activities.append(serialize_activity(doc))

    today_total = round(today_total, 3)

    db.collection("dailyFootprint").document(f"{uid}_{today}").set(
        {"userId": uid, "date": today, "totalKg": today_total}, merge=True
    )

    users_snap = db.collection("users").stream()
    all_users = []
    for user_snap in users_snap:
        user_data = user_snap.to_dict()
        all_users.append({"uid": user_snap.id, "todayKg": user_data.get("todayKg", 0.0)})
    all_users = [entry if entry["uid"] != uid else {**entry, "todayKg": today_total} for entry in all_users]
    all_users.sort(key=lambda entry: entry["todayKg"])
    rank = next((i + 1 for i, entry in enumerate(all_users) if entry["uid"] == uid), 999)

    streak = _calculate_streak(all_dates)

    db.collection("users").document(uid).set(
        {"todayKg": today_total, "rank": rank, "streak": streak, "daysActive": len(all_dates)},
        merge=True,
    )

    user_doc = db.collection("users").document(uid).get().to_dict() or {}
    all_activities.sort(key=lambda act: act["timestamp"], reverse=True)

    return {
        "type": "SYNC",
        "profile": {**user_doc, "streak": streak, "rank": rank, "todayKg": today_total},
        "activities": all_activities,
    }


def _fetch_activities(uid: str, days: int | None = None) -> list:
    query = db.collection("activities").where(filter=FieldFilter("userId", "==", uid))
    if days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.where(filter=FieldFilter("timestamp", ">=", cutoff))
    snap = query.stream()
    result = []
    for doc in snap:
        data = doc.to_dict()
        ts = data.get("timestamp")
        result.append({
            "id": doc.id,
            "activityKey": data.get("activityKey", ""),
            "quantity": data.get("quantity", 0),
            "co2_kg": data.get("co2_kg", 0.0),
            "timestamp": ts.isoformat() if ts and hasattr(ts, "isoformat") else str(ts),
        })
    result.sort(key=lambda act: act["timestamp"], reverse=True)
    return result


def _save_activity(uid: str, activity_key: str, quantity: float, co2_kg: float) -> None:
    db.collection("activities").add({
        "userId": uid,
        "activityKey": activity_key,
        "quantity": quantity,
        "co2_kg": co2_kg,
        "timestamp": SERVER_TIMESTAMP,
    })


# ─── REST: GET /api/activities ────────────────────────────────────────────────

@router.get("/activities")
async def get_activities(
    token: Annotated[dict, Depends(verify_token)],
    days: Annotated[Optional[int], Query(ge=1, le=365)] = None,
):
    return await asyncio.to_thread(_fetch_activities, token["uid"], days)


# ─── REST: POST /api/activities ───────────────────────────────────────────────

@router.post("/activities", status_code=201)
async def add_activity(
    body: ActivityIn,
    token: Annotated[dict, Depends(verify_token)],
):
    uid = token["uid"]

    if body.activityKey not in EMISSION_FACTORS:
        raise HTTPException(status_code=400, detail=f"Unknown activityKey: {body.activityKey}")

    result = calculate_co2(body.activityKey, body.quantity)

    await asyncio.to_thread(
        _save_activity, uid, body.activityKey, body.quantity, result["co2_kg"]
    )

    # Recalculate everything and push via WebSocket in the background
    asyncio.create_task(_recalculate_and_broadcast(uid))

    return {"co2_kg": result["co2_kg"], "label": result["label"]}

