import { contextBridge, ipcRenderer } from 'electron';
import { exposeDataManagerAPI } from '../preload/dataManagerAPI';
import { exposeQuestionnaireAPI } from '../preload/questionnaireAPI';
import { exposeExportAPI } from '../preload/exportAPI';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Future IPC methods will be added here as needed
  // File operations
  loadCSV: (filePath: string) => ipcRenderer.invoke('file:loadCSV', filePath),
  loadQuestions: (filePath: string) => ipcRenderer.invoke('file:loadQuestions', filePath),
  exportResponses: (data: any) => ipcRenderer.invoke('file:exportResponses', data),

  // AI operations
  initializeAI: () => ipcRenderer.invoke('ai:initialize'),
  processAudio: (audioData: ArrayBuffer, overrideText?: string) => ipcRenderer.invoke('ai:processAudio', audioData, overrideText),
  processAudioStream: (audioData: ArrayBuffer, isPartial?: boolean) => ipcRenderer.invoke('ai:processAudioStream', audioData, isPartial),
  parseResponse: (text: string) => ipcRenderer.invoke('ai:parseResponse', text),
  extractDateTime: (text: string) => ipcRenderer.invoke('ai:extractDateTime', text),
  isAIInitialized: () => ipcRenderer.invoke('ai:isInitialized'),
  getModelInfo: () => ipcRenderer.invoke('ai:getModelInfo'),
  cleanupAI: () => ipcRenderer.invoke('ai:cleanup'),

  // Audio capture operations
  startAudioCapture: (options?: any) => ipcRenderer.invoke('audio:startCapture', options),
  stopAudioCapture: () => ipcRenderer.invoke('audio:stopCapture'),
  getAudioBuffer: () => ipcRenderer.invoke('audio:getBuffer'),
  getAudioDevices: () => ipcRenderer.invoke('audio:getDevices'),
  isAudioListening: () => ipcRenderer.invoke('audio:isListening'),
  getAudioStatistics: () => ipcRenderer.invoke('audio:getStatistics'),

  // Audio event listeners
  onAudioDetected: (callback: (audioBuffer: ArrayBuffer) => void) => {
    ipcRenderer.on('audio:detected', (_, audioBuffer) => callback(audioBuffer));
  },
  onAudioError: (callback: (error: string) => void) => {
    ipcRenderer.on('audio:error', (_, error) => callback(error));
  },
  updateAudioProcessingOptions: (options: any) => ipcRenderer.invoke('audio:updateProcessingOptions', options),
  resetAudioProcessor: () => ipcRenderer.invoke('audio:resetProcessor'),
  onVoiceActivity: (callback: (vadResult: any) => void) => {
    ipcRenderer.on('audio:voiceActivity', (_, vadResult) => callback(vadResult));
  },
  onSpeechSegment: (callback: (segment: any) => void) => {
    ipcRenderer.on('audio:speechSegment', (_, segment) => callback(segment));
  },

  // Session management
  saveSession: (sessionData: any) => ipcRenderer.invoke('session:save', sessionData),
  loadSession: () => ipcRenderer.invoke('session:load'),

  // Overlay management
  createOverlay: () => ipcRenderer.invoke('overlay:create'),
  showOverlay: () => ipcRenderer.invoke('overlay:show'),
  hideOverlay: () => ipcRenderer.invoke('overlay:hide'),
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  positionOverlay: (position: any) => ipcRenderer.invoke('overlay:position', position),
  centerOverlay: () => ipcRenderer.invoke('overlay:center'),
  positionTopRight: () => ipcRenderer.invoke('overlay:topRight'),
  setOverlayProperties: (transparent: boolean, clickThrough: boolean) => 
    ipcRenderer.invoke('overlay:setProperties', transparent, clickThrough),
  isOverlayVisible: () => ipcRenderer.invoke('overlay:isVisible'),
  resizeWindow: (width: number, height: number, x?: number, y?: number) => 
    ipcRenderer.invoke('overlay:resize', width, height, x, y),

  // Live Transcription operations
  initializeLiveTranscription: () => ipcRenderer.invoke('liveTranscription:initialize'),
  startLiveTranscriptionStreaming: () => ipcRenderer.invoke('liveTranscription:startStreaming'),
  sendAudioToLiveTranscription: (audioChunk: ArrayBuffer) => ipcRenderer.invoke('liveTranscription:sendAudio', audioChunk),
  getLiveTranscriptionStatus: () => ipcRenderer.invoke('liveTranscription:getStatus'),
  getLiveTranscriptionConfig: () => ipcRenderer.invoke('liveTranscription:getConfig'),
  updateLiveTranscriptionConfig: (updates: any) => ipcRenderer.invoke('liveTranscription:updateConfig', updates),

  // Live Transcription event listeners
  onPartialResult: (callback: (result: any) => void) => {
    ipcRenderer.on('liveTranscription:partialResult', (_, result) => callback(result));
  },
  onFinalResult: (callback: (result: any) => void) => {
    ipcRenderer.on('liveTranscription:finalResult', (_, result) => callback(result));
  },
  onLiveTranscriptionError: (callback: (error: any) => void) => {
    ipcRenderer.on('liveTranscription:error', (_, error) => callback(error));
  },

  // Configuration management
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('config:saveApiKey', apiKey),
  saveServiceAccount: (credentialsJson: string) => ipcRenderer.invoke('config:saveServiceAccount', credentialsJson),
  openSetup: () => ipcRenderer.invoke('config:openSetup'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url)
});

// Expose DataManager API
exposeDataManagerAPI();

// Expose Questionnaire API
exposeQuestionnaireAPI();

// Expose Export API
exposeExportAPI();

// Type definitions for the exposed API are handled by TypeScript inference