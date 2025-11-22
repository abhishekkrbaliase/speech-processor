#!/bin/bash

# Rebuild Optimized Packaged App
# This script rebuilds the app with optimizations for size and performance

set -e

echo "🧹 Cleaning previous builds..."
npm run clean

echo ""
echo "📦 Removing unused dependencies..."
rm -rf node_modules/@tensorflow* node_modules/@xenova models/Xenova 2>/dev/null || true

echo ""
echo "📥 Reinstalling dependencies (this will skip TensorFlow and Xenova)..."
npm install

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "📦 Packaging application..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    npm run dist:mac
else
    npm run dist:win
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Checking app size..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    APP_SIZE=$(du -sh release/mac*/Speech\ Processor.app/Contents/Resources/app.asar 2>/dev/null | cut -f1)
    echo "   App size: $APP_SIZE (should be ~15-20MB)"
    
    echo ""
    echo "🔍 Verifying credentials..."
    if [ -f "release/mac-arm64/Speech Processor.app/Contents/Resources/google-credentials.json" ]; then
        echo "   ✅ Credentials bundled successfully"
    else
        echo "   ❌ WARNING: Credentials not found in bundle!"
    fi
fi

echo ""
echo "🎉 Done! You can now test the packaged app."
echo ""
echo "To test:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  open release/mac*/Speech\ Processor.app"
else
    echo "  Check the release/ directory for the installer"
fi
