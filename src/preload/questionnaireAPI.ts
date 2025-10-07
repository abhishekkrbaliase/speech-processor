/**
 * Questionnaire Preload API
 * Provides secure access to QuestionnaireController functionality from renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ProcessedResponse, PatientRecord, Question } from '../shared/types';
import { QuestionnaireState, QuestionnaireConfig } from '../main/QuestionnaireController';

export interface QuestionnaireAPI {
  // Lifecycle operations
  start: () => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  pause: () => Promise<{ success: boolean; error?: string }>;
  resume: () => Promise<{ success: boolean; error?: string }>;

  // Navigation operations
  nextQuestion: () => Promise<{ success: boolean; hasNext: boolean; error?: string }>;
  previousQuestion: () => Promise<{ success: boolean; hasPrevious: boolean; error?: string }>;
  nextPatient: () => Promise<{ success: boolean; hasNext: boolean; error?: string }>;
  previousPatient: () => Promise<{ success: boolean; hasPrevious: boolean; error?: string }>;
  goToPosition: (patientIndex: number, questionIndex: number) => Promise<{ success: boolean; error?: string }>;

  // Response operations
  submitResponse: (response: ProcessedResponse) => Promise<{ success: boolean; error?: string }>;
  clearResponse: () => Promise<{ success: boolean; error?: string }>;
  getCurrentResponse: () => Promise<{ success: boolean; response?: ProcessedResponse | null; error?: string }>;

  // State and configuration operations
  getState: () => Promise<{ success: boolean; state?: QuestionnaireState; error?: string }>;
  getConfig: () => Promise<{ success: boolean; config?: QuestionnaireConfig; error?: string }>;
  updateConfig: (updates: Partial<QuestionnaireConfig>) => Promise<{ success: boolean; error?: string }>;
  isComplete: () => Promise<{ success: boolean; isComplete?: boolean; error?: string }>;
  getCompletionStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;

  // Event listeners
  onStateChanged: (callback: (state: QuestionnaireState) => void) => void;
  onQuestionChanged: (callback: (data: { patient: PatientRecord; question: Question; questionIndex: number; totalQuestions: number }) => void) => void;
  onPatientChanged: (callback: (data: { patient: PatientRecord; patientIndex: number; totalPatients: number }) => void) => void;
  onResponseReceived: (callback: (response: ProcessedResponse) => void) => void;
  onCompleted: (callback: (data: { totalResponses: number }) => void) => void;
  onProgressUpdated: (callback: (data: { completed: number; total: number; percentage: number }) => void) => void;
  onError: (callback: (error: { message: string; code: string; category: string }) => void) => void;

  // Event listener cleanup
  removeAllListeners: () => void;
}

/**
 * Create Questionnaire API for renderer process
 */
const createQuestionnaireAPI = (): QuestionnaireAPI => {
  return {
    // Lifecycle operations
    start: () => 
      ipcRenderer.invoke('questionnaire:start'),
    
    stop: () => 
      ipcRenderer.invoke('questionnaire:stop'),
    
    pause: () => 
      ipcRenderer.invoke('questionnaire:pause'),
    
    resume: () => 
      ipcRenderer.invoke('questionnaire:resume'),

    // Navigation operations
    nextQuestion: () => 
      ipcRenderer.invoke('questionnaire:next-question'),
    
    previousQuestion: () => 
      ipcRenderer.invoke('questionnaire:previous-question'),
    
    nextPatient: () => 
      ipcRenderer.invoke('questionnaire:next-patient'),
    
    previousPatient: () => 
      ipcRenderer.invoke('questionnaire:previous-patient'),
    
    goToPosition: (patientIndex: number, questionIndex: number) => 
      ipcRenderer.invoke('questionnaire:go-to-position', patientIndex, questionIndex),

    // Response operations
    submitResponse: (response: ProcessedResponse) => 
      ipcRenderer.invoke('questionnaire:submit-response', response),
    
    clearResponse: () => 
      ipcRenderer.invoke('questionnaire:clear-response'),
    
    getCurrentResponse: () => 
      ipcRenderer.invoke('questionnaire:get-current-response'),

    // State and configuration operations
    getState: () => 
      ipcRenderer.invoke('questionnaire:get-state'),
    
    getConfig: () => 
      ipcRenderer.invoke('questionnaire:get-config'),
    
    updateConfig: (updates: Partial<QuestionnaireConfig>) => 
      ipcRenderer.invoke('questionnaire:update-config', updates),
    
    isComplete: () => 
      ipcRenderer.invoke('questionnaire:is-complete'),
    
    getCompletionStats: () => 
      ipcRenderer.invoke('questionnaire:get-completion-stats'),

    // Event listeners
    onStateChanged: (callback: (state: QuestionnaireState) => void) => {
      ipcRenderer.on('questionnaire:state-changed', (_, state) => callback(state));
    },

    onQuestionChanged: (callback: (data: { patient: PatientRecord; question: Question; questionIndex: number; totalQuestions: number }) => void) => {
      ipcRenderer.on('questionnaire:question-changed', (_, data) => callback(data));
    },

    onPatientChanged: (callback: (data: { patient: PatientRecord; patientIndex: number; totalPatients: number }) => void) => {
      ipcRenderer.on('questionnaire:patient-changed', (_, data) => callback(data));
    },

    onResponseReceived: (callback: (response: ProcessedResponse) => void) => {
      ipcRenderer.on('questionnaire:response-received', (_, response) => callback(response));
    },

    onCompleted: (callback: (data: { totalResponses: number }) => void) => {
      ipcRenderer.on('questionnaire:completed', (_, data) => callback(data));
    },

    onProgressUpdated: (callback: (data: { completed: number; total: number; percentage: number }) => void) => {
      ipcRenderer.on('questionnaire:progress-updated', (_, data) => callback(data));
    },

    onError: (callback: (error: { message: string; code: string; category: string }) => void) => {
      ipcRenderer.on('questionnaire:error', (_, error) => callback(error));
    },

    // Event listener cleanup
    removeAllListeners: () => {
      const channels = [
        'questionnaire:state-changed',
        'questionnaire:question-changed',
        'questionnaire:patient-changed',
        'questionnaire:response-received',
        'questionnaire:completed',
        'questionnaire:progress-updated',
        'questionnaire:error'
      ];

      channels.forEach(channel => {
        ipcRenderer.removeAllListeners(channel);
      });
    }
  };
};

/**
 * Expose Questionnaire API to renderer process
 */
export const exposeQuestionnaireAPI = (): void => {
  try {
    contextBridge.exposeInMainWorld('questionnaire', createQuestionnaireAPI());
    console.log('Questionnaire API exposed to renderer process');
  } catch (error) {
    console.error('Failed to expose Questionnaire API:', error);
  }
};

// Type declaration for global window object
declare global {
  interface Window {
    questionnaire: QuestionnaireAPI;
  }
}