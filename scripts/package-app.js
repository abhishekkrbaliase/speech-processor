#!/usr/bin/env node

/**
 * Complete packaging script for Speech Processor
 * Handles building and packaging for both macOS and Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Speech Processor - Complete Packaging Script');
console.log('===============================================');

// Configuration
const APP_NAME = 'Speech Processor';
const platforms = process.argv.slice(2);

if (platforms.length === 0) {
  console.log('Usage: node scripts/package-app.js [mac|win|all]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/package-app.js mac     # Package for macOS only');
  console.log('  node scripts/package-app.js win     # Package for Windows only');
  console.log('  node scripts/package-app.js all     # Package for both platforms');
  process.exit(1);
}

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function validateFiles() {
  console.log('\n🔍 Validating required files...');
  
  const requiredFiles = [
    'google-credentials.json',
    'config.json',
    'build-resources/icon.png',
    'build-resources/icon.ico',
    'build-resources/icon.icns'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.log('\n💡 Run these commands to fix:');
    console.log('   node scripts/generate-icons.js');
    console.log('   # Ensure google-credentials.json and config.json exist');
    process.exit(1);
  }
  
  console.log('✅ All required files present');
}

function cleanBuild() {
  console.log('\n🧹 Cleaning previous builds...');
  try {
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    if (fs.existsSync('release')) {
      fs.rmSync('release', { recursive: true, force: true });
    }
    console.log('✅ Clean completed');
  } catch (error) {
    console.warn('⚠️ Clean warning:', error.message);
  }
}

function updatePackageJson() {
  console.log('\n📝 Updating package.json for production...');
  
  const packagePath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Ensure production settings
  packageJson.build.productName = APP_NAME;
  packageJson.build.appId = 'com.speechprocessor.app';
  
  // Disable dev tools in production
  if (!packageJson.build.extraMetadata) {
    packageJson.build.extraMetadata = {};
  }
  packageJson.build.extraMetadata.main = 'dist/main.js';
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated');
}

function buildApp() {
  runCommand('npm run build:no-validation', 'Building application');
}

function packageForMac() {
  console.log('\n🍎 Packaging for macOS...');
  runCommand('npm run dist:mac', 'Creating macOS package');
  
  // Check if universal build is possible
  try {
    runCommand('npm run dist:mac-universal', 'Creating universal macOS package');
  } catch (error) {
    console.warn('⚠️ Universal build failed, using x64 only');
  }
}

function packageForWindows() {
  console.log('\n🪟 Packaging for Windows...');
  runCommand('npm run dist:win', 'Creating Windows package');
  
  // Also create portable version
  try {
    runCommand('npm run dist:win-portable', 'Creating Windows portable version');
  } catch (error) {
    console.warn('⚠️ Portable build failed');
  }
}

function showResults() {
  console.log('\n🎉 Packaging completed successfully!');
  console.log('=====================================');
  
  if (fs.existsSync('release')) {
    const files = fs.readdirSync('release');
    console.log('\n📁 Generated packages:');
    files.forEach(file => {
      const filePath = path.join('release', file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`   📦 ${file} (${sizeMB} MB)`);
    });
  }
  
  console.log('\n📋 Installation notes:');
  console.log('   • macOS: Mount the .dmg file and drag to Applications');
  console.log('   • Windows: Run the .exe installer or use the portable version');
  console.log('   • No additional software installation required');
  console.log('   • Google Speech credentials are bundled');
  console.log('');
  console.log('🚀 Your Speech Processor app is ready for distribution!');
}

// Main execution
try {
  validateFiles();
  cleanBuild();
  updatePackageJson();
  buildApp();
  
  if (platforms.includes('all') || platforms.includes('mac')) {
    packageForMac();
  }
  
  if (platforms.includes('all') || platforms.includes('win')) {
    packageForWindows();
  }
  
  showResults();
  
} catch (error) {
  console.error('\n❌ Packaging failed:', error.message);
  process.exit(1);
}