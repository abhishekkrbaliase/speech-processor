/**
 * Application Configuration Manager
 * Handles loading Google Speech-to-Text credentials from various sources
 */

import * as path from 'path';
import * as fs from 'fs';

export interface AppConfig {
  googleSpeech: {
    apiKey?: string;
    keyFilename?: string;
  };
  audio: {
    sampleRate: number;
    channels: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from multiple sources in priority order:
   * 1. Environment variables
   * 2. config.json file in app directory
   * 3. Default configuration
   */
  loadConfig(): AppConfig {
    if (this.config) {
      return this.config;
    }

    // Default configuration
    this.config = {
      googleSpeech: {},
      audio: {
        sampleRate: 16000,
        channels: 1
      }
    };

    // Try to load from config.json file
    try {
      const configPath = this.getConfigFilePath();
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.config = { ...this.config, ...fileConfig };
        console.log('Configuration loaded from config.json');
      }
    } catch (error) {
      console.warn('Could not load config.json:', error);
    }

    // Override with environment variables if present
    if (process.env.GOOGLE_SPEECH_API_KEY && this.config) {
      this.config.googleSpeech.apiKey = process.env.GOOGLE_SPEECH_API_KEY;
      console.log('Using Google API key from environment variable');
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && this.config) {
      this.config.googleSpeech.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('Using Google service account from environment variable');
    }

    return this.config!;
  }

  /**
   * Get the path to the config file
   * In development: project root
   * In packaged app: user data directory
   */
  private getConfigFilePath(): string {
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'config.json');
    } else {
      // In packaged Electron app - use userData directory for writable config
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'config.json');
    }
  }

  /**
   * Get the path to the config template file (read-only)
   */
  private getConfigTemplatePath(): string {
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'config-template.json');
    } else {
      // In packaged Electron app - template is in resources
      return path.join(process.resourcesPath, 'config-template.json');
    }
  }

  /**
   * Create a sample config file for users
   */
  createSampleConfig(): void {
    const configPath = this.getConfigFilePath();
    
    // First try to copy from template
    try {
      const templatePath = this.getConfigTemplatePath();
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Ensure the directory exists
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, templateContent);
        console.log(`Configuration template copied to: ${configPath}`);
        return;
      }
    } catch (error) {
      console.warn('Could not copy config template:', error);
    }

    // Fallback to creating from scratch
    const sampleConfig: AppConfig = {
      googleSpeech: {
        apiKey: "your-google-speech-api-key-here",
        // keyFilename: "./path/to/service-account.json"
      },
      audio: {
        sampleRate: 16000,
        channels: 1
      }
    };

    try {
      // Ensure the directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
      console.log(`Sample configuration created at: ${configPath}`);
    } catch (error) {
      console.error('Could not create sample config:', error);
    }
  }

  /**
   * Validate that required configuration is present
   */
  validateConfig(): { valid: boolean; message: string } {
    const config = this.loadConfig();
    
    if (!config.googleSpeech.apiKey && !config.googleSpeech.keyFilename) {
      return {
        valid: false,
        message: 'Google Speech-to-Text credentials not configured. Please set up API key or service account.'
      };
    }

    return { valid: true, message: 'Configuration is valid' };
  }

  getGoogleSpeechConfig() {
    const config = this.loadConfig();
    return config.googleSpeech;
  }
}