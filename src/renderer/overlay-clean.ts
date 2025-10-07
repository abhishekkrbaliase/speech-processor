console.log('🚀 OVERLAY.TS SCRIPT STARTING TO LOAD!');
console.log('📍 Timestamp:', new Date().toISOString());
console.log('🌐 Window object available:', typeof window !== 'undefined');
console.log('📄 Document ready state:', document.readyState);

import { PatientRecord, Question, ProcessedResponse, ResponseType, LiveTranscriptionResult, UncertainWord, ConfidenceAnalysis } from '../shared/types';
import { LiveDisplayManager } from './LiveDisplayManager';

console.log('✅ OVERLAY.TS IMPORTS LOADED!');
console.log('📍 Timestamp:', new Date().toISOString());

interface OverlayState {
  currentPatient: PatientRecord | null;
  currentQuestion: Question | null;
  currentResponse: ProcessedResponse | null;
  isListening: boolean;
  isProcessing: boolean;
  isPaused: boolean;
  questionIndex: number;
  patientIndex: number;
  totalQuestions: number;
  totalPatients: number;
  currentTranscription: string;
  partialTranscription: string;
  isLiveTranscriptionActive: boolean;
  transcriptionConfidence: number;
  uncertainWords: UncertainWord[];
  isFinalizingResponse: boolean;
}

class OverlayRenderer {
  private state: OverlayState = {
    currentPatient: null,
    currentQuestion: null,
    currentResponse: null,
    isListening: false,
    isProcessing: false,
    isPaused: false,
    questionIndex: 0,
    patientIndex: 0,
    totalQuestions: 0,
    totalPatients: 0,
    currentTranscription: '',
    partialTranscription: '',
    isLiveTranscriptionActive: false,
    transcriptionConfidence: 0,
    uncertainWords: [],
    isFinalizingResponse: false
  };

  private liveDisplayManager: LiveDisplayManager | null = null;

  private elements!: {
    patientMrn: HTMLElement;
    patientName: HTMLElement;
    progressText: HTMLElement;
    questionText: HTMLElement;
    statusIndicator: HTMLElement;
    statusText: HTMLElement;
    responseDisplay: HTMLElement;
    resetBtn: HTMLButtonElement;
    nextBtn: HTMLButtonElement;
    pauseBtn: HTMLButtonElement;
    testBtn: HTMLButtonElement;
    transcriptionStatus: HTMLElement;
    confidenceFill: HTMLElement;
    confidencePercentage: HTMLElement;
    wordCount: HTMLElement;
  };

  constructor() {
    console.log('🎯 OVERLAYRENDERER CONSTRUCTOR CALLED!');
    console.log('📍 Timestamp:', new Date().toISOString());
    console.log('🌐 Window APIs available:', {
      electronAPI: !!window.electronAPI,
      dataManager: !!window.dataManager,
      questionnaire: !!(window as any).questionnaire
    });
    
    try {
      console.log('🔧 Step 1: Initializing elements...');
      this.initializeElements();
      console.log('✅ Elements initialized');
      
      console.log('🔧 Step 2: Setting up event listeners...');
      this.setupEventListeners();
      console.log('✅ Event listeners set up');
      
      console.log('🔧 Step 3: Initializing live display manager...');
      this.initializeLiveDisplayManager();
      console.log('✅ Live display manager initialized');
      
      console.log('🔧 Step 4: Initializing overlay...');
      this.initializeOverlay();
      console.log('✅ Overlay initialization started');
      
      console.log('🎉 OVERLAYRENDERER CONSTRUCTOR COMPLETED!');
    } catch (error) {
      console.error('❌ ERROR IN OVERLAYRENDERER CONSTRUCTOR:', error);
      throw error;
    }
  }

  private initializeElements(): void {
    console.log('🔍 INITIALIZING DOM ELEMENTS...');
    console.log('📍 Timestamp:', new Date().toISOString());
    
    const elementIds = [
      'patient-mrn', 'patient-name', 'progress-text', 'question-text',
      'status-indicator', 'status-text', 'response-display',
      'reset-btn', 'next-btn', 'pause-btn', 'test-btn',
      'transcription-status', 'confidence-fill', 'confidence-percentage', 'word-count'
    ];
    
    console.log('🔍 Checking for required DOM elements...');
    const missingElements: string[] = [];
    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element) {
        missingElements.push(id);
        console.log(`❌ Missing element: ${id}`);
      } else {
        console.log(`✅ Found element: ${id}`);
      }
    });
    
    if (missingElements.length > 0) {
      console.error('❌ MISSING DOM ELEMENTS:', missingElements);
      console.log('📄 Available elements in document:');
      const allElements = document.querySelectorAll('[id]');
      allElements.forEach(el => console.log(`  - ${el.id}`));
    }
    
    this.elements = {
      patientMrn: document.getElementById('patient-mrn')!,
      patientName: document.getElementById('patient-name')!,
      progressText: document.getElementById('progress-text')!,
      questionText: document.getElementById('question-text')!,
      statusIndicator: document.getElementById('status-indicator')!,
      statusText: document.getElementById('status-text')!,
      responseDisplay: document.getElementById('response-display')!,
      resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,
      nextBtn: document.getElementById('next-btn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pause-btn') as HTMLButtonElement,
      testBtn: document.getElementById('test-btn') as HTMLButtonElement,
      transcriptionStatus: document.getElementById('transcription-status')!,
      confidenceFill: document.getElementById('confidence-fill')!,
      confidencePercentage: document.getElementById('confidence-percentage')!,
      wordCount: document.getElementById('word-count')!
    };
    
    console.log('✅ DOM ELEMENTS INITIALIZED');
    console.log('🔍 Element validation:', {
      testBtn: !!this.elements.testBtn,
      testBtnType: this.elements.testBtn?.tagName,
      testBtnId: this.elements.testBtn?.id
    });
  }

  private initializeLiveDisplayManager(): void {
    try {
      const statusElement = document.querySelector('.response-status') || this.elements.statusText;
      this.liveDisplayManager = new LiveDisplayManager(
        this.elements.responseDisplay,
        statusElement as HTMLElement,
        this.elements.transcriptionStatus,
        {
          animationDuration: 300,
          fadeInDelay: 50,
          maxDisplayLength: 500
        }
      );
      console.log('✅ LiveDisplayManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize LiveDisplayManager:', error);
      this.liveDisplayManager = null;
    }
  }

  private setupEventListeners(): void {
    console.log('🔧 SETTING UP EVENT LISTENERS...');
    console.log('📍 Timestamp:', new Date().toISOString());
    
    if (!this.elements.testBtn) {
      console.error('❌ TEST BUTTON NOT FOUND - Cannot set up event listener!');
      return;
    }
    
    console.log('✅ Test button found, setting up event listeners...');
    
    this.elements.resetBtn.addEventListener('click', () => {
      console.log('🔄 RESET BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
      this.handleReset();
    });
    
    this.elements.nextBtn.addEventListener('click', () => {
      console.log('▶️ NEXT BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
      this.handleNext();
    });
    
    this.elements.pauseBtn.addEventListener('click', () => {
      console.log('⏸️ PAUSE BUTTON CLICKED!');
      console.log('📍 Timestamp:', new Date().toISOString());
      this.handlePause();
    });
    
    this.elements.testBtn.addEventListener('click', () => {
      console.log('🧪 TEST BUTTON CLICKED - STARTING COMPREHENSIVE TEST!');
      console.log('📍 Timestamp:', new Date().toISOString());
      console.log('🔍 Current State:', {
        patient: this.state.currentPatient?.mrn || 'None',
        question: this.state.currentQuestion?.text || 'None',
        isListening: this.state.isListening,
        isLiveTranscriptionActive: this.state.isLiveTranscriptionActive,
        isPaused: this.state.isPaused
      });
      
      this.elements.testBtn.style.background = 'rgba(255, 0, 0, 0.6)';
      setTimeout(() => {
        this.elements.testBtn.style.background = 'rgba(76, 175, 80, 0.4)';
      }, 200);
      
      console.log('🚀 Calling handleTest()...');
      this.handleTest();
    });
    
    console.log('✅ Button event listeners set up successfully');
  }

  private async initializeOverlay(): Promise<void> {
    console.log('🎯 OVERLAY INITIALIZATION STARTED');
    console.log('📊 Initial overlay state:', this.state);
    this.updateUI();
    
    console.log('🔧 Setting up live transcription event listeners...');
    this.setupLiveTranscriptionEventListeners();
    
    try {
      console.log('📥 Loading initial data from main process...');
      await this.loadInitialData();
      console.log('✅ OVERLAY INITIALIZATION COMPLETED');
    } catch (error) {
      console.error('❌ OVERLAY INITIALIZATION FAILED:', error);
      this.showError('Failed to load data. Please ensure patient and question files are loaded.');
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      if (!window.dataManager) {
        throw new Error('DataManager API not available');
      }

      const [patients, questions] = await Promise.all([
        window.dataManager.getAllPatients(),
        window.dataManager.getAllQuestions()
      ]);

      console.log(`Loaded ${patients.length} patients and ${questions.length} questions`);

      if (patients.length === 0) {
        this.showError('No patients loaded. Please load patient CSV file first.', true);
        return;
      }

      if (questions.length === 0) {
        this.showError('No questions loaded. Please load questions CSV file first.', true);
        return;
      }

      console.log('First patient:', patients[0]);
      console.log('First question:', questions[0]);
      
      this.displayPatient(patients[0], 0, patients.length);
      this.displayQuestion(questions[0], 0, questions.length);
      
      this.setStatus('ready', 'Ready to begin questionnaire');
      
      await this.checkLiveTranscriptionStatus();
      
      console.log('🎤 Auto-starting Google Speech-to-Text live transcription for first question...');
      setTimeout(async () => {
        try {
          await this.startLiveTranscription();
        } catch (error) {
          console.error('Failed to auto-start live transcription:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  private handleReset(): void {
    this.state.currentResponse = null;
    this.clearLiveTranscription();
    this.updateResponseDisplay();
    this.setStatus('ready', 'Ready');
    console.log('Reset requested');
  }

  private async handleNext(): Promise<void> {
    if (this.state.currentResponse) {
      await this.saveCurrentResponse();
      await this.proceedToNext();
    } else {
      await this.startLiveTranscription();
      console.log('Starting live transcription');
    }
  }

  private async handlePause(): Promise<void> {
    const newPausedState = !this.state.isPaused;
    this.setPaused(newPausedState);
    
    if (newPausedState) {
      await this.stopLiveTranscription();
      this.clearLiveTranscription();
    } else if (!this.state.currentResponse) {
      await this.startLiveTranscription();
    }
    
    console.log(`${newPausedState ? 'Paused' : 'Resumed'} questionnaire`);
  }

  private async handleTest(): Promise<void> {
    console.log('🧪 HANDLETEST METHOD CALLED!');
    console.log('📍 Timestamp:', new Date().toISOString());
    console.log('🔍 DETAILED CURRENT STATE:', {
      isLiveTranscriptionActive: this.state.isLiveTranscriptionActive,
      isListening: this.state.isListening,
      isPaused: this.state.isPaused,
      currentResponse: this.state.currentResponse,
      currentPatient: this.state.currentPatient?.mrn || 'None',
      currentQuestion: this.state.currentQuestion?.text || 'None',
      hasElectronAPI: !!window.electronAPI,
      hasDataManager: !!window.dataManager
    });
    
    try {
      console.log('🎯 STARTING TEST SEQUENCE...');
      
      if (!this.state.isLiveTranscriptionActive) {
        console.log('🚀 Starting live transcription for test...');
        await this.startLiveTranscription();
        console.log('✅ Live transcription started for test');
      } else {
        console.log('ℹ️ Live transcription already active');
      }
      
      if (window.electronAPI) {
        console.log('🎤 Testing audio capture initialization...');
        const audioResult = await window.electronAPI.startAudioCapture({
          sampleRate: 16000,
          channels: 1,
          format: 'LINEAR16'
        });
        console.log('✅ Audio capture test result:', audioResult);
      } else {
        console.warn('⚠️ Electron API not available for audio test');
      }
      
      console.log('🧪 TEST 3: Checking system status...');
      console.log('🔍 System Status:', {
        hasWebSocket: typeof WebSocket !== 'undefined',
        hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
      
      console.log('🎉 TEST SEQUENCE COMPLETED!');
      
    } catch (error) {
      console.error('❌ ERROR DURING TEST SEQUENCE:', error);
    }
  }

  private setStatus(type: 'ready' | 'listening' | 'processing' | 'completed' | 'paused' | 'error', text: string): void {
    this.elements.statusText.textContent = text;
    this.elements.statusIndicator.className = `status-indicator ${type}`;
    console.log(`📊 Status changed to: ${type} - ${text}`);
  }

  private showError(message: string, isRecoverable: boolean = true): void {
    this.setStatus('error', message);
    
    if (this.liveDisplayManager && this.state.isLiveTranscriptionActive) {
      this.liveDisplayManager.showError(message, isRecoverable);
    } else {
      this.elements.responseDisplay.textContent = `Error: ${message}`;
      this.elements.responseDisplay.className = 'response-display error';
    }
    
    this.elements.nextBtn.disabled = true;
    
    if (isRecoverable) {
      setTimeout(() => {
        this.setStatus('ready', 'Ready');
        this.elements.nextBtn.disabled = false;
      }, 3000);
    }
    
    console.error(`🚨 Error displayed: ${message} (recoverable: ${isRecoverable})`);
  }

  // Placeholder methods for compilation
  private updateUI(): void { console.log('UI updated'); }
  private setupLiveTranscriptionEventListeners(): void { console.log('Live transcription listeners set up'); }
  private async checkLiveTranscriptionStatus(): Promise<void> { console.log('Live transcription status checked'); }
  private async startLiveTranscription(): Promise<void> { console.log('Live transcription started'); }
  private async stopLiveTranscription(): Promise<void> { console.log('Live transcription stopped'); }
  private clearLiveTranscription(): void { console.log('Live transcription cleared'); }
  private updateResponseDisplay(): void { console.log('Response display updated'); }
  private setPaused(isPaused: boolean): void { console.log('Paused state set:', isPaused); }
  private async saveCurrentResponse(): Promise<void> { console.log('Response saved'); }
  private async proceedToNext(): Promise<void> { console.log('Proceeding to next'); }
  private displayPatient(patient: PatientRecord, patientIndex: number, totalPatients: number): void { console.log('Patient displayed:', patient.mrn); }
  private displayQuestion(question: Question, questionIndex: number, totalQuestions: number): void { console.log('Question displayed:', question.text); }
}

console.log('🎯 OVERLAY.TS SCRIPT FULLY LOADED!');
console.log('📍 Timestamp:', new Date().toISOString());
console.log('🔍 OverlayRenderer class available:', typeof OverlayRenderer !== 'undefined');

console.log('📋 Document ready state:', document.readyState);
if (document.readyState === 'loading') {
  console.log('⏳ Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired, creating OverlayRenderer instance');
    try {
      console.log('🎯 Creating OverlayRenderer instance...');
      const overlay = new OverlayRenderer();
      console.log('✅ OverlayRenderer instance created successfully:', overlay);
    } catch (error) {
      console.error('❌ Error creating OverlayRenderer instance:', error);
    }
  });
} else {
  console.log('✅ DOM already ready, creating OverlayRenderer instance immediately');
  try {
    console.log('🎯 Creating OverlayRenderer instance...');
    const overlay = new OverlayRenderer();
    console.log('✅ OverlayRenderer instance created successfully:', overlay);
  } catch (error) {
    console.error('❌ Error creating OverlayRenderer instance:', error);
  }
}
