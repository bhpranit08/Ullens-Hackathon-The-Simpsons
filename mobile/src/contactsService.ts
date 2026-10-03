import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Contact = {
  id: string;
  name: string;
  email: string;
};

const CONTACTS_KEY = 'trailguard.contacts';

export async function getContacts(): Promise<Contact[]> {
  try {
    const saved = Platform.OS === 'web' 
      ? globalThis.localStorage?.getItem(CONTACTS_KEY) 
      : await SecureStore.getItemAsync(CONTACTS_KEY);
      
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function addContact(name: string, email: string): Promise<Contact> {
  const current = await getContacts();
  const newContact: Contact = {
    id: Math.random().toString(36).substring(2, 11),
    name,
    email
  };
  
  const updated = [...current, newContact];
  const value = JSON.stringify(updated);
  
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CONTACTS_KEY, value);
  } else {
    await SecureStore.setItemAsync(CONTACTS_KEY, value);
  }
  
  return newContact;
}

export async function removeContact(id: string) {
  const current = await getContacts();
  const updated = current.filter(c => c.id !== id);
  const value = JSON.stringify(updated);
  
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CONTACTS_KEY, value);
  } else {
    await SecureStore.setItemAsync(CONTACTS_KEY, value);
  }
}
