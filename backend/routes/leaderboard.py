"""
Leaderboard API

REST:
  GET /api/leaderboard   → returns top 50 users sorted by todayKg ascending
                           (lower emissions = better rank)
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends

from firebase_init import db
from auth import verify_token
from utils import LEADERBOARD_LIMIT

router = APIRouter()


def _fetch_leaderboard(uid: str) -> list:
    snap = db.collection("users").order_by("todayKg").limit(LEADERBOARD_LIMIT + 50).stream()

    users = []
    for doc in snap:
        data = doc.to_dict()
        users.append({
            "uid": doc.id,
            "name": data.get("name", "Anonymous"),
            "city": data.get("city", ""),
            "todayKg": data.get("todayKg", 0.0),
            "rank": data.get("rank", 999),
            "streak": data.get("streak", 0),
            "isCurrentUser": doc.id == uid,
        })

    for i, u in enumerate(users):
        u["rank"] = i + 1

    return users[:LEADERBOARD_LIMIT]


@router.get("/leaderboard")
async def get_leaderboard(token: Annotated[dict, Depends(verify_token)]):
    return await asyncio.to_thread(_fetch_leaderboard, token["uid"])
