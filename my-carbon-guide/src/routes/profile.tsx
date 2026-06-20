import { useState, useEffect } from "react";
import { AppShell } from "@/components/ecolog/AppShell";
import { GlowCard } from "@/components/ecolog/GlowCard";
import { useActivities } from "@/hooks/useActivities";
import { Bell, Globe, LogOut, ChevronRight, Pencil, X, MapPin, GraduationCap, User, Phone, AlignLeft, Check } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { profile, loading, updateGoal, updateProfile } = useUserProfile();
  const { logout } = useAuth();
  const { activities } = useActivities(profile?.dailyGoalKg ?? 2.0);

  const dynamicBadges = [
    { key: "badge.firstLog", emoji: "🌱", earned: activities.length > 0 },
    { key: "badge.sevenDay", emoji: "🔥", earned: (profile?.streak ?? 0) >= 7 },
    { key: "badge.carbonHero", emoji: "🦸", earned: (profile?.daysActive ?? 0) >= 30 },
    { key: "badge.greenCommuter", emoji: "🚲", earned: activities.some(a => a.activityKey === 'bike_ride' || a.activityKey === 'walk' || a.activityKey === 'bike_activa' || a.activityKey === 'e_scooter') },
    { key: "badge.cityTop10", emoji: "🏆", earned: (profile?.rank ?? Infinity) <= 10 },
    { key: "badge.ecoWarrior", emoji: "🌍", earned: activities.length >= 50 }
  ];

  const [goal, setGoal] = useState(2.0);
  const [notif, setNotif] = useState(true);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editAge, setEditAge] = useState<number>(20);
  const [editGender, setEditGender] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editYear, setEditYear] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (profile) {
      setGoal(profile.dailyGoalKg);
      setEditName(profile.name);
      setEditCity(profile.city);
      setEditCollege(profile.college || "");
      setEditAge(profile.age || 20);
      setEditGender(profile.gender || "");
      setEditBio(profile.bio || "");
      setEditPhone(profile.phone || "");
      setEditYear(profile.yearOfStudy || "");
    }
  }, [profile]);

  const handleSaveProfile = () => {
    // Close immediately — optimistic update
    setEditOpen(false);
    // Write to Firestore in the background (no await, no spinner)
    updateProfile({
      name: editName.trim(),
      city: editCity.trim(),
      college: editCollege.trim(),
      age: editAge,
      gender: editGender.trim(),
      bio: editBio.trim(),
      phone: editPhone.trim(),
      yearOfStudy: editYear.trim(),
    });
  };

  /* ── Skeleton layout while loading ── */
  if (loading || !profile) {
    return (
      <AppShell>
        <section className="flex flex-col items-center pt-2 text-center gap-2">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-5 w-32 mt-2" />
          <Skeleton className="h-3 w-24" />
        </section>
        <section className="mt-5 grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </section>
        <Skeleton className="mt-5 h-24 w-full" />
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="mt-5 h-48 w-full" />
      </AppShell>
    );
  }

  const initials = profile.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const rankColor = profile.rank <= 10 ? "text-yellow-500" : profile.rank <= 50 ? "text-primary" : "text-muted-foreground";

  return (
    <AppShell>
      {/* ── Avatar + Name ── */}
      <section className="flex flex-col items-center pt-2 text-center">
        <button onClick={() => setEditOpen(true)} className="relative group" aria-label={t("settings.editProfile")}>
          <div
            className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold bg-white/10 border border-white/20 backdrop-blur-2xl"
          >
            {initials}
          </div>
          <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 border border-white/30 shadow-sm group-hover:scale-110 transition-transform backdrop-blur-xl">
            <Pencil size={11} className="text-primary" />
          </span>
        </button>
        <h1 className="mt-3 text-xl font-extrabold">{profile.name}</h1>
        {profile.college && (
          <p className="flex items-center gap-1 text-xs font-medium text-primary mt-0.5">
            <GraduationCap size={11} /> {profile.college}
          </p>
        )}
        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <MapPin size={11} /> {profile.city}
        </p>
        <p className="text-xs text-muted-foreground">{profile.email}</p>
      </section>

      {/* ── Stats ── */}
      <section className="mt-5 grid grid-cols-3 gap-2">
        <Stat label={t("stats.today")} value={`${(profile.todayKg ?? 0).toFixed(2)} kg`} />
        <Stat label={t("stats.daysActive")} value={profile.daysActive} />
        <GlowCard className="rounded-2xl border border-white/20 bg-white/20 p-3 text-center shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10" enableStars={false} particleCount={0}>
          <div className={`text-lg font-extrabold ${rankColor}`}>#{profile.rank}</div>
          <div className="text-[11px] text-muted-foreground">{t("stats.rank")}</div>
        </GlowCard>
      </section>

      {/* ── Daily Goal ── */}
      <GlowCard className="mt-5 rounded-3xl border border-white/20 bg-white/20 p-5 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10" enableStars={false} particleCount={0}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("profile.dailyGoal")}</h2>
          <span className="text-sm font-extrabold text-primary">{goal.toFixed(1)} kg</span>
        </div>
        <input
          type="range" min={0.5} max={5} step={0.1} value={goal}
          onChange={(e) => setGoal(Number(e.target.value))}
          onMouseUp={() => updateGoal(goal)}
          onTouchEnd={() => updateGoal(goal)}
          className="mt-3 w-full accent-[oklch(0.62_0.13_165)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>0.5 kg</span><span>5 kg</span>
        </div>
      </GlowCard>

      {/* ── Badges ── */}
      <section className="mt-5">
        <h2 className="mb-3 text-sm font-bold">{t("profile.badges")}</h2>
        <div className="grid grid-cols-4 gap-3">
          {dynamicBadges.map((b) => (
            <GlowCard 
              key={b.key} 
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center ${b.earned ? "border-white/20 bg-white/20 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10" : "border-white/20 bg-white/5 opacity-50"}`}
              enableStars={b.earned}
              particleCount={b.earned ? 5 : 0}
            >
              <div className="text-2xl relative z-10">{b.emoji}</div>
              <div className="text-[10px] font-semibold leading-tight relative z-10">{t(b.key)}</div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ── Settings ── */}
      <GlowCard className="mt-5 overflow-hidden rounded-3xl border border-white/20 bg-white/20 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10" enableStars={false} particleCount={0}>
        <div onClick={() => setEditOpen(true)} className="cursor-pointer">
          <Row icon={<Pencil size={18} />} label={t("settings.editProfile")} trailing={profile.city}>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Row>
        </div>
        <div>
        <Row icon={<Bell size={18} />} label={t("settings.notifications")}>
          <Toggle on={notif} onChange={setNotif} /> </Row>
          </div>
        <div onClick={() => setLangOpen(true)} className="cursor-pointer">
          <Row icon={<Globe size={18} />} label={t("settings.language")} trailing={{ en: "English", hi: "हिंदी", kn: "ಕನ್ನಡ" }[language]}>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Row>
        </div>
        <div onClick={logout} className="cursor-pointer">
          <Row icon={<LogOut size={18} />} label={t("settings.signOut")} danger />
        </div>
      </GlowCard>

      {/* ── Language Bottom Sheet ── */}
      {langOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end mx-auto max-w-[430px] bg-black/40 backdrop-blur-sm" onClick={() => setLangOpen(false)}>
          <div
            className="mx-auto w-full max-w-[430px] rounded-3xl border border-white/20 bg-white/20 p-6 shadow-2xl backdrop-blur-xl dark:bg-white/10 mb-28"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">{t("settings.language")}</h2>
              <button onClick={() => setLangOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-1">
              {(["en", "hi", "kn"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setLangOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    language === lang ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                  }`}
                >
                  <span className="flex-1 text-sm font-semibold">
                    {{ en: t("lang.name"), hi: t("lang.hindi"), kn: t("lang.kannada") }[lang]}
                  </span>
                  {language === lang && <Check size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Bottom Sheet ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end mx-auto max-w-[430px] bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
          <div
            className="mx-auto w-full max-w-[430px] rounded-3xl border border-white/20 bg-white/20 p-6 shadow-2xl backdrop-blur-xl dark:bg-white/10 mb-28"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">{t("settings.editProfile")}</h2>
              <button onClick={() => setEditOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-none pr-1">
              <Field label={t("profile.displayName")} icon={<User size={14} />}>
                <input
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                  className="input-field"
                />
              </Field>
              <Field label={t("profile.city")} icon={<MapPin size={14} />}>
                <input
                  type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)}
                  placeholder={t("profile.cityPlaceholder")}
                  className="input-field"
                />
              </Field>
              <Field label={t("profile.college")} icon={<GraduationCap size={14} />}>
                <input
                  type="text" value={editCollege} onChange={(e) => setEditCollege(e.target.value)}
                  placeholder={t("profile.collegePlaceholder")}
                  className="input-field"
                />
              </Field>
              <Field label={t("profile.age")} icon={<User size={14} />}>
                <input
                  type="number" value={editAge} onChange={(e) => setEditAge(Number(e.target.value))}
                  min={10} max={100}
                  className="input-field"
                />
              </Field>
              <Field label={t("profile.gender")} icon={<User size={14} />}>
                <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="input-field">
                  <option value="">{t("profile.selectGender")}</option>
                  <option value="Male">{t("gender.male")}</option>
                  <option value="Female">{t("gender.female")}</option>
                  <option value="Other">{t("gender.other")}</option>
                  <option value="Prefer not to say">{t("gender.preferNot")}</option>
                </select>
              </Field>
              <Field label={t("profile.bio")} icon={<AlignLeft size={14} />}>
                <textarea
                  value={editBio} onChange={(e) => setEditBio(e.target.value)}
                  placeholder={t("profile.bioPlaceholder")}
                  className="input-field min-h-[80px] resize-none"
                />
              </Field>
              <Field label={t("profile.phone")} icon={<Phone size={14} />}>
                <input
                  type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder={t("profile.phonePlaceholder")}
                  className="input-field"
                />
              </Field>
              <Field label={t("profile.yearOfStudy")} icon={<GraduationCap size={14} />}>
                <input
                  type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)}
                  placeholder={t("profile.yearPlaceholder")}
                  className="input-field"
                />
              </Field>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!editName.trim() || !editCity.trim()}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {t("profile.save")}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ── Helpers ── */
function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <GlowCard className="rounded-2xl border border-white/20 bg-white/20 p-3 text-center shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-white/10" enableStars={false} particleCount={0}>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </GlowCard>
  );
}

function Row({ icon, label, children, trailing, danger }: { icon: React.ReactNode; label: string; children?: React.ReactNode; trailing?: string; danger?: boolean }) {
  return (
    <button className={`flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left last:border-0 ${danger ? "text-destructive" : ""}`}>
      <span className={danger ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {trailing && <span className="text-xs text-muted-foreground">{trailing}</span>}
      {children}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      role="switch" aria-checked={on}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </span>
  );
}
