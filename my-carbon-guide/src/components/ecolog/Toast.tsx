import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

let externalShow: ((msg: string) => void) | null = null;
export function showToast(msg: string) {
  externalShow?.(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    externalShow = (m) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 3000);
    };
    return () => {
      externalShow = null;
    };
  }, []);
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-4 z-[60] mx-auto flex max-w-[430px] justify-center px-5 transition-all duration-300 ${
        msg ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">{msg}</span>
      </div>
    </div>
  );
}
