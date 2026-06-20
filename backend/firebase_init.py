import os
import json
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent

def _get_credentials():
    creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if creds_json:
        return credentials.Certificate(json.loads(creds_json))

    raw = os.getenv("FIREBASE_KEY_PATH", "firebase-key.json")
    path = Path(raw)
    if not path.is_absolute():
        for base in (_BACKEND_DIR, _REPO_ROOT):
            candidate = base / raw
            if candidate.exists():
                path = candidate
                break
    if path.exists():
        return credentials.Certificate(str(path))
    return None

if not firebase_admin._apps:
    cred = _get_credentials()
    if cred:
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()
