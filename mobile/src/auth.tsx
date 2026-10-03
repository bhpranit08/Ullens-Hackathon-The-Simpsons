import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";
import { ApiError, request } from "@/lib/api";
import type { User } from "@/lib/types";
import { stopTracking } from "@/lib/tracking";
type Stored = { token: string; user: User };
type Auth = {
  user: User | null;
  token: string | null;
  ready: boolean;
  api: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null),
  key = "trailguard.auth";
const storage = {
  get: () =>
    Platform.OS === "web"
      ? Promise.resolve(
          typeof window === "undefined" ? null : localStorage.getItem(key),
        )
      : SecureStore.getItemAsync(key),
  set: (value: string) =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  remove: () =>
    Platform.OS === "web"
      ? Promise.resolve(
          typeof window === "undefined"
            ? undefined
            : localStorage.removeItem(key),
        )
      : SecureStore.deleteItemAsync(key),
};
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Stored | null>(null),
    [ready, setReady] = useState(false);
  const sessionRef = useRef<Stored | null>(null);
  const save = useCallback(async (value: Stored | null) => {
    sessionRef.current = value;
    setSession(value);
    if (value) await storage.set(JSON.stringify(value));
    else await storage.remove();
  }, []);
  const api = useCallback(
    async <T,>(path: string, body?: unknown, method?: string) => {
      const requestToken = sessionRef.current?.token;
      try {
        return await request<T>(path, { body, method, token: requestToken });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          requestToken === sessionRef.current?.token
        ) {
          await stopTracking();
          await save(null);
        }
        throw error;
      }
    },
    [save],
  );
  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const raw = await storage.get();
        if (!raw) return;
        const saved = JSON.parse(raw) as Stored;
        if (!saved.token || !saved.user?.id) {
          await storage.remove();
          return;
        }
        sessionRef.current = saved;
        try {
          const data = await request<{ user: User }>("/auth/me", {
            token: saved.token,
          });
          saved.user = data.user;
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await storage.remove();
            sessionRef.current = null;
            return;
          }
        }
        if (mounted) await save(saved);
      } catch {
        await storage.remove();
      } finally {
        if (mounted) setReady(true);
      }
    };
    void restore();
    return () => {
      mounted = false;
    };
  }, [save]);
  const sign = async (path: string, body: unknown) => {
    const value = await request<Stored>(path, { body });
    await save(value);
  };
  const refreshUser = async () => {
    const data = await api<{ user: User }>("/auth/me");
    if (sessionRef.current)
      await save({ ...sessionRef.current, user: data.user });
  };
  const logout = async () => {
    try {
      await api("/auth/logout", {});
    } finally {
      await stopTracking();
      await save(null);
    }
  };
  return (
    <Context.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        ready,
        api,
        login: (email, password) => sign("/auth/login", { email, password }),
        register: (name, email, password) =>
          sign("/auth/register", { name, email, password }),
        refreshUser,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
