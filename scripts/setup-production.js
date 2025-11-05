#!/usr/bin/env node

/**
 * Setup script for production packaging
 * Ensures all necessary files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Speech Processor for production packaging...');
console.log('=========================================================');

function checkFile(filePath, description, required = true) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: Found`);
    return true;
  } else {
    if (required) {
      console.log(`❌ ${description}: Missing (required)`);
    } else {
      console.log(`⚠️ ${description}: Missing (optional)`);
    }
    return false;
  }
}

function createMissingFiles() {
  console.log('\n📝 Creating missing configuration files...');
  
  // Create config.json if missing
  if (!fs.existsSync('config.json')) {
    const config = {
      googleSpeech: {
        keyFilename: "./google-credentials.json"
      },
      audio: {
        sampleRate: 16000,
        channels: 1
      }
    };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log('✅ Created config.json');
  }
  
  // Create .env.example if missing
  if (!fs.existsSync('.env.example')) {
    const envExample = `# Google Speech-to-Text Configuration
# Option 1: Use API Key
GOOGLE_SPEECH_API_KEY=your_api_key_here

# Option 2: Use Service Account (recommended for production)
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# Audio Configuration
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1

# Application Settings
NODE_ENV=production
`;
    fs.writeFileSync('.env.example', envExample);
    console.log('✅ Created .env.example');
  }
}

function validateGoogleCredentials() {
  console.log('\n🔐 Validating Google Speech credentials...');
  
  if (!fs.existsSync('google-credentials.json')) {
    console.log('❌ google-credentials.json not found');
    console.log('💡 This file contains your Google Speech-to-Text service account credentials');
    console.log('   It will be bundled with the application for seamless operation');
    return false;
  }
  
  try {
    const credentials = JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Invalid credentials file - missing fields:');
      missingFields.forEach(field => console.log(`   - ${field}`));
      return false;
    }
    
    if (credentials.type !== 'service_account') {
      console.log('❌ Credentials must be for a service account');
      return false;
    }
    
    console.log('✅ Google credentials are valid');
    console.log(`   Project: ${credentials.project_id}`);
    console.log(`   Service Account: ${credentials.client_email}`);
    return true;
    
  } catch (error) {
    console.log('❌ Invalid JSON in google-credentials.json:', error.message);
    return false;
  }
}

function checkBuildResources() {
  console.log('\n🎨 Checking build resources...');
  
  const buildResourcesPath = 'build-resources';
  if (!fs.existsSync(buildResourcesPath)) {
    fs.mkdirSync(buildResourcesPath, { recursive: true });
    console.log('✅ Created build-resources directory');
  }
  
  const iconFiles = [
    { file: 'icon.png', desc: 'PNG icon (512x512)' },
    { file: 'icon.ico', desc: 'Windows ICO icon' },
    { file: 'icon.icns', desc: 'macOS ICNS icon' }
  ];
  
  let allIconsPresent = true;
  iconFiles.forEach(({ file, desc }) => {
    const filePath = path.join(buildResourcesPath, file);
    if (!checkFile(filePath, desc, false)) {
      allIconsPresent = false;
    }
  });
  
  if (!allIconsPresent) {
    console.log('\n💡 To generate placeholder icons, run:');
    console.log('   npm run generate:icons');
    console.log('\n   For production, replace with high-quality icons');
  }
  
  return allIconsPresent;
}

function updatePackageJsonForProduction() {
  console.log('\n📦 Updating package.json for production...');
  
  const packagePath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Ensure correct app name and ID
  if (packageJson.build) {
    packageJson.build.productName = 'Speech Processor';
    packageJson.build.appId = 'com.speechprocessor.app';
    
    // Ensure credentials are included
    if (!packageJson.build.files.includes('google-credentials.json')) {
      packageJson.build.files.push('google-credentials.json');
    }
    if (!packageJson.build.files.includes('config.json')) {
      packageJson.build.files.push('config.json');
    }
    
    // Update extraResources
    const credentialsResource = packageJson.build.extraResources.find(r => 
      r.from === 'google-credentials.json'
    );
    if (!credentialsResource) {
      packageJson.build.extraResources.push({
        from: 'google-credentials.json',
        to: 'google-credentials.json'
      });
    }
    
    const configResource = packageJson.build.extraResources.find(r => 
      r.from === 'config.json'
    );
    if (!configResource) {
      packageJson.build.extraResources.push({
        from: 'config.json',
        to: 'config.json'
      });
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Package.json updated for production');
  }
}

function showSummary() {
  console.log('\n📋 Production Setup Summary');
  console.log('===========================');
  
  const checks = [
    { file: 'google-credentials.json', desc: 'Google Speech credentials' },
    { file: 'config.json', desc: 'Application configuration' },
    { file: 'build-resources/icon.png', desc: 'Application icon (PNG)' },
    { file: 'build-resources/icon.ico', desc: 'Windows icon' },
    { file: 'build-resources/icon.icns', desc: 'macOS icon' }
  ];
  
  let allReady = true;
  checks.forEach(({ file, desc }) => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${desc}`);
    if (!exists) allReady = false;
  });
  
  console.log('\n🚀 Next Steps:');
  if (allReady) {
    console.log('   All files ready! You can now package the application:');
    console.log('   npm run package:all     # Package for both macOS and Windows');
    console.log('   npm run package:mac     # Package for macOS only');
    console.log('   npm run package:win     # Package for Windows only');
  } else {
    console.log('   1. Fix missing files listed above');
    console.log('   2. Run: npm run generate:icons (for placeholder icons)');
    console.log('   3. Ensure google-credentials.json is present and valid');
    console.log('   4. Run this script again to verify');
  }
  
  console.log('\n📖 Features of the packaged app:');
  console.log('   • Self-contained - no external software needed');
  console.log('   • Google Speech credentials bundled');
  console.log('   • Professional app name: "Speech Processor"');
  console.log('   • No debug windows in production');
  console.log('   • Ready for distribution');
}

// Main execution
try {
  createMissingFiles();
  const credentialsValid = validateGoogleCredentials();
  const iconsPresent = checkBuildResources();
  updatePackageJsonForProduction();
  showSummary();
  
  if (credentialsValid && iconsPresent) {
    console.log('\n🎉 Production setup complete! Ready to package.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Setup incomplete. Please address the issues above.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}