import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type User = { id: string; name: string; email: string };
type Session = { token: string; user: User };
type Auth = { user: User | null; ready: boolean; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void> };

const key = 'trailguard.auth';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';
const AuthContext = createContext<Auth | null>(null);

const sessionStore = {
  get: () => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: (value: string) => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  remove: () => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

async function request(path: string, body?: Record<string, string>, token?: string) {
  const response = await fetch(`${apiUrl}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Unable to complete that request.');
  return data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sessionStore.get().then(async (saved) => {
      if (!saved) return;
      const session: Session = JSON.parse(saved);
      setUser((await request('/auth/me', undefined, session.token)).user);
    }).catch(() => sessionStore.remove()).finally(() => setReady(true));
  }, []);

  async function authenticate(path: '/auth/login' | '/auth/register', body: Record<string, string>) {
    const session: Session = await request(path, body);
    await sessionStore.set(JSON.stringify(session));
    setUser(session.user);
  }

  return <AuthContext.Provider value={{ user, ready, login: (email, password) => authenticate('/auth/login', { email, password }), register: (name, email, password) => authenticate('/auth/register', { name, email, password }), logout: async () => { await sessionStore.remove(); setUser(null); } }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
