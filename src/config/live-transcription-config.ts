/**
 * Live Transcription Configuration
 * Configuration settings for Google Speech-to-Text streaming and live transcription features
 */

import { GoogleSpeechStreamingConfig } from '../main/GoogleSpeechStreamingManager';

export interface LiveTranscriptionConfig {
  googleSpeechConfig: GoogleSpeechStreamingConfig;
  audioSettings: AudioStreamSettings;
  recognitionSettings: RecognitionSettings;
  uiSettings: UISettings;
  answerDetectionSettings: AnswerDetectionSettings;
}

export interface AudioStreamSettings {
  sampleRate: number;
  channels: number;
  chunkSize: number; // Size of audio chunks for streaming (bytes)
  bufferDuration: number; // Audio buffer duration (ms)
  noiseSuppressionLevel: 'low' | 'medium' | 'high';
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export interface RecognitionSettings {
  language: string;
  enableInterimResults: boolean;
  enableAutomaticPunctuation: boolean;
  confidenceThreshold: number; // Minimum confidence for accepting results
  speechEndTimeout: number; // Time to wait after speech ends (ms)
  maxSilenceDuration: number; // Maximum silence before finalizing (ms)
  enableWordTimestamps: boolean;
}

export interface UISettings {
  showPartialResults: boolean;
  highlightUncertainWords: boolean;
  showConfidenceIndicators: boolean;
  enableVisualFeedback: boolean;
  partialTextOpacity: number; // Opacity for partial results (0-1)
  uncertainWordColor: string; // Color for uncertain words
  confidenceColors: {
    high: string; // >80% confidence
    medium: string; // 50-80% confidence
    low: string; // <50% confidence
  };
}

export interface AnswerDetectionSettings {
  // Yes/No response patterns
  yesNoPatterns: {
    yes: string[];
    no: string[];
  };
  
  // Date format patterns
  dateFormats: string[];
  
  // Not applicable patterns
  notApplicablePatterns: string[];
  
  // Detection behavior
  completenessTimeout: number; // Time to wait before considering response complete (ms)
  confidenceThreshold: number; // Minimum confidence for auto-classification
  enableSmartProgression: boolean; // Enable intelligent response completion detection
  
  // Answer type specific settings
  dateTimeSettings: {
    enableTimeDetection: boolean;
    timeFormats: string[];
    defaultTimeZone: string;
  };
}

/**
 * Default configuration for live transcription
 */
export const DEFAULT_LIVE_TRANSCRIPTION_CONFIG: LiveTranscriptionConfig = {
  googleSpeechConfig: {
    languageCode: 'en-US',
    model: 'latest_short', // Optimized for low latency
    enableInterimResults: true,
    enableAutomaticPunctuation: true,
    sampleRateHertz: 16000,
    encoding: 'LINEAR16',
    streamingTimeout: 60000, // 60 seconds
    chunkSize: 1600, // 100ms chunks for minimal latency (16kHz * 0.1s * 2 bytes)
    maxAlternatives: 1,
    // Enhanced speech context configuration (Requirements 4.1, 4.2, 4.4)
    enableSpeechContexts: true,
    speechContextBoost: {
      yesNoResponses: 20.0,
      dateTimePatterns: 20.0,
      timePatterns: 18.0,
      monthNames: 16.0,
      ordinalNumbers: 16.0,
      yearFormats: 14.0,
      commonResponses: 12.0
    }
  },
  
  audioSettings: {
    sampleRate: 16000,
    channels: 1,
    chunkSize: 1600, // 100ms chunks for minimal latency
    bufferDuration: 100, // 100ms buffer for real-time processing
    noiseSuppressionLevel: 'medium',
    echoCancellation: true,
    autoGainControl: true
  },
  
  recognitionSettings: {
    language: 'en-US',
    enableInterimResults: true,
    enableAutomaticPunctuation: true,
    confidenceThreshold: 0.6,
    speechEndTimeout: 500, // 500ms for faster finalization
    maxSilenceDuration: 2000, // 2 seconds for quicker response
    enableWordTimestamps: true
  },
  
  uiSettings: {
    showPartialResults: true,
    highlightUncertainWords: true,
    showConfidenceIndicators: true,
    enableVisualFeedback: true,
    partialTextOpacity: 0.7,
    uncertainWordColor: '#ff9800',
    confidenceColors: {
      high: '#4caf50',   // Green for high confidence
      medium: '#ff9800', // Orange for medium confidence
      low: '#f44336'     // Red for low confidence
    }
  },
  
  answerDetectionSettings: {
    yesNoPatterns: {
      yes: [
        'yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'right', 'true',
        'affirmative', 'ok', 'okay', 'alright', 'definitely', 'absolutely',
        'certainly', 'of course', 'indeed', 'positive'
      ],
      no: [
        'no', 'nope', 'nah', 'negative', 'incorrect', 'wrong', 'false',
        'never', 'none', 'nothing', 'not at all', 'definitely not',
        'certainly not', 'absolutely not', 'not really'
      ]
    },
    
    dateFormats: [
      // Natural language formats
      'MMMM Do YYYY',           // December 4th 1991
      'Do MMMM YYYY',           // 4th December 1991
      'MMMM Do, YYYY',          // December 4th, 1991
      'Do of MMMM YYYY',        // 4th of December 1991
      
      // Numeric formats
      'MM/DD/YYYY',             // 12/04/1991
      'DD/MM/YYYY',             // 04/12/1991
      'YYYY/MM/DD',             // 1991/12/04
      'MM-DD-YYYY',             // 12-04-1991
      'DD-MM-YYYY',             // 04-12-1991
      'YYYY-MM-DD',             // 1991-12-04
      
      // Short formats
      'MMM DD, YYYY',           // Dec 04, 1991
      'DD MMM YYYY',            // 04 Dec 1991
    ],
    
    notApplicablePatterns: [
      'not applicable', 'n/a', 'na', 'not relevant', 'doesn\'t apply',
      'does not apply', 'skip', 'pass', 'ignore', 'not sure', 'unsure',
      'don\'t know', 'do not know', 'unknown', 'unclear', 'not available'
    ],
    
    completenessTimeout: 1500, // 1.5 seconds
    confidenceThreshold: 0.7,
    enableSmartProgression: true,
    
    dateTimeSettings: {
      enableTimeDetection: true,
      timeFormats: [
        'h:mm A',                 // 11:15 AM
        'HH:mm',                  // 11:15
        'h A',                    // 11 AM
        'h:mm a',                 // 11:15 am
        'h a',                    // 11 am
      ],
      defaultTimeZone: 'local'
    }
  }
};

/**
 * Configuration loader and manager
 */
export class LiveTranscriptionConfigManager {
  private config: LiveTranscriptionConfig;
  
  constructor(initialConfig?: Partial<LiveTranscriptionConfig>) {
    this.config = this.mergeConfigs(DEFAULT_LIVE_TRANSCRIPTION_CONFIG, initialConfig || {});
  }
  
  /**
   * Get current configuration
   */
  getConfig(): LiveTranscriptionConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LiveTranscriptionConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }
  
  /**
   * Get Google Speech configuration
   */
  getGoogleSpeechConfig(): GoogleSpeechStreamingConfig {
    return { ...this.config.googleSpeechConfig };
  }
  
  /**
   * Update Google Speech configuration
   */
  updateGoogleSpeechConfig(updates: Partial<GoogleSpeechStreamingConfig>): void {
    this.config.googleSpeechConfig = {
      ...this.config.googleSpeechConfig,
      ...updates
    };
  }
  
  /**
   * Load configuration from environment variables and config files
   */
  loadFromEnvironment(): void {
    const envConfig: Partial<LiveTranscriptionConfig> = {};
    
    // Start with current Google Speech config
    let googleSpeechUpdates: Partial<GoogleSpeechStreamingConfig> = {};
    
    // Load from config.json file first
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'config.json');
      
      if (fs.existsSync(configPath)) {
        const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        if (configFile.googleSpeech) {
          if (configFile.googleSpeech.keyFilename) {
            googleSpeechUpdates.keyFilename = configFile.googleSpeech.keyFilename;
          }
          if (configFile.googleSpeech.apiKey) {
            googleSpeechUpdates.apiKey = configFile.googleSpeech.apiKey;
          }
          if (configFile.googleSpeech.projectId) {
            googleSpeechUpdates.projectId = configFile.googleSpeech.projectId;
          }
        }
        
        console.log('✅ Live transcription config loaded from config.json');
        console.log('   - Key filename:', googleSpeechUpdates.keyFilename ? 'Present' : 'Not set');
        console.log('   - API key:', googleSpeechUpdates.apiKey ? 'Present' : 'Not set');
        console.log('   - Project ID:', googleSpeechUpdates.projectId || 'Not set');
      }
    } catch (error) {
      console.warn('⚠️ Could not load config.json for live transcription:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Google Speech configuration from environment (overrides config file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      googleSpeechUpdates.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('🔧 Using GOOGLE_APPLICATION_CREDENTIALS from environment');
    }
    
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      googleSpeechUpdates.projectId = process.env.GOOGLE_CLOUD_PROJECT;
      console.log('🔧 Using GOOGLE_CLOUD_PROJECT from environment');
    }
    
    if (process.env.GOOGLE_SPEECH_API_KEY) {
      googleSpeechUpdates.apiKey = process.env.GOOGLE_SPEECH_API_KEY;
      console.log('🔧 Using GOOGLE_SPEECH_API_KEY from environment');
    }
    
    // Audio settings from environment
    if (process.env.AUDIO_SAMPLE_RATE) {
      const sampleRate = parseInt(process.env.AUDIO_SAMPLE_RATE);
      if (!isNaN(sampleRate)) {
        envConfig.audioSettings = {
          ...this.config.audioSettings,
          sampleRate
        };
        googleSpeechUpdates.sampleRateHertz = sampleRate;
      }
    }
    
    // Recognition settings from environment
    if (process.env.SPEECH_LANGUAGE) {
      envConfig.recognitionSettings = {
        ...this.config.recognitionSettings,
        language: process.env.SPEECH_LANGUAGE
      };
      googleSpeechUpdates.languageCode = process.env.SPEECH_LANGUAGE;
    }
    
    // Apply Google Speech updates if any
    if (Object.keys(googleSpeechUpdates).length > 0) {
      envConfig.googleSpeechConfig = {
        ...this.config.googleSpeechConfig,
        ...googleSpeechUpdates
      };
    }
    
    if (process.env.CONFIDENCE_THRESHOLD) {
      const threshold = parseFloat(process.env.CONFIDENCE_THRESHOLD);
      if (!isNaN(threshold) && threshold >= 0 && threshold <= 1) {
        envConfig.recognitionSettings = {
          ...this.config.recognitionSettings,
          confidenceThreshold: threshold
        };
      }
    }
    
    this.updateConfig(envConfig);
  }
  
  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate Google Speech configuration
    if (!this.config.googleSpeechConfig.languageCode) {
      errors.push('Google Speech language code is required');
    }
    
    if (!this.config.googleSpeechConfig.keyFilename && 
        !this.config.googleSpeechConfig.apiKey && 
        !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      errors.push('Google Speech authentication is required (keyFilename, apiKey, or GOOGLE_APPLICATION_CREDENTIALS)');
    }
    
    // Validate audio settings
    if (this.config.audioSettings.sampleRate <= 0) {
      errors.push('Audio sample rate must be positive');
    }
    
    if (this.config.audioSettings.chunkSize <= 0) {
      errors.push('Audio chunk size must be positive');
    }
    
    // Validate recognition settings
    if (this.config.recognitionSettings.confidenceThreshold < 0 || 
        this.config.recognitionSettings.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }
    
    if (this.config.recognitionSettings.speechEndTimeout <= 0) {
      errors.push('Speech end timeout must be positive');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Deep merge configuration objects
   */
  private mergeConfigs(base: LiveTranscriptionConfig, updates: Partial<LiveTranscriptionConfig>): LiveTranscriptionConfig {
    const result = { ...base };
    
    if (updates.googleSpeechConfig) {
      result.googleSpeechConfig = { ...base.googleSpeechConfig, ...updates.googleSpeechConfig };
    }
    
    if (updates.audioSettings) {
      result.audioSettings = { ...base.audioSettings, ...updates.audioSettings };
    }
    
    if (updates.recognitionSettings) {
      result.recognitionSettings = { ...base.recognitionSettings, ...updates.recognitionSettings };
    }
    
    if (updates.uiSettings) {
      result.uiSettings = { ...base.uiSettings, ...updates.uiSettings };
    }
    
    if (updates.answerDetectionSettings) {
      result.answerDetectionSettings = { ...base.answerDetectionSettings, ...updates.answerDetectionSettings };
    }
    
    return result;
  }
}