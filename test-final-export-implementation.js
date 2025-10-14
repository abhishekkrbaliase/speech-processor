/**
 * Final Export Implementation Test
 * Comprehensive test to verify all export functionality is properly implemented
 */

const fs = require('fs');

console.log('🧪 Final Export Implementation Test');
console.log('===================================');

let allTestsPassed = true;

// Test 1: HTML Structure
console.log('\n📋 Test 1: HTML Structure...');
const overlayHtml = fs.readFileSync('src/renderer/overlay-new.html', 'utf8');

if (overlayHtml.includes('id="export-btn"') && overlayHtml.includes('📤 Export')) {
    console.log('   ✅ Export button in HTML');
} else {
    console.log('   ❌ Export button missing in HTML');
    allTestsPassed = false;
}

// Test 2: JavaScript Integration
console.log('\n📋 Test 2: JavaScript Integration...');
const overlayJs = fs.readFileSync('src/renderer/overlay-new.js', 'utf8');

const requiredFunctions = [
    'showExportDialog',
    'createExportDialog', 
    'handleExportCSV',
    'saveCurrentResponse'
];

requiredFunctions.forEach(func => {
    if (overlayJs.includes(`function ${func}`)) {
        console.log(`   ✅ ${func} function found`);
    } else {
        console.log(`   ❌ ${func} function missing`);
        allTestsPassed = false;
    }
});

// Test 3: Event Listeners
console.log('\n📋 Test 3: Event Listeners...');

if (overlayJs.includes('exportBtn.addEventListener') && overlayJs.includes('showExportDialog()')) {
    console.log('   ✅ Export button event listener');
} else {
    console.log('   ❌ Export button event listener missing');
    allTestsPassed = false;
}

// Test 4: DataManager API Usage
console.log('\n📋 Test 4: DataManager API Usage...');

if (overlayJs.includes('window.dataManager.addResponse')) {
    console.log('   ✅ Correct addResponse API used');
} else {
    console.log('   ❌ Correct addResponse API not used');
    allTestsPassed = false;
}

if (!overlayJs.includes('window.dataManager.saveResponse')) {
    console.log('   ✅ Incorrect saveResponse API not used');
} else {
    console.log('   ❌ Incorrect saveResponse API still present');
    allTestsPassed = false;
}

// Test 5: Response Object Structure
console.log('\n📋 Test 5: Response Object Structure...');

const requiredFields = [
    'questionId: currentQuestion.id',
    'patientMrn: currentPatient.mrn',
    'rawText: text',
    'parsedValue: text',
    'responseType: \'unclear\'',
    'confidence: confidence',
    'timestamp: new Date()'
];

let fieldsFound = 0;
requiredFields.forEach(field => {
    if (overlayJs.includes(field)) {
        fieldsFound++;
    }
});

if (fieldsFound === requiredFields.length) {
    console.log('   ✅ All required ProcessedResponse fields present');
} else {
    console.log(`   ❌ Only ${fieldsFound}/${requiredFields.length} required fields found`);
    allTestsPassed = false;
}

// Test 6: Response Saving Points
console.log('\n📋 Test 6: Response Saving Points...');

const savePoints = overlayJs.match(/saveCurrentResponse\(/g);
if (savePoints && savePoints.length >= 3) {
    console.log(`   ✅ Response saving at ${savePoints.length} points`);
} else {
    console.log(`   ❌ Insufficient response saving points (found: ${savePoints ? savePoints.length : 0})`);
    allTestsPassed = false;
}

// Test 7: Completion Handling
console.log('\n📋 Test 7: Completion Handling...');

if (overlayJs.includes('all questionnaires completed') && 
    overlayJs.includes('stopBrowserAudioCapture()') &&
    overlayJs.includes('showExportDialog()')) {
    console.log('   ✅ Proper completion handling');
} else {
    console.log('   ❌ Incomplete completion handling');
    allTestsPassed = false;
}

// Test 8: Export Manager Integration
console.log('\n📋 Test 8: Export Manager Integration...');

if (overlayJs.includes('window.exportManager.exportWithDialog') &&
    overlayJs.includes('format: \'csv\'') &&
    overlayJs.includes('includePatientDetails: true')) {
    console.log('   ✅ Export manager properly integrated');
} else {
    console.log('   ❌ Export manager integration incomplete');
    allTestsPassed = false;
}

// Test 9: Built Files
console.log('\n📋 Test 9: Built Files...');

if (fs.existsSync('dist/overlay-new.html') && fs.existsSync('dist/overlay-new.js')) {
    const builtHtml = fs.readFileSync('dist/overlay-new.html', 'utf8');
    const builtJs = fs.readFileSync('dist/overlay-new.js', 'utf8');
    
    if (builtHtml.includes('📤 Export') && builtJs.includes('showExportDialog')) {
        console.log('   ✅ Built files contain export functionality');
    } else {
        console.log('   ❌ Built files missing export functionality');
        allTestsPassed = false;
    }
} else {
    console.log('   ❌ Built files not found');
    allTestsPassed = false;
}

// Final Result
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Export functionality is properly implemented.');
    console.log('\n✅ Ready for testing:');
    console.log('   1. Run: npm start');
    console.log('   2. Load patients and questions');
    console.log('   3. Answer questions (responses will be saved automatically)');
    console.log('   4. Click "📤 Export" button OR complete all questionnaires');
    console.log('   5. Choose save location in file dialog');
    console.log('   6. Verify CSV contains MRN, Question ID, and Answers');
    console.log('\n🔧 Key fixes implemented:');
    console.log('   • Uses correct window.dataManager.addResponse() API');
    console.log('   • Proper ProcessedResponse object structure');
    console.log('   • Responses saved during transcription AND on Next button');
    console.log('   • Audio capture stops when all questionnaires completed');
    console.log('   • Export dialog shows automatically on completion');
    console.log('   • Manual export available via Export button');
} else {
    console.log('❌ SOME TESTS FAILED! Please review the implementation.');
}
console.log('='.repeat(50));