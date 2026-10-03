import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Hazard = {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

const HAZARDS_KEY = 'trailguard.hazards';

export async function getHazards(): Promise<Hazard[]> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(HAZARDS_KEY) 
      : await SecureStore.getItemAsync(HAZARDS_KEY);
      
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function addHazard(hazard: Hazard): Promise<void> {
  const current = await getHazards();
  
  const updated = [...current, hazard];
  const value = JSON.stringify(updated);
  
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(HAZARDS_KEY, value);
  } else {
    await SecureStore.setItemAsync(HAZARDS_KEY, value);
  }
}

export async function removeHazard(id: string): Promise<void> {
  const current = await getHazards();
  const updated = current.filter(h => h.id !== id);
  const value = JSON.stringify(updated);
  
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(HAZARDS_KEY, value);
  } else {
    await SecureStore.setItemAsync(HAZARDS_KEY, value);
  }
}
