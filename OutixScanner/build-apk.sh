#!/bin/bash

echo "🚀 Building OutixScanner APK..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
1    echo "🔐 Please login to EAS:"
    eas login
fi

echo ""
echo "🏗️  Starting APK build..."
echo "This will take 5-10 minutes..."
echo ""

# Build the APK
eas build --platform android --profile preview

echo ""
echo "✅ Build complete! Check the link above to download your APK."
