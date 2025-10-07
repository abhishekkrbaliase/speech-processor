/**
 * Google Speech-to-Text Streaming Manager
 * Handles real-time speech recognition using Google Cloud Speech-to-Text streaming API
 */

import { SpeechClient } from '@google-cloud/speech';
import { ResponseType, ProcessedResponse, AppError } from '../shared/types';
import { logger } from '../shared/logger';

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
      maxAlternatives: 1
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
          useEnhanced: true, // Use enhanced model for better accuracy
          // Enhanced configuration for better accuracy
          alternativeLanguageCodes: ['en-IN', 'en-CA'], // Support multiple English accents
          speechContexts: [{
            phrases: [
              // Yes/No responses (high priority)
              'yes', 'no', 'yeah', 'nope', 'yep', 'yup', 'sure', 'correct', 'right', 'true',
              'affirmative', 'negative', 'ok', 'okay', 'alright', 'definitely', 'absolutely',
              // Date components
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
              'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
              'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
              'twenty first', 'twenty second', 'twenty third', 'twenty fourth', 'twenty fifth', 'twenty sixth', 'twenty seventh', 'twenty eighth', 'twenty ninth', 'thirtieth', 'thirty first',
              // Time components
              'AM', 'PM', 'morning', 'afternoon', 'evening', 'night',
              'eleven fifteen', 'three thirty', 'twelve noon', 'midnight',
              // Not applicable
              'not applicable', 'N/A', 'not relevant'
            ],
            boost: 20.0 // Higher boost for critical responses
          }],
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
          // Final result
          const finalResult: FinalResult = {
            transcript: alternative.transcript,
            confidence: alternative.confidence || 0,
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
          // Partial/interim result
          const partialResult: PartialResult = {
            transcript: alternative.transcript,
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