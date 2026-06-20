import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/ecolog/AppShell";
import { GlowCard } from "@/components/ecolog/GlowCard";
import { WeeklySummary } from "@/components/ui/WeeklySummary";
import {
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useActivities } from "@/hooks/useActivities";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { EMISSION_FACTORS } from "@/data/emissionFactors";
import { CITY_AVERAGES } from "@/hooks/useCarbon";
import { API_BASE } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface RoadmapAction {
  week: number;
  action?: string;
  actionKey?: string;
  category: "transport" | "food" | "energy" | "shopping";
  saving_kg_month: number;
  difficulty: "Easy" | "Medium" | "Hard";
  india_tip?: string;
  tipKey?: string;
}

const COLORS = ["#1D9E75", "#F59E0B", "#3B82F6", "#EF4444"];
const CATS = ["Transport", "Food", "Energy", "Shopping"];

const diffClass = (d: "Easy" | "Medium" | "Hard") =>
  d === "Easy" ? "bg-primary/15 text-primary"
    : d === "Medium" ? "bg-accent/20 text-accent-foreground"
    : "bg-destructive/15 text-destructive";

const STATIC_PLAN: RoadmapAction[] = [
  { week: 1, actionKey: "plan.action.1", category: "transport", saving_kg_month: 45, difficulty: "Easy", tipKey: "plan.tip.1" },
  { week: 1, actionKey: "plan.action.2", category: "food", saving_kg_month: 12, difficulty: "Easy", tipKey: "plan.tip.2" },
  { week: 2, actionKey: "plan.action.3", category: "energy", saving_kg_month: 18, difficulty: "Easy", tipKey: "plan.tip.3" },
  { week: 2, actionKey: "plan.action.4", category: "shopping", saving_kg_month: 25, difficulty: "Medium", tipKey: "plan.tip.4" },
  { week: 3, actionKey: "plan.action.5", category: "transport", saving_kg_month: 30, difficulty: "Easy", tipKey: "plan.tip.5" },
  { week: 3, actionKey: "plan.action.6", category: "food", saving_kg_month: 15, difficulty: "Medium", tipKey: "plan.tip.6" },
  { week: 4, actionKey: "plan.action.7", category: "energy", saving_kg_month: 22, difficulty: "Hard", tipKey: "plan.tip.7" },
  { week: 4, actionKey: "plan.action.8", category: "shopping", saving_kg_month: 8, difficulty: "Easy", tipKey: "plan.tip.8" },
];

export default function Insights() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { activities } = useActivities(profile?.dailyGoalKg ?? 2.0);

  const [weeklySummary, setWeeklySummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapAction[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");
  const { language, t } = useLanguage();


  // ── Real 30-day trend from activities ──
  const monthlyTrend = useMemo(() => {
    const days: string[] = [];
    const trend: { date: string; kg: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dateLabel = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      
      const total = activities
        .filter(a => new Date(a.timestamp).toDateString() === dateStr)
        .reduce((s, a) => s + a.co2_kg, 0);
        
      trend.push({ date: dateLabel, kg: parseFloat(total.toFixed(2)) });
    }
    return trend;
  }, [activities]);

  // ── Real category breakdown from TODAY's activities ──
  const categoryBreakdown = useMemo(() => {
    const today = new Date().toDateString();
    const todayActivities = activities.filter(a => new Date(a.timestamp).toDateString() === today);
    const totals: Record<string, number> = { Transport: 0, Food: 0, Energy: 0, Shopping: 0 };
    todayActivities.forEach(a => {
      let label = "Transport";
      for (const [cat, items] of Object.entries(EMISSION_FACTORS)) {
        if (a.activityKey in items) {
          label = cat.charAt(0).toUpperCase() + cat.slice(1);
          break;
        }
      }
      totals[label] = (totals[label] ?? 0) + a.co2_kg;
    });
    return CATS.map((name, i) => ({
      name,
      value: parseFloat((totals[name] ?? 0).toFixed(2)),
      color: COLORS[i],
    })).filter(c => c.value > 0);
  }, [activities]);

  // ── Real 7-day data ──
  const weeklyData = useMemo(() => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const total = activities
        .filter(a => new Date(a.timestamp).toDateString() === dateStr)
        .reduce((s, a) => s + a.co2_kg, 0);
      arr.push(parseFloat(total.toFixed(2)));
    }
    return arr;
  }, [activities]);

  const bestDayKg = Math.min(...weeklyData.filter(v => v > 0));
  const bestDayLabel = bestDayKg === Infinity ? "N/A" : `${bestDayKg.toFixed(2)} kg`;

  const avgKg = useMemo(() => {
    const vals = weeklyData.filter(v => v > 0);
    return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
  }, [weeklyData]);

  const fetchSummary = async () => {
    if (!profile || !user) return;
    setLoadingSummary(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/insights/weekly`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          userName: profile.name,
          weeklyData,
          bestDay: bestDayLabel,
          streak: profile.streak,
          language,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate weekly summary");
      const data = await res.json();
      setWeeklySummary(data.text);
    } catch {
      setWeeklySummary("AI weekly summary unavailable.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (profile && user && weeklyData.some(v => v > 0)) fetchSummary();
  }, [profile?.streak, language, user]);

  const handleGetRoadmap = () => {
    if (!profile) return;
    setShowRoadmap(true);
    setRoadmap(STATIC_PLAN);
  };

  // ── Carbon Story stats ──
  const streak = profile?.streak ?? 0;
  const cityAvg = CITY_AVERAGES[profile?.city ?? ""] ?? CITY_AVERAGES.national;
  const savedVsAvg = avgKg > 0 ? Math.round(((cityAvg - avgKg) / cityAvg) * 100) : 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">{t("insights.title")}</h1>
      <p className="text-sm text-white/70 mb-4">{t("insights.subtitle")}</p>

      <div className="mb-6">
        <WeeklySummary
          summary={weeklySummary}
          loading={loadingSummary}
          avgKg={avgKg}
          bestDay={bestDayLabel}
          streak={streak}
          onGetPlan={handleGetRoadmap}
        />
      </div>

      {/* Reduction Roadmap */}
      {loadingRoadmap && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-white">{t("insights.generatingPlan")}</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card rounded-2xl p-4">
                <Skeleton className="mb-3 h-3 w-16" />
                <div className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showRoadmap && roadmapError && !loadingRoadmap && (
        <section className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">{t("insights.planError")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{roadmapError}</p>
        </section>
      )}

      {showRoadmap && roadmap.length > 0 && !loadingRoadmap && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-white">{t("insights.reductionPlan")}</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(week => {
              const weekActions = roadmap.filter(a => a.week === week);
              if (weekActions.length === 0) return null;
              return (
                <GlowCard key={week} className="glass-card rounded-2xl p-4" enableStars={false} particleCount={0}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("plan.week")} {week}</h3>
                  <div className="space-y-3">
                    {weekActions.map((action, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{action.actionKey ? t(action.actionKey) : action.action}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                              {t(`category.${action.category}`)}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${diffClass(action.difficulty)}`}>
                              {t(`difficulty.${action.difficulty.toLowerCase()}`)}
                            </span>
                            <span className="text-[10px] font-medium text-primary">
                              -{action.saving_kg_month} {t("plan.savingPerMonth")}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{action.tipKey ? t(action.tipKey) : action.india_tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              );
            })}
          </div>
        </section>
      )}

      {/* 30-Day Trend */}
      <GlowCard className="glass-card rounded-3xl p-5" enableStars={false} particleCount={0}>
        <h2 className="text-sm font-bold mb-1 text-white">{t("insights.30dayTrend")}</h2>
        <p className="text-[11px] text-muted-foreground mb-2">{t("insights.firestoreLabel")}</p>
        {monthlyTrend.length === 0 ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <div className="mt-2 h-44">
            <ResponsiveContainer>
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#D1FAE5" }} interval={4} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,.1)", fontSize: 12 }} />
                <Line type="monotone" dataKey="kg" stroke="#1D9E75" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlowCard>

      {/* Category breakdown */}
      <GlowCard className="glass-card mt-5 rounded-3xl p-5" enableStars={false} particleCount={0}>
        <h2 className="text-sm font-bold text-white">{t("insights.categoryBreakdown")}</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">{t("insights.breakdownEmpty")}</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {categoryBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v} kg`} contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlowCard>

      {/* Carbon Story */}
      <section className="mt-5">
        <h2 className="mb-3 text-sm font-bold text-white">{t("insights.carbonStory")}</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label={t("insights.bestDay")} value={bestDayKg === Infinity ? "—" : bestDayKg.toFixed(1)} unit="kg" />
          <Stat label={t("insights.streak")} value={streak.toString()} unit={t("dashboard.days")} />
          <Stat label={t("insights.savedVsCity")} value={`${savedVsAvg > 0 ? "+" : ""}${savedVsAvg}`} unit="%" />
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <GlowCard className="glass-card rounded-2xl p-3 text-center" enableStars={false} particleCount={0}>
      <div className="text-lg font-extrabold text-white">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{unit}</div>
      <div className="mt-1 text-[11px] text-white/80">{label}</div>
    </GlowCard>
  );
}
