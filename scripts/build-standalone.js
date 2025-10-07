#!/usr/bin/env node

/**
 * Standalone Build Script for Speech Overlay App
 * Creates distributable packages for macOS and Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PLATFORMS = {
  mac: {
    name: 'macOS',
    commands: ['npm run dist:mac'],
    outputs: ['*.dmg', '*.zip'],
    notes: [
      'Universal binary (Intel + Apple Silicon)',
      'DMG installer and ZIP archive',
      'Requires macOS 10.13 or later'
    ]
  },
  win: {
    name: 'Windows',
    commands: ['npm run dist:win', 'npm run dist:win-portable'],
    outputs: ['*.exe', '*-portable.exe'],
    notes: [
      'NSIS installer and portable executable',
      'x64 architecture',
      'Requires Windows 10 or later'
    ]
  }
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌'
  };
  
  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`Running: ${description}`, 'info');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`Completed: ${description}`, 'success');
    return true;
  } catch (error) {
    log(`Failed: ${description} - ${error.message}`, 'error');
    return false;
  }
}

function checkPrerequisites() {
  log('Checking prerequisites...', 'info');
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log('node_modules not found. Please run: npm install', 'error');
    return false;
  }
  
  // Check if dist directory exists or can be created
  if (!fs.existsSync('dist')) {
    log('dist directory not found. Will be created during build.', 'warning');
  }
  
  // Check for required build files
  const requiredFiles = ['package.json', 'webpack.config.js'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`Required file missing: ${file}`, 'error');
      return false;
    }
  }
  
  log('Prerequisites check passed', 'success');
  return true;
}

function displayGoogleAPIInfo() {
  log('Google Speech-to-Text API Configuration', 'info');
  console.log('');
  console.log('🔑 The built application will require Google Speech-to-Text API credentials.');
  console.log('   Users can configure this in three ways:');
  console.log('');
  console.log('   1. API Key (Recommended for individual use):');
  console.log('      - Set in the app\'s Settings > API Configuration');
  console.log('      - Or edit config.json in the app data directory');
  console.log('');
  console.log('   2. Service Account JSON (Recommended for organizations):');
  console.log('      - Download from Google Cloud Console');
  console.log('      - Set path in app settings or config.json');
  console.log('');
  console.log('   3. Environment Variable:');
  console.log('      - Set GOOGLE_APPLICATION_CREDENTIALS system variable');
  console.log('      - Points to service account JSON file');
  console.log('');
  console.log('📍 Configuration file locations:');
  console.log('   macOS: ~/Library/Application Support/Speech Overlay App/config.json');
  console.log('   Windows: %APPDATA%\\Speech Overlay App\\config.json');
  console.log('');
}

function buildPlatform(platform) {
  const config = PLATFORMS[platform];
  if (!config) {
    log(`Unknown platform: ${platform}`, 'error');
    return false;
  }
  
  log(`Building for ${config.name}...`, 'info');
  
  for (const command of config.commands) {
    if (!runCommand(command, `${config.name} build`)) {
      return false;
    }
  }
  
  log(`${config.name} build completed successfully!`, 'success');
  
  // Display build info
  console.log('');
  console.log(`📦 ${config.name} Build Information:`);
  config.notes.forEach(note => console.log(`   • ${note}`));
  console.log(`   • Output files: ${config.outputs.join(', ')}`);
  console.log(`   • Location: ./release/`);
  console.log('');
  
  return true;
}

function displayPostBuildInstructions() {
  log('Build completed! Next steps:', 'success');
  console.log('');
  console.log('📁 Distribution files are in the ./release/ directory');
  console.log('');
  console.log('🚀 To distribute your application:');
  console.log('   1. Test the built application on target systems');
  console.log('   2. Provide users with the README-SETUP.md file');
  console.log('   3. Include instructions for Google API setup');
  console.log('   4. Consider code signing for production distribution');
  console.log('');
  console.log('🔐 Security Notes:');
  console.log('   • Never include API keys in the distributed application');
  console.log('   • Users must configure their own Google API credentials');
  console.log('   • Recommend using service accounts for organizational deployments');
  console.log('');
  console.log('📋 User Setup Requirements:');
  console.log('   • Google Cloud account with Speech-to-Text API enabled');
  console.log('   • API key or service account credentials');
  console.log('   • Microphone access permissions');
  console.log('');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const platform = args[0];
  
  console.log('🎯 Speech Overlay App - Standalone Build Tool');
  console.log('='.repeat(50));
  console.log('');
  
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  displayGoogleAPIInfo();
  
  // Prepare build resources
  if (!runCommand('npm run prepare-build-resources', 'Preparing build resources')) {
    process.exit(1);
  }
  
  // Clean previous builds
  if (!runCommand('npm run clean', 'Cleaning previous builds')) {
    process.exit(1);
  }
  
  // Build the application
  if (!runCommand('npm run build', 'Building application')) {
    process.exit(1);
  }
  
  let success = true;
  
  if (platform && PLATFORMS[platform]) {
    // Build specific platform
    success = buildPlatform(platform);
  } else if (!platform) {
    // Build all platforms
    log('Building for all platforms...', 'info');
    for (const [platformKey] of Object.entries(PLATFORMS)) {
      if (!buildPlatform(platformKey)) {
        success = false;
        break;
      }
    }
  } else {
    log(`Invalid platform: ${platform}. Available: ${Object.keys(PLATFORMS).join(', ')}`, 'error');
    success = false;
  }
  
  if (success) {
    displayPostBuildInstructions();
  } else {
    log('Build failed. Please check the errors above.', 'error');
    process.exit(1);
  }
}

// Handle command line usage
if (require.main === module) {
  main().catch(error => {
    log(`Build script error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { buildPlatform, PLATFORMS };