const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * electron-builder afterPack hook
 * Signs the macOS app with ad-hoc signature and entitlements
 */
exports.default = async function(context) {
  // Only run for macOS builds
  if (context.electronPlatformName !== 'darwin') {
    console.log('⏭️  Skipping signing (not macOS)');
    return;
  }

  const appPath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app';
  const entitlementsPath = path.join(context.packager.projectDir, 'build-resources', 'entitlements.mac.plist');

  console.log('🔐 Post-pack: Signing app with entitlements...');
  console.log('   App path:', appPath);
  console.log('   Entitlements:', entitlementsPath);

  if (!fs.existsSync(appPath)) {
    console.error('❌ App not found at:', appPath);
    return;
  }

  if (!fs.existsSync(entitlementsPath)) {
    console.error('❌ Entitlements not found at:', entitlementsPath);
    return;
  }

  try {
    // Remove existing signature
    try {
      execSync(`codesign --remove-signature "${appPath}"`, { stdio: 'pipe' });
    } catch (e) {
      // Ignore errors if no signature exists
    }

    // Sign with ad-hoc signature and entitlements
    const signCommand = `codesign --force --deep --sign - --entitlements "${entitlementsPath}" --options runtime "${appPath}"`;
    console.log('   Running:', signCommand);
    
    execSync(signCommand, { stdio: 'inherit' });
    
    console.log('✅ App signed successfully with entitlements');

    // Verify the signature
    try {
      execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
      console.log('✅ Signature verified');
    } catch (e) {
      console.warn('⚠️  Signature verification failed, but continuing...');
    }

  } catch (error) {
    console.error('❌ Failed to sign app:', error.message);
    // Don't fail the build, just warn
  }
};
