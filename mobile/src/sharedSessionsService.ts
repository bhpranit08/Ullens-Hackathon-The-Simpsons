import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SharedSession = {
  id: string;
  senderEmail: string;
  senderName: string;
  targetEmail: string; // The person who should see this
  activityType: string;
  latitude: number;
  longitude: number;
};

const SHARED_SESSIONS_KEY = 'trailguard.shared_sessions';

export async function getSharedSessions(userEmail: string): Promise<SharedSession[]> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(SHARED_SESSIONS_KEY) 
      : await SecureStore.getItemAsync(SHARED_SESSIONS_KEY);
      
    if (!saved) return [];
    const allSessions: SharedSession[] = JSON.parse(saved);
    // Return sessions meant for this user
    return allSessions.filter(s => s.targetEmail.toLowerCase() === userEmail.toLowerCase());
  } catch {
    return [];
  }
}

export async function addSharedSession(session: SharedSession): Promise<void> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(SHARED_SESSIONS_KEY) 
      : await SecureStore.getItemAsync(SHARED_SESSIONS_KEY);
      
    let allSessions: SharedSession[] = saved ? JSON.parse(saved) : [];
    
    // Remove any existing session from this sender to keep it clean for the demo
    allSessions = allSessions.filter(s => s.senderEmail !== session.senderEmail);
    allSessions.push(session);
    
    const value = JSON.stringify(allSessions);
    
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(SHARED_SESSIONS_KEY, value);
    } else {
      await SecureStore.setItemAsync(SHARED_SESSIONS_KEY, value);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function removeSharedSession(senderEmail: string): Promise<void> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(SHARED_SESSIONS_KEY) 
      : await SecureStore.getItemAsync(SHARED_SESSIONS_KEY);
      
    if (!saved) return;
    
    let allSessions: SharedSession[] = JSON.parse(saved);
    allSessions = allSessions.filter(s => s.senderEmail !== senderEmail);
    
    const value = JSON.stringify(allSessions);
    
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(SHARED_SESSIONS_KEY, value);
    } else {
      await SecureStore.setItemAsync(SHARED_SESSIONS_KEY, value);
    }
  } catch (e) {
    console.error(e);
  }
}
