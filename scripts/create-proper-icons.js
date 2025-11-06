#!/usr/bin/env node

/**
 * Create proper application icons from SVG
 * This script provides instructions and tools for creating high-quality icons
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Creating proper application icons for Speech Processor...');
console.log('=========================================================');

const svgPath = path.join(__dirname, '..', 'build-resources', 'icon.svg');
const buildResourcesPath = path.join(__dirname, '..', 'build-resources');

if (!fs.existsSync(svgPath)) {
  console.error('❌ SVG icon not found at:', svgPath);
  process.exit(1);
}

console.log('✅ Found SVG icon at:', svgPath);

// Create a better PNG icon (still basic, but with proper dimensions)
function createBetterPng() {
  // Create a 512x512 PNG with Speech Processor branding
  const width = 512;
  const height = 512;
  
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(2, 9);            // Color type (RGB)
  ihdrData.writeUInt8(0, 10);           // Compression
  ihdrData.writeUInt8(0, 11);           // Filter
  ihdrData.writeUInt8(0, 12);           // Interlace
  
  const ihdrCrc = calculateCRC(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // Length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);
  
  // Create image data (simple blue gradient)
  const imageData = Buffer.alloc(width * height * 3); // RGB
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      // Create a blue gradient
      const intensity = Math.floor(255 * (1 - y / height));
      imageData[offset] = Math.floor(74 + intensity * 0.3);     // R
      imageData[offset + 1] = Math.floor(144 + intensity * 0.3); // G  
      imageData[offset + 2] = Math.floor(226 + intensity * 0.1); // B
    }
  }
  
  // Compress the image data (very basic)
  const zlib = require('zlib');
  const deflated = zlib.deflateSync(imageData);
  
  const idatCrc = calculateCRC(Buffer.concat([Buffer.from('IDAT'), deflated]));
  const idat = Buffer.concat([
    Buffer.alloc(4), // Length (will be set)
    Buffer.from('IDAT'),
    deflated,
    idatCrc
  ]);
  idat.writeUInt32BE(deflated.length, 0);
  
  // IEND chunk
  const iendCrc = calculateCRC(Buffer.from('IEND'));
  const iend = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // Length
    Buffer.from('IEND'),
    iendCrc
  ]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function calculateCRC(data) {
  // Simple CRC32 calculation (basic implementation)
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return result;
}

try {
  console.log('\n📝 For best results, use online conversion tools:');
  console.log('1. Convert SVG to PNG (512x512): https://cloudconvert.com/svg-to-png');
  console.log('2. Convert PNG to ICO: https://cloudconvert.com/png-to-ico');
  console.log('3. Convert PNG to ICNS: https://cloudconvert.com/png-to-icns');
  
  console.log('\n🔧 Creating basic icons for immediate use...');
  
  // Create a better PNG
  const pngData = createBetterPng();
  const pngPath = path.join(buildResourcesPath, 'icon.png');
  fs.writeFileSync(pngPath, pngData);
  console.log('✅ Created improved icon.png');
  
  // Copy existing ICO and ICNS (they're minimal but functional)
  console.log('✅ Using existing icon.ico and icon.icns');
  
  console.log('\n🎯 Icons created successfully!');
  console.log('   These are functional but basic icons.');
  console.log('   For production, replace with high-quality versions.');
  
} catch (error) {
  console.error('❌ Error creating icons:', error.message);
  
  console.log('\n💡 Manual steps to create proper icons:');
  console.log('1. Open build-resources/icon.svg in a graphics editor');
  console.log('2. Export as PNG at 512x512 pixels');
  console.log('3. Use online tools to convert to ICO and ICNS formats');
  console.log('4. Replace the files in build-resources/');
}