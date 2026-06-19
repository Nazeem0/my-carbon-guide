import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { InteractiveGlobe } from "@/components/scene/InteractiveGlobe";
import { FloatingParticles } from "@/components/scene/FloatingParticles";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
    <div className="relative mx-auto flex min-h-screen max-w-[430px] flex-col bg-background text-foreground shadow-2xl sm:border-x border-border overflow-hidden">
      
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Canvas camera={{ fov: 60, position: [0, 0.5, 8] }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 4, 4]} intensity={1.5} />
          <InteractiveGlobe step={step} />
          <FloatingParticles step={step} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-1 flex-col px-5 pt-10 pb-8 pointer-events-none">
        
        {/* Hero */}
        <div className="mb-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight drop-shadow-sm">
            {t("onboarding.welcome")}{" "}
            <span className="text-primary">EcoLog</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            {t("onboarding.tagline")}
          </p>
        </div>

        {/* Interactive UI Wrapper */}
        <div className="pointer-events-auto">
          {/* Step Card */}
          <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary/80 text-3xl border border-border/50">
              {steps[step].emoji}
            </div>
            <h2 className="mt-5 text-xl font-bold text-foreground">{steps[step].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{steps[step].body}</p>

            {/* Dots + Next */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                    }`}
                  />
                ))}
              </div>
              
              {step < steps.length - 1 && (
                <button
                  onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
                  className="grid h-10 w-10 place-items-center rounded-full bg-secondary/80 border border-border/50 text-foreground hover:bg-muted transition-all active:scale-95"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 space-y-3 min-h-[48px]">
            {step === steps.length - 1 && (
              <button 
                onClick={loginWithGoogle}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg"
              >
                <GoogleIcon /> {t("onboarding.signIn")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.22-4.74 3.22-8.07z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC04" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
