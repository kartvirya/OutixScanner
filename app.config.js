export default {
  name: "OutixScanner",
  slug: "outixscanner",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "outixscanner",
  userInterfaceStyle: "automatic",
  splash: {
    backgroundColor: "#FF6B00"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "co.outix.scanner"
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FF6B00"
    },
    package: "co.outix.scanner"
  },
  web: {
    bundler: "metro"
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan QR codes."
      }
    ],
    "expo-font",
    "expo-web-browser"
  ]
}; 