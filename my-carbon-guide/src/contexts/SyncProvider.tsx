import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { connectSync, disconnectSync } from "@/lib/syncBus";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      disconnectSync();
      return;
    }

    let cancelled = false;

    user.getIdToken().then((token) => {
      if (!cancelled) connectSync(token);
    });

    return () => {
      cancelled = true;
      disconnectSync();
    };
  }, [user]);

  return <>{children}</>;
}
