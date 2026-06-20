import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import Dock from "./Dock";
import Lightfall from "@/components/Lightfall";

export function AppShell({ children, hideNavbar = false, hideStreak = false }: { children: ReactNode; hideNavbar?: boolean; hideStreak?: boolean }) {
  return (
    <div className="fixed inset-0 bg-[#0A1F17] flex justify-center overflow-hidden">
        <div className="app-container w-full max-w-[430px] h-[100dvh] relative flex flex-col">
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden text-foreground sm:rounded-[2.25rem] sm:shadow-2xl sm:mt-1">
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <Lightfall
              colors={['#22C55E', '#34D399', '#A7F3D0']}
              backgroundColor="#000000"
              speed={0.3}
              streakCount={3}
              streakWidth={0.5}
              streakLength={1}
              glow={0.6}
              density={0.25}
              twinkle={0.3}
              zoom={3}
              backgroundGlow={0.1}
              opacity={1}
              mouseInteraction={false}
              mouseStrength={0}
              mouseRadius={0}
            />
          </div>
          {!hideNavbar && <Navbar hideStreak={hideStreak} />}
          <div className="relative flex flex-col overflow-y-auto scrollbar-none flex-1 min-h-0 overscroll-none pb-[75px]">
            <main className="relative flex-1 px-5 pt-2">{children}</main>
          </div>
          <Dock />
        </div>
      </div>
    </div>
  );
}
