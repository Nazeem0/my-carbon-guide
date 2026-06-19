import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-3xl bg-card p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
