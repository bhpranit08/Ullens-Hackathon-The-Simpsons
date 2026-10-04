import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type UpdateEvent = {
  time: string;
  message: string;
};

export type HistoryEvent = {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
  active: boolean;
  date: string;
  duration?: number;
  description?: string;
  notes?: string;
  photos?: string[];
  updates?: UpdateEvent[];
  distance?: number;
  pace?: number;
};
const HISTORY_KEY = 'trailguard.history';

export async function getHistoryEvents(): Promise<HistoryEvent[]> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(HISTORY_KEY) 
      : await SecureStore.getItemAsync(HISTORY_KEY);
      
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function addHistoryEvent(event: Omit<HistoryEvent, 'date' | 'id'> & { id?: string }) {
  try {
    const current = await getHistoryEvents();
    const newEvent: HistoryEvent = {
      ...event,
      id: event.id || Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString()
    };
    
    const updated = [newEvent, ...current];
    const value = JSON.stringify(updated);
    
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(HISTORY_KEY, value);
    } else {
      await SecureStore.setItemAsync(HISTORY_KEY, value);
    }
    return newEvent.id;
  } catch (e) {
    console.error('Failed to save history event', e);
  }
}

export async function updateHistoryEvent(id: string, eventUpdates: Partial<HistoryEvent>) {
  try {
    const current = await getHistoryEvents();
    const updated = current.map(e => e.id === id ? { ...e, ...eventUpdates } : e);
    const value = JSON.stringify(updated);
    
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(HISTORY_KEY, value);
    } else {
      await SecureStore.setItemAsync(HISTORY_KEY, value);
    }
  } catch (e) {
    console.error('Failed to update history event', e);
  }
}

export async function getHistoryEvent(id: string): Promise<HistoryEvent | undefined> {
  const current = await getHistoryEvents();
  return current.find(e => e.id === id);
}
