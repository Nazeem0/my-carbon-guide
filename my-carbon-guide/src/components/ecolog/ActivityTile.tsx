import type { Activity } from "@/data/emissionFactors";
import { useLanguage } from "@/contexts/LanguageContext";

export function ActivityTile({ a, onTap }: { a: Activity; onTap: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.97]"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xl">{a.emoji}</div>
      <div className="text-sm font-semibold leading-tight">{t(`activity.${a.id}`)}</div>
      <div className="text-[11px] text-muted-foreground">
        {a.factor === 0 ? t("activity.zeroImpact") : `${a.factor}${t("unit.g")}/${t(`unit.${a.unit}`)}`}
      </div>
    </button>
  );
}