import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "../global.css";

import { AuthProvider, useAuth } from "@/auth";
import { TrackingManager } from "@/components/tracking-manager";
import { PushManager } from "@/components/push-manager";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
function Navigation() {
  const { ready, user } = useAuth();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F5F5ED",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#256B4D" />
      </View>
    );
  return (
    <>
      <TrackingManager />
      <PushManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="sessions/new"
            options={{ headerShown: true, title: "Safety plan" }}
          />
          <Stack.Screen
            name="sessions/[id]"
            options={{ headerShown: true, title: "Safety session" }}
          />
          <Stack.Screen
            name="hazards/new"
            options={{ headerShown: true, title: "Report hazard" }}
          />
        </Stack.Protected>
        <Stack.Screen name="verify" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}
