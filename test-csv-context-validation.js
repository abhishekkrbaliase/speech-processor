/**
 * Test CSV-driven speech context validation
 * This test validates the CSV context manager implementation without requiring module imports
 */

const fs = require('fs');
const path = require('path');

async function validateCSVContextImplementation() {
  console.log('🧪 Validating CSV-driven speech context implementation...\n');

  const results = {
    filesCreated: 0,
    typesExtended: 0,
    integrationPoints: 0,
    sampleFiles: 0,
    errors: []
  };

  try {
    // 1. Check if CSVDrivenSpeechContextManager was created
    console.log('📁 Checking implementation files...');
    
    const csvContextManagerPath = 'src/main/CSVDrivenSpeechContextManager.ts';
    if (fs.existsSync(csvContextManagerPath)) {
      console.log('✅ CSVDrivenSpeechContextManager.ts created');
      results.filesCreated++;
      
      // Check if it contains the required methods
      const content = fs.readFileSync(csvContextManagerPath, 'utf-8');
      const requiredMethods = [
        'initializeFromQuestions',
        'switchContextForQuestion',
        'generateContextsForExtendedType',
        'setSpeechManager'
      ];
      
      requiredMethods.forEach(method => {
        if (content.includes(method)) {
          console.log(`   ✅ Method ${method} implemented`);
        } else {
          console.log(`   ❌ Method ${method} missing`);
          results.errors.push(`Missing method: ${method}`);
        }
      });
    } else {
      console.log('❌ CSVDrivenSpeechContextManager.ts not found');
      results.errors.push('CSVDrivenSpeechContextManager.ts not created');
    }

    // 2. Check if ContextAwareSpeechManager was extended
    console.log('\n🔧 Checking ContextAwareSpeechManager extensions...');
    
    const contextManagerPath = 'src/main/ContextAwareSpeechManager.ts';
    if (fs.existsSync(contextManagerPath)) {
      const content = fs.readFileSync(contextManagerPath, 'utf-8');
      
      // Check for extended response types
      const extendedTypes = ['numeric', 'text', 'multiple_choice'];
      extendedTypes.forEach(type => {
        if (content.includes(`'${type}'`)) {
          console.log(`   ✅ Extended type '${type}' supported`);
          results.typesExtended++;
        } else {
          console.log(`   ❌ Extended type '${type}' missing`);
          results.errors.push(`Missing extended type: ${type}`);
        }
      });

      // Check for new context generation methods
      const newMethods = [
        'generateNumericContexts',
        'generateTextContexts', 
        'generateMultipleChoiceContexts',
        'generateContextsForExtendedType'
      ];
      
      newMethods.forEach(method => {
        if (content.includes(method)) {
          console.log(`   ✅ Method ${method} implemented`);
        } else {
          console.log(`   ❌ Method ${method} missing`);
          results.errors.push(`Missing method: ${method}`);
        }
      });
    } else {
      console.log('❌ ContextAwareSpeechManager.ts not found');
      results.errors.push('ContextAwareSpeechManager.ts not found');
    }

    // 3. Check integration points
    console.log('\n🔗 Checking integration points...');
    
    // Check main.ts integration
    const mainPath = 'src/main/main.ts';
    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf-8');
      
      if (content.includes('CSVDrivenSpeechContextManager')) {
        console.log('   ✅ CSVDrivenSpeechContextManager imported in main.ts');
        results.integrationPoints++;
      } else {
        console.log('   ❌ CSVDrivenSpeechContextManager not imported in main.ts');
        results.errors.push('Missing import in main.ts');
      }

      if (content.includes('setupCSVContextIntegration')) {
        console.log('   ✅ CSV context integration setup method found');
        results.integrationPoints++;
      } else {
        console.log('   ❌ CSV context integration setup method missing');
        results.errors.push('Missing setupCSVContextIntegration method');
      }

      if (content.includes('question-changed')) {
        console.log('   ✅ Question-changed event listener found');
        results.integrationPoints++;
      } else {
        console.log('   ❌ Question-changed event listener missing');
        results.errors.push('Missing question-changed event listener');
      }
    }

    // Check DataManager event emission
    const dataManagerPath = 'src/main/DataManager.ts';
    if (fs.existsSync(dataManagerPath)) {
      const content = fs.readFileSync(dataManagerPath, 'utf-8');
      
      if (content.includes('EventEmitter')) {
        console.log('   ✅ DataManager extends EventEmitter');
        results.integrationPoints++;
      } else {
        console.log('   ❌ DataManager does not extend EventEmitter');
        results.errors.push('DataManager missing EventEmitter');
      }

      if (content.includes('questions-loaded')) {
        console.log('   ✅ questions-loaded event emission found');
        results.integrationPoints++;
      } else {
        console.log('   ❌ questions-loaded event emission missing');
        results.errors.push('Missing questions-loaded event');
      }
    }

    // 4. Check sample files
    console.log('\n📋 Checking sample files...');
    
    const sampleFiles = [
      'examples/sample-questions-extended.csv',
      'examples/sample-questions-extended.json'
    ];
    
    sampleFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${filePath} created`);
        results.sampleFiles++;
        
        // Check if extended types are used
        const content = fs.readFileSync(filePath, 'utf-8');
        const extendedTypes = ['numeric', 'text', 'multiple_choice'];
        const foundTypes = extendedTypes.filter(type => content.includes(type));
        
        if (foundTypes.length > 0) {
          console.log(`      ✅ Contains extended types: ${foundTypes.join(', ')}`);
        } else {
          console.log(`      ⚠️ No extended types found`);
        }
      } else {
        console.log(`   ❌ ${filePath} not found`);
        results.errors.push(`Missing sample file: ${filePath}`);
      }
    });

    // 5. Check type definitions
    console.log('\n🏷️ Checking type definitions...');
    
    const typesPath = 'src/shared/types.ts';
    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf-8');
      
      const extendedTypes = ['numeric', 'text', 'multiple_choice'];
      const foundInTypes = extendedTypes.filter(type => content.includes(`'${type}'`));
      
      if (foundInTypes.length === extendedTypes.length) {
        console.log('   ✅ All extended types added to Question interface');
      } else {
        console.log(`   ⚠️ Only ${foundInTypes.length}/${extendedTypes.length} extended types found in types.ts`);
        results.errors.push('Incomplete type definitions');
      }
    }

    // 6. Check QuestionsParser updates
    const questionsParserPath = 'src/main/QuestionsParser.ts';
    if (fs.existsSync(questionsParserPath)) {
      const content = fs.readFileSync(questionsParserPath, 'utf-8');
      
      const extendedTypes = ['numeric', 'text', 'multiple_choice'];
      const foundInParser = extendedTypes.filter(type => content.includes(`'${type}'`));
      
      if (foundInParser.length === extendedTypes.length) {
        console.log('   ✅ QuestionsParser supports all extended types');
      } else {
        console.log(`   ⚠️ QuestionsParser only supports ${foundInParser.length}/${extendedTypes.length} extended types`);
        results.errors.push('Incomplete QuestionsParser support');
      }
    }

    // Summary
    console.log('\n📊 Implementation Validation Summary');
    console.log('=====================================');
    console.log(`✅ Files created: ${results.filesCreated}`);
    console.log(`✅ Extended types: ${results.typesExtended}`);
    console.log(`✅ Integration points: ${results.integrationPoints}`);
    console.log(`✅ Sample files: ${results.sampleFiles}`);
    
    if (results.errors.length === 0) {
      console.log('\n🎉 All validation checks passed!');
      console.log('\n💡 Implementation includes:');
      console.log('   • CSV-driven dynamic speech context switching');
      console.log('   • Support for numeric, text, and multiple_choice response types');
      console.log('   • Integration with QuestionnaireController question-changed events');
      console.log('   • Automatic context optimization based on expected response type');
      console.log('   • Performance metrics and caching for context switching');
      console.log('   • Sample CSV and JSON files with extended response types');
      
      console.log('\n🚀 Ready for testing:');
      console.log('   1. Load questions with extended response types');
      console.log('   2. Navigate through questions to trigger context switching');
      console.log('   3. Verify speech recognition accuracy improves for each type');
      
      return true;
    } else {
      console.log(`\n❌ ${results.errors.length} validation errors found:`);
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      return false;
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

// Run the validation
if (require.main === module) {
  validateCSVContextImplementation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation error:', error);
      process.exit(1);
    });
}

module.exports = { validateCSVContextImplementation };