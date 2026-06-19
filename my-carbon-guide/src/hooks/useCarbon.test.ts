import { describe, test, expect } from "vitest";
import { useCarbon, getCarbonEquivalent } from "./useCarbon";

describe("useCarbon Calculations & Logic", () => {
  const { calculateCO2, getDailyTotal, getCityComparison } = useCarbon();

  test("calculateCO2('car_petrol', 10) === 1.74", () => {
    const res = calculateCO2("car_petrol", 10);
    expect(res.co2_kg).toBe(1.74);
    expect(res.unit).toBe("km");
  });

  test("calculateCO2('bike_ride', 5) === 0", () => {
    const res = calculateCO2("bike_ride", 5);
    expect(res.co2_kg).toBe(0);
  });

  test("calculateCO2('nonveg_meal', 1) === 6.9", () => {
    const res = calculateCO2("nonveg_meal", 1);
    expect(res.co2_kg).toBe(6.9);
  });

  test("calculateCO2('lpg_cylinder', 14.2) ≈ 42.3", () => {
    const res = calculateCO2("lpg_cylinder", 14.2);
    expect(res.co2_kg).toBeCloseTo(42.316, 2); // 2.98 * 14.2 = 42.316
  });

  test("getCarbonEquivalent(0.87) returns string with 'plastic bags'", () => {
    const res = getCarbonEquivalent(0.87);
    expect(res).toContain("plastic bags"); // 0.87 / 0.014 = ~62 bags
  });

  test("getDailyTotal returns correct status at different levels", () => {
    // Under 60% of 2.0 goal (1.2kg) -> good
    const goodTotal = getDailyTotal([
      { activityKey: "veg_meal", quantity: 1 } // 1.1kg -> 55%
    ]);
    expect(goodTotal.status).toBe("good");

    // 60-85% of 2.0 goal (1.2kg - 1.7kg) -> warning
    const warningTotal = getDailyTotal([
      { activityKey: "veg_meal", quantity: 1 },
      { activityKey: "car_petrol", quantity: 2 } // 1.1 + 0.348 = 1.448kg -> 72.4%
    ]);
    expect(warningTotal.status).toBe("warning");

    // Over 85% of 2.0 goal (1.7kg+) -> danger
    const dangerTotal = getDailyTotal([
      { activityKey: "nonveg_meal", quantity: 1 } // 6.9kg -> 345%
    ]);
    expect(dangerTotal.status).toBe("danger");
  });

  test("getCityComparison returns correct percentile", () => {
    const res = getCityComparison(1.24, "Mangaluru");
    // city avg = 1.9. 1.24 is cleaner, so percentile should be > 50
    expect(res.percentile).toBeGreaterThan(50);
    expect(res.message).toContain("Mangaloreans");
  });
});
