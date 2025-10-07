/**
 * Jest Test Setup
 * Global setup for live transcription tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods for cleaner test output (optional)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Override console methods to include test context
console.log = (...args) => {
  originalConsoleLog('[TEST]', ...args);
};

console.error = (...args) => {
  originalConsoleError('[TEST ERROR]', ...args);
};

// Global test timeout
jest.setTimeout(30000);

// Setup global test utilities
global.testUtils = {
  // Helper to create test audio buffers
  createTestAudioBuffer: (durationMs = 100, sampleRate = 16000) => {
    const samples = Math.floor((durationMs / 1000) * sampleRate);
    const buffer = new ArrayBuffer(samples * 2); // 16-bit samples
    const view = new Int16Array(buffer);
    
    // Fill with sine wave for testing
    for (let i = 0; i < samples; i++) {
      view[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767;
    }
    
    return buffer;
  },
  
  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to check if Google Cloud credentials are available
  hasGoogleCredentials: () => {
    return !!(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_SPEECH_API_KEY ||
      process.env.GOOGLE_CLOUD_PROJECT
    );
  }
};

// Setup error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🧪 Test setup complete - Live Transcription Test Suite');
console.log('📊 Environment:', {
  nodeEnv: process.env.NODE_ENV,
  hasGoogleCreds: global.testUtils.hasGoogleCredentials(),
  testTimeout: 30000
});