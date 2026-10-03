import { makePing, queueAndFlush, clearQueue } from "@/lib/location-queue";
let watcher: number | undefined,
  currentId: string | undefined,
  status = "Browser tracking runs only while this page is open.";
export async function initialLocation() {
  if (!navigator.geolocation)
    throw new Error(
      "Location is not available in this browser. Use HTTPS or localhost.",
    );
  return new Promise<ReturnType<typeof makePing>>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve(
          makePing(
            p.coords.latitude,
            p.coords.longitude,
            "browser",
            p.timestamp,
            p.coords.accuracy,
          ),
        ),
      (e) =>
        reject(new Error(e.message || "Allow browser location permission.")),
      { enableHighAccuracy: true, timeout: 15000 },
    ),
  );
}
export async function startTracking(sessionId: string, token: string) {
  if (currentId === sessionId && watcher !== undefined) {
    await queueAndFlush(sessionId, token);
    return status;
  }
  if (watcher !== undefined) navigator.geolocation.clearWatch(watcher);
  currentId = sessionId;
  if (!navigator.geolocation) {
    status = "Browser location is unavailable. Use HTTPS or localhost.";
    return status;
  }
  let lastSent = 0;
  watcher = navigator.geolocation.watchPosition(
    (p) => {
      if (Date.now() - lastSent < 30000) return;
      lastSent = Date.now();
      status =
        "Live browser location enabled. Keep this page open; background tracking is unavailable in browsers.";
      void queueAndFlush(
        sessionId,
        token,
        makePing(
          p.coords.latitude,
          p.coords.longitude,
          "browser",
          p.timestamp,
          p.coords.accuracy,
        ),
      ).catch((error) => {
        status = "Location could not be saved: " + String(error.message);
      });
    },
    (e) => {
      status = e.message || "Browser location permission is missing.";
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
  );
  await queueAndFlush(sessionId, token);
  return status;
}
export async function enableBackground(): Promise<string> {
  throw new Error(
    "Browser background tracking is unavailable. Use the Android or iOS development build.",
  );
}
export async function stopTracking() {
  if (typeof navigator !== "undefined" && watcher !== undefined)
    navigator.geolocation.clearWatch(watcher);
  watcher = undefined;
  currentId = undefined;
  await clearQueue();
}
export function trackingStatus() {
  return status;
}
