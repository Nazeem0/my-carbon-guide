export const EMISSION_FACTORS = {
  transport: {
    car_petrol:      { factor: 0.174, unit: "km",    label: "Car (Petrol)" },
    car_diesel:      { factor: 0.168, unit: "km",    label: "Car (Diesel)" },
    bike_activa:     { factor: 0.043, unit: "km",    label: "Activa/Bike" },
    e_scooter:       { factor: 0.012, unit: "km",    label: "E-Scooter" },
    auto_rickshaw:   { factor: 0.096, unit: "km",    label: "Auto Rickshaw" },
    bus:             { factor: 0.089, unit: "km",    label: "Bus" },
    train:           { factor: 0.041, unit: "km",    label: "Train" },
    flight_domestic: { factor: 0.255, unit: "km",    label: "Flight" },
    bike_ride:       { factor: 0.0,   unit: "km",    label: "Bike Ride" },
    walk:            { factor: 0.0,   unit: "km",    label: "Walk" }
  },
  food: {
    veg_meal:        { factor: 1.1,   unit: "meal",  label: "Veg Meal" },
    nonveg_meal:     { factor: 6.9,   unit: "meal",  label: "Non-veg Meal" },
    dairy_meal:      { factor: 3.2,   unit: "meal",  label: "Dairy Meal" },
    egg_meal:        { factor: 1.6,   unit: "meal",  label: "Egg Meal" },
    street_food:     { factor: 0.8,   unit: "meal",  label: "Street Food" },
    swiggy_zomato:   { factor: 0.5,   unit: "order", label: "Swiggy/Zomato" }
  },
  energy: {
    electricity_kwh: { factor: 0.82,  unit: "kWh",   label: "Electricity" },
    lpg_cylinder:    { factor: 2.98,  unit: "kg",    label: "LPG Cylinder" },
    ac_hour:         { factor: 1.0,   unit: "hour",  label: "AC Usage" },
    geyser_hour:     { factor: 0.82,  unit: "hour",  label: "Geyser" },
    washing_machine: { factor: 0.6,   unit: "cycle", label: "Washing Machine" }
  },
  shopping: {
    online_order:    { factor: 0.5,   unit: "order", label: "Online Order" },
    clothing_item:   { factor: 10.0,  unit: "item",  label: "Clothing Item" },
    electronics:     { factor: 70.0,  unit: "item",  label: "Electronics" },
    plastic_bag:     { factor: 0.014, unit: "bag",   label: "Plastic Bag" }
  }
} as const;

export type Category = "Transport" | "Food" | "Energy" | "Shopping";

export interface Activity {
  id: string;
  name: string;
  category: Category;
  emoji: string;
  factor: number; // in grams for backwards compatibility with LogPage
  unit: string;
}

const EMOJIS: Record<string, string> = {
  car_petrol: "🚗",
  car_diesel: "🚗",
  bike_activa: "🏍️",
  e_scooter: "🛵",
  auto_rickshaw: "🛺",
  bus: "🚌",
  train: "🚄",
  flight_domestic: "✈️",
  bike_ride: "🚲",
  walk: "🚶",
  veg_meal: "🥗",
  nonveg_meal: "🍗",
  dairy_meal: "🥛",
  egg_meal: "🍳",
  street_food: "🌮",
  swiggy_zomato: "🛍️",
  electricity_kwh: "⚡",
  lpg_cylinder: "🔥",
  ac_hour: "❄️",
  geyser_hour: "🚿",
  washing_machine: "🧺",
  online_order: "📦",
  clothing_item: "👕",
  electronics: "📱",
  plastic_bag: "🛍️",
};

export const activities: Activity[] = Object.entries(EMISSION_FACTORS).flatMap(([catKey, catItems]) => {
  const category = (catKey.charAt(0).toUpperCase() + catKey.slice(1)) as Category;
  return Object.entries(catItems).map(([itemKey, details]) => ({
    id: itemKey,
    name: details.label,
    category,
    emoji: EMOJIS[itemKey] || "🌱",
    factor: details.factor * 1000, // convert kg to grams
    unit: details.unit,
  }));
});