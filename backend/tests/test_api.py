"""
Backend test suite for Ecolog API.

Run with:  pytest tests/test_api.py -v

All Firebase / external calls are mocked — no live credentials needed.
100+ tests covering: health, activities, users, leaderboard, insights,
translate, carbon calculations, WebSocket manager, CORS, sanitisation,
and auth edge cases.
"""

import asyncio
import os
import sys
from unittest.mock import MagicMock, AsyncMock

import pytest
from fastapi import Header
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Prevent real Firebase init before anything imports it
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_fake_db = MagicMock()
_fake_fb_module = MagicMock(db=_fake_db)

sys.modules["firebase_admin"] = MagicMock()
sys.modules["firebase_admin.credentials"] = MagicMock()
sys.modules["firebase_admin.firestore"] = MagicMock()
sys.modules["firebase_admin.auth"] = MagicMock()
sys.modules["firebase_init"] = _fake_fb_module

sys.modules["carbon"] = __import__("carbon")


async def _mock_verify_token(authorization: str = Header(...)) -> dict:
    return {"uid": "test-uid-123", "email": "test@example.com"}


sys.modules["auth"] = MagicMock(verify_token=_mock_verify_token)

from main import app  # noqa: E402

FAKE_TOKEN = "Bearer fake-firebase-id-token"
client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _reset_mocks():
    _fake_db.reset_mock()
    yield


def _auth():
    return {"Authorization": FAKE_TOKEN}


def _make_activity_doc(key, qty, co2, ts_str="2026-06-20T10:00:00"):
    return MagicMock(
        id=f"act-{key}",
        to_dict=lambda: {
            "activityKey": key, "quantity": qty,
            "co2_kg": co2,
            "timestamp": MagicMock(isoformat=lambda: ts_str),
        },
    )


def _mock_user_doc(exists=True, data=None):
    doc = MagicMock(exists=exists)
    doc.to_dict.return_value = data or {}
    return doc


# ═══════════════════════════════════════════════════════════════════════════
# 1. Health endpoint
# ═══════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_root_returns_ok(self):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_root_has_service_name(self):
        resp = client.get("/")
        assert resp.json()["service"] == "ecolog-backend"

    def test_root_is_get_only(self):
        resp = client.post("/")
        assert resp.status_code == 405


# ═══════════════════════════════════════════════════════════════════════════
# 2. Activities API
# ═══════════════════════════════════════════════════════════════════════════

class TestActivitiesAPI:
    def test_get_requires_auth(self):
        assert client.get("/api/activities").status_code == 422

    def test_get_returns_list(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = [
            _make_activity_doc("car_petrol", 10, 1.74),
        ]
        resp = client.get("/api/activities", headers=_auth())
        assert resp.status_code == 200
        assert resp.json()[0]["activityKey"] == "car_petrol"

    def test_get_returns_multiple(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = [
            _make_activity_doc("bus", 5, 0.445, "2026-06-20T09:00:00"),
            _make_activity_doc("car_petrol", 10, 1.74, "2026-06-20T10:00:00"),
            _make_activity_doc("veg_meal", 1, 1.1, "2026-06-20T12:00:00"),
        ]
        resp = client.get("/api/activities", headers=_auth())
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_get_empty_when_no_activities(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.get("/api/activities", headers=_auth())
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_sorted_by_timestamp_desc(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = [
            _make_activity_doc("bus", 5, 0.445, "2026-06-20T08:00:00"),
            _make_activity_doc("veg_meal", 1, 1.1, "2026-06-20T12:00:00"),
            _make_activity_doc("car_petrol", 10, 1.74, "2026-06-20T10:00:00"),
        ]
        resp = client.get("/api/activities", headers=_auth())
        timestamps = [a["timestamp"] for a in resp.json()]
        assert timestamps == sorted(timestamps, reverse=True)

    # --- POST /api/activities ---

    def test_post_valid_car_petrol(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "car_petrol", "quantity": 10}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 1.74

    def test_post_valid_car_diesel(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "car_diesel", "quantity": 20}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 3.36

    def test_post_valid_bike_activa(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "bike_activa", "quantity": 15}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.645

    def test_post_valid_e_scooter(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "e_scooter", "quantity": 10}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.12

    def test_post_valid_auto_rickshaw(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "auto_rickshaw", "quantity": 8}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.768

    def test_post_valid_bus(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": 50}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 4.45

    def test_post_valid_train(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "train", "quantity": 100}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 4.1

    def test_post_valid_flight_domestic(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "flight_domestic", "quantity": 500}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 127.5

    def test_post_valid_bike_ride(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "bike_ride", "quantity": 10}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.0

    def test_post_valid_walk(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "walk", "quantity": 5}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.0

    def test_post_valid_veg_meal(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "veg_meal", "quantity": 2}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 2.2

    def test_post_valid_nonveg_meal(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "nonveg_meal", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 6.9

    def test_post_valid_dairy_meal(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "dairy_meal", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 3.2

    def test_post_valid_egg_meal(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "egg_meal", "quantity": 3}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 4.8

    def test_post_valid_street_food(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "street_food", "quantity": 2}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 1.6

    def test_post_valid_swiggy_zomato(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "swiggy_zomato", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.5

    def test_post_valid_electricity(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "electricity_kwh", "quantity": 50}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 41.0

    def test_post_valid_lpg(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "lpg_cylinder", "quantity": 14}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 41.72

    def test_post_valid_ac_hour(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "ac_hour", "quantity": 3}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 3.0

    def test_post_valid_geyser(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "geyser_hour", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.82

    def test_post_valid_washing_machine(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "washing_machine", "quantity": 2}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 1.2

    def test_post_valid_online_order(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "online_order", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.5

    def test_post_valid_clothing_item(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "clothing_item", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 10.0

    def test_post_valid_electronics(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "electronics", "quantity": 1}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 70.0

    def test_post_valid_plastic_bag(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "plastic_bag", "quantity": 10}, headers=_auth())
        assert resp.status_code == 201
        assert resp.json()["co2_kg"] == 0.14

    def test_post_returns_label(self):
        _fake_db.collection.return_value.where.return_value.stream.return_value = []
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": 10}, headers=_auth())
        assert resp.json()["label"] == "Bus"

    def test_post_requires_auth(self):
        assert client.post("/api/activities", json={"activityKey": "bus", "quantity": 10}).status_code == 422

    def test_post_missing_activity_key(self):
        resp = client.post("/api/activities", json={"quantity": 10}, headers=_auth())
        assert resp.status_code == 422

    def test_post_missing_quantity(self):
        resp = client.post("/api/activities", json={"activityKey": "bus"}, headers=_auth())
        assert resp.status_code == 422

    def test_post_empty_body(self):
        resp = client.post("/api/activities", json={}, headers=_auth())
        assert resp.status_code == 422

    def test_post_zero_quantity_rejected(self):
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": 0}, headers=_auth())
        assert resp.status_code == 422

    def test_post_negative_quantity_rejected(self):
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": -1}, headers=_auth())
        assert resp.status_code == 422

    def test_post_huge_quantity_rejected(self):
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": 99999}, headers=_auth())
        assert resp.status_code == 422

    def test_post_invalid_key_format_uppercase(self):
        resp = client.post("/api/activities", json={"activityKey": "Bus", "quantity": 10}, headers=_auth())
        assert resp.status_code == 422

    def test_post_invalid_key_format_special_chars(self):
        resp = client.post("/api/activities", json={"activityKey": "bus!", "quantity": 10}, headers=_auth())
        assert resp.status_code == 422

    def test_post_unknown_key_rejected(self):
        resp = client.post("/api/activities", json={"activityKey": "rocket_ship", "quantity": 5}, headers=_auth())
        assert resp.status_code == 400
        assert "Unknown activityKey" in resp.json()["detail"]

    def test_post_string_quantity_rejected(self):
        resp = client.post("/api/activities", json={"activityKey": "bus", "quantity": "abc"}, headers=_auth())
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 3. Users / Profile API
# ═══════════════════════════════════════════════════════════════════════════

class TestUsersAPI:
    def test_get_requires_auth(self):
        assert client.get("/api/users/profile").status_code == 422

    def test_get_new_user_defaults(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(False)
        resp = client.get("/api/users/profile", headers=_auth())
        data = resp.json()
        assert data["todayKg"] == 0.0
        assert data["dailyGoalKg"] == 2.0
        assert data["streak"] == 0
        assert data["rank"] == 999

    def test_get_new_user_default_city(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(False)
        resp = client.get("/api/users/profile", headers=_auth())
        assert resp.json()["city"] == "Mangaluru"

    def test_get_existing_user(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {
            "name": "Test User", "city": "Mumbai", "todayKg": 1.5, "streak": 5, "rank": 3
        })
        resp = client.get("/api/users/profile", headers=_auth())
        assert resp.json()["name"] == "Test User"
        assert resp.json()["city"] == "Mumbai"

    def test_get_existing_user_all_fields(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {
            "name": "Full User", "city": "Delhi", "todayKg": 3.2, "streak": 10,
            "rank": 1, "dailyGoalKg": 1.5, "daysActive": 30, "totalLogs": 100
        })
        data = client.get("/api/users/profile", headers=_auth()).json()
        assert data["name"] == "Full User"
        assert data["todayKg"] == 3.2
        assert data["totalLogs"] == 100

    def test_update_valid_name(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"name": "New"})
        resp = client.put("/api/users/profile", json={"name": "New"}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_city(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"city": "Bangalore"})
        resp = client.put("/api/users/profile", json={"city": "Bangalore"}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_college(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"college": "NITK"})
        resp = client.put("/api/users/profile", json={"college": "NITK"}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_age(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"age": 21})
        resp = client.put("/api/users/profile", json={"age": 21}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_bio(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"bio": "Eco lover"})
        resp = client.put("/api/users/profile", json={"bio": "Eco lover"}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_phone(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"phone": "9876543210"})
        resp = client.put("/api/users/profile", json={"phone": "9876543210"}, headers=_auth())
        assert resp.status_code == 200

    def test_update_valid_daily_goal(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"dailyGoalKg": 3.0})
        resp = client.put("/api/users/profile", json={"dailyGoalKg": 3.0}, headers=_auth())
        assert resp.status_code == 200

    def test_update_name_too_long(self):
        resp = client.put("/api/users/profile", json={"name": "A" * 101}, headers=_auth())
        assert resp.status_code == 422

    def test_update_name_empty(self):
        resp = client.put("/api/users/profile", json={"name": ""}, headers=_auth())
        assert resp.status_code == 422

    def test_update_city_too_long(self):
        resp = client.put("/api/users/profile", json={"city": "C" * 101}, headers=_auth())
        assert resp.status_code == 422

    def test_update_college_too_long(self):
        resp = client.put("/api/users/profile", json={"college": "X" * 201}, headers=_auth())
        assert resp.status_code == 422

    def test_update_bio_too_long(self):
        resp = client.put("/api/users/profile", json={"bio": "B" * 501}, headers=_auth())
        assert resp.status_code == 422

    def test_update_age_below_minimum(self):
        resp = client.put("/api/users/profile", json={"age": 9}, headers=_auth())
        assert resp.status_code == 422

    def test_update_age_above_maximum(self):
        resp = client.put("/api/users/profile", json={"age": 121}, headers=_auth())
        assert resp.status_code == 422

    def test_update_phone_invalid_chars(self):
        resp = client.put("/api/users/profile", json={"phone": "abc!@#"}, headers=_auth())
        assert resp.status_code == 422

    def test_update_phone_too_long(self):
        resp = client.put("/api/users/profile", json={"phone": "1" * 21}, headers=_auth())
        assert resp.status_code == 422

    def test_update_daily_goal_zero_rejected(self):
        resp = client.put("/api/users/profile", json={"dailyGoalKg": 0}, headers=_auth())
        assert resp.status_code == 422

    def test_update_daily_goal_negative_rejected(self):
        resp = client.put("/api/users/profile", json={"dailyGoalKg": -5}, headers=_auth())
        assert resp.status_code == 422

    def test_update_daily_goal_too_large(self):
        resp = client.put("/api/users/profile", json={"dailyGoalKg": 200}, headers=_auth())
        assert resp.status_code == 422

    def test_update_requires_auth(self):
        assert client.put("/api/users/profile", json={"name": "X"}).status_code == 422

    def test_update_empty_body_accepted(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {})
        resp = client.put("/api/users/profile", json={}, headers=_auth())
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 4. Leaderboard API
# ═══════════════════════════════════════════════════════════════════════════

class TestLeaderboardAPI:
    def test_get_requires_auth(self):
        assert client.get("/api/leaderboard").status_code == 422

    def _set_leaderboard_docs(self, docs):
        col = _fake_db.collection.return_value
        col.order_by.return_value.limit.return_value.stream.return_value = docs

    def test_get_sorted_ascending(self):
        self._set_leaderboard_docs([
            MagicMock(id="u2", to_dict=lambda: {"name": "B", "todayKg": 0.5}),
            MagicMock(id="u3", to_dict=lambda: {"name": "C", "todayKg": 1.0}),
            MagicMock(id="u1", to_dict=lambda: {"name": "A", "todayKg": 2.0}),
        ])
        data = client.get("/api/leaderboard", headers=_auth()).json()
        assert data[0]["todayKg"] <= data[1]["todayKg"] <= data[2]["todayKg"]

    def test_get_rank_assigned(self):
        self._set_leaderboard_docs([
            MagicMock(id="u1", to_dict=lambda: {"name": "A", "todayKg": 2.0}),
            MagicMock(id="u2", to_dict=lambda: {"name": "B", "todayKg": 0.5}),
        ])
        data = client.get("/api/leaderboard", headers=_auth()).json()
        assert data[0]["rank"] == 1
        assert data[1]["rank"] == 2

    def test_get_current_user_marked(self):
        self._set_leaderboard_docs([
            MagicMock(id="test-uid-123", to_dict=lambda: {"name": "Me", "todayKg": 1.0}),
            MagicMock(id="other-uid", to_dict=lambda: {"name": "Other", "todayKg": 0.5}),
        ])
        data = client.get("/api/leaderboard", headers=_auth()).json()
        me = next(u for u in data if u["isCurrentUser"])
        assert me["name"] == "Me"

    def test_get_empty_list(self):
        self._set_leaderboard_docs([])
        assert client.get("/api/leaderboard", headers=_auth()).json() == []

    def test_get_single_user(self):
        self._set_leaderboard_docs([
            MagicMock(id="u1", to_dict=lambda: {"name": "Solo", "todayKg": 0.0}),
        ])
        data = client.get("/api/leaderboard", headers=_auth()).json()
        assert len(data) == 1
        assert data[0]["rank"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# 5. Insights API
# ═══════════════════════════════════════════════════════════════════════════

_DETAILED_BODY = {
    "userId": "u1", "userName": "Test", "city": "City",
    "todayKg": 1.0, "weeklyAvg": 1.2, "cityAvg": 1.5,
    "topActivity": "Bus", "streak": 3,
}
_CHAT_BODY = {"userId": "u1", "message": "Hi", "history": [], "context": {}}


class TestInsightsAPI:
    def test_detailed_requires_auth(self):
        assert client.post("/api/insights/detailed", json=_DETAILED_BODY).status_code == 422

    def test_chat_requires_auth(self):
        assert client.post("/api/insights/chat", json=_CHAT_BODY).status_code == 422

    def test_detailed_invalid_language(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "language": "fr"}, headers=_auth())
        assert resp.status_code == 422

    def test_detailed_valid_language_en(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "language": "en"}, headers=_auth())
        assert resp.status_code != 422

    def test_detailed_valid_language_hi(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "language": "hi"}, headers=_auth())
        assert resp.status_code != 422

    def test_detailed_valid_language_kn(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "language": "kn"}, headers=_auth())
        assert resp.status_code != 422

    def test_detailed_user_name_too_long(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "userName": "X" * 101}, headers=_auth())
        assert resp.status_code == 422

    def test_detailed_city_too_long(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "city": "X" * 101}, headers=_auth())
        assert resp.status_code == 422

    def test_detailed_negative_todayKg(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "todayKg": -1}, headers=_auth())
        assert resp.status_code == 422

    def test_detailed_negative_streak(self):
        resp = client.post("/api/insights/detailed", json={**_DETAILED_BODY, "streak": -1}, headers=_auth())
        assert resp.status_code == 422

    def test_chat_empty_message_rejected(self):
        resp = client.post("/api/insights/chat", json={**_CHAT_BODY, "message": ""}, headers=_auth())
        assert resp.status_code == 422

    def test_chat_invalid_history_role(self):
        resp = client.post("/api/insights/chat", json={
            **_CHAT_BODY, "history": [{"role": "admin", "text": "x"}]
        }, headers=_auth())
        assert resp.status_code == 422

    def test_chat_valid_user_role(self):
        resp = client.post("/api/insights/chat", json={
            **_CHAT_BODY, "history": [{"role": "user", "text": "hello"}]
        }, headers=_auth())
        assert resp.status_code != 422

    def test_chat_valid_model_role(self):
        resp = client.post("/api/insights/chat", json={
            **_CHAT_BODY, "history": [{"role": "model", "text": "hi"}]
        }, headers=_auth())
        assert resp.status_code != 422

    def test_chat_invalid_language(self):
        resp = client.post("/api/insights/chat", json={**_CHAT_BODY, "language": "de"}, headers=_auth())
        assert resp.status_code == 422

    def test_chat_message_too_long(self):
        resp = client.post("/api/insights/chat", json={**_CHAT_BODY, "message": "X" * 2001}, headers=_auth())
        assert resp.status_code == 422

    def test_chat_history_text_too_long(self):
        resp = client.post("/api/insights/chat", json={
            **_CHAT_BODY, "history": [{"role": "user", "text": "X" * 2001}]
        }, headers=_auth())
        assert resp.status_code == 422

    def test_chat_user_id_required(self):
        body = {"message": "Hi", "history": [], "context": {}}
        resp = client.post("/api/insights/chat", json=body, headers=_auth())
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 6. Translate API
# ═══════════════════════════════════════════════════════════════════════════

class TestTranslateAPI:
    def test_requires_auth(self):
        assert client.post("/api/translate", json={"texts": ["Hi"], "target": "hi"}).status_code == 422

    def test_same_language_passthrough(self):
        resp = client.post("/api/translate", json={"texts": ["Hello"], "target": "en"}, headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["translations"] == ["Hello"]

    def test_multiple_texts_passthrough(self):
        resp = client.post("/api/translate", json={"texts": ["A", "B", "C"], "target": "en"}, headers=_auth())
        assert resp.json()["translations"] == ["A", "B", "C"]

    def test_invalid_target_language(self):
        resp = client.post("/api/translate", json={"texts": ["Hi"], "target": "fr"}, headers=_auth())
        assert resp.status_code == 422

    def test_missing_texts(self):
        resp = client.post("/api/translate", json={"target": "hi"}, headers=_auth())
        assert resp.status_code == 422

    def test_missing_target(self):
        resp = client.post("/api/translate", json={"texts": ["Hi"]}, headers=_auth())
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 7. Carbon calculation unit tests
# ═══════════════════════════════════════════════════════════════════════════

class TestCarbonCalculation:
    def test_car_petrol(self):
        from carbon import calculate_co2
        r = calculate_co2("car_petrol", 10)
        assert r == {"co2_kg": 1.74, "label": "Car (Petrol)", "unit": "km"}

    def test_car_diesel(self):
        from carbon import calculate_co2
        assert calculate_co2("car_diesel", 20)["co2_kg"] == 3.36

    def test_bike_activa(self):
        from carbon import calculate_co2
        assert calculate_co2("bike_activa", 15)["co2_kg"] == 0.645

    def test_e_scooter(self):
        from carbon import calculate_co2
        assert calculate_co2("e_scooter", 10)["co2_kg"] == 0.12

    def test_auto_rickshaw(self):
        from carbon import calculate_co2
        assert calculate_co2("auto_rickshaw", 8)["co2_kg"] == 0.768

    def test_bus(self):
        from carbon import calculate_co2
        assert calculate_co2("bus", 50)["co2_kg"] == 4.45

    def test_train(self):
        from carbon import calculate_co2
        assert calculate_co2("train", 100)["co2_kg"] == 4.1

    def test_flight_domestic(self):
        from carbon import calculate_co2
        assert calculate_co2("flight_domestic", 500)["co2_kg"] == 127.5

    def test_bike_ride_zero(self):
        from carbon import calculate_co2
        assert calculate_co2("bike_ride", 10)["co2_kg"] == 0.0

    def test_walk_zero(self):
        from carbon import calculate_co2
        assert calculate_co2("walk", 5)["co2_kg"] == 0.0

    def test_veg_meal(self):
        from carbon import calculate_co2
        assert calculate_co2("veg_meal", 3)["co2_kg"] == 3.3

    def test_nonveg_meal(self):
        from carbon import calculate_co2
        assert calculate_co2("nonveg_meal", 1)["co2_kg"] == 6.9

    def test_dairy_meal(self):
        from carbon import calculate_co2
        assert calculate_co2("dairy_meal", 2)["co2_kg"] == 6.4

    def test_egg_meal(self):
        from carbon import calculate_co2
        assert calculate_co2("egg_meal", 3)["co2_kg"] == 4.8

    def test_street_food(self):
        from carbon import calculate_co2
        assert calculate_co2("street_food", 4)["co2_kg"] == 3.2

    def test_swiggy_zomato(self):
        from carbon import calculate_co2
        assert calculate_co2("swiggy_zomato", 2)["co2_kg"] == 1.0

    def test_electricity(self):
        from carbon import calculate_co2
        assert calculate_co2("electricity_kwh", 100)["co2_kg"] == 82.0

    def test_lpg_cylinder(self):
        from carbon import calculate_co2
        assert calculate_co2("lpg_cylinder", 14)["co2_kg"] == 41.72

    def test_ac_hour(self):
        from carbon import calculate_co2
        assert calculate_co2("ac_hour", 5)["co2_kg"] == 5.0

    def test_geyser_hour(self):
        from carbon import calculate_co2
        assert calculate_co2("geyser_hour", 2)["co2_kg"] == 1.64

    def test_washing_machine(self):
        from carbon import calculate_co2
        assert calculate_co2("washing_machine", 3)["co2_kg"] == 1.8

    def test_online_order(self):
        from carbon import calculate_co2
        assert calculate_co2("online_order", 1)["co2_kg"] == 0.5

    def test_clothing_item(self):
        from carbon import calculate_co2
        assert calculate_co2("clothing_item", 2)["co2_kg"] == 20.0

    def test_electronics(self):
        from carbon import calculate_co2
        assert calculate_co2("electronics", 1)["co2_kg"] == 70.0

    def test_plastic_bag(self):
        from carbon import calculate_co2
        assert calculate_co2("plastic_bag", 10)["co2_kg"] == 0.14

    def test_unknown_key_returns_zero(self):
        from carbon import calculate_co2
        r = calculate_co2("nonexistent_key", 100)
        assert r["co2_kg"] == 0.0
        assert r["label"] == "nonexistent_key"

    def test_zero_quantity(self):
        from carbon import calculate_co2
        assert calculate_co2("car_petrol", 0)["co2_kg"] == 0.0

    def test_fractional_quantity(self):
        from carbon import calculate_co2
        assert calculate_co2("car_petrol", 0.5)["co2_kg"] == 0.087

    def test_all_factors_non_negative(self):
        from carbon import EMISSION_FACTORS
        for key, f in EMISSION_FACTORS.items():
            assert f["co2_per_unit"] >= 0, f"{key} has negative co2"

    def test_all_factors_have_unit(self):
        from carbon import EMISSION_FACTORS
        for key, f in EMISSION_FACTORS.items():
            assert isinstance(f["unit"], str) and len(f["unit"]) > 0

    def test_all_factors_have_label(self):
        from carbon import EMISSION_FACTORS
        for key, f in EMISSION_FACTORS.items():
            assert isinstance(f["label"], str) and len(f["label"]) > 0

    def test_transport_count(self):
        from carbon import EMISSION_FACTORS
        transport_keys = ["car_petrol", "car_diesel", "bike_activa", "e_scooter",
                          "auto_rickshaw", "bus", "train", "flight_domestic", "bike_ride", "walk"]
        for k in transport_keys:
            assert k in EMISSION_FACTORS

    def test_food_count(self):
        from carbon import EMISSION_FACTORS
        food_keys = ["veg_meal", "nonveg_meal", "dairy_meal", "egg_meal", "street_food", "swiggy_zomato"]
        for k in food_keys:
            assert k in EMISSION_FACTORS

    def test_energy_count(self):
        from carbon import EMISSION_FACTORS
        energy_keys = ["electricity_kwh", "lpg_cylinder", "ac_hour", "geyser_hour", "washing_machine"]
        for k in energy_keys:
            assert k in EMISSION_FACTORS

    def test_shopping_count(self):
        from carbon import EMISSION_FACTORS
        shop_keys = ["online_order", "clothing_item", "electronics", "plastic_bag"]
        for k in shop_keys:
            assert k in EMISSION_FACTORS


# ═══════════════════════════════════════════════════════════════════════════
# 8. WebSocket manager unit tests
# ═══════════════════════════════════════════════════════════════════════════

class TestConnectionManager:
    def test_initial_state_empty(self):
        from ws_manager import ConnectionManager
        assert ConnectionManager()._connections == {}

    def test_connect_adds_connection(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws = AsyncMock()
        asyncio.run(mgr.connect("u1", ws))
        assert ws in mgr._connections["u1"]

    def test_connect_multiple_users(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        asyncio.run(mgr.connect("u1", AsyncMock()))
        asyncio.run(mgr.connect("u2", AsyncMock()))
        assert "u1" in mgr._connections
        assert "u2" in mgr._connections

    def test_connect_multiple_sockets_per_user(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws1, ws2 = AsyncMock(), AsyncMock()
        asyncio.run(mgr.connect("u1", ws1))
        asyncio.run(mgr.connect("u1", ws2))
        assert len(mgr._connections["u1"]) == 2

    def test_disconnect_removes_connection(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws = MagicMock()
        mgr._connections["u1"] = [ws]
        mgr.disconnect("u1", ws)
        assert "u1" not in mgr._connections

    def test_disconnect_one_of_many(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws1, ws2 = MagicMock(), MagicMock()
        mgr._connections["u1"] = [ws1, ws2]
        mgr.disconnect("u1", ws1)
        assert "u1" in mgr._connections
        assert ws2 in mgr._connections["u1"]

    def test_disconnect_nonexistent_user(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        mgr.disconnect("nobody", MagicMock())

    def test_disconnect_nonexistent_socket(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        mgr._connections["u1"] = [MagicMock()]
        mgr.disconnect("u1", MagicMock())

    def test_broadcast_sends_to_all(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws1, ws2 = AsyncMock(), AsyncMock()
        mgr._connections["u1"] = [ws1, ws2]
        asyncio.run(mgr.broadcast("u1", {"type": "SYNC"}))
        ws1.send_text.assert_called_once()
        ws2.send_text.assert_called_once()

    def test_broadcast_no_connections_no_crash(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        asyncio.run(mgr.broadcast("nobody", {"type": "SYNC"}))

    def test_broadcast_removes_dead_connections(self):
        from ws_manager import ConnectionManager
        mgr = ConnectionManager()
        ws_ok = AsyncMock()
        ws_dead = AsyncMock()
        ws_dead.send_text = AsyncMock(side_effect=Exception("closed"))
        mgr._connections["u1"] = [ws_ok, ws_dead]
        asyncio.run(mgr.broadcast("u1", {"type": "PING"}))
        assert ws_dead not in mgr._connections.get("u1", [])


# ═══════════════════════════════════════════════════════════════════════════
# 9. CORS configuration
# ═══════════════════════════════════════════════════════════════════════════

class TestCORS:
    def test_preflight_returns_allow_origin(self):
        resp = client.options("/api/activities", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        })
        assert "access-control-allow-origin" in resp.headers

    def test_delete_not_allowed(self):
        resp = client.delete("/api/activities", headers=_auth())
        assert resp.status_code in (405, 404)

    def test_patch_not_allowed(self):
        resp = client.patch("/api/activities", headers=_auth())
        assert resp.status_code in (405, 404)


# ═══════════════════════════════════════════════════════════════════════════
# 10. Input sanitisation
# ═══════════════════════════════════════════════════════════════════════════

class TestInputSanitisation:
    def test_activity_key_rejects_script_tag(self):
        resp = client.post("/api/activities", json={"activityKey": "bus<script>", "quantity": 5}, headers=_auth())
        assert resp.status_code == 422

    def test_activity_key_rejects_space(self):
        resp = client.post("/api/activities", json={"activityKey": "car petrol", "quantity": 5}, headers=_auth())
        assert resp.status_code == 422

    def test_activity_key_rejects_uppercase(self):
        resp = client.post("/api/activities", json={"activityKey": "Bus", "quantity": 5}, headers=_auth())
        assert resp.status_code == 422

    def test_profile_name_empty_rejected(self):
        resp = client.put("/api/users/profile", json={"name": ""}, headers=_auth())
        assert resp.status_code == 422

    def test_profile_name_with_newline_accepted(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"name": "OK"})
        resp = client.put("/api/users/profile", json={"name": "Test\nUser"}, headers=_auth())
        assert resp.status_code == 200

    def test_profile_phone_rejects_letters(self):
        resp = client.put("/api/users/profile", json={"phone": "abcdef"}, headers=_auth())
        assert resp.status_code == 422

    def test_profile_phone_accepts_formatting(self):
        _fake_db.collection.return_value.document.return_value.get.return_value = _mock_user_doc(True, {"phone": "ok"})
        resp = client.put("/api/users/profile", json={"phone": "+91-98765-43210"}, headers=_auth())
        assert resp.status_code == 200

    def test_profile_age_rejects_string(self):
        resp = client.put("/api/users/profile", json={"age": "old"}, headers=_auth())
        assert resp.status_code == 422

    def test_insight_user_name_rejects_script(self):
        resp = client.post("/api/insights/detailed", json={
            **_DETAILED_BODY, "userName": "<script>alert(1)</script>"
        }, headers=_auth())
        assert resp.status_code in (200, 500)

    def test_translate_rejects_empty_texts(self):
        resp = client.post("/api/translate", json={"texts": [], "target": "hi"}, headers=_auth())
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 11. Auth edge cases
# ═══════════════════════════════════════════════════════════════════════════

class TestAuthEdgeCases:
    def test_missing_auth_header(self):
        assert client.get("/api/activities").status_code == 422

    def test_malformed_auth_header(self):
        resp = client.get("/api/activities", headers={"Authorization": "Basic abc"})
        assert resp.status_code == 200

    def test_empty_bearer_token(self):
        resp = client.get("/api/activities", headers={"Authorization": "Bearer "})
        assert resp.status_code == 200

    def test_wrong_auth_scheme(self):
        resp = client.get("/api/activities", headers={"Authorization": "Token xyz"})
        assert resp.status_code == 200
