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
  // Create a simple 512x512 PNG with a blue background and white "SP" text
  // This is a basic implementation - for production, use proper image libraries
  
  // Create a simple PNG data (1x1 blue pixel, but we'll document the proper approach)
  const simplePng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk size
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x02, 0x00, // Width: 512
    0x00, 0x00, 0x02, 0x00, // Height: 512
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 2 (RGB), Compression: 0, Filter: 0, Interlace: 0
    0x91, 0x5D, 0x1D, 0xDB, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk size
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x60, 0x18, 0x05, 0x00, 0x00, 0x10, 0x00, 0x01, // Compressed data (minimal)
    0x1A, 0x0A, 0x0D, 0x0A, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk size
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  // Write PNG file
  const pngPath = path.join(buildResourcesPath, 'icon.png');
  fs.writeFileSync(pngPath, simplePng);
  console.log('✅ Created icon.png (basic version)');

  // Create a proper ICO file with multiple sizes
  const icoData = createIcoFile();
  const icoPath = path.join(buildResourcesPath, 'icon.ico');
  fs.writeFileSync(icoPath, icoData);
  console.log('✅ Created icon.ico');

  // Create a proper ICNS file
  const icnsData = createIcnsFile();
  const icnsPath = path.join(buildResourcesPath, 'icon.icns');
  fs.writeFileSync(icnsPath, icnsData);
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

function createIcoFile() {
  // Create a minimal but valid ICO file
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: ICO
  header.writeUInt16LE(1, 4); // Number of images

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0);  // Width: 32
  dirEntry.writeUInt8(32, 1);  // Height: 32
  dirEntry.writeUInt8(0, 2);   // Color count
  dirEntry.writeUInt8(0, 3);   // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(40 + 32*32*4, 8); // Image size
  dirEntry.writeUInt32LE(22, 12); // Image offset

  // Create a simple 32x32 blue bitmap
  const bitmapHeader = Buffer.alloc(40);
  bitmapHeader.writeUInt32LE(40, 0);    // Header size
  bitmapHeader.writeInt32LE(32, 4);     // Width
  bitmapHeader.writeInt32LE(64, 8);     // Height (32*2 for AND mask)
  bitmapHeader.writeUInt16LE(1, 12);    // Planes
  bitmapHeader.writeUInt16LE(32, 14);   // Bits per pixel
  bitmapHeader.writeUInt32LE(0, 16);    // Compression
  bitmapHeader.writeUInt32LE(32*32*4, 20); // Image size

  // Create blue pixels (BGRA format)
  const pixels = Buffer.alloc(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) {
    const offset = i * 4;
    pixels[offset] = 0xE2;     // Blue
    pixels[offset + 1] = 0x90; // Green
    pixels[offset + 2] = 0x4A; // Red
    pixels[offset + 3] = 0xFF; // Alpha
  }

  // AND mask (all transparent)
  const andMask = Buffer.alloc(32 * 4); // 32 rows * 4 bytes per row

  return Buffer.concat([header, dirEntry, bitmapHeader, pixels, andMask]);
}

function createIcnsFile() {
  // Create a minimal but valid ICNS file
  const header = Buffer.alloc(8);
  header.write('icns', 0);
  header.writeUInt32BE(8, 4); // File size (just header for now)
  
  return header;
}