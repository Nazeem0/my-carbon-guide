import { describe, it, expect } from "vitest";
import { EMISSION_FACTORS, activities } from "./emissionFactors";

describe("emissionFactors", () => {
  it("should have correct categories in EMISSION_FACTORS", () => {
    expect(EMISSION_FACTORS).toHaveProperty("transport");
    expect(EMISSION_FACTORS).toHaveProperty("food");
    expect(EMISSION_FACTORS).toHaveProperty("energy");
    expect(EMISSION_FACTORS).toHaveProperty("shopping");
  });

  it("should map activities correctly to array", () => {
    expect(activities.length).toBeGreaterThan(0);

    // Test a specific activity to ensure correct mapping and factor conversion
    const carPetrol = activities.find((a) => a.id === "car_petrol");
    expect(carPetrol).toBeDefined();
    expect(carPetrol?.category).toBe("Transport");
    expect(carPetrol?.emoji).toBe("🚗");
    expect(carPetrol?.factor).toBe(174); // 0.174 * 1000
    expect(carPetrol?.unit).toBe("km");
  });

  it("should have zero impact activities", () => {
    const walk = activities.find((a) => a.id === "walk");
    expect(walk?.factor).toBe(0);

    const bikeRide = activities.find((a) => a.id === "bike_ride");
    expect(bikeRide?.factor).toBe(0);
  });
});
