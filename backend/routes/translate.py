"""
Google Cloud Translation API wrapper.

REST:
  POST /api/translate   → translates an array of English texts to the target language
"""

import os
import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import requests

from auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()


class TranslateRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=128)
    target: str = Field(..., pattern=r"^(en|hi|kn)$")


@router.post("/translate")
async def translate_text(
    req: TranslateRequest,
    token: Annotated[dict, Depends(verify_token)],
):
    """Translate an array of English strings to the requested language.

    Returns {"translations": [...]}. Returns input as-is when target is "en".
    """
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_TRANSLATE_API_KEY not configured")

    if req.target == "en":
        return {"translations": req.texts}

    try:
        params = {"key": api_key, "target": req.target, "source": "en"}
        for t in req.texts:
            params.setdefault("q", []).append(t)

        url = "https://translation.googleapis.com/language/translate/v2"
        resp = requests.post(url, params=params, timeout=30)
        data = resp.json()

        if "error" in data:
            raise HTTPException(status_code=500, detail=data["error"]["message"])

        translations = [item["translatedText"] for item in data["data"]["translations"]]
        return {"translations": translations}
    except Exception:
        logger.exception("Translation request failed")
        raise HTTPException(status_code=500, detail="Translation service unavailable")
