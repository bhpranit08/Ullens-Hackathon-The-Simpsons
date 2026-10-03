const base = require("./app.json").expo;
module.exports = {
  ...base,
  name: "TrailGuard",
  slug: "trailguard",
  scheme: "trailguard",
  icon: "./assets/images/trailguard-icon.png",
  ios: {
    ...base.ios,
    icon: "./assets/images/trailguard-icon.png",
    bundleIdentifier: "com.trailguard.app",
  },
  android: {
    ...base.android,
    package: "com.trailguard.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/trailguard-icon.png",
      backgroundColor: "#F5F5ED",
    },
  },
  web: { ...base.web, favicon: "./assets/images/trailguard-icon.png" },
  plugins: [
    ...base.plugins.filter(
      (p) => !(Array.isArray(p) && p[0] === "expo-splash-screen"),
    ),
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F5F5ED",
        image: "./assets/images/trailguard-icon.png",
        imageWidth: 120,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "TrailGuard shares your location during safety sessions with your selected trusted contact.",
        locationAlwaysAndWhenInUsePermission:
          "Allow TrailGuard to continue sharing during a safety session while your screen is locked.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    "expo-notifications",
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "",
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || "",
      },
    ],
  ],
  extra: {
    ...(base.extra || {}),
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
};
