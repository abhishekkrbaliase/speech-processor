#!/bin/bash

# Sign the app with ad-hoc signature and entitlements for development
# This allows the app to request microphone permissions on macOS

APP_PATH="release/mac/Speech Processor.app"
ENTITLEMENTS="build-resources/entitlements.mac.plist"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at: $APP_PATH"
    echo "   Please build the app first with: npm run pack"
    exit 1
fi

if [ ! -f "$ENTITLEMENTS" ]; then
    echo "❌ Entitlements file not found at: $ENTITLEMENTS"
    exit 1
fi

echo "🔐 Signing app with ad-hoc signature and entitlements..."
echo "   App: $APP_PATH"
echo "   Entitlements: $ENTITLEMENTS"

# Remove existing signature
codesign --remove-signature "$APP_PATH" 2>/dev/null || true

# Sign with ad-hoc signature and entitlements
codesign --force --deep --sign - \
    --entitlements "$ENTITLEMENTS" \
    --options runtime \
    "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ App signed successfully"
    
    # Verify the signature
    echo ""
    echo "🔍 Verifying signature..."
    codesign --verify --deep --strict --verbose=2 "$APP_PATH"
    
    echo ""
    echo "📋 Signature details:"
    codesign -d --entitlements - "$APP_PATH"
else
    echo "❌ Failed to sign app"
    exit 1
fi
