import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, request } from "@/lib/api";
import type { Location } from "@/lib/types";
const key = "trailguard.pending-locations";
type Ping = { sessionId: string; location: Location };
let chain = Promise.resolve();
export function queueAndFlush(
  sessionId: string,
  token: string,
  location?: Location,
) {
  chain = chain
    .catch(() => {})
    .then(async () => {
      let queue: Ping[] = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
      if (location) queue.push({ sessionId, location });
      queue = queue
        .filter(
          (p) => Date.now() - +new Date(p.location.observedAt || 0) < 86400000,
        )
        .slice(-500);
      await AsyncStorage.setItem(key, JSON.stringify(queue));
      while (queue.length) {
        const p = queue[0];
        try {
          await request("/sessions/" + p.sessionId + "/location", {
            body: { location: p.location },
            token,
          });
        } catch (e) {
          if (
            !(e instanceof ApiError) ||
            ![400, 401, 403, 404, 409].includes(e.status)
          )
            break;
          if (e.status === 401) {
            await AsyncStorage.removeItem(key);
            return;
          }
        }
        queue.shift();
        await AsyncStorage.setItem(key, JSON.stringify(queue));
      }
    });
  return chain;
}
export async function clearQueue() {
  await chain.catch(() => {});
  await AsyncStorage.removeItem(key);
}
export function makePing(
  lat: number,
  lng: number,
  source: "gps" | "browser" | "simulated",
  timestamp = Date.now(),
  accuracy?: number,
): Location {
  return {
    lat,
    lng,
    source,
    accuracy,
    observedAt: new Date(timestamp).toISOString(),
    pingId: source + ":" + timestamp + ":" + lat + ":" + lng,
  };
}
