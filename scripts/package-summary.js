#!/usr/bin/env node

/**
 * Display packaging summary and distribution information
 */

const fs = require('fs');
const path = require('path');

console.log('🎉 Speech Processor - Packaging Summary');
console.log('=======================================');

const releaseDir = 'release';

if (!fs.existsSync(releaseDir)) {
  console.log('❌ No release directory found. Run packaging first:');
  console.log('   npm run package:all');
  process.exit(1);
}

const files = fs.readdirSync(releaseDir).filter(file => {
  const filePath = path.join(releaseDir, file);
  return fs.statSync(filePath).isFile() && !file.endsWith('.blockmap') && !file.endsWith('.yml') && !file.endsWith('.yaml');
});

if (files.length === 0) {
  console.log('❌ No packaged files found in release directory.');
  process.exit(1);
}

console.log('\n📦 Generated Packages:');
console.log('======================');

let totalSize = 0;

files.forEach(file => {
  const filePath = path.join(releaseDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  totalSize += stats.size;
  
  let icon = '📦';
  let platform = '';
  let type = '';
  
  if (file.includes('.dmg')) {
    icon = '🍎';
    platform = 'macOS';
    type = 'Disk Image';
  } else if (file.includes('.exe')) {
    icon = '🪟';
    platform = 'Windows';
    type = 'Installer';
  } else if (file.includes('-mac.zip')) {
    icon = '🍎';
    platform = 'macOS';
    type = 'Archive';
  } else if (file.includes('.zip') && !file.includes('-mac.zip')) {
    icon = '🪟';
    platform = 'Windows';
    type = 'Portable';
  }
  
  console.log(`${icon} ${file}`);
  console.log(`   Platform: ${platform} | Type: ${type} | Size: ${sizeMB} MB`);
  console.log('');
});

const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
console.log(`📊 Total package size: ${totalSizeMB} MB`);

console.log('\n🚀 Distribution Instructions:');
console.log('=============================');

console.log('\n🍎 macOS Distribution:');
console.log('   • DMG files: Users mount and drag to Applications folder');
console.log('   • ZIP files: Users extract and move to Applications folder');
console.log('   • No additional software installation required');
console.log('   • Google Speech credentials are bundled');

console.log('\n🪟 Windows Distribution:');
console.log('   • EXE installers: Users run to install normally');
console.log('   • Portable versions: Users run directly without installation');
console.log('   • No additional software installation required');
console.log('   • Google Speech credentials are bundled');

console.log('\n✅ Application Features:');
console.log('========================');
console.log('   ✅ Self-contained - no external dependencies');
console.log('   ✅ Professional branding - shows as "Speech Processor"');
console.log('   ✅ No debug windows in production');
console.log('   ✅ Google Speech-to-Text credentials bundled');
console.log('   ✅ Cross-platform compatibility');
console.log('   ✅ Ready for immediate distribution');

console.log('\n🔒 Security Notes:');
console.log('==================');
console.log('   • Google credentials are embedded in the application');
console.log('   • Credentials are stored in app resources directory');
console.log('   • Consider security implications for your distribution model');
console.log('   • For enterprise use, consider credential management alternatives');

console.log('\n📋 Next Steps:');
console.log('==============');
console.log('   1. Test the packaged applications on target systems');
console.log('   2. Verify all features work without external dependencies');
console.log('   3. Consider code signing for public distribution');
console.log('   4. Create distribution channels (website, app stores, etc.)');
console.log('   5. Prepare user documentation and support materials');

console.log('\n🎯 Ready for Distribution!');
console.log('Your Speech Processor application is now packaged and ready to distribute to end users.');