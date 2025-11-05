#!/usr/bin/env node

/**
 * Development setup script
 * Creates required configuration files from templates
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Speech Processor for development...');
console.log('=================================================');

function createFromTemplate(templateFile, targetFile, description) {
  if (fs.existsSync(targetFile)) {
    console.log(`✅ ${description}: Already exists`);
    return false;
  }
  
  if (!fs.existsSync(templateFile)) {
    console.log(`❌ ${description}: Template not found (${templateFile})`);
    return false;
  }
  
  try {
    const templateContent = fs.readFileSync(templateFile, 'utf8');
    fs.writeFileSync(targetFile, templateContent);
    console.log(`✅ ${description}: Created from template`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: Failed to create - ${error.message}`);
    return false;
  }
}

console.log('\n📝 Creating configuration files from templates...');

const configCreated = createFromTemplate(
  'config.template.json',
  'config.json',
  'Application configuration'
);

const credentialsCreated = createFromTemplate(
  'google-credentials.template.json',
  'google-credentials.json',
  'Google credentials'
);

console.log('\n🎨 Generating application icons...');
try {
  const { execSync } = require('child_process');
  execSync('npm run generate:icons', { stdio: 'inherit' });
  console.log('✅ Application icons generated');
} catch (error) {
  console.log('❌ Failed to generate icons:', error.message);
}

console.log('\n📋 Setup Summary');
console.log('================');

if (configCreated || credentialsCreated) {
  console.log('\n⚠️  IMPORTANT: Update the following files with your actual values:');
  
  if (configCreated) {
    console.log('   📄 config.json - Application configuration');
  }
  
  if (credentialsCreated) {
    console.log('   🔐 google-credentials.json - Google Speech-to-Text service account');
    console.log('       • Get this from Google Cloud Console');
    console.log('       • Go to IAM & Admin > Service Accounts');
    console.log('       • Create or download service account key');
    console.log('       • Ensure Speech-to-Text API is enabled');
  }
}

console.log('\n🚀 Next Steps:');
console.log('==============');
console.log('1. Update google-credentials.json with your actual Google service account');
console.log('2. Verify config.json points to the correct credentials file');
console.log('3. Run: npm install (if not already done)');
console.log('4. Run: npm start (to test the application)');
console.log('5. Run: npm run setup:production (to validate for packaging)');

console.log('\n📖 Documentation:');
console.log('=================');
console.log('• PACKAGING_GUIDE.md - Complete packaging instructions');
console.log('• PACKAGING_COMPLETE.md - Overview of packaging system');
console.log('• README.md - General application information');

console.log('\n✅ Development setup complete!');
console.log('Remember: Never commit google-credentials.json or config.json to git!');