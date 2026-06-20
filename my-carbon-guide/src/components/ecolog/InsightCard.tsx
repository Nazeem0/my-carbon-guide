import { Lightbulb } from "lucide-react";

export function InsightCard({ text }: { text: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-elevated)]"
      style={{ background: "var(--gradient-insight)" }}
    >
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
          <Lightbulb size={20} />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            AI Insight
          </div>
          <p className="mt-1 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}
