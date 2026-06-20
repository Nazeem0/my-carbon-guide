"""
Users API

REST:
  GET  /api/users/profile   → fetch current user's profile
  PUT  /api/users/profile   → update profile fields (name, city, dailyGoalKg, etc.)
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from firebase_init import db
from auth import verify_token
from ws_manager import manager

router = APIRouter()


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    city: str | None = Field(None, min_length=1, max_length=100)
    college: str | None = Field(None, max_length=200)
    age: int | None = Field(None, ge=10, le=120)
    gender: str | None = Field(None, pattern=r"^(Male|Female|Other|Non-binary|Prefer not to say)?$")
    bio: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, pattern=r"^[0-9+\-\s()]*$", max_length=20)
    yearOfStudy: str | None = Field(None, max_length=50)
    dailyGoalKg: float | None = Field(None, gt=0, le=100)


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
