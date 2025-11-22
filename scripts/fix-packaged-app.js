#!/usr/bin/env node

/**
 * Fix packaged app issues without breaking working development setup
 * This script creates a targeted fix for the packaged app
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing packaged app issues...');
console.log('=================================');

// The issue is likely that the packaged app has different behavior
// Let's create a version that detects if it's packaged and adjusts accordingly

const overlayPath = 'src/renderer/overlay.js';
const overlayContent = fs.readFileSync(overlayPath, 'utf8');

console.log('📄 Current overlay.js size:', overlayContent.length, 'characters');

// Check if we need to add packaged app detection
const hasPackagedDetection = overlayContent.includes('app.isPackaged');
const hasPermissionCheck = overlayContent.includes('microphone permission');

console.log('🔍 Analysis:');
console.log(`   ${hasPackagedDetection ? '✅' : '❌'} Has packaged app detection`);
console.log(`   ${hasPermissionCheck ? '✅' : '❌'} Has permission checking`);

if (!hasPackagedDetection) {
  console.log('\n💡 Recommendation: Add packaged app detection');
  console.log('   This will help the app behave differently when packaged vs development');
}

if (!hasPermissionCheck) {
  console.log('\n💡 Recommendation: Add microphone permission checking');
  console.log('   Packaged apps need explicit microphone permissions on macOS');
}

// Let's check what the actual error is in the packaged app
console.log('\n🔍 Checking packaged app logs for clues...');

const appDataDir = path.join(require('os').homedir(), 'Library', 'Application Support', 'speech-overlay-app');
const logsDir = path.join(appDataDir, 'logs');

if (fs.existsSync(logsDir)) {
  const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  if (logFiles.length > 0) {
    const latestLog = logFiles.sort().pop();
    const logPath = path.join(logsDir, latestLog);
    const logContent = fs.readFileSync(logPath, 'utf8');
    
    // Look for specific patterns that indicate the problem
    const hasAIInit = logContent.includes('AI initialization result');
    const hasAudioCapture = logContent.includes('audio capture');
    const hasTranscription = logContent.includes('Transcribed:');
    const hasErrors = logContent.includes('[ERROR]');
    
    console.log('\n📊 Log Analysis:');
    console.log(`   ${hasAIInit ? '✅' : '❌'} AI initialization attempted`);
    console.log(`   ${hasAudioCapture ? '✅' : '❌'} Audio capture attempted`);
    console.log(`   ${hasTranscription ? '✅' : '❌'} Transcription working`);
    console.log(`   ${hasErrors ? '⚠️' : '✅'} ${hasErrors ? 'Has errors' : 'No errors'}`);
    
    if (!hasAIInit) {
      console.log('\n🎯 ISSUE FOUND: AI initialization not being called in packaged app');
      console.log('   This suggests the overlay is not loading properly or IPC is not working');
    }
    
    if (hasAIInit && !hasTranscription) {
      console.log('\n🎯 ISSUE FOUND: AI initializes but transcription fails');
      console.log('   This suggests a credentials or API issue in the packaged app');
    }
  }
}

console.log('\n🛠️ Recommended fixes:');
console.log('=====================');
console.log('1. Check macOS microphone permissions for Speech Processor');
console.log('2. Verify Google credentials are properly bundled');
console.log('3. Add better error handling for packaged app differences');
console.log('4. Test with a minimal fix that preserves working functionality');

console.log('\n🚀 Next steps:');
console.log('==============');
console.log('1. Check System Preferences > Security & Privacy > Privacy > Microphone');
console.log('2. Ensure "Speech Processor" has microphone access');
console.log('3. Try running the packaged app from Terminal to see console output');
console.log('4. Compare credentials loading between dev and packaged versions');