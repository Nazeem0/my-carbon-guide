import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { subscribeSync } from "@/lib/syncBus";
import { useAuth } from "./AuthContext";

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

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateGoal: (goal: number) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  error: null,
  updateGoal: async () => {},
  updateProfile: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(loadCache);
  const [loading, setLoading] = useState(!loadCache());
  const [error, setError] = useState<string | null>(null);
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      setFetchedUserId(null);
      return;
    }

    if (fetchedUserId === user.uid) return;

    let cancelled = false;

    apiGet<UserProfile>(user, "/api/users/profile")
      .then((data) => {
        if (cancelled) return;
        const merged = { ...defaultProfile, ...data };
        setProfile(merged);
        saveCache(merged);
        setLoading(false);
        setFetchedUserId(user.uid);
      })
      .catch((err) => {
        console.error("Error fetching user profile:", err);
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Failed to fetch profile");
        }
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

  const updateGoal = useCallback(async (newGoal: number) => {
    if (!user) return;
    await apiPut(user, "/api/users/profile", { dailyGoalKg: newGoal });
  }, [user]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    if (profile) {
      const updated = { ...profile, ...data };
      setProfile(updated);
      saveCache(updated);
    }
    await apiPut(user, "/api/users/profile", data);
  }, [user, profile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error, updateGoal, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(ProfileContext);
}
