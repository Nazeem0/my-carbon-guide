import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests

router = APIRouter()

class TranslateRequest(BaseModel):
    texts: list[str]
    target: str

@router.post("/translate")
async def translate_text(req: TranslateRequest):
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
