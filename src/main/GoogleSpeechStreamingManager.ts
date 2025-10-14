/**
 * Google Speech-to-Text Streaming Manager
 * Handles real-time speech recognition using Google Cloud Speech-to-Text streaming API
 */

import { SpeechClient } from '@google-cloud/speech';
import { ResponseType, ProcessedResponse, AppError } from '../shared/types';
import { logger } from '../shared/logger';
import { correctTranscription, validateDateTime } from '../shared/transcription-utils';

export interface GoogleSpeechStreamingConfig {
  // Authentication options
  keyFilename?: string; // Path to service account JSON file
  apiKey?: string; // API key for authentication
  projectId?: string; // Google Cloud project ID
  
  // Streaming configuration
  languageCode: string; // Language code (e.g., 'en-US')
  model: 'latest_long' | 'latest_short' | 'command_and_search';
  enableInterimResults: boolean; // Enable partial results
  enableAutomaticPunctuation: boolean;
  sampleRateHertz: number; // Audio sample rate
  encoding: 'LINEAR16' | 'FLAC';
  
  // Streaming behavior
  streamingTimeout: number; // Timeout for streaming session (ms)
  chunkSize: number; // Audio chunk size for streaming
  maxAlternatives: number; // Maximum alternative transcriptions
  
  // Speech context optimization (Requirements 4.1, 4.2, 4.4)
  enableSpeechContexts?: boolean; // Enable speech context optimization
  speechContextBoost?: SpeechContextBoostConfig; // Custom boost values
  useEnhanced?: boolean; // Use enhanced model for better accuracy
}

export interface SpeechContextBoostConfig {
  yesNoResponses: number; // Boost for yes/no responses (default: 20.0)
  dateTimePatterns: number; // Boost for date-time patterns (default: 20.0)
  timePatterns: number; // Boost for time patterns (default: 18.0)
  monthNames: number; // Boost for month names (default: 16.0)
  ordinalNumbers: number; // Boost for ordinal numbers (default: 16.0)
  yearFormats: number; // Boost for year formats (default: 14.0)
  commonResponses: number; // Boost for common responses (default: 12.0)
}

export interface StreamingSession {
  sendAudioChunk(chunk: ArrayBuffer): void;
  onPartialResult(callback: (result: PartialResult) => void): void;
  onFinalResult(callback: (result: FinalResult) => void): void;
  onError(callback: (error: StreamingError) => void): void;
  close(): void;
  isActive(): boolean;
}

export interface PartialResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  stability: number;
  words?: WordResult[];
  timestamp: Date;
}

export interface FinalResult {
  transcript: string;
  confidence: number;
  words: WordResult[];
  alternatives?: Alternative[];
  languageCode?: string;
  timestamp: Date;
}

export interface WordResult {
  word: string;
  confidence: number;
  startTime: number; // Start time in seconds
  endTime: number; // End time in seconds
}

export interface Alternative {
  transcript: string;
  confidence: number;
  words?: WordResult[];
}

export interface StreamingError {
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  originalError?: any;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isStreaming: boolean;
  latency: number;
  errorCount: number;
  lastError?: StreamingError;
  sessionStartTime?: Date;
}

export class GoogleSpeechStreamingManager {
  private speechClient: SpeechClient | null = null;
  private isInitialized = false;
  private config: GoogleSpeechStreamingConfig;
  private connectionStatus: ConnectionStatus;

  constructor(config: GoogleSpeechStreamingConfig) {
    // Set default configuration and merge with provided config
    const defaultConfig: GoogleSpeechStreamingConfig = {
      languageCode: 'en-US',
      model: 'latest_short', // Optimized for low latency
      enableInterimResults: true,
      enableAutomaticPunctuation: true,
      sampleRateHertz: 16000,
      encoding: 'LINEAR16',
      streamingTimeout: 60000, // 60 seconds
      chunkSize: 1600, // 100ms chunks for minimal latency
      maxAlternatives: 1,
      enableSpeechContexts: true, // Enable speech context optimization by default
      speechContextBoost: {
        yesNoResponses: 20.0,
        dateTimePatterns: 20.0,
        timePatterns: 18.0,
        monthNames: 16.0,
        ordinalNumbers: 16.0,
        yearFormats: 14.0,
        commonResponses: 12.0
      }
    };
    
    this.config = { ...defaultConfig, ...config };

    this.connectionStatus = {
      isConnected: false,
      isStreaming: false,
      latency: 0,
      errorCount: 0
    };
  }

  /**
   * Initialize Google Speech-to-Text streaming client
   */
  async initializeGoogleSpeech(): Promise<void> {
    try {
      console.log('Initializing Google Speech-to-Text streaming...');

      // Initialize client with provided configuration
      if (this.config.keyFilename) {
        // Option 1: Service Account JSON file
        this.speechClient = new SpeechClient({
          keyFilename: this.config.keyFilename,
          projectId: this.config.projectId
        });
        console.log('Using service account authentication for streaming');
      } else if (this.config.apiKey) {
        // Option 2: API Key
        this.speechClient = new SpeechClient({
          apiKey: this.config.apiKey,
          projectId: this.config.projectId
        });
        console.log('Using API key authentication for streaming');
      } else {
        // Option 3: Environment variables (GOOGLE_APPLICATION_CREDENTIALS)
        this.speechClient = new SpeechClient({
          projectId: this.config.projectId
        });
        console.log('Using environment variable authentication for streaming');
      }

      // Test the connection
      await this.testConnectivity();
      
      this.isInitialized = true;
      this.connectionStatus.isConnected = true;
      console.log('Google Speech-to-Text streaming initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Speech-to-Text streaming:', error);
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = {
        code: 'INIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        timestamp: new Date(),
        recoverable: true,
        originalError: error
      };
      
      throw new AppError(
        `Failed to initialize Google Speech-to-Text streaming: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GOOGLE_SPEECH_STREAMING_INIT_ERROR',
        'ai'
      );
    }
  }

  /**
   * Test connectivity to Google Speech-to-Text service
   */
  async testConnectivity(): Promise<boolean> {
    if (!this.speechClient) {
      throw new Error('Speech client not initialized');
    }

    try {
      const startTime = Date.now();
      
      // Create a minimal test request to verify authentication and connectivity
      const request = {
        config: {
          encoding: this.config.encoding as any,
          sampleRateHertz: this.config.sampleRateHertz,
          languageCode: this.config.languageCode,
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
          const latency = Date.now() - startTime;
          this.connectionStatus.latency = latency;
          console.log(`Connectivity test passed (latency: ${latency}ms)`);
          return true;
        }
        throw error;
      }
      
      return true;
    } catch (error: any) {
      this.connectionStatus.errorCount++;
      
      if (error.code === 16) { // UNAUTHENTICATED
        throw new Error('Authentication failed. Please check your Google Cloud credentials.');
      } else if (error.code === 7) { // PERMISSION_DENIED
        throw new Error('Permission denied. Please ensure Speech-to-Text API is enabled.');
      }
      throw error;
    }
  }

  /**
   * Start a new streaming recognition session
   */
  async startStreamingRecognition(): Promise<StreamingSession> {
    if (!this.isInitialized || !this.speechClient) {
      throw new AppError(
        'Google Speech-to-Text streaming service not initialized',
        'SERVICE_NOT_INITIALIZED',
        'ai'
      );
    }

    try {
      console.log('Starting Google Speech streaming session...');
      
      const session = new GoogleStreamingSession(
        this.speechClient,
        this.config,
        this.connectionStatus
      );
      
      await session.initialize();
      
      this.connectionStatus.isStreaming = true;
      this.connectionStatus.sessionStartTime = new Date();
      
      console.log('Google Speech streaming session started successfully');
      return session;
      
    } catch (error) {
      console.error('Failed to start streaming session:', error);
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = {
        code: 'STREAMING_START_ERROR',
        message: error instanceof Error ? error.message : 'Unknown streaming start error',
        timestamp: new Date(),
        recoverable: true,
        originalError: error
      };
      
      throw new AppError(
        `Failed to start streaming session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAMING_START_ERROR',
        'ai'
      );
    }
  }

  /**
   * Reconnect to Google Speech service
   */
  async reconnectService(): Promise<void> {
    console.log('Reconnecting to Google Speech service...');
    
    try {
      // Reset connection status
      this.connectionStatus.isConnected = false;
      this.connectionStatus.isStreaming = false;
      
      // Reinitialize the service
      await this.initializeGoogleSpeech();
      
      console.log('Successfully reconnected to Google Speech service');
    } catch (error) {
      console.error('Failed to reconnect to Google Speech service:', error);
      throw error;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if service is initialized and ready
   */
  isServiceReady(): boolean {
    return this.isInitialized && this.connectionStatus.isConnected;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): GoogleSpeechStreamingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires reinitialization)
   */
  updateConfiguration(newConfig: Partial<GoogleSpeechStreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Note: Requires reinitialization to take effect
  }

  /**
   * Get speech context configuration for debugging and testing
   */
  getSpeechContextInfo(): { enabled: boolean; boostConfig: SpeechContextBoostConfig | undefined; contextCount: number } {
    return {
      enabled: this.config.enableSpeechContexts || false,
      boostConfig: this.config.speechContextBoost,
      contextCount: this.config.enableSpeechContexts ? 8 : 0 // Number of speech context groups
    };
  }

  /**
   * Update speech contexts dynamically based on question type
   * This allows context-aware speech recognition
   */
  updateSpeechContextsForQuestion(questionType: 'yes_no' | 'date_time' | 'not_applicable' | 'any'): void {
    // Import here to avoid circular dependencies
    const { ContextAwareSpeechManager } = require('./ContextAwareSpeechManager');
    
    const mockQuestion = {
      id: 'temp',
      text: '',
      expectedResponseType: questionType,
      order: 1
    };
    
    const contextConfig = ContextAwareSpeechManager.generateContextsForQuestion(mockQuestion);
    
    // Update configuration with new contexts
    this.config = {
      ...this.config,
      model: contextConfig.model as any || this.config.model,
      useEnhanced: contextConfig.useEnhanced || this.config.useEnhanced
    };
    
    // Store the dynamic contexts for use in the next session
    (this.config as any).dynamicSpeechContexts = contextConfig.speechContexts;
    
    console.log(`🎯 Updated speech contexts for question type: ${questionType}`);
    console.log(`   - Contexts: ${contextConfig.speechContexts.length}`);
    console.log(`   - Total phrases: ${contextConfig.speechContexts.reduce((sum: number, ctx: any) => sum + ctx.phrases.length, 0)}`);
    console.log(`   - Model: ${contextConfig.model}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.speechClient) {
        await this.speechClient.close();
        this.speechClient = null;
      }
      
      this.isInitialized = false;
      this.connectionStatus.isConnected = false;
      this.connectionStatus.isStreaming = false;
      
      console.log('Google Speech-to-Text streaming service cleaned up');
    } catch (error) {
      console.error('Error during Google Speech streaming cleanup:', error);
    }
  }
}

/**
 * Google Speech Streaming Session Implementation
 */
class GoogleStreamingSession implements StreamingSession {
  private speechClient: SpeechClient;
  private config: GoogleSpeechStreamingConfig;
  private connectionStatus: ConnectionStatus;
  private recognizeStream: any = null;
  private sessionActive = false;
  
  // Callback handlers
  private partialResultCallback?: (result: PartialResult) => void;
  private finalResultCallback?: (result: FinalResult) => void;
  private errorCallback?: (error: StreamingError) => void;

  constructor(
    speechClient: SpeechClient,
    config: GoogleSpeechStreamingConfig,
    connectionStatus: ConnectionStatus
  ) {
    this.speechClient = speechClient;
    this.config = config;
    this.connectionStatus = connectionStatus;
  }

  async initialize(): Promise<void> {
    try {
      // Create streaming recognition request configuration optimized for low latency
      const request = {
        config: {
          encoding: this.config.encoding as any,
          sampleRateHertz: this.config.sampleRateHertz,
          languageCode: this.config.languageCode,
          model: this.config.model,
          enableAutomaticPunctuation: this.config.enableAutomaticPunctuation,
          enableWordTimeOffsets: true,
          maxAlternatives: this.config.maxAlternatives,
          useEnhanced: true, // Use enhanced model for better accuracy (Requirement 4.1)
          // Enhanced configuration for better accuracy (Requirements 4.1, 4.2, 4.4)
          alternativeLanguageCodes: ['en-IN', 'en-CA', 'en-GB'], // Support multiple English accents
          speechContexts: this.config.enableSpeechContexts ? [
            // HIGHEST PRIORITY: Yes responses with comprehensive variations (Requirement 4.2)
            {
              phrases: [
                'yes', 'yeah', 'yep', 'yup', 'yah', 'ya', 'aye', 'ay',
                'affirmative', 'correct', 'right', 'true', 'accurate',
                'absolutely', 'definitely', 'certainly', 'of course', 'sure', 'surely',
                'ok', 'okay', 'alright', 'all right', 'very well', 'indeed',
                'positive', 'confirmed', 'agreed', 'exactly', 'precisely',
                'that\'s right', 'that is right', 'that\'s correct', 'that is correct'
              ],
              boost: this.config.speechContextBoost?.yesNoResponses || 20.0
            },
            // HIGHEST PRIORITY: No responses with comprehensive variations (Requirement 4.2)
            {
              phrases: [
                'no', 'nope', 'nah', 'nay', 'negative', 'negatory',
                'incorrect', 'wrong', 'false', 'inaccurate', 'untrue',
                'never', 'not at all', 'absolutely not', 'definitely not',
                'certainly not', 'of course not', 'not really', 'not quite',
                'that\'s wrong', 'that is wrong', 'that\'s incorrect', 'that is incorrect'
              ],
              boost: this.config.speechContextBoost?.yesNoResponses || 20.0
            },
            // HIGHEST PRIORITY: Complete date-time patterns for "13th November 2025 11 AM" format (Requirement 4.4)
            // Handles dates with pauses between words as specified in requirements
            {
              phrases: [
                // Test case format: "21st May 1992 11:00 AM"
                'twenty first May nineteen ninety two eleven AM',
                '21st May 1992 11 AM', '21st May 1992 eleven AM',
                'twenty first May nineteen ninety two eleven o\'clock AM',
                'twenty first May nineteen ninety two 11:00 AM',
                
                // Common date-time patterns for 2024-2025
                'thirteenth November 2025 eleven AM', '13th November 2025 11 AM',
                'thirteenth November twenty twenty five eleven AM',
                'fourteenth December 2024 three PM', '14th December 2024 3 PM',
                'twenty first May 2025 nine AM', '21st May 2025 9 AM',
                'first January 2025 ten AM', '1st January 2025 10 AM',
                'second February 2025 two PM', '2nd February 2025 2 PM',
                'third March 2025 four PM', '3rd March 2025 4 PM',
                
                // Historical dates (1990s era)
                'twenty first May nineteen ninety two', '21st May 1992',
                'fourth December nineteen ninety one', '4th December 1991',
                'fifteenth August nineteen ninety three', '15th August 1993',
                'tenth October nineteen ninety four', '10th October 1994',
                
                // With time variations
                'thirteenth November 2025 eleven in the morning',
                'fourteenth December 2024 three in the afternoon',
                'twenty first May 1992 eleven o\'clock in the morning'
              ],
              boost: this.config.speechContextBoost?.dateTimePatterns || 20.0
            },
            // HIGH PRIORITY: Specific time patterns to fix common misrecognitions
            {
              phrases: [
                // Common time formats that get misrecognized
                'eleven AM', '11 AM', 'eleven a.m.', '11 a.m.',
                'eleven o\'clock', '11 o\'clock', 'eleven in the morning',
                'three PM', '3 PM', 'three p.m.', '3 p.m.',
                'three o\'clock', '3 o\'clock', 'three in the afternoon',
                
                // Specific problematic patterns from testing
                'eleven oh four', 'eleven zero four', '11:04', 'eleven four',
                'ten oh five', 'ten zero five', '10:05', 'ten five',
                'twelve oh one', 'twelve zero one', '12:01', 'twelve one',
                'nine thirty', '9:30', 'nine oh five', '9:05',
                
                // Time expressions
                'o\'clock', 'fifteen', 'thirty', 'forty five', 
                'quarter past', 'half past', 'quarter to',
                'in the morning', 'in the afternoon', 'in the evening'
              ],
              boost: this.config.speechContextBoost?.timePatterns || 18.0
            },
            // HIGH PRIORITY: Month names with common variations (Requirement 4.4)
            {
              phrases: [
                'January', 'Jan', 'February', 'Feb', 'March', 'Mar',
                'April', 'Apr', 'May', 'June', 'Jun',
                'July', 'Jul', 'August', 'Aug', 'September', 'Sep', 'Sept',
                'October', 'Oct', 'November', 'Nov', 'December', 'Dec'
              ],
              boost: this.config.speechContextBoost?.monthNames || 16.0
            },
            // HIGH PRIORITY: Ordinal numbers for dates (Requirement 4.4)
            {
              phrases: [
                // Written ordinals
                'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
                'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 
                'eighteenth', 'nineteenth', 'twentieth', 'twenty first', 'twenty second', 'twenty third', 
                'twenty fourth', 'twenty fifth', 'twenty sixth', 'twenty seventh', 'twenty eighth', 
                'twenty ninth', 'thirtieth', 'thirty first',
                
                // Numeric ordinals
                '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
                '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
                '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'
              ],
              boost: this.config.speechContextBoost?.ordinalNumbers || 16.0
            },
            // MEDIUM PRIORITY: Years in multiple formats (Requirement 4.4)
            {
              phrases: [
                // Recent years (numeric)
                '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
                
                // Recent years (spoken)
                'twenty twenty', 'twenty twenty one', 'twenty twenty two', 'twenty twenty three', 
                'twenty twenty four', 'twenty twenty five', 'twenty twenty six', 'twenty twenty seven',
                'twenty twenty eight', 'twenty twenty nine', 'twenty thirty',
                
                // 1990s (numeric) - important for test case
                '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
                
                // 1990s (spoken) - important for test case
                'nineteen ninety', 'nineteen ninety one', 'nineteen ninety two', 'nineteen ninety three', 
                'nineteen ninety four', 'nineteen ninety five', 'nineteen ninety six', 'nineteen ninety seven', 
                'nineteen ninety eight', 'nineteen ninety nine',
                
                // 2000s
                'two thousand', 'two thousand one', 'two thousand two', 'two thousand three',
                'two thousand four', 'two thousand five', 'two thousand six', 'two thousand seven',
                'two thousand eight', 'two thousand nine', 'two thousand ten'
              ],
              boost: this.config.speechContextBoost?.yearFormats || 14.0
            },
            // MEDIUM PRIORITY: Common response patterns
            {
              phrases: [
                'not applicable', 'N/A', 'not relevant', 'doesn\'t apply', 'does not apply',
                'unknown', 'unsure', 'not sure', 'don\'t know', 'do not know',
                'maybe', 'perhaps', 'possibly', 'sometimes', 'occasionally',
                'never', 'always', 'usually', 'often', 'rarely', 'seldom'
              ],
              boost: this.config.speechContextBoost?.commonResponses || 12.0
            }
          ] : [],
          profanityFilter: false
        },
        interimResults: this.config.enableInterimResults,
      };

      // Create the streaming recognition stream
      this.recognizeStream = this.speechClient
        .streamingRecognize(request)
        .on('data', (data: any) => this.handleStreamingData(data))
        .on('error', (error: any) => this.handleStreamingError(error))
        .on('end', () => this.handleStreamingEnd());

      this.sessionActive = true;
      console.log('Google Speech streaming session initialized');
      
    } catch (error) {
      console.error('Failed to initialize streaming session:', error);
      throw error;
    }
  }

  sendAudioChunk(chunk: ArrayBuffer): void {
    console.log('📤 GOOGLE SPEECH SESSION: sendAudioChunk called:', {
      chunkSize: chunk.byteLength,
      sessionActive: this.sessionActive,
      hasRecognizeStream: !!this.recognizeStream,
      timestamp: new Date().toISOString()
    });
    
    if (!this.sessionActive || !this.recognizeStream) {
      console.warn('⚠️ GOOGLE SPEECH SESSION: Attempted to send audio chunk to inactive streaming session:', {
        sessionActive: this.sessionActive,
        hasRecognizeStream: !!this.recognizeStream
      });
      return;
    }

    try {
      // Convert ArrayBuffer to Buffer for Google Speech API
      const buffer = Buffer.from(chunk);
      console.log('📤 GOOGLE SPEECH SESSION: Writing audio content to stream:', {
        bufferSize: buffer.length,
        timestamp: new Date().toISOString()
      });
      
      this.recognizeStream.write({ audioContent: buffer });
      console.log('✅ GOOGLE SPEECH SESSION: Audio content written successfully');
    } catch (error) {
      console.error('❌ GOOGLE SPEECH SESSION: Error sending audio chunk:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      this.handleStreamingError(error);
    }
  }

  onPartialResult(callback: (result: PartialResult) => void): void {
    this.partialResultCallback = callback;
  }

  onFinalResult(callback: (result: FinalResult) => void): void {
    this.finalResultCallback = callback;
  }

  onError(callback: (error: StreamingError) => void): void {
    this.errorCallback = callback;
  }

  close(): void {
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
    this.sessionActive = false;
    console.log('Google Speech streaming session closed');
  }

  isActive(): boolean {
    return this.sessionActive;
  }

  private handleStreamingData(data: any): void {
    console.log('📨 GOOGLE SPEECH API RESPONSE:', {
      hasResults: !!(data.results && data.results.length > 0),
      resultsCount: data.results?.length || 0,
      languageCode: data.languageCode,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const alternative = result.alternatives[0];
        
        const resultDetails = {
          hasAlternative: !!alternative,
          isFinal: result.isFinal,
          stability: result.stability,
          alternativesCount: result.alternatives?.length || 0
        };
        
        logger.info('📝 GOOGLE SPEECH RESULT DETAILS', resultDetails, 'GOOGLE-SPEECH');
        console.log('📝 GOOGLE SPEECH RESULT DETAILS:', resultDetails);
        
        if (!alternative) {
          logger.warn('⚠️ GOOGLE SPEECH: No alternative found in result', {}, 'GOOGLE-SPEECH');
          console.log('⚠️ GOOGLE SPEECH: No alternative found in result');
          return;
        }
        
        // Log the transcript content
        logger.info('📄 GOOGLE SPEECH TRANSCRIPT', {
          transcript: alternative.transcript,
          confidence: alternative.confidence || 0,
          isFinal: result.isFinal
        }, 'GOOGLE-SPEECH');

        const words: WordResult[] = alternative.words?.map((word: any) => ({
          word: word.word,
          confidence: word.confidence || 0,
          startTime: word.startTime?.seconds || 0,
          endTime: word.endTime?.seconds || 0
        })) || [];

        if (result.isFinal) {
          // Apply post-processing corrections to improve accuracy
          const correctionResult = correctTranscription(alternative.transcript, alternative.confidence || 0);
          
          // Log corrections if any were made
          if (correctionResult.corrections.length > 0) {
            logger.info('🔧 TRANSCRIPTION CORRECTIONS APPLIED', {
              original: correctionResult.original,
              corrected: correctionResult.corrected,
              corrections: correctionResult.corrections
            }, 'GOOGLE-SPEECH');
            console.log('🔧 TRANSCRIPTION CORRECTIONS:', {
              original: correctionResult.original,
              corrected: correctionResult.corrected,
              corrections: correctionResult.corrections
            });
          }
          
          // Validate date/time format
          const validation = validateDateTime(correctionResult.corrected);
          if (!validation.isValid) {
            logger.warn('⚠️ DATE/TIME VALIDATION ISSUES', {
              text: correctionResult.corrected,
              suggestions: validation.suggestions,
              confidence: validation.confidence
            }, 'GOOGLE-SPEECH');
          }
          
          // Final result with corrections applied
          const finalResult: FinalResult = {
            transcript: correctionResult.corrected,
            confidence: (alternative.confidence || 0) * validation.confidence,
            words,
            alternatives: result.alternatives?.slice(1).map((alt: any) => ({
              transcript: alt.transcript,
              confidence: alt.confidence || 0,
              words: alt.words?.map((word: any) => ({
                word: word.word,
                confidence: word.confidence || 0,
                startTime: word.startTime?.seconds || 0,
                endTime: word.endTime?.seconds || 0
              })) || []
            })) || [],
            languageCode: data.languageCode,
            timestamp: new Date()
          };

          console.log('✅ GOOGLE SPEECH FINAL RESULT CREATED:', {
            transcript: finalResult.transcript,
            confidence: finalResult.confidence,
            wordsCount: finalResult.words.length,
            hasCallback: !!this.finalResultCallback
          });

          if (this.finalResultCallback) {
            console.log('📤 GOOGLE SPEECH: Calling final result callback');
            this.finalResultCallback(finalResult);
          } else {
            console.warn('⚠️ GOOGLE SPEECH: No final result callback registered');
          }
        } else {
          // Apply light corrections to partial results (less aggressive to avoid flickering)
          let correctedTranscript = alternative.transcript;
          
          // Only apply basic time format corrections for partial results
          correctedTranscript = correctedTranscript.replace(/(\d{1,2}),\s*(\d{1,2}):00\s*(p\.?m\.?|a\.?m\.?)/gi, 
            (match: string, hours: string, minutes: string, ampm: string) => `${hours}:${minutes.padStart(2, '0')} ${ampm.toUpperCase().replace(/\./g, '')}`);
          
          // Partial/interim result
          const partialResult: PartialResult = {
            transcript: correctedTranscript,
            confidence: alternative.confidence || 0,
            isFinal: false,
            stability: result.stability || 0,
            words,
            timestamp: new Date()
          };

          console.log('📝 GOOGLE SPEECH PARTIAL RESULT CREATED:', {
            transcript: partialResult.transcript,
            confidence: partialResult.confidence,
            stability: partialResult.stability,
            hasCallback: !!this.partialResultCallback
          });

          if (this.partialResultCallback) {
            console.log('📤 GOOGLE SPEECH: Calling partial result callback');
            this.partialResultCallback(partialResult);
          } else {
            console.warn('⚠️ GOOGLE SPEECH: No partial result callback registered');
          }
        }
      }
    } catch (error) {
      console.error('Error handling streaming data:', error);
      this.handleStreamingError(error);
    }
  }

  private handleStreamingError(error: any): void {
    console.error('Google Speech streaming error:', error);
    
    const streamingError: StreamingError = {
      code: error.code?.toString() || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown streaming error',
      timestamp: new Date(),
      recoverable: this.isRecoverableError(error),
      originalError: error
    };

    this.connectionStatus.errorCount++;
    this.connectionStatus.lastError = streamingError;

    if (this.errorCallback) {
      this.errorCallback(streamingError);
    }

    // Close the session on non-recoverable errors
    if (!streamingError.recoverable) {
      this.close();
    }
  }

  private handleStreamingEnd(): void {
    console.log('Google Speech streaming session ended');
    this.sessionActive = false;
  }

  private isRecoverableError(error: any): boolean {
    // Define which errors are recoverable
    const recoverableErrorCodes = [
      11, // DEADLINE_EXCEEDED
      14, // UNAVAILABLE
      4,  // DEADLINE_EXCEEDED (alternative code)
    ];

    return recoverableErrorCodes.includes(error.code);
  }
}