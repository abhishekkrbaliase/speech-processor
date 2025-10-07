#!/usr/bin/env node

/**
 * Build preparation script
 * Prepares build resources and validates configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing build resources...');

// Create build-resources directory if it doesn't exist
const buildResourcesDir = path.join(__dirname, '..', 'build-resources');
if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

// Create basic icon files if they don't exist
const iconFiles = [
  { name: 'icon.png', size: '512x512' },
  { name: 'icon.icns', platform: 'macOS' },
  { name: 'icon.ico', platform: 'Windows' }
];

iconFiles.forEach(icon => {
  const iconPath = path.join(buildResourcesDir, icon.name);
  if (!fs.existsSync(iconPath)) {
    console.log(`⚠️  Missing ${icon.name} for ${icon.platform || 'all platforms'}`);
    console.log(`   Please add a ${icon.size || 'proper'} icon file at: ${iconPath}`);
  }
});

// Create macOS entitlements file
const entitlementsPath = path.join(buildResourcesDir, 'entitlements.mac.plist');
if (!fs.existsSync(entitlementsPath)) {
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.device.microphone</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
</dict>
</plist>`;
  
  fs.writeFileSync(entitlementsPath, entitlements);
  console.log('✅ Created macOS entitlements file');
}

// Create Windows installer script
const installerScriptPath = path.join(buildResourcesDir, 'installer.nsh');
if (!fs.existsSync(installerScriptPath)) {
  const installerScript = `; Custom NSIS installer script for Speech Overlay App

; Create config template in user directory
Section "ConfigTemplate"
  SetOutPath "$APPDATA\\Speech Overlay App"
  File "\${BUILD_RESOURCES_DIR}\\..\\config-template.json"
  File "\${BUILD_RESOURCES_DIR}\\..\\README-SETUP.md"
SectionEnd

; Create desktop shortcut with custom icon
Section "DesktopShortcut"
  CreateShortCut "$DESKTOP\\Speech Overlay App.lnk" "$INSTDIR\\Speech Overlay App.exe" "" "$INSTDIR\\Speech Overlay App.exe" 0
SectionEnd`;

  fs.writeFileSync(installerScriptPath, installerScript);
  console.log('✅ Created Windows installer script');
}

// Validate package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log('📦 Build configuration:');
console.log(`   App ID: ${packageJson.build.appId}`);
console.log(`   Product Name: ${packageJson.build.productName}`);
console.log(`   Version: ${packageJson.version}`);

// Check for required dependencies
const requiredDeps = [
  '@google-cloud/speech',
  '@tensorflow-models/speech-commands',
  '@tensorflow/tfjs'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
if (missingDeps.length > 0) {
  console.log('⚠️  Missing required dependencies:', missingDeps.join(', '));
} else {
  console.log('✅ All required dependencies present');
}

console.log('🎯 Build targets:');
console.log('   macOS: DMG and ZIP (x64, ARM64)');
console.log('   Windows: NSIS installer and Portable (x64)');

console.log('✅ Build preparation complete!');
console.log('');
console.log('📋 Next steps:');
console.log('   1. Add icon files to build-resources/ directory');
console.log('   2. Run: npm run dist:mac (for macOS build)');
console.log('   3. Run: npm run dist:win (for Windows build)');
console.log('   4. Distribute the files from the release/ directory');