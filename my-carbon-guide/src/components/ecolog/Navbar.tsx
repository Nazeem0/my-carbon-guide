import { Logo } from "./Logo";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";

export function Navbar() {
  const { profile } = useUserProfile();
  const { t } = useLanguage();

  const name = profile?.name || "User";
  const city = profile?.city || "";
  const streak = profile?.streak || 0;
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/85 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight">{t("navbar.appName")}</div>
          <div className="text-[11px] text-muted-foreground">{city}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          🔥 {streak} {t("navbar.days")}
        </span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials}
        </div>
      </div>
    </header>
  );
}
