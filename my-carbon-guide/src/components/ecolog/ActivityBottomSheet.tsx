import { useState, useEffect, useMemo, useRef } from "react";
import { useCarbon } from "@/hooks/useCarbon";
import { EMISSION_FACTORS } from "@/data/emissionFactors";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, ChevronDown } from "lucide-react";

interface ActivityBottomSheetProps {
  open: boolean;
  onClose: () => void;
  initialCategory: "transport" | "food" | "energy" | "shopping";
  onLog: (activityKey: string, quantity: number) => void;
}

export function ActivityBottomSheet({
  open,
  onClose,
  initialCategory,
  onLog,
}: ActivityBottomSheetProps) {
  const { calculateCO2, getCarbonEquivalent } = useCarbon();
  const { t } = useLanguage();
  const [category, setCategory] = useState(initialCategory);

  // Sync category state with prop when it opens
  useEffect(() => {
    if (open) {
      setCategory(initialCategory);
    }
  }, [open, initialCategory]);

  // Available activity keys for the selected category
  const categoryItems = useMemo(() => {
    return EMISSION_FACTORS[category];
  }, [category]);

  const firstActivityKey = useMemo(() => {
    return Object.keys(categoryItems)[0];
  }, [categoryItems]);

  const [selectedActivity, setSelectedActivity] = useState(firstActivityKey);
  const [quantityStr, setQuantityStr] = useState<string>("1");
  const quantity = Number(quantityStr) || 0;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected activity when category changes
  useEffect(() => {
    setSelectedActivity(firstActivityKey);
    setQuantityStr("1");
  }, [category, firstActivityKey]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Live CO2 calculation
  const liveCalc = useMemo(() => {
    return calculateCO2(selectedActivity, quantity);
  }, [selectedActivity, quantity, calculateCO2]);

  if (!open) return null;

  const handleLog = () => {
    onLog(selectedActivity, Math.max(1, quantity));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLog();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 mx-auto max-w-[430px] bg-black/40 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="fixed bottom-24 inset-x-0 z-50 mx-auto max-w-[430px] max-h-[85vh] bg-white/20 border border-white/20 rounded-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:bg-white/10 flex flex-col min-h-0">
        {/* Drag Handle */}
        <div
          className="shrink-0 mx-auto mt-3 h-1 w-12 rounded-full bg-white/30 mb-3 cursor-pointer"
          onClick={onClose}
        />

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between mb-3 px-5">
          <h2 className="text-lg font-bold text-foreground">
            {t("log.header").replace("{category}", t(`category.${category}`))}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 bg-white/20 hover:bg-white/30 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-xl"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          {/* Category Tabs Inside Sheet */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/10 border border-white/20 mb-3 backdrop-blur-lg">
            {(Object.keys(EMISSION_FACTORS) as Array<keyof typeof EMISSION_FACTORS>).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-all duration-200 ${
                  category === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`category.${cat}`)}
              </button>
            ))}
          </div>

          {/* Form Controls */}
          <div className="space-y-4">
            {/* Activity Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
                {t("log.activityType")}
              </label>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full h-9 rounded-xl bg-white/10 border border-white/20 px-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer select-none flex items-center justify-between"
              >
                <span>{t(`activity.${selectedActivity}`)}</span>
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl bg-black/40 border border-white/10 shadow-lg overflow-hidden backdrop-blur-xl">
                  <div className="max-h-48 overflow-y-auto scrollbar-none">
                    {Object.entries(categoryItems).map(([key]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedActivity(key);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-3 text-left text-sm font-semibold transition-colors ${
                          key === selectedActivity
                            ? "bg-white/15 text-white"
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {t(`activity.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
                {t("log.quantity").replace(
                  "{unit}",
                  t(`unit.${categoryItems[selectedActivity as keyof typeof categoryItems]?.unit}`),
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantityStr((q) => String(Math.max(1, (Number(q) || 0) - 1)))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/20 text-lg font-bold text-foreground hover:bg-white/20 active:scale-95"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  onKeyDown={handleKeyDown}
                  inputMode="numeric"
                  enterKeyHint="done"
                  className="flex-1 h-9 rounded-xl bg-white/10 border border-white/20 text-center text-sm font-bold text-white focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setQuantityStr((q) => String((Number(q) || 0) + 1))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/20 text-lg font-bold text-foreground hover:bg-white/20 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-2 text-center mt-3">
              <span className="text-[10px] font-semibold text-muted-foreground block select-none">
                {t("log.calculatedImpact")}
              </span>
              <span className="text-xl font-extrabold text-primary block mt-0.5">
                {liveCalc.co2_kg.toFixed(3)} {t("unit.kg")}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground block mt-0.5">
                {getCarbonEquivalent(liveCalc.co2_kg)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleLog}
              className="w-full h-10 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-[var(--primary-glow)] active:scale-[0.98] transition-all duration-200 mt-3"
            >
              {t("log.header").replace("{category}", t(`category.${category}`))}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
