import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNavbar = false }: { children: ReactNode; hideNavbar?: boolean }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto flex min-h-screen max-w-[430px] flex-col bg-background">
        {!hideNavbar && <Navbar />}
        <main className="flex-1 px-5 pb-28 pt-2">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
