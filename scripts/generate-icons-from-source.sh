#!/bin/bash

# Generate all required icon formats from source PNG
# Usage: ./scripts/generate-icons-from-source.sh <source-png-path>

SOURCE_PNG="$1"
BUILD_DIR="build-resources"

if [ -z "$SOURCE_PNG" ]; then
    echo "❌ Usage: $0 <source-png-path>"
    exit 1
fi

if [ ! -f "$SOURCE_PNG" ]; then
    echo "❌ Source PNG not found: $SOURCE_PNG"
    exit 1
fi

echo "🎨 Generating icons from: $SOURCE_PNG"
echo ""

# Create temporary directory for icon generation
TEMP_DIR=$(mktemp -d)
ICONSET_DIR="$TEMP_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"

echo "📦 Step 1: Creating base PNG (1024x1024)..."
sips -z 1024 1024 "$SOURCE_PNG" --out "$BUILD_DIR/icon.png" > /dev/null 2>&1
echo "   ✅ Created: $BUILD_DIR/icon.png"

echo ""
echo "🍎 Step 2: Generating macOS .icns file..."

# Generate all required sizes for macOS iconset
sips -z 16 16     "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
sips -z 32 32     "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 32 32     "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
sips -z 64 64     "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128   "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
sips -z 256 256   "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
sips -z 512 512   "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
sips -z 1024 1024 "$BUILD_DIR/icon.png" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

# Convert iconset to icns
iconutil -c icns "$ICONSET_DIR" -o "$BUILD_DIR/icon.icns"
echo "   ✅ Created: $BUILD_DIR/icon.icns"

echo ""
echo "🪟 Step 3: Generating Windows .ico file..."

# For Windows ICO, we need to use a different approach
# Create multiple sizes and combine them
TEMP_ICO_DIR="$TEMP_DIR/ico"
mkdir -p "$TEMP_ICO_DIR"

sips -z 16 16   "$BUILD_DIR/icon.png" --out "$TEMP_ICO_DIR/icon_16.png" > /dev/null 2>&1
sips -z 32 32   "$BUILD_DIR/icon.png" --out "$TEMP_ICO_DIR/icon_32.png" > /dev/null 2>&1
sips -z 48 48   "$BUILD_DIR/icon.png" --out "$TEMP_ICO_DIR/icon_48.png" > /dev/null 2>&1
sips -z 256 256 "$BUILD_DIR/icon.png" --out "$TEMP_ICO_DIR/icon_256.png" > /dev/null 2>&1

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    convert "$TEMP_ICO_DIR/icon_16.png" \
            "$TEMP_ICO_DIR/icon_32.png" \
            "$TEMP_ICO_DIR/icon_48.png" \
            "$TEMP_ICO_DIR/icon_256.png" \
            "$BUILD_DIR/icon.ico"
    echo "   ✅ Created: $BUILD_DIR/icon.ico (using ImageMagick)"
else
    # Fallback: just use the 256x256 version
    sips -s format ico "$TEMP_ICO_DIR/icon_256.png" --out "$BUILD_DIR/icon.ico" > /dev/null 2>&1
    echo "   ⚠️  Created: $BUILD_DIR/icon.ico (single size - install ImageMagick for multi-size)"
    echo "      Install: brew install imagemagick"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "📋 Generated files:"
echo "   • $BUILD_DIR/icon.png (1024x1024)"
echo "   • $BUILD_DIR/icon.icns (macOS)"
echo "   • $BUILD_DIR/icon.ico (Windows)"
echo ""
echo "🚀 Ready to build! Run: npm run dist:mac"
