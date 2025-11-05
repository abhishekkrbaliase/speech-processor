import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { WindowManager } from './WindowManager';
import { GoogleSpeechManager, GoogleSpeechConfig } from './GoogleSpeechManager';
import { GoogleSpeechStreamingManager } from './GoogleSpeechStreamingManager';
import { ConfigManager } from '../config/app-config';
import { LiveTranscriptionConfigManager } from '../config/live-transcription-config';
import { CrossPlatformAudioCaptureHandler, AudioCaptureOptions, AudioDevice } from './AudioCaptureHandler';
import { logger, LogLevel } from '../shared/logger';

import { DataManager } from './DataManager';
import { DataManagerIPC } from './DataManagerIPC';
import { QuestionnaireController } from './QuestionnaireController';
import { QuestionnaireControllerIPC } from './QuestionnaireControllerIPC';
import { ExportManager } from './ExportManager';
import { ExportManagerIPC } from './ExportManagerIPC';
import { CSVDrivenSpeechContextManager } from './CSVDrivenSpeechContextManager';
import { OverlayPosition, ProcessedResponse, AppError } from '../shared/types';

class SpeechOverlayApp {
  private mainWindow: BrowserWindow | null = null;
  private windowManager: WindowManager;
  private speechManager: GoogleSpeechManager;
  private streamingManager: GoogleSpeechStreamingManager | null = null;
  private currentSession: any = null; // Store the current streaming session
  private liveTranscriptionConfig: LiveTranscriptionConfigManager;
  private audioCaptureHandler: CrossPlatformAudioCaptureHandler;

  private dataManager: DataManager;
  private dataManagerIPC: DataManagerIPC;
  private questionnaireController: QuestionnaireController;
  private questionnaireControllerIPC: QuestionnaireControllerIPC;
  private exportManager: ExportManager;
  private exportManagerIPC: ExportManagerIPC;
  private csvContextManager: CSVDrivenSpeechContextManager;

  constructor() {
    logger.info('🚀 SPEECH OVERLAY APP STARTING', {}, 'MAIN');
    logger.info('📍 Timestamp: ' + new Date().toISOString(), {}, 'MAIN');
    
    this.windowManager = new WindowManager();
    logger.info('✅ WindowManager initialized', {}, 'MAIN');
    
    // Initialize Google Speech-to-Text with configuration
    const googleSpeechConfig: GoogleSpeechConfig = this.loadGoogleSpeechConfig();
    this.speechManager = new GoogleSpeechManager(googleSpeechConfig);
    logger.info('✅ GoogleSpeechManager initialized', { config: googleSpeechConfig }, 'MAIN');
    
    // Initialize live transcription configuration with the same credentials
    this.liveTranscriptionConfig = new LiveTranscriptionConfigManager();
    this.liveTranscriptionConfig.loadFromEnvironment();
    logger.info('✅ LiveTranscriptionConfigManager initialized', {}, 'MAIN');
    
    // Update live transcription config with the same credentials as the main speech manager
    this.liveTranscriptionConfig.updateGoogleSpeechConfig({
      keyFilename: googleSpeechConfig.keyFilename,
      apiKey: googleSpeechConfig.apiKey
    });
    logger.info('✅ Live transcription config updated with Google Speech credentials', {}, 'MAIN');
    
    this.audioCaptureHandler = new CrossPlatformAudioCaptureHandler();
    
    // Initialize DataManager with default configuration
    this.dataManager = new DataManager({
      maxPatients: 10000,
      maxQuestions: 1000,
      maxResponses: 100000,
      sessionFilePath: path.join(app.getPath('userData'), 'session.json')
    });
    
    // Initialize DataManager IPC handlers
    this.dataManagerIPC = new DataManagerIPC(this.dataManager);
    
    // Initialize QuestionnaireController
    this.questionnaireController = new QuestionnaireController(this.dataManager, {
      autoProgressOnResponse: true,
      autoProgressToNextPatient: true,
      requireConfirmation: false,
      saveProgressAutomatically: true,
      allowManualNavigation: true
    });
    
    // Initialize QuestionnaireController IPC handlers
    this.questionnaireControllerIPC = new QuestionnaireControllerIPC(this.questionnaireController);
    
    // Initialize CSV-driven speech context manager
    this.csvContextManager = new CSVDrivenSpeechContextManager();
    
    // Set up CSV context manager integration
    this.setupCSVContextIntegration();
    
    // Initialize ExportManager
    this.exportManager = new ExportManager(this.dataManager);
    
    // Initialize ExportManager IPC handlers
    this.exportManagerIPC = new ExportManagerIPC(this.exportManager);
    
    this.initializeApp();
  }

  /**
   * Load Google Speech-to-Text configuration using ConfigManager
   */
  private loadGoogleSpeechConfig(): GoogleSpeechConfig {
    const configManager = ConfigManager.getInstance();
    
    // In production, try to load from bundled resources first
    if (app.isPackaged) {
      try {
        const resourcesPath = process.resourcesPath;
        const bundledConfigPath = path.join(resourcesPath, 'config.json');
        const bundledCredentialsPath = path.join(resourcesPath, 'google-credentials.json');
        
        // Check if bundled config exists
        const fs = require('fs');
        if (fs.existsSync(bundledConfigPath) && fs.existsSync(bundledCredentialsPath)) {
          console.log('📦 Using bundled configuration and credentials');
          
          // Load bundled config
          const bundledConfig = JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8'));
          
          // Update the keyFilename to point to bundled credentials
          if (bundledConfig.googleSpeech) {
            bundledConfig.googleSpeech.keyFilename = bundledCredentialsPath;
          }
          
          return bundledConfig.googleSpeech || {};
        }
      } catch (error) {
        console.warn('Could not load bundled configuration:', error);
      }
    }
    
    // Fallback to regular configuration loading
    const validation = configManager.validateConfig();
    if (!validation.valid) {
      console.error('Configuration Error:', validation.message);
      console.log('\n📋 Setup Instructions:');
      console.log('1. Create a config.json file in your app directory');
      console.log('2. Add your Google Speech API key:');
      console.log('   {"googleSpeech": {"apiKey": "your-api-key-here"}}');
      console.log('3. Or set environment variable: GOOGLE_SPEECH_API_KEY');
      
      // Create sample config for user
      try {
        configManager.createSampleConfig();
        console.log('📄 Sample config.json created for you to edit');
      } catch (error) {
        console.warn('Could not create sample config:', error);
      }
    }

    return configManager.getGoogleSpeechConfig();
  }

  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();
    });

    // Handle window closed events
    app.on('window-all-closed', async () => {
      // Cleanup services before quitting
      try {
        this.audioCaptureHandler.stopListening();
        await this.speechManager.cleanup();
        
        // Save session state before quitting
        await this.dataManager.saveSessionState();
        
        // Cleanup DataManager IPC handlers
        this.dataManagerIPC.cleanup();
        
        // Cleanup QuestionnaireController IPC handlers
        this.questionnaireControllerIPC.cleanup();
        this.questionnaireController.cleanup();
        
        // Cleanup CSV context manager
        this.csvContextManager.cleanup();
        
        // Cleanup ExportManager IPC handlers
        this.exportManagerIPC.cleanup();
      } catch (error) {
        console.error('Error during app cleanup:', error);
      }
      
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      },
      show: false,
      titleBarStyle: 'default'
    });

    // Load the renderer HTML
    // Always load from built files for now
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    // Only open dev tools in development
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * Set up CSV-driven speech context integration
   */
  private setupCSVContextIntegration(): void {
    logger.info('🔗 Setting up CSV context integration', {}, 'MAIN');
    console.log('🔗 Setting up CSV context integration');

    // Listen for question changes from QuestionnaireController
    this.questionnaireController.on('question-changed', async (patient, question, questionIndex, totalQuestions) => {
      try {
        logger.info('📋 Question changed, updating speech contexts', {
          questionId: question.id,
          responseType: question.expectedResponseType,
          questionIndex,
          totalQuestions
        }, 'MAIN');

        console.log(`📋 Question changed: ${question.id} (${question.expectedResponseType})`);

        // Switch contexts for the new question
        const success = await this.csvContextManager.switchContextForQuestion(question.id);
        
        if (success) {
          logger.info('✅ Speech contexts updated successfully', {
            questionId: question.id,
            responseType: question.expectedResponseType
          }, 'MAIN');
          console.log(`✅ Speech contexts updated for question: ${question.id}`);
        } else {
          logger.warn('⚠️ Failed to update speech contexts', {
            questionId: question.id
          }, 'MAIN');
          console.warn(`⚠️ Failed to update speech contexts for question: ${question.id}`);
        }

        // Send context update to renderer windows for debugging
        BrowserWindow.getAllWindows().forEach(window => {
          const contextInfo = this.csvContextManager.getCurrentContextInfo();
          window.webContents.send('speechContext:updated', {
            questionId: question.id,
            responseType: question.expectedResponseType,
            contextInfo,
            success
          });
        });

      } catch (error) {
        logger.error('❌ Error updating speech contexts', {
          questionId: question.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'MAIN');
        console.error(`❌ Error updating speech contexts for question ${question.id}:`, error);
      }
    });

    // Initialize contexts when questions are loaded
    this.dataManager.on('questions-loaded', (questions) => {
      try {
        logger.info('📚 Questions loaded, initializing CSV contexts', {
          questionCount: questions.length
        }, 'MAIN');
        console.log(`📚 Questions loaded: ${questions.length} questions`);

        // Initialize the CSV context manager with the loaded questions
        this.csvContextManager.initializeFromQuestions(questions);

        // Connect the speech manager if available
        if (this.streamingManager) {
          this.csvContextManager.setSpeechManager(this.streamingManager);
          logger.info('🔗 Speech manager connected to CSV context manager', {}, 'MAIN');
          console.log('🔗 Speech manager connected to CSV context manager');
        }

      } catch (error) {
        logger.error('❌ Error initializing CSV contexts', {
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'MAIN');
        console.error('❌ Error initializing CSV contexts:', error);
      }
    });

    logger.info('✅ CSV context integration setup complete', {}, 'MAIN');
    console.log('✅ CSV context integration setup complete');
  }

  private setupIpcHandlers(): void {
    // Basic IPC handlers for future use
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });

    ipcMain.handle('app:openExternal', async (_, url: string) => {
      try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('Failed to open external URL:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Window management IPC handlers
    ipcMain.handle('overlay:create', () => {
      console.log('IPC: overlay:create called');
      return this.windowManager.createOverlayWindow();
    });

    ipcMain.handle('overlay:show', () => {
      console.log('IPC: overlay:show called');
      this.windowManager.showOverlay();
    });

    ipcMain.handle('overlay:hide', () => {
      console.log('IPC: overlay:hide called');
      this.windowManager.hideOverlay();
    });

    ipcMain.handle('overlay:toggle', () => {
      console.log('IPC: overlay:toggle called');
      this.windowManager.toggleOverlayVisibility();
    });

    ipcMain.handle('overlay:position', (_, position: OverlayPosition) => {
      this.windowManager.positionOverlay(position);
    });

    ipcMain.handle('overlay:center', () => {
      this.windowManager.centerOverlay();
    });

    ipcMain.handle('overlay:topRight', () => {
      this.windowManager.positionTopRight();
    });

    ipcMain.handle('overlay:setProperties', (_, transparent: boolean, clickThrough: boolean) => {
      this.windowManager.setOverlayProperties(transparent, clickThrough);
    });

    ipcMain.handle('overlay:isVisible', () => {
      return this.windowManager.isVisible();
    });

    ipcMain.handle('overlay:resize', (_, width: number, height: number, x?: number, y?: number) => {
      const overlayWindow = this.windowManager.getOverlayWindow();
      if (overlayWindow) {
        if (x !== undefined && y !== undefined) {
          overlayWindow.setBounds({ x, y, width, height });
        } else {
          overlayWindow.setSize(width, height);
        }
      }
    });

    ipcMain.on('close-overlay', () => {
      console.log('IPC: close-overlay called');
      this.windowManager.destroyOverlay();
    });

    ipcMain.on('set-click-through', (_, enabled: boolean) => {
      console.log('IPC: set-click-through called with:', enabled);
      const overlayWindow = this.windowManager.getOverlayWindow();
      if (overlayWindow) {
        if (enabled) {
          overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
          overlayWindow.setIgnoreMouseEvents(false);
        }
      }
    });

    ipcMain.on('set-window-opacity', (_, opacity: number) => {
      console.log('IPC: set-window-opacity called with:', opacity);
      const overlayWindow = this.windowManager.getOverlayWindow();
      if (overlayWindow) {
        // Clamp opacity between 0 and 1
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        overlayWindow.setOpacity(clampedOpacity);
      }
    });

    // AI Service IPC handlers
    ipcMain.handle('ai:initialize', async () => {
      try {
        console.log('IPC: ai:initialize called');
        await this.speechManager.initializeService();
        return { success: true };
      } catch (error) {
        console.error('Failed to initialize Google Speech-to-Text:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('ai:processAudio', async (_, audioBuffer: ArrayBuffer, overrideText?: string) => {
      try {
        console.log('IPC: ai:processAudio called');
        
        if (overrideText) {
          // If text is provided, create a response directly from the text
          // Simple text processing for override text
          let parsedValue: string | Date | boolean | null = null;
          let responseType = 'unclear';
          
          const lowerText = overrideText.toLowerCase().trim();
          if (['yes', 'yeah', 'yep', 'sure'].includes(lowerText)) {
            responseType = 'yes';
            parsedValue = true;
          } else if (['no', 'nope', 'nah'].includes(lowerText)) {
            responseType = 'no';
            parsedValue = false;
          } else {
            parsedValue = overrideText;
          }
          
          const response = {
            questionId: '',
            patientMrn: '',
            rawText: overrideText,
            parsedValue: parsedValue,
            responseType: responseType,
            confidence: 0.8, // Default confidence for text-based processing
            timestamp: new Date()
          };
          
          return { success: true, response };
        } else {
          // Use hybrid speech processing
          const response = await this.speechManager.processAudioInput(audioBuffer, overrideText);
          return { success: true, response };
        }
      } catch (error) {
        console.error('Failed to process audio:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('ai:processAudioStream', async (_, audioBuffer: ArrayBuffer, expectedType?: string) => {
      try {
        console.log('IPC: ai:processAudioStream called');
        const response = await this.speechManager.processAudioInput(audioBuffer, expectedType);
        return { success: true, response };
      } catch (error) {
        console.error('Failed to process audio stream:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    // Remove old parseResponse - handled by hybrid manager now

    // Remove old extractDateTime - handled by hybrid manager now

    ipcMain.handle('ai:isInitialized', () => {
      return this.speechManager.isServiceInitialized();
    });

    ipcMain.handle('ai:getModelInfo', () => {
      return this.speechManager.getModelInfo();
    });

    ipcMain.handle('ai:cleanup', async () => {
      try {
        console.log('IPC: ai:cleanup called');
        await this.speechManager.cleanup();
        return { success: true };
      } catch (error) {
        console.error('Failed to cleanup AI service:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    // Configuration IPC handlers
    ipcMain.handle('config:saveApiKey', async (_, apiKey: string) => {
      try {
        console.log('IPC: config:saveApiKey called');
        const configManager = ConfigManager.getInstance();
        
        // Create config with the API key
        const config = {
          googleSpeech: {
            apiKey: apiKey
          },
          audio: {
            sampleRate: 16000,
            channels: 1
          }
        };
        
        // Save to config.json
        const fs = require('fs');
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Update the speech manager with new config
        this.speechManager = new GoogleSpeechManager({ apiKey });
        
        console.log('API key saved successfully');
        return { success: true };
      } catch (error) {
        console.error('Failed to save API key:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('config:saveServiceAccount', async (_, credentialsJson: string) => {
      try {
        console.log('IPC: config:saveServiceAccount called');
        
        // Validate the JSON
        const credentials = JSON.parse(credentialsJson);
        if (!credentials.type || credentials.type !== 'service_account') {
          throw new Error('Invalid service account credentials');
        }
        
        // Save credentials to file
        const fs = require('fs');
        const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
        fs.writeFileSync(credentialsPath, credentialsJson);
        
        // Create config pointing to the credentials file
        const config = {
          googleSpeech: {
            keyFilename: './google-credentials.json'
          },
          audio: {
            sampleRate: 16000,
            channels: 1
          }
        };
        
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Update the speech manager with new config
        this.speechManager = new GoogleSpeechManager({ keyFilename: credentialsPath });
        
        console.log('Service account credentials saved successfully');
        return { success: true };
      } catch (error) {
        console.error('Failed to save service account:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('config:openSetup', () => {
      try {
        console.log('IPC: config:openSetup called');
        
        // Create setup dialog window
        const setupWindow = new BrowserWindow({
          width: 700,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
          },
          modal: true,
          parent: this.mainWindow || undefined,
          resizable: false,
          title: 'Google Speech-to-Text Setup'
        });

        setupWindow.loadFile(path.join(__dirname, 'setup-dialog.html'));
        
        return { success: true };
      } catch (error) {
        console.error('Failed to open setup dialog:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Live Transcription IPC handlers
    ipcMain.handle('liveTranscription:initialize', async () => {
      try {
        logger.info('🎤 IPC: LIVE TRANSCRIPTION INITIALIZE CALLED', {}, 'MAIN-IPC');
        console.log('🎤 IPC: liveTranscription:initialize called');
        
        // Reload configuration from environment/files
        logger.info('📋 Reloading live transcription configuration', {}, 'MAIN-IPC');
        console.log('📋 Reloading live transcription configuration...');
        this.liveTranscriptionConfig.loadFromEnvironment();
        
        // Validate configuration
        logger.info('🔍 Validating live transcription configuration', {}, 'MAIN-IPC');
        console.log('🔍 Validating live transcription configuration...');
        const validation = this.liveTranscriptionConfig.validateConfig();
        if (!validation.isValid) {
          logger.error('❌ Configuration validation failed', { errors: validation.errors }, 'MAIN-IPC');
          console.error('❌ Configuration validation failed:', validation.errors);
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        logger.info('✅ Configuration validation passed', {}, 'MAIN-IPC');
        console.log('✅ Configuration validation passed');
        
        // Get and log configuration
        const config = this.liveTranscriptionConfig.getGoogleSpeechConfig();
        const configLog = {
          languageCode: config.languageCode,
          model: config.model,
          keyFilename: config.keyFilename ? 'Present' : 'Not set',
          apiKey: config.apiKey ? 'Present' : 'Not set',
          sampleRateHertz: config.sampleRateHertz,
          encoding: config.encoding
        };
        
        logger.info('⚙️ Google Speech config for live transcription', configLog, 'MAIN-IPC');
        console.log('⚙️ Google Speech config for live transcription:', configLog);
        
        // Initialize streaming manager
        logger.info('🎵 Initializing Google Speech Streaming Manager', {}, 'MAIN-IPC');
        console.log('🎵 Initializing Google Speech Streaming Manager...');
        this.streamingManager = new GoogleSpeechStreamingManager(config);
        await this.streamingManager.initializeGoogleSpeech();
        
        // Connect CSV context manager to streaming manager
        if (this.csvContextManager) {
          this.csvContextManager.setSpeechManager(this.streamingManager);
          logger.info('🔗 CSV context manager connected to streaming manager', {}, 'MAIN-IPC');
          console.log('🔗 CSV context manager connected to streaming manager');
        }
        
        console.log('✅ Live transcription initialized successfully');
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to initialize live transcription:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('liveTranscription:startStreaming', async () => {
      try {
        console.log('🎵 IPC: liveTranscription:startStreaming called');
        
        if (!this.streamingManager) {
          console.error('❌ Streaming manager not initialized');
          throw new Error('Live transcription service not initialized');
        }
        
        if (!this.streamingManager.isServiceReady()) {
          console.error('❌ Streaming manager service not ready');
          const status = this.streamingManager.getConnectionStatus();
          console.error('   Connection status:', status);
          throw new Error('Live transcription service not ready');
        }
        
        console.log('🎤 Starting streaming recognition session...');
        this.currentSession = await this.streamingManager.startStreamingRecognition();
        
        // Set up session event handlers
        this.currentSession.onPartialResult((result: any) => {
          console.log('📝 GOOGLE SPEECH PARTIAL RESULT:', {
            transcript: result.transcript,
            confidence: result.confidence,
            stability: result.stability,
            timestamp: new Date().toISOString()
          });
          
          // Send partial results to all renderer windows
          BrowserWindow.getAllWindows().forEach(window => {
            console.log('📤 Sending partial result to renderer window');
            window.webContents.send('liveTranscription:partialResult', result);
          });
        });
        
        this.currentSession.onFinalResult((result: any) => {
          console.log('✅ GOOGLE SPEECH FINAL RESULT:', {
            transcript: result.transcript,
            confidence: result.confidence,
            words: result.words?.length || 0,
            alternatives: result.alternatives?.length || 0,
            timestamp: new Date().toISOString()
          });
          
          // Send final results to all renderer windows
          BrowserWindow.getAllWindows().forEach(window => {
            console.log('📤 Sending final result to renderer window');
            window.webContents.send('liveTranscription:finalResult', result);
          });
        });
        
        this.currentSession.onError((error: any) => {
          console.error('❌ GOOGLE SPEECH SESSION ERROR:', {
            code: error.code,
            message: error.message,
            recoverable: error.recoverable,
            timestamp: new Date().toISOString()
          });
          
          // Send errors to all renderer windows
          BrowserWindow.getAllWindows().forEach(window => {
            console.log('📤 Sending error to renderer window');
            window.webContents.send('liveTranscription:error', error);
          });
          
          // Clear the session on error
          this.currentSession = null;
        });
        
        return { success: true };
      } catch (error) {
        console.error('Failed to start live transcription streaming:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('liveTranscription:sendAudio', async (_, audioChunk: ArrayBuffer) => {
      try {
        const logData = {
          audioChunkSize: audioChunk.byteLength,
          hasStreamingManager: !!this.streamingManager,
          hasCurrentSession: !!this.currentSession,
          timestamp: new Date().toISOString()
        };
        
        logger.info('📨 IPC: LIVE TRANSCRIPTION SEND AUDIO RECEIVED', logData, 'MAIN-IPC');
        console.log('📨 IPC: liveTranscription:sendAudio received:', logData);
        
        if (!this.streamingManager) {
          logger.error('❌ GOOGLE SPEECH ERROR: Live transcription service not initialized', {}, 'MAIN-IPC');
          console.error('❌ GOOGLE SPEECH ERROR: Live transcription service not initialized');
          throw new Error('Live transcription service not initialized');
        }
        
        if (!this.currentSession) {
          logger.warn('⚠️ GOOGLE SPEECH WARNING: No active streaming session', {}, 'MAIN-IPC');
          console.warn('⚠️ GOOGLE SPEECH WARNING: No active streaming session, audio chunk ignored');
          return { success: false, error: 'No active streaming session' };
        }
        
        // Send audio chunk to the active session
        const sendData = {
          audioChunkSize: audioChunk.byteLength,
          sessionActive: this.currentSession.isActive(),
          timestamp: new Date().toISOString()
        };
        
        logger.info('📤 SENDING TO GOOGLE SPEECH', sendData, 'MAIN-IPC');
        console.log('📤 SENDING TO GOOGLE SPEECH:', sendData);
        
        this.currentSession.sendAudioChunk(audioChunk);
        
        logger.info('✅ GOOGLE SPEECH AUDIO SENT SUCCESSFULLY', {}, 'MAIN-IPC');
        console.log('✅ GOOGLE SPEECH AUDIO SENT SUCCESSFULLY');
        return { success: true };
      } catch (error) {
        const errorData = {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        };
        
        logger.error('❌ GOOGLE SPEECH SEND ERROR', errorData, 'MAIN-IPC');
        console.error('❌ GOOGLE SPEECH SEND ERROR:', errorData);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('liveTranscription:getStatus', () => {
      try {
        if (!this.streamingManager) {
          return { 
            success: true, 
            status: { isConnected: false, isStreaming: false, latency: 0, errorCount: 0 } 
          };
        }
        
        const status = this.streamingManager.getConnectionStatus();
        return { success: true, status };
      } catch (error) {
        console.error('Failed to get live transcription status:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('liveTranscription:getConfig', () => {
      try {
        const config = this.liveTranscriptionConfig.getConfig();
        return { success: true, config };
      } catch (error) {
        console.error('Failed to get live transcription config:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('liveTranscription:updateConfig', (_, updates: any) => {
      try {
        console.log('IPC: liveTranscription:updateConfig called');
        this.liveTranscriptionConfig.updateConfig(updates);
        return { success: true };
      } catch (error) {
        console.error('Failed to update live transcription config:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Audio Capture IPC handlers
    ipcMain.handle('audio:startCapture', async (_, options: AudioCaptureOptions) => {
      try {
        logger.info('🎤 IPC: AUDIO START CAPTURE CALLED', { options }, 'MAIN-IPC');
        console.log('🎤 IPC: audio:startCapture called with options:', options);
        await this.audioCaptureHandler.startListening(options);
        logger.info('✅ Audio capture started successfully', {}, 'MAIN-IPC');
        console.log('✅ Audio capture started successfully');
        return { success: true };
      } catch (error) {
        logger.error('❌ Failed to start audio capture', { error }, 'MAIN-IPC');
        console.error('❌ Failed to start audio capture:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:stopCapture', () => {
      try {
        console.log('IPC: audio:stopCapture called');
        this.audioCaptureHandler.stopListening();
        return { success: true };
      } catch (error) {
        console.error('Failed to stop audio capture:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:getBuffer', () => {
      try {
        console.log('IPC: audio:getBuffer called');
        const buffer = this.audioCaptureHandler.getAudioBuffer();
        return { success: true, buffer };
      } catch (error) {
        console.error('Failed to get audio buffer:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:getDevices', async () => {
      try {
        console.log('IPC: audio:getDevices called');
        const devices = await this.audioCaptureHandler.getAvailableDevices();
        return { success: true, devices };
      } catch (error) {
        console.error('Failed to get audio devices:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:isListening', () => {
      return this.audioCaptureHandler.isListening();
    });

    ipcMain.handle('audio:getStatistics', () => {
      try {
        const stats = this.audioCaptureHandler.getStatistics();
        return { success: true, stats };
      } catch (error) {
        console.error('Failed to get audio statistics:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:updateProcessingOptions', (_, options: any) => {
      try {
        console.log('IPC: audio:updateProcessingOptions called');
        this.audioCaptureHandler.updateProcessingOptions(options);
        return { success: true };
      } catch (error) {
        console.error('Failed to update processing options:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('audio:resetProcessor', () => {
      try {
        console.log('IPC: audio:resetProcessor called');
        this.audioCaptureHandler.resetProcessor();
        return { success: true };
      } catch (error) {
        console.error('Failed to reset processor:', error);
        return { 
          success: false, 
          error: error instanceof AppError ? error.message : 'Unknown error' 
        };
      }
    });

    // Set up audio event handlers
    this.setupAudioEventHandlers();
  }

  /**
   * Setup audio event handlers
   */
  private setupAudioEventHandlers(): void {
    // Handle audio detection events
    this.audioCaptureHandler.onAudioDetected((audioBuffer: ArrayBuffer) => {
      console.log('Audio detected, processing...');
      
      // Send audio to all renderer windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('audio:detected', audioBuffer);
      });
    });

    // Handle audio capture errors
    this.audioCaptureHandler.onError((error: Error) => {
      console.error('Audio capture error:', error);
      
      // Send error to all renderer windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('audio:error', error.message);
      });
    });

    // Handle voice activity detection events
    this.audioCaptureHandler.on('voiceActivity', (vadResult: any) => {
      // Send VAD results to all renderer windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('audio:voiceActivity', vadResult);
      });
    });

    // Handle speech segment events
    this.audioCaptureHandler.on('speechSegment', (segment: any) => {
      console.log('Speech segment detected:', segment.confidence);
      
      // Send speech segment to all renderer windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('audio:speechSegment', segment);
      });
    });
  }
}

// Initialize the application
new SpeechOverlayApp();