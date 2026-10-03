import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/auth";
import { listenForPush } from "@/lib/push";
export function PushManager() {
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    return listenForPush((id) =>
      router.push({ pathname: "/sessions/[id]", params: { id } }),
    );
  }, [userId]);
  return null;
}
