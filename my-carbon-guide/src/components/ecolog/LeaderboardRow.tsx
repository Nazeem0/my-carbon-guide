import { ArrowDown, ArrowUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LeaderboardRow({
  rank,
  name,
  score,
  trend,
  me = false,
}: {
  rank: number;
  name: string;
  score: number;
  trend: "up" | "down";
  me?: boolean;
}) {
  const { t } = useLanguage();
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 backdrop-blur-xl ${
        me ? "border-primary bg-primary/20" : "border-white/20 bg-white/20 dark:bg-white/10"
      }`}
    >
      <div className="grid w-8 place-items-center text-sm font-bold text-muted-foreground">
        {medal ?? rank}
      </div>
      <div
        className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${
          me ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {initials}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">
          {name}
          {me && <span className="ml-2 text-xs text-primary">You</span>}
        </div>
        <div className="text-xs text-muted-foreground">
          {score.toFixed(1)} {t("leaderboard.kgCO2")}
        </div>
      </div>
      <div
        className={`flex items-center text-xs font-semibold ${trend === "up" ? "text-primary" : "text-destructive"}`}
      >
        {trend === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </div>
    </div>
  );
}
