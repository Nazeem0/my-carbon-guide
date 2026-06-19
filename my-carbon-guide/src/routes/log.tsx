import { useMemo, useState } from "react";
import { AppShell } from "@/components/ecolog/AppShell";
import { ActivityTile } from "@/components/ecolog/ActivityTile";
import { BottomSheet } from "@/components/ecolog/BottomSheet";
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
  const [qty, setQty] = useState(1);

  const list = useMemo(
    () =>
      activities.filter(
        (a) => (tab === "All" || a.category === tab) && a.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [tab, query],
  );

  const openSheet = (a: Activity) => {
    setSelected(a);
    setQty(1);
  };

  const submit = () => {
    if (!selected) return;
    
    // Optimistic update: fire the addActivity request in the background
    // and close the sheet instantly. The hook will show a toast when done.
    addActivity(selected.id, qty);
    
    setSelected(null);
  };

  return (
    <AppShell>
      <ToastHost />
      <h1 className="text-2xl font-extrabold tracking-tight">{t("log.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("log.subtitle")}</p>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <Search size={18} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("log.search")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Mic size={16} />
        </button>
      </div>

      <div className="-mx-5 mt-4 overflow-x-auto px-5">
        <div className="flex gap-2">
          {tabs.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                tab === tabName ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
              }`}
            >
              {tabName === "All" ? t("tab.all") : t(`category.${tabName.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {list.map((a) => (
          <ActivityTile key={a.id} a={a} onTap={() => openSheet(a)} />
        ))}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected ? t(`activity.${selected.id}`) : ""}>
        {selected && (
          <div>
            <div className="rounded-2xl bg-secondary p-4 text-center">
              <div className="text-3xl">{selected.emoji}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("log.perUnit").replace("{unit}", t(`unit.${selected.unit}`))}
              </div>
            </div>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("log.quantity").replace("{unit}", t(`unit.${selected.unit}`))}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card text-xl"
              >
                −
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="h-12 w-full rounded-lg border border-border bg-card px-3 text-center text-lg font-bold outline-none focus:border-primary"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card text-xl"
              >
                +
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-center text-sm">
              {t("log.totalImpact")}{" "}
              <span className="font-bold text-primary">
                {(selected.factor * qty) >= 1000
                  ? ((selected.factor * qty) / 1000).toFixed(2) + " " + t("unit.kg")
                  : selected.factor * qty + " " + t("unit.g")}{" "}
                CO₂
              </span>
            </div>
            <button
              onClick={submit}
              className="mt-4 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] active:scale-[0.98] transition-all"
            >
              {t("log.logIt")}
            </button>
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );
}
