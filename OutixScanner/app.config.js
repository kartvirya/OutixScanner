export default {
  name: "OutixScanner",
  slug: "outixscanner",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "outixscanner",
  owner: "outix",
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
    [
      "expo-camera",
      {
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan QR codes."
      }
    ],
    "expo-font"
  ],
  extra: {
    eas: {
      projectId: "outix-scanner"
    }
  }
}; 