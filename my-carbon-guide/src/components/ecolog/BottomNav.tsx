import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Trophy, User, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function BottomNav() {
  const { pathname } = useLocation();
  const { t, language } = useLanguage();

  const tabs: { to: string; labelKey: string; icon: typeof Home; center?: boolean }[] = [
    { to: "/dashboard", labelKey: "nav.home", icon: Home },
    { to: "/insights", labelKey: "nav.insights", icon: BarChart3 },
    { to: "/log", labelKey: "nav.log", icon: Plus, center: true },
    { to: "/leaderboard", labelKey: "nav.top", icon: Trophy },
    { to: "/profile", labelKey: "nav.me", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px]">
      <div className="mx-3 mb-3 flex items-end justify-around rounded-3xl border border-white/20 bg-white/20 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10">
        {tabs.map(({ to, labelKey, icon: Icon, center }) => {
          const active = pathname === to;
          if (center) {
            return (
              <Link
                key={to}
                to={to}
                className="-mt-7 grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elevated)" }}
                aria-label={t("nav.quickLog")}
              >
                <Icon size={26} strokeWidth={2.6} />
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              <span className={labelKey === "nav.home" && language === "kn" ? "text-[9px]" : ""}>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
