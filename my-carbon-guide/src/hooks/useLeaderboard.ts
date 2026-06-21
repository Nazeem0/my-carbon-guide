import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { subscribeSync } from "@/lib/syncBus";
import { useAuth } from "@/contexts/AuthContext";

export interface LeaderEntry {
  uid: string;
  name: string;
  city: string;
  college?: string;
  todayKg: number;
  streak: number;
  rank: number;
}

export function useLeaderboard(top = 30) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!user) {
      setLeaders([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<LeaderEntry[]>(user, "/api/leaderboard");
      setLeaders(data.slice(0, top));
      setLoading(false);
    } catch (err) {
      console.error("Leaderboard error:", err);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    }
  }, [user, top]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!user) return;
    return subscribeSync((msg) => {
      if (msg.type === "SYNC") fetchLeaderboard();
    });
  }, [user, fetchLeaderboard]);

  const myEntry = user ? leaders.find((l) => l.uid === user.uid) : null;

  return { leaders, myEntry, loading, error };
}
