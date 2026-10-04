/**
 * apiService.ts
 * Centralised helper for all authenticated backend API calls.
 * The auth token is passed in from the caller (the auth context exposes it
 * via sessionStore, but for simplicity callers pass it explicitly here).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.88:5001/api';
const SESSION_KEY = 'trailguard.auth';

// ── token helper ──────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    const saved = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);
    if (!saved) return null;
    return JSON.parse(saved).token;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let data: any;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

// ── Trusted Contacts ──────────────────────────────────────────────────────────

export type ApiContact = { id: string; name: string; email: string };
export type ApiContactRequest = { requestId: string; user: ApiContact };

export async function apiGetContacts(): Promise<ApiContact[]> {
  const data = await apiFetch('/contacts');
  return data.contacts ?? [];
}

export async function apiGetContactData(): Promise<{ contacts: ApiContact[], pendingRequests: ApiContactRequest[], sentRequests: ApiContactRequest[] }> {
  const data = await apiFetch('/contacts');
  return {
    contacts: data.contacts ?? [],
    pendingRequests: data.pendingRequests ?? [],
    sentRequests: data.sentRequests ?? []
  };
}

export async function apiAddContact(email: string): Promise<ApiContact> {
  const data = await apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return data.contact;
}

export async function apiAcceptContactRequest(requestId: string): Promise<void> {
  await apiFetch(`/contacts/${requestId}/accept`, { method: 'PATCH' });
}

export async function apiRejectContactRequest(requestId: string): Promise<void> {
  await apiFetch(`/contacts/${requestId}`, { method: 'DELETE' });
}

export async function apiRemoveContact(contactId: string): Promise<void> {
  await apiFetch(`/contacts/${contactId}`, { method: 'DELETE' });
}

// ── Live Sessions ─────────────────────────────────────────────────────────────

export type LiveSessionPayload = {
  sessionId: string;
  activityType: string;
  title: string;
  route?: string;
  sharedWithEmails: string[];
  latitude?: number;
  longitude?: number;
};

export type LiveSession = {
  sessionId: string;
  owner: ApiContact;
  activityType: string;
  title: string;
  route: string;
  status: 'active' | 'sos' | 'ended';
  sosTriggeredAt?: string;
  startedAt: string;
  endedAt?: string;
  location?: { latitude: number; longitude: number; updatedAt: string };
};

export async function apiStartSession(payload: LiveSessionPayload): Promise<void> {
  await apiFetch('/sessions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateLocation(sessionId: string, latitude: number, longitude: number): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/location`, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function apiCheckIn(sessionId: string, latitude?: number, longitude?: number): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function apiTriggerSOS(sessionId: string, latitude?: number, longitude?: number): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/sos`, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function apiCancelSOS(sessionId: string): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/sos`, { method: 'DELETE' });
}

export async function apiEndSession(sessionId: string): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/end`, { method: 'POST' });
}

export async function apiGetSharedSessions(): Promise<LiveSession[]> {
  const data = await apiFetch('/sessions/shared');
  return data.sessions ?? [];
}

export async function apiGetSession(sessionId: string): Promise<LiveSession | null> {
  try {
    const data = await apiFetch(`/sessions/${sessionId}`);
    return data.session ?? null;
  } catch {
    return null;
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type ApiNotification = {
  id: string;
  type: 'activity_started' | 'activity_ended' | 'checkin_safe' | 'sos' | 'missed_checkin';
  sessionId?: string;
  message: string;
  read: boolean;
  sender: ApiContact;
  createdAt: string;
};

export async function apiGetNotifications(): Promise<ApiNotification[]> {
  const data = await apiFetch('/notifications');
  return data.notifications ?? [];
}

export async function apiMarkNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/read-all', { method: 'PATCH' });
}
