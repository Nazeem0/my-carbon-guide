"""
WebSocket connection manager.

Each authenticated user gets their own set of active WebSocket connections.
When any data changes (new activity, profile update, etc.) we call
`broadcast(uid, payload)` and it instantly pushes the update to every
tab/device the user has open.
"""

import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # uid -> list of active WebSocket connections for that user
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, uid: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(uid, []).append(ws)

    def disconnect(self, uid: str, ws: WebSocket):
        conns = self._connections.get(uid, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._connections.pop(uid, None)

    async def broadcast(self, uid: str, payload: dict):
        """Push a JSON message to all open connections for the given user."""
        dead = []
        for ws in self._connections.get(uid, []):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(uid, ws)


# Singleton shared across all route modules
manager = ConnectionManager()
