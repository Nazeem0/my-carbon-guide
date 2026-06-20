import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { subscribeSync } from "@/lib/syncBus";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  name: string;
  email: string;
  city: string;
  college: string;
  age: number;
  gender: string;
  bio: string;
  phone: string;
  yearOfStudy: string;
  streak: number;
  rank: number;
  totalLogs: number;
  daysActive: number;
  dailyGoalKg: number;
  todayKg: number;
}

const defaultProfile: UserProfile = {
  name: "New User",
  email: "",
  city: "Mangaluru",
  college: "",
  age: 20,
  gender: "",
  bio: "",
  phone: "",
  yearOfStudy: "",
  streak: 1,
  rank: 999,
  totalLogs: 0,
  daysActive: 1,
  dailyGoalKg: 2.0,
  todayKg: 0,
};

const CACHE_KEY = "ecolog-profile-cache";

function loadCache(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveCache(p: UserProfile) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(loadCache);
  const [loading, setLoading] = useState<boolean>(!loadCache());

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    apiGet<UserProfile>(user, "/api/users/profile")
      .then((data) => {
        if (cancelled) return;
        const merged = { ...defaultProfile, ...data };
        setProfile(merged);
        saveCache(merged);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching user profile:", error);
        if (!cancelled) setLoading(false);
      });

    const unsub = subscribeSync((msg) => {
      if (msg.type === "SYNC" || msg.type === "PROFILE_UPDATE") {
        const merged = { ...defaultProfile, ...(msg.profile as Partial<UserProfile>) };
        setProfile(merged);
        saveCache(merged);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const updateGoal = async (newGoal: number) => {
    if (!user) return;
    await apiPut(user, "/api/users/profile", { dailyGoalKg: newGoal });
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    if (profile) {
      const updated = { ...profile, ...data };
      setProfile(updated);
      saveCache(updated);
    }
    await apiPut(user, "/api/users/profile", data);
  };

  return { profile, loading, updateGoal, updateProfile };
}
