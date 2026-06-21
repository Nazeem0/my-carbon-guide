"""
WebSocket sync endpoint.

The frontend opens a single long-lived connection:

    new WebSocket("ws://localhost:8000/ws/sync?token=<firebase_id_token>")

On connect the server:
  1. Verifies the Firebase ID token.
  2. Registers the socket for that user via `ws_manager`.
  3. Sends the current state (profile + activities) immediately as a
     `{type: "SYNC"}` message.
  4. Keeps the connection open, sending a `{type: "PING"}` every 30 s.
     (Most browsers / proxies will silently close idle sockets without this.)
  5. Future data changes are pushed automatically by `manager.broadcast(...)`
     from other route handlers (e.g. `routes/activities._recalculate_and_broadcast`).
"""

import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from firebase_admin import auth as fb_auth

from firebase_init import db
from google.cloud.firestore_v1.base_query import FieldFilter
from ws_manager import manager
from utils import serialize_activity, WS_PING_INTERVAL

router = APIRouter()


def _fetch_sync_state(uid: str) -> dict:
    acts_snap = db.collection("activities").where(filter=FieldFilter("userId", "==", uid)).stream()
    activities = [serialize_activity(doc) for doc in acts_snap]
    activities.sort(key=lambda a: a["timestamp"], reverse=True)

    profile_doc = db.collection("users").document(uid).get()
    profile = profile_doc.to_dict() if profile_doc.exists else {}

    return {"type": "SYNC", "profile": profile, "activities": activities}


@router.websocket("/ws/sync")
async def websocket_sync(ws: WebSocket, token: str = Query(...)):
    try:
        decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
    except Exception:
        await ws.close(code=4001)
        return

    uid = decoded["uid"]
    await manager.connect(uid, ws)

    try:
        state = await asyncio.to_thread(_fetch_sync_state, uid)
        await ws.send_json(state)

        while True:
            await asyncio.sleep(WS_PING_INTERVAL)
            await ws.send_json({"type": "PING"})

    except WebSocketDisconnect:
        manager.disconnect(uid, ws)
    except Exception:
        manager.disconnect(uid, ws)
