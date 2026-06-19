import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent


def _resolve_key_path() -> str:
    """Resolve FIREBASE_KEY_PATH relative to backend/ or repo root."""
    raw = os.getenv("FIREBASE_KEY_PATH", "firebase-key.json")
    path = Path(raw)
    if path.is_absolute():
        return str(path)
    for base in (_BACKEND_DIR, _REPO_ROOT):
        candidate = base / raw
        if candidate.exists():
            return str(candidate)
    return str(_BACKEND_DIR / raw)


KEY_PATH = _resolve_key_path()

# Initialise only once (Vite hot-reload safe)
if not firebase_admin._apps:
    cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred)

# Shared Firestore client
db = firestore.client()
