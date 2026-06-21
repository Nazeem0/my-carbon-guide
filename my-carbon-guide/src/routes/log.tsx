import { useMemo, useState } from "react";
import { AppShell } from "@/components/ecolog/AppShell";
import { ActivityTile } from "@/components/ecolog/ActivityTile";
import { BottomSheet } from "@/components/ecolog/BottomSheet";
import { GlowCard } from "@/components/ecolog/GlowCard";
import { ToastHost } from "@/components/ecolog/Toast";
import { activities, type Activity, type Category } from "@/data/emissionFactors";
import { Mic, Search } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";

const tabs: ("All" | Category)[] = ["All", "Transport", "Food", "Energy", "Shopping"];

export default function LogPage() {
  const { profile } = useUserProfile();
  const { addActivity } = useActivities(profile?.dailyGoalKg ?? 2.0);

  const { t } = useLanguage();
  const [tab, setTab] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Activity | null>(null);
  const [qtyStr, setQtyStr] = useState<string>("1");
  const qty = Number(qtyStr) || 0;

  const list = useMemo(
    () =>
      activities.filter(
        (a) =>
          (tab === "All" || a.category === tab) &&
          a.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [tab, query],
  );

  const openSheet = (a: Activity) => {
    setSelected(a);
    setQtyStr("1");
  };

  const submit = () => {
    if (!selected) return;
    addActivity(selected.id, Math.max(1, qty));
    setSelected(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <AppShell>
      <ToastHost />
      <div className="flex flex-col flex-1 pt-20">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("log.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("log.subtitle")}</p>
        </div>

        <GlowCard
          className="mt-4 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/20 p-3 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10"
          enableStars={false}
          particleCount={0}
        >
          <Search size={18} className="text-muted-foreground relative z-10" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("log.search")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground relative z-10"
          />
          <button className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground relative z-10">
            <Mic size={16} />
          </button>
        </GlowCard>

        <div className="-mx-5 mt-4 overflow-x-auto px-5">
          <div className="flex gap-2">
            {tabs.map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  tab === tabName
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/20 text-foreground border border-white/20 backdrop-blur-xl"
                }`}
              >
                {tabName === "All" ? t("tab.all") : t(`category.${tabName.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {list.map((activity) => (
            <ActivityTile key={activity.id} a={activity} onTap={() => openSheet(activity)} />
          ))}
        </div>
      </div>

      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? t(`activity.${selected.id}`) : ""}
      >
        {selected && (
          <div>
            <GlowCard
              className="rounded-2xl bg-secondary p-3 text-center"
              enableStars={false}
              particleCount={0}
            >
              <div className="text-2xl relative z-10">{selected.emoji}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground relative z-10">
                {t("log.perUnit").replace("{unit}", t(`unit.${selected.unit}`))}
              </div>
            </GlowCard>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("log.quantity").replace("{unit}", t(`unit.${selected.unit}`))}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setQtyStr((q) => String(Math.max(1, (Number(q) || 0) - 1)))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/20 text-lg dark:bg-white/10"
              >
                −
              </button>
              <input
                type="number"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                onKeyDown={handleKeyDown}
                inputMode="numeric"
                enterKeyHint="done"
                className="h-9 w-full rounded-lg border border-white/20 bg-white/20 px-3 text-center text-sm font-bold text-white outline-none focus:border-primary dark:bg-white/10"
              />
              <button
                onClick={() => setQtyStr((q) => String((Number(q) || 0) + 1))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/20 text-lg dark:bg-white/10"
              >
                +
              </button>
            </div>
            <GlowCard
              className="mt-3 rounded-2xl bg-primary/10 p-2 text-center text-xs"
              enableStars={false}
              particleCount={0}
            >
              {t("log.totalImpact")}{" "}
              <span className="font-bold text-primary relative z-10">
                {selected.factor * qty >= 1000
                  ? ((selected.factor * qty) / 1000).toFixed(2) + " " + t("unit.kg")
                  : selected.factor * qty + " " + t("unit.g")}{" "}
                CO₂
              </span>
            </GlowCard>
            <button
              onClick={submit}
              className="mt-3 h-10 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {t("log.logIt")}
            </button>
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );
}
