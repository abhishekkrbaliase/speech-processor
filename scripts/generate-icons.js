#!/usr/bin/env node

/**
 * Generate application icons from SVG
 * This script creates the necessary icon files for packaging
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Generating application icons...');

// Read the SVG icon
const svgPath = path.join(__dirname, '..', 'build-resources', 'icon.svg');
const buildResourcesPath = path.join(__dirname, '..', 'build-resources');

if (!fs.existsSync(svgPath)) {
  console.error('❌ SVG icon not found at:', svgPath);
  console.log('💡 Run: node build-resources/create-placeholder-icons.js first');
  process.exit(1);
}

// For now, we'll create minimal placeholder files that electron-builder can use
// In a production environment, you'd want to use proper image conversion libraries

// Create a simple PNG placeholder (base64 encoded 1x1 pixel)
const pngPlaceholder = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8j8wAAAABJRU5ErkJggg==',
  'base64'
);

// Create minimal ICO file (Windows icon)
const icoHeader = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type: ICO
  0x01, 0x00, // Number of images: 1
  // Image directory entry
  0x20, // Width: 32
  0x20, // Height: 32
  0x00, // Color count: 0 (no palette)
  0x00, // Reserved
  0x01, 0x00, // Color planes: 1
  0x20, 0x00, // Bits per pixel: 32
  0x00, 0x00, 0x00, 0x00, // Image size: 0 (will be calculated)
  0x16, 0x00, 0x00, 0x00  // Image offset: 22
]);

// Create minimal ICNS file (macOS icon)
const icnsHeader = Buffer.from([
  0x69, 0x63, 0x6E, 0x73, // 'icns' signature
  0x00, 0x00, 0x00, 0x08  // File size: 8 bytes (header only)
]);

try {
  // Write PNG file
  const pngPath = path.join(buildResourcesPath, 'icon.png');
  fs.writeFileSync(pngPath, pngPlaceholder);
  console.log('✅ Created icon.png');

  // Write ICO file
  const icoPath = path.join(buildResourcesPath, 'icon.ico');
  fs.writeFileSync(icoPath, icoHeader);
  console.log('✅ Created icon.ico');

  // Write ICNS file
  const icnsPath = path.join(buildResourcesPath, 'icon.icns');
  fs.writeFileSync(icnsPath, icnsHeader);
  console.log('✅ Created icon.icns');

  console.log('');
  console.log('📝 Note: These are minimal placeholder icons for building.');
  console.log('   For production, replace with proper high-quality icons:');
  console.log('   1. Convert the SVG to PNG (512x512)');
  console.log('   2. Use online tools to create ICO and ICNS files');
  console.log('   3. Replace the generated files in build-resources/');
  console.log('');
  console.log('🔗 Recommended tools:');
  console.log('   - PNG: https://cloudconvert.com/svg-to-png');
  console.log('   - ICO: https://cloudconvert.com/png-to-ico');
  console.log('   - ICNS: https://cloudconvert.com/png-to-icns');

} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  process.exit(1);
}