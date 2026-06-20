import type { Activity } from "@/data/emissionFactors";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlowCard } from "./GlowCard";

export function ActivityTile({ a, onTap }: { a: Activity; onTap: () => void }) {
  const { t } = useLanguage();
  return (
    <GlowCard
      onClick={onTap}
      className="flex flex-col items-start gap-2 rounded-2xl border border-white/20 bg-white/20 p-4 text-left shadow-lg shadow-black/5 backdrop-blur-xl transition-transform active:scale-[0.97] dark:bg-white/10"
      particleCount={6}
      enableStars={true}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xl relative z-10">
        {a.emoji}
      </div>
      <div className="text-sm font-semibold leading-tight relative z-10">
        {t(`activity.${a.id}`)}
      </div>
      <div className="text-[11px] text-muted-foreground relative z-10">
        {a.factor === 0
          ? t("activity.zeroImpact")
          : `${a.factor}${t("unit.g")}/${t(`unit.${a.unit}`)}`}
      </div>
    </GlowCard>
  );
}
