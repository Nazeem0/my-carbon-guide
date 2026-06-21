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

    const getFreshToken = () => user.getIdToken(/* forceRefresh */ true);

    connectSync(getFreshToken);

    return () => {
      disconnectSync();
    };
  }, [user]);

  return <>{children}</>;
}
