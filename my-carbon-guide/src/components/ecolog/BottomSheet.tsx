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
      <div
        className="absolute inset-0 mx-auto max-w-[430px] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-24 mx-auto max-w-[430px] max-h-[85vh] rounded-3xl bg-white/20 border border-white/20 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-transform duration-300 dark:bg-white/10 flex flex-col min-h-0 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="shrink-0 mx-auto mt-4 mb-3 h-1.5 w-12 rounded-full bg-white/30" />
        <div className="shrink-0 mb-3 flex items-center justify-between px-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur-xl"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">{children}</div>
      </div>
    </div>
  );
}
