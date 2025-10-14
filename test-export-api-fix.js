/**
 * Test Export API Fix
 * Verify that the export functionality uses the correct DataManager API
 */

const fs = require('fs');

console.log('🧪 Testing Export API Fix');
console.log('=========================');

// Test 1: Check if correct DataManager API is used
console.log('\n📋 Test 1: Checking DataManager API usage...');
const overlayJs = fs.readFileSync('src/renderer/overlay-new.js', 'utf8');

if (overlayJs.includes('window.dataManager.addResponse')) {
    console.log('   ✅ Correct API method (addResponse) found');
} else {
    console.log('   ❌ Correct API method (addResponse) NOT found');
}

if (overlayJs.includes('window.dataManager.saveResponse')) {
    console.log('   ❌ Incorrect API method (saveResponse) still present');
} else {
    console.log('   ✅ Incorrect API method (saveResponse) not found');
}

// Test 2: Check response object structure
console.log('\n📋 Test 2: Checking response object structure...');

if (overlayJs.includes('questionId: currentQuestion.id') && 
    overlayJs.includes('patientMrn: currentPatient.mrn') &&
    overlayJs.includes('rawText: text') &&
    overlayJs.includes('responseType: \'unclear\'')) {
    console.log('   ✅ Correct ProcessedResponse structure found');
} else {
    console.log('   ❌ Correct ProcessedResponse structure NOT found');
}

// Test 3: Check if responses are saved during transcription
console.log('\n📋 Test 3: Checking transcription response saving...');

const saveResponseCalls = overlayJs.match(/saveCurrentResponse\(/g);
console.log('   📊 saveCurrentResponse calls found:', saveResponseCalls ? saveResponseCalls.length : 0);

if (saveResponseCalls && saveResponseCalls.length >= 2) {
    console.log('   ✅ Both transcription handlers save responses');
} else {
    console.log('   ❌ Not all transcription handlers save responses');
}

// Test 4: Check if responses are saved on Next button
console.log('\n📋 Test 4: Checking Next button response saving...');

if (overlayJs.includes('overlayState.currentResponse && overlayState.currentResponse.text') &&
    overlayJs.includes('saveCurrentResponse(overlayState.currentResponse.text')) {
    console.log('   ✅ Next button saves current response');
} else {
    console.log('   ❌ Next button does NOT save current response');
}

// Test 5: Check export functionality
console.log('\n📋 Test 5: Checking export functionality...');

if (overlayJs.includes('window.exportManager.exportWithDialog')) {
    console.log('   ✅ Export manager integration found');
} else {
    console.log('   ❌ Export manager integration NOT found');
}

if (overlayJs.includes('showExportDialog()') && overlayJs.includes('all questionnaires completed')) {
    console.log('   ✅ Export trigger on completion found');
} else {
    console.log('   ❌ Export trigger on completion NOT found');
}

// Test 6: Check audio stopping on completion
console.log('\n📋 Test 6: Checking audio stopping...');

if (overlayJs.includes('stopBrowserAudioCapture()') && overlayJs.includes('all questionnaires completed')) {
    console.log('   ✅ Audio capture stops on completion');
} else {
    console.log('   ❌ Audio capture does NOT stop on completion');
}

console.log('\n🎉 Export API fix test complete!');
console.log('\n📝 Expected behavior:');
console.log('   1. Responses saved using window.dataManager.addResponse()');
console.log('   2. Correct ProcessedResponse structure with all required fields');
console.log('   3. Responses saved during transcription AND on Next button');
console.log('   4. Export dialog shows when all questionnaires completed');
console.log('   5. Audio capture stops when completed');
console.log('   6. Export should work with saved responses');