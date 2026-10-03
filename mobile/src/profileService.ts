import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PROFILE_IMAGE_KEY = 'trailguard.profile_image';

export async function getProfileImage(): Promise<string | null> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(PROFILE_IMAGE_KEY) 
      : await SecureStore.getItemAsync(PROFILE_IMAGE_KEY);
      
    return saved ? saved : null;
  } catch {
    return null;
  }
}

export async function setProfileImage(uri: string | null): Promise<void> {
  if (!uri) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(PROFILE_IMAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(PROFILE_IMAGE_KEY);
    }
    return;
  }

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(PROFILE_IMAGE_KEY, uri);
  } else {
    await SecureStore.setItemAsync(PROFILE_IMAGE_KEY, uri);
  }
}
