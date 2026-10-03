import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function pushToken() {
  if (!Device.isDevice)
    throw new Error("Push notifications require a physical device.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Safety alerts",
      importance: Notifications.AndroidImportance.MAX,
    });
  if (!(await Notifications.requestPermissionsAsync()).granted)
    throw new Error("Allow notifications in device settings.");
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error(
      "Configure EXPO_PUBLIC_EAS_PROJECT_ID and your EAS push credentials first.",
    );
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
export function listenForPush(open: (sessionId: string) => void) {
  const receive = (r: Notifications.NotificationResponse) => {
    const id = r.notification.request.content.data?.sessionId;
    if (typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) {
      open(id);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  };
  void Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (r) receive(r);
    })
    .catch(() => {});
  const subscription =
    Notifications.addNotificationResponseReceivedListener(receive);
  return () => subscription.remove();
}
