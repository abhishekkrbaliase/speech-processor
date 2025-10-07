#!/usr/bin/env node

/**
 * Creates placeholder icon files for building
 * Replace these with proper icons for production
 */

const fs = require('fs');
const path = require('path');

// Simple SVG icon as placeholder
const svgIcon = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2196F3"/>
  <circle cx="256" cy="200" r="80" fill="white"/>
  <rect x="176" y="280" width="160" height="120" rx="20" fill="white"/>
  <circle cx="220" cy="320" r="8" fill="#2196F3"/>
  <circle cx="256" cy="320" r="8" fill="#2196F3"/>
  <circle cx="292" cy="320" r="8" fill="#2196F3"/>
  <text x="256" y="450" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">SPEECH</text>
</svg>`;

console.log('Creating placeholder icons...');

// Create a simple PNG placeholder (this is just a text representation)
// In a real scenario, you'd use a proper image library
const pngPlaceholder = `This is a placeholder for icon.png
Please replace with a proper 512x512 PNG icon file.
You can use online tools to convert SVG to PNG:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

The SVG content above can be saved as icon.svg and converted.`;

const icnsPlaceholder = `This is a placeholder for icon.icns
Please replace with a proper macOS icon file.
You can use online tools to convert PNG to ICNS:
- https://cloudconvert.com/png-to-icns
- https://iconverticons.com/online/

Or use iconutil on macOS:
1. Create icon.iconset directory
2. Add PNG files: icon_16x16.png, icon_32x32.png, etc.
3. Run: iconutil -c icns icon.iconset`;

const icoPlaceholder = `This is a placeholder for icon.ico
Please replace with a proper Windows icon file.
You can use online tools to convert PNG to ICO:
- https://cloudconvert.com/png-to-ico
- https://convertio.co/png-ico/

The ICO should contain multiple sizes: 16x16, 32x32, 48x48, 256x256`;

// Write placeholder files
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(__dirname, 'icon.png.placeholder'), pngPlaceholder);
fs.writeFileSync(path.join(__dirname, 'icon.icns.placeholder'), icnsPlaceholder);
fs.writeFileSync(path.join(__dirname, 'icon.ico.placeholder'), icoPlaceholder);

console.log('✅ Placeholder files created');
console.log('📝 Please replace with proper icon files:');
console.log('   - icon.png (512x512)');
console.log('   - icon.icns (macOS)');
console.log('   - icon.ico (Windows)');
console.log('');
console.log('💡 Use the provided icon.svg as a starting point');
console.log('   or create your own design representing the app');