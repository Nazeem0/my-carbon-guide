import { useState, useCallback, useEffect } from "react";
import { useCarbon } from "./useCarbon";
import { showToast } from "@/components/ecolog/Toast";
import { apiGet, apiPost } from "@/lib/api";
import { subscribeSync } from "@/lib/syncBus";
import { useAuth } from "@/contexts/AuthContext";

export interface LoggedActivity {
  id: string;
  activityKey: string;
  quantity: number;
  co2_kg: number;
  timestamp: string;
}

export function useActivities(dailyGoal = 2.0) {
  const { calculateCO2 } = useCarbon();
  const { user } = useAuth();

  const [activities, setActivities] = useState<LoggedActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    apiGet<LoggedActivity[]>(user, "/api/activities")
      .then((data) => {
        if (cancelled) return;
        setActivities(data);
        setLoaded(true);
      })
      .catch((error) => {
        console.error("Error fetching activities:", error);
        if (!cancelled) setLoaded(true);
      });

    const unsub = subscribeSync((msg) => {
      if (msg.type === "SYNC" && Array.isArray(msg.activities)) {
        // Replace all local state with the canonical server data (removes optimistic entries)
        setActivities(msg.activities as LoggedActivity[]);
        setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const addActivity = useCallback(
    async (activityKey: string, quantity: number) => {
      if (!user) {
        showToast("Please log in to add activities.");
        return;
      }

      const calc = calculateCO2(activityKey, quantity);

      // Optimistically add to local state immediately so the gauge updates right away
      const optimisticActivity: LoggedActivity = {
        id: `optimistic-${Date.now()}`,
        activityKey,
        quantity,
        co2_kg: calc.co2_kg,
        timestamp: new Date().toISOString(),
      };
      setActivities((prev) => [optimisticActivity, ...prev]);

      try {
        await apiPost<{ co2_kg: number; label: string }>(user, "/api/activities", {
          activityKey,
          quantity,
        });

        const formatted =
          calc.co2_kg >= 1.0
            ? `${calc.co2_kg.toFixed(2)}kg`
            : `${Math.round(calc.co2_kg * 1000)}g`;

        showToast(`✅ Logged! +${formatted} CO₂ added 🌱`);
      } catch (error) {
        // Rollback optimistic update on failure
        setActivities((prev) => prev.filter((a) => a.id !== optimisticActivity.id));
        console.error("Error adding activity:", error);
        showToast("❌ Failed to log activity");
      }
    },
    [calculateCO2, user],
  );

  const getDailyTotal = useCallback(() => {
    const today = new Date().toDateString();
    const todayActivities = activities.filter(
      (act) => new Date(act.timestamp).toDateString() === today,
    );
    const sum = todayActivities.reduce((acc, act) => acc + act.co2_kg, 0);
    return parseFloat(sum.toFixed(3));
  }, [activities]);

  const getTodayPercentage = useCallback(() => {
    const total = getDailyTotal();
    return Math.round((total / dailyGoal) * 100);
  }, [getDailyTotal, dailyGoal]);

  const getTopActivity = useCallback(() => {
    if (activities.length === 0) return null;
    const today = new Date().toDateString();
    const todayActivities = activities.filter(
      (act) => new Date(act.timestamp).toDateString() === today,
    );
    if (todayActivities.length === 0) return null;
    return todayActivities.reduce(
      (max, act) => (act.co2_kg > max.co2_kg ? act : max),
      todayActivities[0],
    );
  }, [activities]);

  return { activities, loaded, addActivity, getDailyTotal, getTodayPercentage, getTopActivity };
}
