import { EMISSION_FACTORS } from "../data/emissionFactors";

export interface CalculateCO2Result {
  co2_kg: number;
  unit: string;
  label: string;
  equivalent: string;
}

export interface DailyTotalResult {
  total_kg: number;
  percentage_of_goal: number;
  status: "good" | "warning" | "danger";
}

export interface CityComparisonResult {
  percentile: number;
  message: string;
}

export interface WeeklyAverageResult {
  avg: number;
  best_day: number;
  worst_day: number;
  trend: "improving" | "worsening" | "stable";
}

export const CITY_AVERAGES: Record<string, number> = {
  Mangaluru: 1.9,
  Bengaluru: 2.4,
  Mumbai: 2.1,
  Chennai: 2.0,
  national: 1.9,
};

const DEMONYMS: Record<string, string> = {
  Mangaluru: "Mangaloreans",
  Bengaluru: "Bengalurians",
  Mumbai: "Mumbaikars",
  Chennai: "Chennaiites",
};

export function getCarbonEquivalent(kg: number): string {
  const value = Math.round(kg);
  if (kg < 0.1) {
    const phones = Math.round(kg / 0.006);
    return `= charging ${phones} phone${phones === 1 ? "" : "s"} 📱`;
  } else if (kg < 1.0) {
    const bags = Math.round(kg / 0.014);
    return `= ${bags} plastic bag${bags === 1 ? "" : "s"} 🛍️`;
  } else if (kg < 5.0) {
    const km = Math.round(kg / 0.174);
    return `= ${km} km in a car 🚗`;
  } else {
    // 1 tree absorbs ~20kg CO2 per year. Let's use 20kg as standard.
    // Wait, the prompt says "X trees needed to absorb this". Let's use 20kg.
    // If kg = 20, trees = 1.
    const trees = Math.round(kg / 20) || 1; // At least 1 tree if >= 5kg
    return `= ${trees} tree${trees === 1 ? "" : "s"} needed to absorb this 🌳`;
  }
}

export function useCarbon() {
  const calculateCO2 = (activityKey: string, quantity: number): CalculateCO2Result => {
    let foundFactor: { factor: number; unit: string; label: string } | null = null;

    for (const category of Object.values(EMISSION_FACTORS)) {
      if (activityKey in category) {
        foundFactor = category[activityKey as keyof typeof category];
        break;
      }
    }

    if (!foundFactor) {
      return {
        co2_kg: 0,
        unit: "",
        label: activityKey,
        equivalent: getCarbonEquivalent(0),
      };
    }

    const co2_kg = parseFloat((foundFactor.factor * quantity).toFixed(3));
    return {
      co2_kg,
      unit: foundFactor.unit,
      label: foundFactor.label,
      equivalent: getCarbonEquivalent(co2_kg),
    };
  };

  const getDailyTotal = (
    activitiesArray: { activityKey: string; quantity: number }[],
    goal = 2.0,
  ): DailyTotalResult => {
    let total_kg = 0;
    for (const item of activitiesArray) {
      const res = calculateCO2(item.activityKey, item.quantity);
      total_kg += res.co2_kg;
    }
    total_kg = parseFloat(total_kg.toFixed(3));
    const percentage_of_goal = Math.round((total_kg / goal) * 100);

    let status: "good" | "warning" | "danger" = "good";
    if (percentage_of_goal > 85) {
      status = "danger";
    } else if (percentage_of_goal >= 60) {
      status = "warning";
    }

    return {
      total_kg,
      percentage_of_goal,
      status,
    };
  };

  const getCityComparison = (user_kg_daily_avg: number, city: string): CityComparisonResult => {
    const cityAvg = CITY_AVERAGES[city] || CITY_AVERAGES.national;
    const demonym = DEMONYMS[city] || "residents";

    // Percentile: higher is better (greener).
    // If user_kg_daily_avg is 0, they beat 100% (greener than 99%).
    // If they equal city average, they beat 50%.
    const diffPct = ((cityAvg - user_kg_daily_avg) / cityAvg) * 100;
    let percentile = Math.round(50 + diffPct);
    percentile = Math.max(1, Math.min(99, percentile));

    return {
      percentile,
      message: `You are greener than ${percentile}% of ${demonym} 🌿`,
    };
  };

  const getWeeklyAverage = (weeklyDataArray: number[]): WeeklyAverageResult => {
    if (weeklyDataArray.length === 0) {
      return { avg: 0, best_day: 0, worst_day: 0, trend: "stable" };
    }
    const sum = weeklyDataArray.reduce((a, b) => a + b, 0);
    const avg = parseFloat((sum / weeklyDataArray.length).toFixed(2));
    const best_day = Math.min(...weeklyDataArray);
    const worst_day = Math.max(...weeklyDataArray);

    // Trend analysis: compare second half of the week to the first half
    // If we have 7 days, first half is days 0-2 (3 days), second half is days 4-6 (3 days)
    let trend: "improving" | "worsening" | "stable" = "stable";
    if (weeklyDataArray.length >= 4) {
      const mid = Math.floor(weeklyDataArray.length / 2);
      const firstHalf = weeklyDataArray.slice(0, mid);
      const secondHalf = weeklyDataArray.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const diff = secondAvg - firstAvg;
      // If emissions are lower in the second half, they are improving
      if (diff < -0.05) {
        trend = "improving";
      } else if (diff > 0.05) {
        trend = "worsening";
      }
    }

    return {
      avg,
      best_day,
      worst_day,
      trend,
    };
  };

  return {
    calculateCO2,
    getCarbonEquivalent,
    getDailyTotal,
    getCityComparison,
    getWeeklyAverage,
  };
}
