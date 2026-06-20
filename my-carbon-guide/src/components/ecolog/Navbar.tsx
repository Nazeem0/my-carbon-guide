import { Logo } from "./Logo";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";

export function Navbar({ hideStreak = false }: { hideStreak?: boolean }) {
  const { profile } = useUserProfile();
  const { t } = useLanguage();

  const name = profile?.name || "User";
  const city = profile?.city || "";
  const streak = profile?.streak || 0;
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="z-40 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,8px)] pb-2">
      <div className="flex items-center gap-2.5">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight text-white">{t("navbar.appName")}</div>
          <div className="text-[11px] text-white/60">{city}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!hideStreak && (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-white">
            🔥 {streak} {t("navbar.days")}
          </span>
        )}
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 border border-white/30 text-sm font-semibold text-white backdrop-blur-xl shadow-lg shadow-black/5">
          {initials}
        </div>
      </div>
    </header>
  );
}
