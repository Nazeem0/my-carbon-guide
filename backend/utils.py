"""Shared helpers for Firestore data serialization."""

LEADERBOARD_LIMIT = 50
WS_PING_INTERVAL = 30
CITY_AVG_KG = 1.9


def serialize_activity(doc) -> dict:
    """Convert a Firestore activity document to a JSON-safe dict."""
    data = doc.to_dict()
    ts = data.get("timestamp")
    return {
        "id": doc.id,
        "activityKey": data.get("activityKey", ""),
        "quantity": data.get("quantity", 0),
        "co2_kg": data.get("co2_kg", 0.0),
        "timestamp": ts.isoformat() if ts and hasattr(ts, "isoformat") else str(ts),
    }
