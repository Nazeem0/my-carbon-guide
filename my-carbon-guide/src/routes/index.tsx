import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ElectricBorder from "@/components/ElectricBorder";
import leafSphere from '../assets/images/leaf-sphere.png';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { user, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const steps = [
    { title: t("onboarding.step1.title"), body: t("onboarding.step1.body"), emoji: "📝" },
    { title: t("onboarding.step2.title"), body: t("onboarding.step2.body"), emoji: "🤖" },
    { title: t("onboarding.step3.title"), body: t("onboarding.step3.body"), emoji: "🏆" },
    { title: t("onboarding.step4.title"), body: t("onboarding.step4.body"), emoji: "🏃" },
    { title: t("onboarding.step5.title"), body: t("onboarding.step5.body"), emoji: "🌍" },
  ];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="app-shell-viewport flex min-h-screen items-center justify-center">
    <div className="app-shell-container relative flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-between overflow-hidden pb-8 sm:my-8 sm:h-[calc(100dvh-4rem)] sm:rounded-[2.25rem] sm:shadow-2xl" style={{ background: 'linear-gradient(180deg, #DCFCE7 0%, #ECFDF5 50%, #F0FDF4 100%)' }}>
      
      {/* Leaf sphere graphic */}
      <img
        src={leafSphere}
        alt=""
        className="leaf-sphere-graphic"
      />

      
      {/* Onboarding card wrapper - sits at bottom */}
      <div className="relative z-10 w-full px-5 pointer-events-none" style={{ marginTop: 'auto' }}>
        <div className="pointer-events-auto">
          <ElectricBorder
            color="#34D399"
            speed={1}
            chaos={0.12}
            borderRadius={20}
            style={{ borderRadius: 20 }}
          >
            <div className="p-8 flex flex-col glass-card rounded-[20px]">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-3xl border border-white/15">
                {steps[step].emoji}
              </div>
              <h2 className="mt-8 text-xl font-bold text-white">{steps[step].title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{steps[step].body}</p>

              {step === steps.length - 1 && (
                <button
                  onClick={loginWithGoogle}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '12px 20px',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    fontWeight: 600,
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    marginTop: 16,
                  }}
                >
                  <img src="/google-icon.svg" alt="" style={{ width: 18, height: 18 }} />
                  {t("onboarding.signIn")}
                </button>
              )}

              {/* Dots + Next */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-6 bg-[#34D399]" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
                
                {step < steps.length - 1 && (
                  <button
                    onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/10 border border-white/20 text-white transition-all active:scale-95 hover:bg-white/20"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </ElectricBorder>
        </div>
      </div>
    </div>
    </div>
  );
}
