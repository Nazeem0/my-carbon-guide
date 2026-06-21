import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useActivities } from "@/hooks/useActivities";
import { useCarbon, CITY_AVERAGES } from "@/hooks/useCarbon";
import { ActivityBottomSheet } from "@/components/ecolog/ActivityBottomSheet";
import { ToastHost } from "@/components/ecolog/Toast";
import { AppShell } from "@/components/ecolog/AppShell";
import { GlowCard } from "@/components/ecolog/GlowCard";
import CountUp from "@/components/CountUp";
import { Trophy, Sparkles, RefreshCw, TrendingDown } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { calculateCO2 } = useCarbon();

  const dailyGoal = profile?.dailyGoalKg || 2.0;
  const { activities, loaded, addActivity, getDailyTotal, getTopActivity } =
    useActivities(dailyGoal, 30);

  const { t, language } = useLanguage();
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "transport" | "food" | "energy" | "shopping"
  >("transport");

  // Use cached profile data until activities are fully loaded from Firestore,
  // then seamlessly switch to the live calculated total from the activities array.
  const todayKg = loaded ? getDailyTotal() : (profile?.todayKg ?? 0);
  const percentage = Math.round((todayKg / dailyGoal) * 100);
  const topAct = getTopActivity();

  const topActivityDetails = useMemo(() => {
    if (!topAct) return { label: "No logs today", co2: 0, info: "Start logging!" };
    const calc = calculateCO2(topAct.activityKey, topAct.quantity);
    return {
      label: calc.label,
      co2: calc.co2_kg,
      info: `${(calc.co2_kg / topAct.quantity).toFixed(3)}kg per ${calc.unit}`,
    };
  }, [topAct, calculateCO2]);

  const goalPct = Math.min((todayKg / dailyGoal) * 100, 100);
  const rawPct = (todayKg / dailyGoal) * 100;
  const gaugeColor =
    goalPct < 60 ? "rgb(16,185,129)" : goalPct < 85 ? "rgb(245,158,11)" : "rgb(239,68,68)";

  const circumference = 2 * Math.PI * 52;
  const gapDeg = 30;
  const arcSweep = 360 - gapDeg;
  const arcLen = circumference * (arcSweep / 360);
  const gapLen = circumference - arcLen;
  const fromAngle = gapDeg / 2;

  const markerR = 52;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcX = (deg: number) => 60 + markerR * Math.cos(toRad(deg));
  const arcY = (deg: number) => 60 + markerR * Math.sin(toRad(deg));

  const fetchedRef = useRef(false);
const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const [markerAngle, setMarkerAngle] = useState(fromAngle);
  const markerRaf = useRef(0);
  const markerAngleRef = useRef(fromAngle);
  const markerStartAngle = useRef(fromAngle);
  const markerStartTs = useRef(0);

  const animateMarker = useCallback((targetAngle: number) => {
    markerStartAngle.current = markerAngleRef.current;
    markerStartTs.current = performance.now();
    const duration = 1000;
    const step = (now: number) => {
      const elapsed = now - markerStartTs.current;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = markerStartAngle.current + (targetAngle - markerStartAngle.current) * ease;
      markerAngleRef.current = angle;
      setMarkerAngle(angle);
      if (t < 1) markerRaf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(markerRaf.current);
    markerRaf.current = requestAnimationFrame(step);
  }, []);

  const targetEndAngle = fromAngle + arcSweep * (Math.min(rawPct, 100) / 100);

  useEffect(() => {
    if (!mounted || rawPct <= 0) return;
    animateMarker(targetEndAngle);
    return () => cancelAnimationFrame(markerRaf.current);
  }, [mounted, targetEndAngle]);

  const startMarkerX = arcX(fromAngle);
  const startMarkerY = arcY(fromAngle);
  const endMarkerX = arcX(markerAngle);
  const endMarkerY = arcY(markerAngle);
  const markerColor = useMemo(() => {
    const pct = Math.min(Math.max(rawPct, 0), 100);
    if (pct <= 50) return "#10b981";
    if (pct <= 80) return "#eab308";
    if (pct < 100) return "#f97316";
    return "#ef4444";
  }, [rawPct]);

  const gaugeGradient = useMemo(() => {
    const g = "#10b981",
      y = "#eab308",
      o = "#f97316",
      r = "#ef4444";
    const pct = Math.min(Math.max(rawPct, 0), 100);
    const arcProgress = (pct / 100) * arcSweep;
    const g50 = 0.5 * arcSweep;
    const g80 = 0.8 * arcSweep;
    if (pct <= 0) return "transparent";
    const s = [`${g} 0deg`];
    if (arcProgress <= g50) {
      s.push(`${g} ${arcProgress}deg`, `transparent ${arcProgress}deg`);
    } else if (arcProgress <= g80) {
      s.push(`${g} ${g50}deg`, `${y} ${arcProgress}deg`, `transparent ${arcProgress}deg`);
    } else if (pct < 100) {
      s.push(
        `${g} ${g50}deg`,
        `${y} ${g80}deg`,
        `${o} ${arcProgress}deg`,
        `transparent ${arcProgress}deg`,
      );
    } else {
      s.push(
        `${g} ${g50}deg`,
        `${y} ${g80}deg`,
        `${o} ${arcSweep * 0.95}deg`,
        `${r} ${arcSweep}deg`,
      );
    }
    return `conic-gradient(from ${fromAngle}deg, ${s.join(", ")})`;
  }, [rawPct, arcSweep, fromAngle]);

  const fetchInsight = async () => {
    if (!profile || !user) return;
    setLoadingInsight(true);
    try {
      const topLabel = topAct
        ? calculateCO2(topAct.activityKey, topAct.quantity).label
        : "No emissions";

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekLogs = activities.filter((a) => new Date(a.timestamp) >= oneWeekAgo);
      const weekTotal = weekLogs.reduce((sum, a) => sum + a.co2_kg, 0);
      const weeklyAvg = parseFloat((weekTotal / 7).toFixed(2));

      const data = await apiPost<{ text: string }>(user, "/api/insights/daily", {
        userId: user.uid,
        userName: profile.name,
        city: profile.city,
        todayKg,
        weeklyAvg: weeklyAvg > 0 ? weeklyAvg : 1.34,
        cityAvg: CITY_AVERAGES[profile.city] ?? CITY_AVERAGES.national,
        topActivity: topLabel,
        streak: profile.streak,
        language,
      });
      setInsight(data.text);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setInsight("Daily AI insight limit reached — check back tomorrow!");
      } else {
        setInsight("AI insight unavailable");
      }
    } finally {
      setLoadingInsight(false);
    }
  };

  // Reset fetch guard when language changes so translated insight is fetched
  useEffect(() => {
    fetchedRef.current = false;
  }, [language]);

  useEffect(() => {
    if (profile && user && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchInsight();
    }
  }, [profile?.streak, language, user]);

  const handleQuickLogClick = (cat: "transport" | "food" | "energy" | "shopping") => {
    setSelectedCategory(cat);
    setSheetOpen(true);
  };

  if (profileLoading || !profile) {
    return (
      <AppShell hideStreak>
        <ToastHost />
        {/* Pills skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        {/* Ring skeleton */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <Skeleton className="h-36 w-36 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        {/* Cards skeleton */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        {/* Quick log skeleton */}
        <div className="mt-6">
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = (profile.name || "User")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell hideStreak>
      <ToastHost />

      {/* ── Stat Pills ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <GlowCard
          className="shrink-0 flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider"
          particleCount={5}
          enableStars={true}
        >
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider relative z-10">
            🔥 {profile.streak} {t("dashboard.days")}
          </span>
        </GlowCard>
        <GlowCard
          className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-bold text-primary uppercase tracking-wider"
          particleCount={5}
          enableStars={true}
        >
          <Trophy size={11} className="relative z-10" />{" "}
          <span className="relative z-10">Rank #{profile.rank}</span>
        </GlowCard>
      </div>

      {/* ── Today's Progress Ring (CSS) ── */}
      <div className="mt-5 flex flex-col items-center">
        <div
          className="relative grid h-48 w-48 place-items-center gauge-glow"
          style={{ "--glow-color": gaugeColor } as React.CSSProperties}
        >
          {rawPct >= 100 && (
            <div
              className="absolute inset-[-10px] rounded-full gauge-pulse"
              style={{ boxShadow: `0 0 24px ${gaugeColor}60, 0 0 48px ${gaugeColor}30` }}
            />
          )}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="10"
              strokeDasharray={`${arcLen} ${gapLen}`}
              strokeLinecap="butt"
              transform={`rotate(${fromAngle} 60 60)`}
            />
            <circle
              cx={startMarkerX}
              cy={startMarkerY}
              r="4"
              fill="#10b981"
              stroke="#0a7a56"
              strokeWidth="1"
            />
            {rawPct > 0 && (
              <>
                <circle
                  cx={endMarkerX}
                  cy={endMarkerY}
                  r="12"
                  fill={markerColor}
                  opacity="0.3"
                  style={{ filter: "blur(4px)" }}
                />
                <circle cx={endMarkerX} cy={endMarkerY} r="8" fill={markerColor} />
              </>
            )}
          </svg>
          <div
            className="gauge-gradient-ring absolute inset-0 rounded-full"
            style={
              {
                background: gaugeGradient,
                "--gauge-mask-pct":
                  Math.min(Math.max((markerAngle - fromAngle) / arcSweep, 0), 1) *
                  (arcSweep / 360) *
                  100,
                "--gauge-from": fromAngle,
              } as React.CSSProperties
            }
          />
          <div className="text-center z-10">
            <div className="text-3xl font-black text-foreground">
              <CountUp key={todayKg} to={todayKg} duration={0.8} className="tabular-nums" />{" "}
              <span className="text-lg font-bold">kg</span>
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("dashboard.kgCO2")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t("dashboard.ofGoal").replace("{goal}", dailyGoal.toString())}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingDown size={12} className="text-primary" />
          <span>
            {goalPct.toFixed(0)}
            {t("dashboard.goalUsed")}
          </span>
        </div>
      </div>

      {/* ── Info Cards Row ── */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Top Emission */}
        <GlowCard
          className="rounded-2xl border-l-4 border-red-500 border-t border-r border-b border-white/10 bg-[rgba(20,40,32,0.6)] p-3 shadow-lg shadow-black/5 backdrop-blur-xl"
          enableStars={false}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            {t("dashboard.topEmission")}
          </span>
          <span className="text-[13px] font-extrabold text-foreground mt-1 block truncate">
            {topActivityDetails.label}
          </span>
          <span className="text-base font-black text-red-500 mt-1 block">
            {topActivityDetails.co2.toFixed(2)} {t("dashboard.kgCO2")}
          </span>
          <span className="text-[9px] text-muted-foreground">{topActivityDetails.info}</span>
        </GlowCard>

        {/* AI Insight */}
        <GlowCard
          className="rounded-2xl border border-white/10 bg-[rgba(20,40,32,0.6)] p-3 shadow-lg shadow-black/5 backdrop-blur-xl cursor-pointer hover:border-white/20 transition-colors"
          enableStars={false}
          onClick={() => {
            const weeklyTotal = activities
              .filter(
                (a) => new Date(a.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              )
              .reduce((s, a) => s + a.co2_kg, 0);
            const wAvg = parseFloat((weeklyTotal / 7).toFixed(2));
            navigate("/detailed-insight", {
              state: {
                userName: profile?.name || "User",
                city: profile?.city || "City",
                todayKg,
                weeklyAvg: wAvg > 0 ? wAvg : 1.34,
                cityAvg: CITY_AVERAGES[profile.city] ?? CITY_AVERAGES.national,
                topActivity: topAct
                  ? calculateCO2(topAct.activityKey, topAct.quantity).label
                  : "No emissions",
                streak: profile?.streak || 0,
              },
            });
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Sparkles size={11} className="animate-pulse" /> {t("dashboard.aiInsight")}
            </div>
            {!loadingInsight && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchInsight();
                }}
                className="rounded-full p-0.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw size={11} />
              </button>
            )}
          </div>
          {loadingInsight ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-2.5 bg-muted rounded w-full" />
              <div className="h-2.5 bg-muted rounded w-10/12" />
              <div className="h-2.5 bg-muted rounded w-4/5" />
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-foreground line-clamp-4">{insight}</p>
          )}
          <div className="mt-1.5 text-[9px] text-muted-foreground text-right">
            {t("dashboard.poweredBy")} ✨
          </div>
        </GlowCard>
      </div>

      {/* ── Quick Log ── */}
      <div className="mt-6">
        <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {t("dashboard.quickLog")}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              cat: "transport" as const,
              emoji: "🚗",
              label: t("category.transport"),
              color: "hover:border-primary/50 hover:bg-primary/5",
            },
            {
              cat: "food" as const,
              emoji: "🍽️",
              label: t("category.food"),
              color: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
            },
            {
              cat: "energy" as const,
              emoji: "⚡",
              label: t("category.energy"),
              color: "hover:border-sky-500/50 hover:bg-sky-500/5",
            },
            {
              cat: "shopping" as const,
              emoji: "🛍️",
              label: t("category.shopping"),
              color: "hover:border-amber-500/50 hover:bg-amber-500/5",
            },
          ].map(({ cat, emoji, label, color }) => (
            <GlowCard
              key={cat}
              onClick={() => handleQuickLogClick(cat)}
              className={`flex flex-col items-center justify-center bg-[rgba(20,40,32,0.6)] border border-white/10 rounded-2xl p-3 transition-all duration-200 ${color} active:scale-95 group shadow-lg shadow-black/5 backdrop-blur-xl`}
              enableStars={true}
              enableBorderGlow={true}
              particleCount={6}
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200 relative z-10">
                {emoji}
              </span>
              <span className="text-xs font-bold text-foreground relative z-10">{label}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5 relative z-10">
                {t("dashboard.tapToLog")}
              </span>
            </GlowCard>
          ))}
        </div>
      </div>

      {/* Activity Sheet */}
      <ActivityBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialCategory={selectedCategory}
        onLog={addActivity}
      />
    </AppShell>
  );
}
