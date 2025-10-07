/**
 * Google Speech-to-Text Manager
 * Handles speech recognition using Google Cloud Speech-to-Text API
 */

import { SpeechClient } from '@google-cloud/speech';
import { ResponseType, ProcessedResponse, AppError } from '../shared/types';

export interface GoogleSpeechConfig {
  // Option 1: Service Account (Recommended)
  keyFilename?: string; // Path to service account JSON file
  
  // Option 2: API Key (Simpler setup)
  apiKey?: string;
  
  // Option 3: Environment variables (GOOGLE_APPLICATION_CREDENTIALS)
  // No additional config needed if using environment variables
}

export class GoogleSpeechManager {
  private speechClient: SpeechClient | null = null;
  private isInitialized = false;
  private config: GoogleSpeechConfig;

  constructor(config: GoogleSpeechConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize Google Speech-to-Text client
   */
  async initializeService(): Promise<void> {
    try {
      console.log('Initializing Google Speech-to-Text...');

      // Initialize client with provided configuration
      if (this.config.keyFilename) {
        // Option 1: Service Account JSON file
        this.speechClient = new SpeechClient({
          keyFilename: this.config.keyFilename
        });
        console.log('Using service account authentication');
      } else if (this.config.apiKey) {
        // Option 2: API Key
        this.speechClient = new SpeechClient({
          apiKey: this.config.apiKey
        });
        console.log('Using API key authentication');
      } else {
        // Option 3: Environment variables (GOOGLE_APPLICATION_CREDENTIALS)
        this.speechClient = new SpeechClient();
        console.log('Using environment variable authentication');
      }

      // Test the connection with a simple request
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('Google Speech-to-Text initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Speech-to-Text:', error);
      throw new AppError(
        `Failed to initialize Google Speech-to-Text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GOOGLE_SPEECH_INIT_ERROR',
        'ai'
      );
    }
  }

  /**
   * Test the Google Speech-to-Text connection
   */
  private async testConnection(): Promise<void> {
    if (!this.speechClient) {
      throw new Error('Speech client not initialized');
    }

    try {
      // Create a minimal test request to verify authentication
      const request = {
        config: {
          encoding: 'LINEAR16' as const,
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
        audio: {
          content: Buffer.alloc(1024).toString('base64'), // Empty audio for test
        },
      };

      // This will fail with invalid audio but should succeed with authentication
      try {
        await this.speechClient.recognize(request);
      } catch (error: any) {
        // We expect this to fail with audio error, not auth error
        if (error.code === 3) { // INVALID_ARGUMENT (expected for empty audio)
          console.log('Authentication test passed');
          return;
        }
        throw error;
      }
    } catch (error: any) {
      if (error.code === 16) { // UNAUTHENTICATED
        throw new Error('Authentication failed. Please check your Google Cloud credentials.');
      } else if (error.code === 7) { // PERMISSION_DENIED
        throw new Error('Permission denied. Please ensure Speech-to-Text API is enabled.');
      }
      throw error;
    }
  }

  /**
   * Process audio input using Google Speech-to-Text
   */
  async processAudioInput(
    audioBuffer: ArrayBuffer, 
    expectedType?: string
  ): Promise<ProcessedResponse> {
    if (!this.isInitialized || !this.speechClient) {
      throw new AppError(
        'Google Speech-to-Text service not initialized',
        'SERVICE_NOT_INITIALIZED',
        'ai'
      );
    }

    try {
      console.log('Processing audio with Google Speech-to-Text...');
      console.log(`Audio buffer size: ${audioBuffer.byteLength} bytes`);
      
      // Validate audio buffer
      if (audioBuffer.byteLength === 0) {
        console.log('❌ Empty audio buffer - skipping Google API call');
        throw new AppError('Empty audio buffer received', 'INVALID_AUDIO', 'audio');
      }

      // Check if audio buffer is too small (less than 0.1 seconds at 16kHz)
      const minSamples = 1600; // 0.1 seconds at 16kHz
      const minBytes = minSamples * 2; // 16-bit samples = 2 bytes each
      
      if (audioBuffer.byteLength < minBytes) {
        console.log(`❌ Audio buffer too small: ${audioBuffer.byteLength} bytes (need at least ${minBytes})`);
        // Return empty result instead of throwing error
        return {
          questionId: '',
          patientMrn: '',
          rawText: '',
          responseType: this.classifyResponse('', expectedType),
          parsedValue: '',
          confidence: 0,
          timestamp: new Date()
        };
      }

      // Convert Float32Array to LINEAR16 format for Google API
      const float32Array = new Float32Array(audioBuffer);
      console.log(`🔄 Converting ${float32Array.length} Float32 samples to LINEAR16`);
      
      // Convert Float32 (-1.0 to 1.0) to 16-bit PCM (-32768 to 32767)
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        // Clamp to [-1, 1] and convert to 16-bit
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = sample * 32767;
      }
      
      const audioBytes = Buffer.from(int16Array.buffer);
      console.log(`📤 Sending ${audioBytes.length} bytes (${int16Array.length} samples) to Google Speech-to-Text API`);
      
      // Configure recognition request optimized for dates and complex speech
      const request = {
        config: {
          encoding: 'LINEAR16' as const,
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          // Enhanced configuration for better accuracy
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true, // Enable for better timing
          model: 'command_and_search', // Optimized for dates and commands
          useEnhanced: true, // Use enhanced model for better accuracy
          // Alternative voices/accents support
          alternativeLanguageCodes: ['en-IN', 'en-CA'], // Indian English, Canadian English
          // Enhanced speech contexts for better date and time recognition
          speechContexts: [{
            phrases: [
              // Complete date-time phrases (highest priority)
              'December fourth nineteen ninety one',
              'twenty first May nineteen ninety one eleven fifteen AM',
              'second August two thousand twelve three thirty PM',
              'September nineteenth two thousand twenty five twelve noon',
              // Date components
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
              // Ordinal numbers with better spacing
              'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
              'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
              'twenty first', 'twenty second', 'twenty third', 'twenty fourth', 'twenty fifth', 'twenty sixth', 'twenty seventh', 'twenty eighth', 'twenty ninth', 'thirtieth', 'thirty first',
              // Years (common patterns)
              'nineteen ninety one', 'nineteen ninety two', 'nineteen ninety three', 'nineteen ninety four', 'nineteen ninety five',
              'two thousand twelve', 'two thousand twenty three', 'two thousand twenty four', 'two thousand twenty five',
              // Time patterns (more specific)
              'eleven fifteen AM', 'eleven fifteen in the morning',
              'three thirty PM', 'three thirty in the afternoon', 
              'twelve noon', 'twelve midnight', 'midnight',
              'one o\'clock', 'two o\'clock', 'three o\'clock', 'four o\'clock', 'five o\'clock',
              'six o\'clock', 'seven o\'clock', 'eight o\'clock', 'nine o\'clock', 'ten o\'clock',
              'eleven o\'clock', 'twelve o\'clock',
              // Time qualifiers
              'AM', 'PM', 'in the morning', 'in the afternoon', 'in the evening', 'at night',
              // Simple responses
              'yes', 'no', 'not applicable'
            ],
            boost: 20.0 // Higher boost for complete phrases
          }],
          // Profanity filter off for medical terms
          profanityFilter: false
        },
        audio: {
          content: audioBytes.toString('base64'),
        },
      };

      // Perform speech recognition
      console.log('🚀 Calling Google Speech-to-Text API...');
      const response = await this.speechClient.recognize(request);
      console.log('✅ Received response from Google API');
      
      // Extract transcription
      const transcription = response[0].results?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = response[0].results?.[0]?.alternatives?.[0]?.confidence || 0;

      console.log(`📝 Google Speech transcribed: "${transcription}" (confidence: ${confidence})`);
      
      if (!transcription) {
        console.log('ℹ️ No transcription returned - likely silence or unclear audio');
      }

      // Parse the response
      const processedResponse = this.parseResponse(transcription, confidence, expectedType);
      
      return processedResponse;

    } catch (error) {
      console.error('Google Speech-to-Text processing error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Speech processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SPEECH_PROCESSING_ERROR',
        'ai'
      );
    }
  }

  /**
   * Process streaming audio (for real-time recognition)
   */
  async processAudioStream(
    audioBuffer: ArrayBuffer,
    expectedType?: string
  ): Promise<ProcessedResponse> {
    // For now, use the same method as batch processing
    // In the future, this could be enhanced with streaming recognition
    return this.processAudioInput(audioBuffer, expectedType);
  }

  /**
   * Parse the transcribed text into structured response
   */
  private parseResponse(
    text: string, 
    confidence: number, 
    expectedType?: string
  ): ProcessedResponse {
    const normalizedText = text.toLowerCase().trim();
    
    // Determine response type
    let responseType = this.classifyResponse(normalizedText, expectedType);
    
    // Parse the value based on response type
    let parsedValue: any = this.parseValue(normalizedText, responseType);
    
    // Adjust confidence based on response clarity
    const adjustedConfidence = this.calculateAdjustedConfidence(
      normalizedText, 
      responseType, 
      confidence
    );

    return {
      questionId: '', // Will be set by the calling code
      patientMrn: '', // Will be set by the calling code
      rawText: text,
      responseType,
      parsedValue,
      confidence: adjustedConfidence,
      timestamp: new Date()
    };
  }

  /**
   * Classify the response type based on content
   */
  private classifyResponse(text: string, expectedType?: string): ResponseType {
    // Check for date/time first (most specific)
    if (this.isDateTime(text)) {
      return ResponseType.DATE_TIME;
    }
    
    // Check for yes/no responses
    if (this.isYesResponse(text)) {
      return ResponseType.YES;
    }
    
    if (this.isNoResponse(text)) {
      return ResponseType.NO;
    }
    
    // Check for not applicable
    if (this.isNotApplicable(text)) {
      return ResponseType.NOT_APPLICABLE;
    }
    
    return ResponseType.UNCLEAR;
  }

  /**
   * Check if text represents a positive response
   */
  private isYesResponse(text: string): boolean {
    const yesPatterns = [
      /\b(yes|yeah|yep|yup|sure|correct|right|true|affirmative)\b/,
      /\b(ok|okay|alright|all right)\b/,
      /\b(definitely|absolutely|certainly|of course)\b/
    ];
    return yesPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text represents a negative response
   */
  private isNoResponse(text: string): boolean {
    const noPatterns = [
      /\b(no|nope|nah|negative|incorrect|wrong|false)\b/,
      /\b(never|none|nothing)\b/,
      /\b(not at all|definitely not|certainly not)\b/
    ];
    return noPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text represents a not applicable response
   */
  private isNotApplicable(text: string): boolean {
    const naPatterns = [
      /\b(not applicable|n\/a|na|not relevant)\b/,
      /\b(skip|pass|ignore|not sure|unsure)\b/,
      /\b(don't know|do not know|unknown)\b/
    ];
    return naPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text contains date/time information
   */
  private isDateTime(text: string): boolean {
    const dateTimePatterns = [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/, // 12/25/2023
      /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/, // 2023/12/25
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/,
      /\b\d{1,2}:\d{2}(\s*(am|pm))?\b/, // 3:30 PM
      /\b(today|yesterday|tomorrow|morning|afternoon|evening|night)\b/,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
      /\b\d{1,2}(st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/
    ];
    return dateTimePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Parse value based on response type
   */
  private parseValue(text: string, responseType: ResponseType): any {
    switch (responseType) {
      case ResponseType.YES:
        return true;
      case ResponseType.NO:
        return false;
      case ResponseType.NOT_APPLICABLE:
        return null;
      case ResponseType.DATE_TIME:
        return this.parseDateTime(text);
      default:
        return text;
    }
  }

  /**
   * Parse date/time from text
   */
  private parseDateTime(text: string): Date | string {
    try {
      // Try to parse as a standard date
      const parsed = new Date(text);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      
      // If standard parsing fails, return the original text
      // In a production system, you might want more sophisticated date parsing
      return text;
    } catch {
      return text;
    }
  }

  /**
   * Calculate adjusted confidence based on response characteristics
   */
  private calculateAdjustedConfidence(
    text: string, 
    responseType: ResponseType, 
    originalConfidence: number
  ): number {
    let adjustedConfidence = originalConfidence;
    
    // Boost confidence for clear yes/no responses
    if (responseType === ResponseType.YES || responseType === ResponseType.NO) {
      if (['yes', 'no', 'yeah', 'nope'].includes(text)) {
        adjustedConfidence = Math.min(adjustedConfidence + 0.1, 1.0);
      }
    }
    
    // Reduce confidence for very short unclear responses
    if (responseType === ResponseType.UNCLEAR && text.length < 3) {
      adjustedConfidence *= 0.7;
    }
    
    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; version: string; provider: string } {
    return {
      name: 'Google Speech-to-Text',
      version: 'latest_short',
      provider: 'Google Cloud'
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.speechClient) {
        // Close the client connection
        await this.speechClient.close();
        this.speechClient = null;
      }
      this.isInitialized = false;
      console.log('Google Speech-to-Text service cleaned up');
    } catch (error) {
      console.error('Error during Google Speech-to-Text cleanup:', error);
    }
  }
}