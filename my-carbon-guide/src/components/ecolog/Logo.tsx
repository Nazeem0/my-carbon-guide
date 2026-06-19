import { Leaf, Zap } from "lucide-react";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      <Leaf className="text-primary-foreground" size={size * 0.55} strokeWidth={2.4} />
      <Zap
        className="absolute text-accent"
        size={size * 0.32}
        strokeWidth={2.8}
        style={{ right: -2, bottom: -2, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }}
        fill="currentColor"
      />
    </div>
  );
}
