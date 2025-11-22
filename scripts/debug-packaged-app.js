#!/usr/bin/env node

/**
 * Debug script for packaged app issues
 * Helps diagnose problems with the packaged Speech Processor
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Speech Processor - Packaged App Diagnostics');
console.log('===============================================');

// Check app data directory
const appDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'speech-overlay-app');
console.log('\n📁 App Data Directory:', appDataDir);

if (fs.existsSync(appDataDir)) {
  console.log('✅ App data directory exists');
  
  // Check logs
  const logsDir = path.join(appDataDir, 'logs');
  if (fs.existsSync(logsDir)) {
    console.log('✅ Logs directory exists');
    
    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
    console.log(`📄 Found ${logFiles.length} log files:`);
    
    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeMB} MB, modified: ${stats.mtime.toISOString()})`);
    });
    
    // Check latest log for errors
    if (logFiles.length > 0) {
      const latestLog = logFiles.sort().pop();
      const latestLogPath = path.join(logsDir, latestLog);
      const logContent = fs.readFileSync(latestLogPath, 'utf8');
      
      console.log(`\n🔍 Analyzing latest log: ${latestLog}`);
      
      // Count different types of entries
      const lines = logContent.split('\n');
      const errors = lines.filter(line => line.includes('[ERROR]')).length;
      const warnings = lines.filter(line => line.includes('[WARN]')).length;
      const infos = lines.filter(line => line.includes('[INFO]')).length;
      
      console.log(`   📊 Log entries: ${errors} errors, ${warnings} warnings, ${infos} info`);
      
      // Check for specific issues
      const hasStreamingInit = logContent.includes('liveTranscription:initialize');
      const hasStreamingStart = logContent.includes('liveTranscription:startStreaming');
      const hasAudioCapture = logContent.includes('audio:startCapture');
      const hasGoogleSpeechInit = logContent.includes('GoogleSpeechManager initialized');
      
      console.log('\n🔍 Feature Status:');
      console.log(`   ${hasGoogleSpeechInit ? '✅' : '❌'} Google Speech Manager initialized`);
      console.log(`   ${hasStreamingInit ? '✅' : '❌'} Live transcription initialized`);
      console.log(`   ${hasStreamingStart ? '✅' : '❌'} Streaming started`);
      console.log(`   ${hasAudioCapture ? '✅' : '❌'} Audio capture started`);
      
      // Show recent errors
      const recentErrors = lines.filter(line => line.includes('[ERROR]')).slice(-5);
      if (recentErrors.length > 0) {
        console.log('\n❌ Recent Errors:');
        recentErrors.forEach(error => console.log(`   ${error}`));
      }
      
      // Show last few entries
      console.log('\n📝 Last 10 log entries:');
      const lastEntries = lines.filter(line => line.trim()).slice(-10);
      lastEntries.forEach(entry => console.log(`   ${entry}`));
    }
  } else {
    console.log('❌ Logs directory not found');
  }
  
  // Check config files
  const configFile = path.join(appDataDir, 'config.json');
  if (fs.existsSync(configFile)) {
    console.log('✅ Config file exists in app data');
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      console.log('   Config keys:', Object.keys(config));
    } catch (error) {
      console.log('❌ Config file is invalid JSON');
    }
  }
  
} else {
  console.log('❌ App data directory not found');
  console.log('   This suggests the packaged app has never been run');
}

// Check packaged app resources
const packagedAppPath = '/Users/abhishek/code/binario/speech-processor/release/Speech Processor.app';
console.log('\n📦 Packaged App Resources:');

if (fs.existsSync(packagedAppPath)) {
  console.log('✅ Packaged app exists');
  
  const resourcesPath = path.join(packagedAppPath, 'Contents', 'Resources');
  if (fs.existsSync(resourcesPath)) {
    console.log('✅ Resources directory exists');
    
    const credentialsPath = path.join(resourcesPath, 'google-credentials.json');
    const configPath = path.join(resourcesPath, 'config.json');
    
    console.log(`   ${fs.existsSync(credentialsPath) ? '✅' : '❌'} google-credentials.json`);
    console.log(`   ${fs.existsSync(configPath) ? '✅' : '❌'} config.json`);
    
    if (fs.existsSync(credentialsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        console.log(`   📋 Credentials project: ${creds.project_id}`);
        console.log(`   📋 Credentials type: ${creds.type}`);
      } catch (error) {
        console.log('   ❌ Credentials file is invalid JSON');
      }
    }
  }
} else {
  console.log('❌ Packaged app not found');
}

console.log('\n💡 Troubleshooting Suggestions:');
console.log('================================');

if (!fs.existsSync(appDataDir)) {
  console.log('1. Run the packaged app at least once to create app data directory');
}

console.log('2. Check macOS microphone permissions for Speech Processor');
console.log('3. Try running the app from Terminal to see console output:');
console.log('   open "/Users/abhishek/code/binario/speech-processor/release/Speech Processor.app"');
console.log('4. Compare behavior with development version (npm start)');
console.log('5. Check if Google Speech API quotas/billing are active');

console.log('\n🔧 Debug Commands:');
console.log('==================');
console.log('# View live logs:');
console.log(`tail -f "${path.join(appDataDir, 'logs')}"/speech-processor-*.log`);
console.log('\n# Check microphone permissions:');
console.log('System Preferences > Security & Privacy > Privacy > Microphone');
console.log('\n# Run packaged app with console output:');
console.log('open -a Console.app');
console.log('# Then launch Speech Processor and filter Console by "Speech Processor"');