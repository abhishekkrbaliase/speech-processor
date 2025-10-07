// Global type declarations for renderer processes

declare global {
  interface Window {
    electronAPI: {
      // App information
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;

      // AI operations
      initializeAI: () => Promise<{ success: boolean; error?: string }>;
      processAudio: (audioData: ArrayBuffer, overrideText?: string) => Promise<{ success: boolean; response?: any; error?: string }>;
      processAudioStream: (audioData: ArrayBuffer, isPartial?: boolean) => Promise<{ success: boolean; response?: any; error?: string }>;
      isAIInitialized: () => Promise<boolean>;
      getModelInfo: () => Promise<any>;
      cleanupAI: () => Promise<{ success: boolean; error?: string }>;

      // Audio capture operations
      startAudioCapture: (options?: any) => Promise<{ success: boolean; error?: string }>;
      stopAudioCapture: () => Promise<{ success: boolean; error?: string }>;
      getAudioBuffer: () => Promise<{ success: boolean; buffer?: ArrayBuffer; error?: string }>;
      getAudioDevices: () => Promise<{ success: boolean; devices?: any[]; error?: string }>;
      isAudioListening: () => Promise<boolean>;
      getAudioStatistics: () => Promise<any>;

      // Audio event listeners
      onAudioDetected: (callback: (audioBuffer: ArrayBuffer) => void) => void;
      onAudioError: (callback: (error: string) => void) => void;
      onVoiceActivity: (callback: (vadResult: any) => void) => void;
      onSpeechSegment: (callback: (segment: any) => void) => void;

      // Overlay management
      createOverlay: () => Promise<{ success: boolean; error?: string }>;
      showOverlay: () => Promise<{ success: boolean; error?: string }>;
      hideOverlay: () => Promise<{ success: boolean; error?: string }>;
      toggleOverlay: () => Promise<{ success: boolean; error?: string }>;
      positionOverlay: (position: any) => Promise<{ success: boolean; error?: string }>;
      centerOverlay: () => Promise<{ success: boolean; error?: string }>;
      positionTopRight: () => Promise<{ success: boolean; error?: string }>;
      setOverlayProperties: (transparent: boolean, clickThrough: boolean) => Promise<{ success: boolean; error?: string }>;
      isOverlayVisible: () => Promise<boolean>;
      resizeWindow: (width: number, height: number, x?: number, y?: number) => Promise<{ success: boolean; error?: string }>;

      // Live Transcription operations
      initializeLiveTranscription: () => Promise<{ success: boolean; error?: string }>;
      startLiveTranscriptionStreaming: () => Promise<{ success: boolean; error?: string }>;
      sendAudioToLiveTranscription: (audioChunk: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
      getLiveTranscriptionStatus: () => Promise<{ success: boolean; status?: any; error?: string }>;
      getLiveTranscriptionConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
      updateLiveTranscriptionConfig: (updates: any) => Promise<{ success: boolean; error?: string }>;

      // Live Transcription event listeners
      onPartialResult: (callback: (result: any) => void) => void;
      onFinalResult: (callback: (result: any) => void) => void;
      onLiveTranscriptionError: (callback: (error: any) => void) => void;

      // Configuration management
      saveApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
      saveServiceAccount: (credentialsJson: string) => Promise<{ success: boolean; error?: string }>;
      openSetup: () => Promise<{ success: boolean; error?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    };

    dataManager: {
      getAllPatients: () => Promise<any[]>;
      getAllQuestions: () => Promise<any[]>;
      addResponse: (response: any) => Promise<void>;
      loadPatientsFromCSV: (filePath: string) => Promise<any[]>;
      loadQuestionsFromCSV: (filePath: string) => Promise<any[]>;
    };

    questionnaireController: {
      getCurrentState: () => Promise<any>;
      nextQuestion: () => Promise<any>;
      previousQuestion: () => Promise<any>;
      processResponse: (response: any) => Promise<void>;
    };

    exportManager: {
      exportWithDialog: (settings: any) => Promise<{ success: boolean; recordCount?: number; error?: string }>;
    };
  }
}

export {};