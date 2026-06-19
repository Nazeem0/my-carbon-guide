"""
Users API

REST:
  GET  /api/users/profile   → fetch current user's profile
  PUT  /api/users/profile   → update profile fields (name, city, dailyGoalKg, etc.)
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from firebase_init import db
from auth import verify_token
from ws_manager import manager

router = APIRouter()


class ProfileUpdate(BaseModel):
    name: str | None = None
    city: str | None = None
    college: str | None = None
    age: int | None = None
    gender: str | None = None
    bio: str | None = None
    phone: str | None = None
    yearOfStudy: str | None = None
    dailyGoalKg: float | None = None


def _get_profile_sync(uid: str, token: dict) -> dict:
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return doc.to_dict()
    return {
        "name": token.get("name", "New User"),
        "email": token.get("email", ""),
        "city": "Mangaluru",
        "streak": 0,
        "rank": 999,
        "todayKg": 0.0,
        "dailyGoalKg": 2.0,
        "daysActive": 0,
        "totalLogs": 0,
    }


def _update_profile_sync(uid: str, update_data: dict) -> dict:
    db.collection("users").document(uid).set(update_data, merge=True)
    updated_doc = db.collection("users").document(uid).get()
    return updated_doc.to_dict() if updated_doc.exists else {}


@router.get("/users/profile")
async def get_profile(token: Annotated[dict, Depends(verify_token)]):
    return await asyncio.to_thread(_get_profile_sync, token["uid"], token)


@router.put("/users/profile")
async def update_profile(
    body: ProfileUpdate,
    token: Annotated[dict, Depends(verify_token)],
):
    uid = token["uid"]
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "No fields to update"}

    profile = await asyncio.to_thread(_update_profile_sync, uid, update_data)
    await manager.broadcast(uid, {"type": "PROFILE_UPDATE", "profile": profile})

    return {"message": "Profile updated", "profile": profile}
