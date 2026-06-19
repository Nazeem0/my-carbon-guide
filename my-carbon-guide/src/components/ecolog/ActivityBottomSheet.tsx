import { useState, useEffect, useMemo } from "react";
import { useCarbon } from "@/hooks/useCarbon";
import { EMISSION_FACTORS } from "@/data/emissionFactors";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";

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
  onLog
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
  const [quantity, setQuantity] = useState(1);

  // Sync selected activity when category changes
  useEffect(() => {
    setSelectedActivity(firstActivityKey);
    setQuantity(1);
  }, [category, firstActivityKey]);

  // Live CO2 calculation
  const liveCalc = useMemo(() => {
    return calculateCO2(selectedActivity, quantity);
  }, [selectedActivity, quantity, calculateCO2]);

  if (!open) return null;

  const handleLog = () => {
    onLog(selectedActivity, quantity);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-card border-t border-border rounded-t-[28px] px-5 pb-8 pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
        
        {/* Drag Handle */}
        <div className="mx-auto h-1 w-12 rounded-full bg-muted mb-5 cursor-pointer" onClick={onClose} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {t("log.header").replace("{category}", t(`category.${category}`))}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category Tabs Inside Sheet */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-secondary border border-border mb-5">
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
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
              {t("log.activityType")}
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full h-12 rounded-xl bg-background border border-border px-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer select-none"
            >
              {Object.entries(categoryItems).map(([key]) => (
                <option key={key} value={key}>
                  {t(`activity.${key}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
              {t("log.quantity").replace("{unit}", t(`unit.${categoryItems[selectedActivity as keyof typeof categoryItems]?.unit}`))}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 place-items-center rounded-xl bg-secondary border border-border text-xl font-bold text-foreground hover:bg-muted active:scale-95"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 h-12 rounded-xl bg-background border border-border text-center text-lg font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="grid h-12 w-12 place-items-center rounded-xl bg-secondary border border-border text-xl font-bold text-foreground hover:bg-muted active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center mt-6">
            <span className="text-xs font-semibold text-muted-foreground block select-none">{t("log.calculatedImpact")}</span>
            <span className="text-3xl font-extrabold text-primary block mt-1">
              {liveCalc.co2_kg.toFixed(3)} {t("unit.kg")}
            </span>
            <span className="text-xs font-medium text-muted-foreground block mt-1">
              {getCarbonEquivalent(liveCalc.co2_kg)}
            </span>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleLog}
            className="w-full h-12 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-glow active:scale-[0.98] transition-all duration-200 mt-6"
          >
            {t("log.submit")}
          </button>
        </div>
      </div>
    </>
  );
}
