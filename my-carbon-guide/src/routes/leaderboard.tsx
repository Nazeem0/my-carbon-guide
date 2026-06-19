import { useState } from "react";
import { AppShell } from "@/components/ecolog/AppShell";
import { LeaderboardRow } from "@/components/ecolog/LeaderboardRow";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LeaderboardPage() {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { leaders, myEntry, loading } = useLeaderboard(30);

  const [period, setPeriod] = useState<"Weekly" | "Monthly" | "Today">("Today");
  const { t } = useLanguage();
  const [scope, setScope] = useState<"Global" | "City">("Global");

  // Basic filtering for city if City scope is selected
  const filteredLeaders = scope === "City" && profile?.city 
    ? leaders.filter(l => l.city.toLowerCase() === profile.city.toLowerCase())
    : leaders;

  // We only have "Today" working strictly with the live database right now, but keeping the UI toggles
  
  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight">{t("leaderboard.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("leaderboard.subtitle")}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 rounded-full bg-card p-1 border border-border">
          {(["Today", "Weekly", "Monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                period === p ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
              }`}
            >
              {t(`leaderboard.period.${p.toLowerCase()}`)}
            </button>
          ))}
        </div>
        <div className="flex rounded-full bg-card p-1 border border-border">
          {(["Global", "City"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                scope === s ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground border border-border"
              }`}
            >
              {t(`leaderboard.scope.${s.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">{t("leaderboard.yourRank")}</h2>
        {myEntry ? (
          <LeaderboardRow rank={myEntry.rank} name={myEntry.name} score={myEntry.todayKg} trend="up" me />
        ) : profile ? (
          <LeaderboardRow rank={profile.rank} name={profile.name} score={profile.todayKg} trend="up" me />
        ) : (
          <div className="animate-pulse h-16 bg-muted rounded-2xl w-full" />
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">{t("leaderboard.topWarriors")}</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded-2xl w-full" />)}
          </div>
        ) : filteredLeaders.length > 0 ? (
          <div className="space-y-2">
            {filteredLeaders.map((u, i) => (
              <LeaderboardRow key={u.uid} rank={i + 1} name={u.name} score={u.todayKg} trend={i % 2 === 0 ? "up" : "down"} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-10 bg-card rounded-2xl border border-border">
            {t("leaderboard.empty")}
          </div>
        )}
      </div>
    </AppShell>
  );
}
