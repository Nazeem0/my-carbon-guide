"""
FastAPI application entrypoint for the Ecolog backend.

This file wires:
  * CORS middleware so the React frontend (default http://localhost:5173) can call us.
  * The four REST + WebSocket routers.
  * A tiny `/` health endpoint.

Importing `firebase_init` at module scope has the side-effect of initialising
`firebase_admin` exactly once, so the shared `db` client is available to every
route module.
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialise firebase_admin and expose the shared `db` client
import firebase_init  # noqa: F401  (side-effect import)

from routes.activities import router as activities_router
from routes.leaderboard import router as leaderboard_router
from routes.users import router as users_router
from routes.websockets import router as websockets_router
from routes.insights import router as insights_router
from routes.translate import router as translate_router

load_dotenv()

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
    "https://ecolog-1088753562033.asia-south1.run.app"
]

app = FastAPI(
    title="Ecolog Backend",
    description="Python FastAPI backend powering the Ecolog carbon-tracking app.",
    version="1.0.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# The React dev server hits us from the origin below; allow it (plus
# credentials and the usual methods/headers).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
# REST
app.include_router(activities_router,   prefix="/api", tags=["activities"])
app.include_router(users_router,        prefix="/api", tags=["users"])
app.include_router(leaderboard_router,  prefix="/api", tags=["leaderboard"])
app.include_router(insights_router,     prefix="/api/insights", tags=["insights"])
app.include_router(translate_router,    prefix="/api", tags=["translate"])

# WebSocket
app.include_router(websockets_router,                tags=["websockets"])


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Tiny health endpoint for liveness checks."""
    return {"status": "ok", "service": "ecolog-backend"}
