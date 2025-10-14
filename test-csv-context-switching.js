/**
 * Test CSV-driven speech context switching
 * This test verifies that the CSV context manager correctly switches contexts based on question types
 */

const { CSVDrivenSpeechContextManager } = require('./dist/main/CSVDrivenSpeechContextManager');
const { ContextAwareSpeechManager } = require('./dist/main/ContextAwareSpeechManager');

async function testCSVContextSwitching() {
  console.log('🧪 Testing CSV-driven speech context switching...\n');

  // Create test questions with different response types
  const testQuestions = [
    {
      id: 'q1',
      text: 'Do you have any allergies?',
      expectedResponseType: 'yes_no',
      order: 1
    },
    {
      id: 'q2',
      text: 'When was your last appointment?',
      expectedResponseType: 'date_time',
      order: 2
    },
    {
      id: 'q3',
      text: 'How many medications do you take?',
      expectedResponseType: 'numeric',
      order: 3
    },
    {
      id: 'q4',
      text: 'Please describe your symptoms',
      expectedResponseType: 'text',
      order: 4
    },
    {
      id: 'q5',
      text: 'Choose your preferred contact method: A) Phone B) Email C) Text',
      expectedResponseType: 'multiple_choice',
      order: 5
    }
  ];

  try {
    // Initialize CSV context manager
    const contextManager = new CSVDrivenSpeechContextManager();
    
    console.log('📋 Initializing context manager with test questions...');
    contextManager.initializeFromQuestions(testQuestions);
    
    console.log('✅ Context manager initialized\n');

    // Test context switching for each question type
    for (const question of testQuestions) {
      console.log(`🔄 Testing context switch for question: ${question.id} (${question.expectedResponseType})`);
      
      const success = await contextManager.switchContextForQuestion(question.id);
      
      if (success) {
        const contextInfo = contextManager.getCurrentContextInfo();
        console.log(`✅ Context switched successfully:`);
        console.log(`   Question ID: ${contextInfo.questionId}`);
        console.log(`   Response Type: ${contextInfo.responseType}`);
        console.log(`   Context Summary: ${contextInfo.contextSummary}`);
      } else {
        console.log(`❌ Context switch failed for question: ${question.id}`);
      }
      
      console.log('');
    }

    // Test metrics
    const metrics = contextManager.getMetrics();
    console.log('📊 Context switching metrics:');
    console.log(`   Total switches: ${metrics.totalSwitches}`);
    console.log(`   Switches by type:`, metrics.switchesByType);
    console.log(`   Average latency: ${metrics.averageSwitchLatency.toFixed(2)}ms`);
    console.log(`   Cache hits: ${metrics.contextCacheHits}`);
    console.log(`   Cache misses: ${metrics.contextCacheMisses}`);

    // Test extended context generation
    console.log('\n🎯 Testing extended context generation...');
    
    const extendedTypes = ['numeric', 'text', 'multiple_choice'];
    for (const type of extendedTypes) {
      const contexts = ContextAwareSpeechManager.generateContextsForExtendedType(type);
      const summary = ContextAwareSpeechManager.getExtendedContextSummary(type);
      
      console.log(`   ${type}: ${summary}`);
      console.log(`     Context groups: ${contexts.speechContexts.length}`);
      console.log(`     Total phrases: ${contexts.speechContexts.reduce((sum, ctx) => sum + ctx.phrases.length, 0)}`);
      console.log(`     Model: ${contexts.model}`);
    }

    console.log('\n✅ All tests completed successfully!');
    
    // Cleanup
    contextManager.cleanup();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCSVContextSwitching().catch(console.error);
}

module.exports = { testCSVContextSwitching };