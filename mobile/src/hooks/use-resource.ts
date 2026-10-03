import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/auth";
export function useResource<T>(path: string, poll = false) {
  const { api, token } = useAuth();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const result = await api<T>(path);
      if (current === sequence.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (current === sequence.current)
        setError(e instanceof Error ? e.message : "Unable to load data.");
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [api, path]);
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      void refresh();
      const timer = poll ? setInterval(() => void refresh(), 5000) : undefined;
      return () => {
        ++sequence.current;
        if (timer) clearInterval(timer);
      };
    }, [refresh, poll, token]),
  );
  return { data, error, loading, refresh };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    lock = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete the action.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}
