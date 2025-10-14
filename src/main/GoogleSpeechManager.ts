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
          model: 'latest_short', // Optimized for short responses like yes/no and dates
          useEnhanced: true, // Use enhanced model for better accuracy (Requirement 4.4)
          // Alternative voices/accents support
          alternativeLanguageCodes: ['en-IN', 'en-CA'], // Indian English, Canadian English
          // Enhanced speech contexts for better accuracy (Requirements 4.1, 4.2, 4.4)
          speechContexts: [
            // High priority: Yes/No responses with variations (Requirement 4.2)
            {
              phrases: [
                'yes', 'yeah', 'yep', 'yup', 'affirmative', 'correct', 'right', 'true',
                'absolutely', 'definitely', 'certainly', 'of course', 'sure', 'ok', 'okay'
              ],
              boost: 20.0
            },
            {
              phrases: [
                'no', 'nope', 'negative', 'incorrect', 'wrong', 'false', 'nah',
                'never', 'not at all', 'definitely not', 'certainly not'
              ],
              boost: 20.0
            },
            // High priority: Specific date patterns with ordinals (Requirement 4.4)
            // Handles "13th November 2025" style dates with pauses
            {
              phrases: [
                'thirteenth November 2025', '13th November 2025', 'thirteenth November twenty twenty five',
                'fourteenth December 2024', '14th December 2024', 'fourteenth December twenty twenty four',
                'twenty first May 2025', '21st May 2025', 'twenty first May twenty twenty five',
                'first January 2025', '1st January 2025', 'first January twenty twenty five',
                'second February 2025', '2nd February 2025', 'second February twenty twenty five',
                'third March 2025', '3rd March 2025', 'third March twenty twenty five',
                'fourth April 2025', '4th April 2025', 'fourth April twenty twenty five',
                'fifth May 2025', '5th May 2025', 'fifth May twenty twenty five',
                'sixth June 2025', '6th June 2025', 'sixth June twenty twenty five',
                'seventh July 2025', '7th July 2025', 'seventh July twenty twenty five',
                'eighth August 2025', '8th August 2025', 'eighth August twenty twenty five',
                'ninth September 2025', '9th September 2025', 'ninth September twenty twenty five',
                'tenth October 2025', '10th October 2025', 'tenth October twenty twenty five'
              ],
              boost: 20.0
            },
            // High priority: Date-time combinations with AM/PM (Requirement 4.4)
            // Handles "13th November 2025 11 AM" style with pauses
            {
              phrases: [
                'thirteenth November 2025 eleven AM', '13th November 2025 11 AM',
                'thirteenth November 2025 eleven in the morning', '13th November 2025 11 in the morning',
                'fourteenth December 2024 three PM', '14th December 2024 3 PM',
                'twenty first May 2025 nine AM', '21st May 2025 9 AM',
                'first January 2025 ten AM', '1st January 2025 10 AM',
                'second February 2025 two PM', '2nd February 2025 2 PM',
                'third March 2025 four PM', '3rd March 2025 4 PM',
                'fourth April 2025 eight AM', '4th April 2025 8 AM',
                'fifth May 2025 twelve PM', '5th May 2025 12 PM',
                'sixth June 2025 one PM', '6th June 2025 1 PM',
                'seventh July 2025 five PM', '7th July 2025 5 PM',
                'eighth August 2025 seven AM', '8th August 2025 7 AM',
                'ninth September 2025 six PM', '9th September 2025 6 PM',
                'tenth October 2025 eleven PM', '10th October 2025 11 PM'
              ],
              boost: 18.0
            },
            // High priority: Month names (Requirement 4.4)
            {
              phrases: [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ],
              boost: 18.0
            },
            // High priority: Ordinal numbers with variations (Requirement 4.4)
            {
              phrases: [
                'first', '1st', 'second', '2nd', 'third', '3rd', 'fourth', '4th', 'fifth', '5th', 
                'sixth', '6th', 'seventh', '7th', 'eighth', '8th', 'ninth', '9th', 'tenth', '10th',
                'eleventh', '11th', 'twelfth', '12th', 'thirteenth', '13th', 'fourteenth', '14th', 
                'fifteenth', '15th', 'sixteenth', '16th', 'seventeenth', '17th', 'eighteenth', '18th', 
                'nineteenth', '19th', 'twentieth', '20th', 'twenty first', '21st', 'twenty second', '22nd', 
                'twenty third', '23rd', 'twenty fourth', '24th', 'twenty fifth', '25th', 'twenty sixth', '26th', 
                'twenty seventh', '27th', 'twenty eighth', '28th', 'twenty ninth', '29th', 'thirtieth', '30th', 
                'thirty first', '31st'
              ],
              boost: 15.0
            },
            // Medium priority: Years in different formats (Requirement 4.4)
            {
              phrases: [
                '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
                'twenty twenty', 'twenty twenty one', 'twenty twenty two', 'twenty twenty three', 
                'twenty twenty four', 'twenty twenty five', 'twenty twenty six', 'twenty twenty seven',
                'twenty twenty eight', 'twenty twenty nine', 'twenty thirty',
                'nineteen ninety one', 'nineteen ninety two', 'nineteen ninety three', 'nineteen ninety four', 
                'nineteen ninety five', 'nineteen ninety six', 'nineteen ninety seven', 'nineteen ninety eight', 
                'nineteen ninety nine', 'two thousand', 'two thousand one', 'two thousand two'
              ],
              boost: 12.0
            },
            // Medium priority: Time patterns and AM/PM
            {
              phrases: [
                'eleven AM', '11 AM', 'eleven in the morning', '11 in the morning',
                'three PM', '3 PM', 'three in the afternoon', '3 in the afternoon',
                'nine AM', '9 AM', 'nine in the morning', '9 in the morning',
                'two PM', '2 PM', 'two in the afternoon', '2 in the afternoon',
                'twelve PM', '12 PM', 'twelve noon', 'noon',
                'twelve AM', '12 AM', 'twelve midnight', 'midnight',
                'one o\'clock', 'two o\'clock', 'three o\'clock', 'four o\'clock', 'five o\'clock',
                'six o\'clock', 'seven o\'clock', 'eight o\'clock', 'nine o\'clock', 'ten o\'clock',
                'eleven o\'clock', 'twelve o\'clock'
              ],
              boost: 12.0
            },
            // Lower priority: Time qualifiers and other responses
            {
              phrases: [
                'AM', 'PM', 'a.m.', 'p.m.', 'in the morning', 'in the afternoon', 'in the evening', 'at night',
                'not applicable', 'N/A', 'not relevant', 'unknown', 'unsure'
              ],
              boost: 10.0
            }
          ],
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
   * Check if text represents a positive response (Enhanced for Requirement 4.2)
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
   * Check if text represents a negative response (Enhanced for Requirement 4.2)
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
   * Calculate adjusted confidence based on response characteristics (Enhanced for Requirements 4.1, 4.2)
   */
  private calculateAdjustedConfidence(
    text: string, 
    responseType: ResponseType, 
    originalConfidence: number
  ): number {
    let adjustedConfidence = originalConfidence;
    const normalizedText = text.toLowerCase().trim();
    
    // Boost confidence for speech context matches (Requirement 4.1)
    
    // High boost for exact yes/no matches (Requirement 4.2)
    const exactYesMatches = ['yes', 'yeah', 'yep', 'yup', 'affirmative', 'correct', 'right', 'true', 'absolutely', 'definitely', 'certainly', 'of course', 'sure', 'ok', 'okay'];
    const exactNoMatches = ['no', 'nope', 'negative', 'incorrect', 'wrong', 'false', 'nah', 'never', 'not at all', 'definitely not', 'certainly not'];
    
    if (responseType === ResponseType.YES && exactYesMatches.includes(normalizedText)) {
      adjustedConfidence = Math.min(adjustedConfidence + 0.15, 1.0);
    } else if (responseType === ResponseType.NO && exactNoMatches.includes(normalizedText)) {
      adjustedConfidence = Math.min(adjustedConfidence + 0.15, 1.0);
    }
    
    // Boost confidence for date/time responses with month names (Requirement 4.4)
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    if (responseType === ResponseType.DATE_TIME) {
      const hasMonth = monthNames.some(month => normalizedText.includes(month));
      if (hasMonth) {
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
   * Get model information (Enhanced for Requirement 4.4)
   */
  getModelInfo(): { name: string; version: string; provider: string; enhanced: boolean } {
    return {
      name: 'Google Speech-to-Text',
      version: 'latest_short',
      provider: 'Google Cloud',
      enhanced: true // Using enhanced model for better accuracy
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