import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/auth";
import { startTracking, stopTracking } from "@/lib/tracking";
import type { SafetySession } from "@/lib/types";
export function TrackingManager() {
  const { user, token, api } = useAuth();
  useEffect(() => {
    if (!token || !user) return;
    let mounted = true,
      running = false;
    const reconcile = async () => {
      if (running) return;
      running = true;
      try {
        const { sessions } = await api<{ sessions: SafetySession[] }>(
          "/sessions",
        );
        if (!mounted) return;
        const active = sessions.find(
          (s) =>
            s.owner.id === user.id &&
            s.status !== "completed" &&
            s.trackingMode === "live",
        );
        if (active) await startTracking(active.id, token);
        else await stopTracking();
      } catch {
        /* Keep current tracking during transient API downtime. */
      } finally {
        running = false;
      }
    };
    void reconcile();
    const timer = setInterval(() => void reconcile(), 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcile();
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [api, token, user]);
  return null;
}
