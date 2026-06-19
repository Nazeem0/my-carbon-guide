import { ArrowRight, Trophy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeeklySummaryProps {
  summary: string;
  loading: boolean;
  avgKg: number;
  bestDay: string;
  streak: number;
  onGetPlan?: () => void;
}

export function WeeklySummary({
  summary,
  loading,
  avgKg,
  bestDay,
  streak,
  onGetPlan
}: WeeklySummaryProps) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl bg-card border-l-4 border-amber-500 border-t border-r border-b border-border p-5 shadow-[var(--shadow-card)]">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-bold">📊 {t("weeklySummary.title")}</span>
      </div>

      {/* Summary Text */}
      {loading ? (
        <div className="space-y-2.5 animate-pulse mb-5">
          <div className="h-3.5 bg-muted rounded w-full"></div>
          <div className="h-3.5 bg-muted rounded w-11/12"></div>
          <div className="h-3.5 bg-muted rounded w-4/5"></div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-foreground mb-5 font-medium">
          {summary || t("weeklySummary.placeholder")}
        </p>
      )}

      {/* Stat Pills */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="flex flex-col items-center justify-center rounded-xl bg-secondary border border-border py-2.5 text-center">
          <span className="text-sm font-extrabold text-foreground">{avgKg.toFixed(2)} kg</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("weeklySummary.avgPerDay")}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-secondary border border-border py-2.5 text-center">
          <span className="text-sm font-extrabold text-foreground truncate max-w-full px-1">{bestDay}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("weeklySummary.bestDay")}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-secondary border border-border py-2.5 text-center">
          <span className="text-sm font-extrabold text-foreground flex items-center gap-0.5">
            <Trophy size={11} className="text-amber-500" /> {streak}d
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("weeklySummary.streak")}</span>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={onGetPlan}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all duration-200"
      >
        {t("weeklySummary.getPlan")} <ArrowRight size={15} />
      </button>
    </div>
  );
}
