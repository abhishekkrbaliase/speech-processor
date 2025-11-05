#!/usr/bin/env node

/**
 * Creates placeholder icon files for building
 * Replace these with proper icons for production
 */

const fs = require('fs');
const path = require('path');

// Professional SVG icon for Speech Processor
const svgIcon = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F0F0F0;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  
  <!-- Microphone body -->
  <rect x="216" y="120" width="80" height="140" rx="40" fill="url(#mic)" stroke="#357ABD" stroke-width="4"/>
  
  <!-- Microphone grille -->
  <line x1="236" y1="140" x2="276" y2="140" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  <line x1="236" y1="160" x2="276" y2="160" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  <line x1="236" y1="180" x2="276" y2="180" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  <line x1="236" y1="200" x2="276" y2="200" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  <line x1="236" y1="220" x2="276" y2="220" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  <line x1="236" y1="240" x2="276" y2="240" stroke="#357ABD" stroke-width="3" stroke-linecap="round"/>
  
  <!-- Microphone stand -->
  <rect x="248" y="260" width="16" height="60" fill="url(#mic)" stroke="#357ABD" stroke-width="2"/>
  <rect x="226" y="320" width="60" height="16" rx="8" fill="url(#mic)" stroke="#357ABD" stroke-width="2"/>
  
  <!-- Sound waves -->
  <path d="M 320 180 Q 340 190 320 200" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M 340 160 Q 370 180 340 200" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M 360 140 Q 400 180 360 220" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.4"/>
  
  <!-- Processing indicator -->
  <circle cx="256" cy="400" r="8" fill="#FFFFFF" opacity="0.9">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="276" cy="400" r="6" fill="#FFFFFF" opacity="0.7">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="236" cy="400" r="6" fill="#FFFFFF" opacity="0.7">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.4s" repeatCount="indefinite"/>
  </circle>
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