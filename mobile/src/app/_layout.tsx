import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="start" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session/active" options={{ gestureEnabled: false }} />
        <Stack.Screen name="session/end" options={{ gestureEnabled: false }} />
        <Stack.Screen name="activity/[id]" />
        <Stack.Screen name="shared/[id]" />
      </Stack>
    </AuthProvider>
  );
}
