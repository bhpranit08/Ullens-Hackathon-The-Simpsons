import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as SecureStore from "expo-secure-store";
import { clearQueue, makePing, queueAndFlush } from "@/lib/location-queue";
const TASK = "trailguard-location",
  key = "trailguard.tracking";
type Tracking = { sessionId: string; token: string };
let foreground: Location.LocationSubscription | null = null;
let status = "Location tracking is stopped.";
let currentId: string | null = null;
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  TASK,
  async ({ data, error }) => {
    if (error) {
      status = error.message;
      return;
    }
    const saved = await SecureStore.getItemAsync(key);
    if (!saved) return;
    const tracking = JSON.parse(saved) as Tracking;
    for (const p of data?.locations || [])
      await queueAndFlush(
        tracking.sessionId,
        tracking.token,
        makePing(
          p.coords.latitude,
          p.coords.longitude,
          "gps",
          p.timestamp,
          p.coords.accuracy || undefined,
        ),
      );
  },
);
export async function initialLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Allow location access in device settings to start a live session.",
    );
  const p = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return makePing(
    p.coords.latitude,
    p.coords.longitude,
    "gps",
    p.timestamp,
    p.coords.accuracy || undefined,
  );
}
export async function startTracking(sessionId: string, token: string) {
  if (currentId === sessionId) {
    await queueAndFlush(sessionId, token);
    return status;
  }
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    status =
      "Location permission is missing. Open settings, then resume tracking.";
    return status;
  }
  foreground?.remove();
  const saved = await SecureStore.getItemAsync(key);
  if (
    saved &&
    JSON.parse(saved).sessionId !== sessionId &&
    (await Location.hasStartedLocationUpdatesAsync(TASK))
  )
    await Location.stopLocationUpdatesAsync(TASK);
  await SecureStore.setItemAsync(key, JSON.stringify({ sessionId, token }));
  const upload = (p: Location.LocationObject) => {
    void queueAndFlush(
      sessionId,
      token,
      makePing(
        p.coords.latitude,
        p.coords.longitude,
        "gps",
        p.timestamp,
        p.coords.accuracy || undefined,
      ),
    ).catch((error) => {
      status = "Location could not be saved: " + String(error.message);
    });
  };
  foreground = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000,
      distanceInterval: 25,
    },
    upload,
  );
  currentId = sessionId;
  await queueAndFlush(sessionId, token);
  status =
    "Tracking while the app is open. Enable background tracking in Profile for tracking with the screen locked.";
  const backgroundGranted = (await Location.getBackgroundPermissionsAsync())
    .granted;
  if (backgroundGranted && (await TaskManager.isAvailableAsync())) {
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK)))
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000,
        distanceInterval: 25,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "TrailGuard safety session",
          notificationBody: "Sharing your location with your trusted contact.",
        },
      });
    status =
      "Foreground and background tracking enabled. Tracking can stop if the app is force-closed.";
  }
  if (
    !backgroundGranted &&
    (await TaskManager.isAvailableAsync()) &&
    (await Location.hasStartedLocationUpdatesAsync(TASK))
  )
    await Location.stopLocationUpdatesAsync(TASK);
  return status;
}
export async function enableBackground() {
  await Location.requestForegroundPermissionsAsync();
  const result = await Location.requestBackgroundPermissionsAsync();
  if (!result.granted)
    throw new Error(
      "Background location was not granted. Enable Always/Allow all the time in settings.",
    );
  if (!(await TaskManager.isAvailableAsync()))
    throw new Error(
      "Background tracking needs a TrailGuard development build.",
    );
  currentId = null;
  return "Background permission granted. Your active session will resume tracking.";
}
export async function stopTracking() {
  foreground?.remove();
  foreground = null;
  currentId = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK))
      await Location.stopLocationUpdatesAsync(TASK);
  } catch {
    /* Native module may be unavailable in Expo Go. */
  }
  await SecureStore.deleteItemAsync(key);
  await clearQueue();
  status = "Location tracking is stopped.";
}
export function trackingStatus() {
  return status;
}
