"""
Carbon emission calculation — mirrors my-carbon-guide/src/data/emissionFactors.ts
and useCarbon.ts so the backend and frontend always agree on CO₂ values.
"""

# kg CO₂ per unit — flat lookup keyed by activity id (matches frontend activityKey)
EMISSION_FACTORS: dict[str, dict] = {
    # Transport
    "car_petrol":      {"co2_per_unit": 0.174, "unit": "km",    "label": "Car (Petrol)"},
    "car_diesel":      {"co2_per_unit": 0.168, "unit": "km",    "label": "Car (Diesel)"},
    "bike_activa":     {"co2_per_unit": 0.043, "unit": "km",    "label": "Activa/Bike"},
    "e_scooter":       {"co2_per_unit": 0.012, "unit": "km",    "label": "E-Scooter"},
    "auto_rickshaw":   {"co2_per_unit": 0.096, "unit": "km",    "label": "Auto Rickshaw"},
    "bus":             {"co2_per_unit": 0.089, "unit": "km",    "label": "Bus"},
    "train":           {"co2_per_unit": 0.041, "unit": "km",    "label": "Train"},
    "flight_domestic": {"co2_per_unit": 0.255, "unit": "km",    "label": "Flight"},
    "bike_ride":       {"co2_per_unit": 0.000, "unit": "km",    "label": "Bike Ride"},
    "walk":            {"co2_per_unit": 0.000, "unit": "km",    "label": "Walk"},

    # Food
    "veg_meal":        {"co2_per_unit": 1.100, "unit": "meal",  "label": "Veg Meal"},
    "nonveg_meal":     {"co2_per_unit": 6.900, "unit": "meal",  "label": "Non-veg Meal"},
    "dairy_meal":      {"co2_per_unit": 3.200, "unit": "meal",  "label": "Dairy Meal"},
    "egg_meal":        {"co2_per_unit": 1.600, "unit": "meal",  "label": "Egg Meal"},
    "street_food":     {"co2_per_unit": 0.800, "unit": "meal",  "label": "Street Food"},
    "swiggy_zomato":   {"co2_per_unit": 0.500, "unit": "order", "label": "Swiggy/Zomato"},

    # Energy
    "electricity_kwh": {"co2_per_unit": 0.820, "unit": "kWh",   "label": "Electricity"},
    "lpg_cylinder":    {"co2_per_unit": 2.980, "unit": "kg",    "label": "LPG Cylinder"},
    "ac_hour":         {"co2_per_unit": 1.000, "unit": "hour",  "label": "AC Usage"},
    "geyser_hour":     {"co2_per_unit": 0.820, "unit": "hour",  "label": "Geyser"},
    "washing_machine": {"co2_per_unit": 0.600, "unit": "cycle", "label": "Washing Machine"},

    # Shopping
    "online_order":    {"co2_per_unit": 0.500, "unit": "order", "label": "Online Order"},
    "clothing_item":   {"co2_per_unit": 10.00, "unit": "item",  "label": "Clothing Item"},
    "electronics":     {"co2_per_unit": 70.00, "unit": "item",  "label": "Electronics"},
    "plastic_bag":     {"co2_per_unit": 0.014, "unit": "bag",   "label": "Plastic Bag"},
}


def calculate_co2(activity_key: str, quantity: float) -> dict:
    """Return co2_kg, label, and unit for a given activity + quantity."""
    factor = EMISSION_FACTORS.get(activity_key)
    if not factor:
        return {"co2_kg": 0.0, "label": activity_key, "unit": ""}
    return {
        "co2_kg": round(factor["co2_per_unit"] * quantity, 3),
        "label": factor["label"],
        "unit": factor["unit"],
    }
