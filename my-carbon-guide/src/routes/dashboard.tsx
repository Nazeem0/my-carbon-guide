import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useActivities } from "@/hooks/useActivities";
import { useCarbon } from "@/hooks/useCarbon";
import { generateDailyInsight } from "@/services/gemini";
import { ActivityBottomSheet } from "@/components/ecolog/ActivityBottomSheet";
import { ToastHost } from "@/components/ecolog/Toast";
import { AppShell } from "@/components/ecolog/AppShell";
import { Flame, Trophy, MapPin, Sparkles, RefreshCw, TrendingDown } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserProfile();
  const { calculateCO2 } = useCarbon();
  
  const dailyGoal = profile?.dailyGoalKg || 2.0;
  const { activities, loaded, addActivity, getDailyTotal, getTopActivity } =
    useActivities(dailyGoal);

  const { t } = useLanguage();
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"transport" | "food" | "energy" | "shopping">("transport");

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

  const fetchInsight = async () => {
    if (!profile) return;
    setLoadingInsight(true);
    try {
      const topLabel = topAct ? calculateCO2(topAct.activityKey, topAct.quantity).label : "No emissions";
      
      // Calculate real weekly average from `activities`
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekLogs = activities.filter(a => new Date(a.timestamp) >= oneWeekAgo);
      const weekTotal = weekLogs.reduce((sum, a) => sum + a.co2_kg, 0);
      const weeklyAvg = parseFloat((weekTotal / 7).toFixed(2));

      const text = await generateDailyInsight({
        userName: profile.name,
        city: profile.city,
        todayKg,
        weeklyAvg: weeklyAvg > 0 ? weeklyAvg : 1.34, // fallback if new
        cityAvg: 1.9,
        topActivity: topLabel,
        streak: profile.streak,
        language: "en",
      });
      setInsight(text);
    } catch {
      setInsight("AI insight unavailable — check your API key");
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => { 
    if (profile) {
      fetchInsight();
    }
  }, [todayKg, profile]);

  const handleQuickLogClick = (cat: "transport" | "food" | "energy" | "shopping") => {
    setSelectedCategory(cat);
    setSheetOpen(true);
  };

  if (profileLoading || !profile) {
    return (
      <AppShell hideNavbar>
        <ToastHost />
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
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
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = (profile.name || "User").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const goalPct = Math.min(percentage, 100);

  return (
    <AppShell hideNavbar>
      <ToastHost />

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <span className="text-xl font-bold tracking-tight text-primary">🌿 EcoLog</span>
          <p className="text-xs text-muted-foreground">{profile.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
            {initials}
          </div>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">🔥 {profile.streak} {t("dashboard.days")}</span>
        </span>
        <span className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-bold text-primary uppercase tracking-wider">
          <Trophy size={11} /> Rank #{profile.rank}
        </span>
      </div>

      {/* ── Today's Progress Ring (CSS) ── */}
      <div className="mt-5 flex flex-col items-center">
        <div className="relative grid h-36 w-36 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-border" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="currentColor" className="text-primary transition-all duration-700"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - goalPct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center z-10">
            <div className="text-2xl font-black text-foreground">{todayKg.toFixed(2)}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("dashboard.kgCO2")}</div>
            <div className="text-[10px] text-muted-foreground">{t("dashboard.ofGoal").replace("{goal}", dailyGoal.toString())}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingDown size={12} className="text-primary" />
          <span>{goalPct.toFixed(0)}{t("dashboard.goalUsed")}</span>
        </div>
      </div>

      {/* ── Info Cards Row ── */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Top Emission */}
        <div className="rounded-2xl border-l-4 border-red-500 border-t border-r border-b border-border bg-card p-3 shadow-[var(--shadow-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">{t("dashboard.topEmission")}</span>
          <span className="text-[13px] font-extrabold text-foreground mt-1 block truncate">{topActivityDetails.label}</span>
          <span className="text-base font-black text-red-500 mt-1 block">{topActivityDetails.co2.toFixed(2)} {t("dashboard.kgCO2")}</span>
          <span className="text-[9px] text-muted-foreground">{topActivityDetails.info}</span>
        </div>

        {/* AI Insight */}
        <div 
          className="rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-[var(--shadow-card)] cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => {
            const weeklyTotal = activities.filter(a => new Date(a.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).reduce((s, a) => s + a.co2_kg, 0);
            const wAvg = parseFloat((weeklyTotal / 7).toFixed(2));
            navigate("/detailed-insight", { 
              state: {
                userName: profile?.name || "User",
                city: profile?.city || "City",
                todayKg,
                weeklyAvg: wAvg > 0 ? wAvg : 1.34,
                cityAvg: 1.9,
                topActivity: topAct ? calculateCO2(topAct.activityKey, topAct.quantity).label : "No emissions",
                streak: profile?.streak || 0
              } 
            });
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Sparkles size={11} className="animate-pulse" /> {t("dashboard.aiInsight")}
            </div>
            {!loadingInsight && (
              <button 
                onClick={(e) => { e.stopPropagation(); fetchInsight(); }} 
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
          <div className="mt-1.5 text-[9px] text-muted-foreground text-right">{t("dashboard.poweredBy")} ✨</div>
        </div>
      </div>

      {/* ── Quick Log ── */}
      <div className="mt-6">
        <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("dashboard.quickLog")}</div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { cat: "transport" as const, emoji: "🚗", label: t("category.transport"), color: "hover:border-primary/50 hover:bg-primary/5" },
            { cat: "food" as const, emoji: "🍽️", label: t("category.food"), color: "hover:border-emerald-500/50 hover:bg-emerald-500/5" },
            { cat: "energy" as const, emoji: "⚡", label: t("category.energy"), color: "hover:border-sky-500/50 hover:bg-sky-500/5" },
            { cat: "shopping" as const, emoji: "🛍️", label: t("category.shopping"), color: "hover:border-amber-500/50 hover:bg-amber-500/5" },
          ].map(({ cat, emoji, label, color }) => (
            <button
              key={cat}
              onClick={() => handleQuickLogClick(cat)}
              className={`flex flex-col items-center justify-center bg-card border border-border rounded-2xl p-3 transition-all duration-200 ${color} active:scale-95 group shadow-[var(--shadow-card)]`}
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">{emoji}</span>
              <span className="text-xs font-bold text-foreground">{label}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{t("dashboard.tapToLog")}</span>
            </button>
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
