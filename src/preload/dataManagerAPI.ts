/**
 * DataManager Preload API
 * Provides secure access to DataManager functionality from renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { PatientRecord, Question, ProcessedResponse, SessionState } from '../shared/types';
import { DataManagerConfig, DataStats, ExportOptions } from '../main/DataManager';

export interface DataManagerAPI {
  // Patient data operations
  loadPatientData: (csvPath: string) => Promise<PatientRecord[]>;
  selectAndLoadPatientData: () => Promise<{ success: boolean; count?: number; error?: string }>;
  getAllPatients: () => Promise<PatientRecord[]>;
  getPatient: (mrn: string) => Promise<PatientRecord | null>;
  setPatient: (patient: PatientRecord) => Promise<void>;
  removePatient: (mrn: string) => Promise<boolean>;
  getPatientCount: () => Promise<number>;

  // Questions operations
  loadQuestions: (questionsPath: string) => Promise<Question[]>;
  selectAndLoadQuestions: () => Promise<{ success: boolean; count?: number; error?: string }>;
  getAllQuestions: () => Promise<Question[]>;
  getQuestion: (id: string) => Promise<Question | null>;
  setQuestion: (question: Question) => Promise<void>;
  removeQuestion: (id: string) => Promise<boolean>;
  getQuestionCount: () => Promise<number>;

  // Responses operations
  addResponse: (response: ProcessedResponse) => Promise<void>;
  getResponse: (patientMrn: string, questionId: string) => Promise<ProcessedResponse | null>;
  getPatientResponses: (patientMrn: string) => Promise<ProcessedResponse[]>;
  getQuestionResponses: (questionId: string) => Promise<ProcessedResponse[]>;
  getAllResponses: () => Promise<ProcessedResponse[]>;
  removeResponse: (patientMrn: string, questionId: string) => Promise<boolean>;
  clearAllResponses: () => Promise<void>;
  getResponseCount: () => Promise<number>;

  // Session state operations
  getCurrentSession: () => Promise<SessionState>;
  updateSessionState: (updates: Partial<SessionState>) => Promise<void>;
  saveSessionState: () => Promise<void>;
  loadSessionState: () => Promise<void>;

  // Export operations
  exportResponses: (options: ExportOptions) => Promise<string>;

  // Statistics and utilities
  getDataStats: () => Promise<DataStats>;
  clearAllData: () => Promise<void>;
  getConfig: () => Promise<DataManagerConfig>;
  updateConfig: (updates: Partial<DataManagerConfig>) => Promise<void>;
}

/**
 * Create DataManager API for renderer process
 */
const createDataManagerAPI = (): DataManagerAPI => {
  return {
    // Patient data operations
    loadPatientData: (csvPath: string) => 
      ipcRenderer.invoke('data-manager:load-patient-data', csvPath),
    
    selectAndLoadPatientData: () => 
      ipcRenderer.invoke('data-manager:select-and-load-patient-data'),
    
    getAllPatients: () => 
      ipcRenderer.invoke('data-manager:get-all-patients'),
    
    getPatient: (mrn: string) => 
      ipcRenderer.invoke('data-manager:get-patient', mrn),
    
    setPatient: (patient: PatientRecord) => 
      ipcRenderer.invoke('data-manager:set-patient', patient),
    
    removePatient: (mrn: string) => 
      ipcRenderer.invoke('data-manager:remove-patient', mrn),
    
    getPatientCount: () => 
      ipcRenderer.invoke('data-manager:get-patient-count'),

    // Questions operations
    loadQuestions: (questionsPath: string) => 
      ipcRenderer.invoke('data-manager:load-questions', questionsPath),
    
    selectAndLoadQuestions: () => 
      ipcRenderer.invoke('data-manager:select-and-load-questions'),
    
    getAllQuestions: () => 
      ipcRenderer.invoke('data-manager:get-all-questions'),
    
    getQuestion: (id: string) => 
      ipcRenderer.invoke('data-manager:get-question', id),
    
    setQuestion: (question: Question) => 
      ipcRenderer.invoke('data-manager:set-question', question),
    
    removeQuestion: (id: string) => 
      ipcRenderer.invoke('data-manager:remove-question', id),
    
    getQuestionCount: () => 
      ipcRenderer.invoke('data-manager:get-question-count'),

    // Responses operations
    addResponse: (response: ProcessedResponse) => 
      ipcRenderer.invoke('data-manager:add-response', response),
    
    getResponse: (patientMrn: string, questionId: string) => 
      ipcRenderer.invoke('data-manager:get-response', patientMrn, questionId),
    
    getPatientResponses: (patientMrn: string) => 
      ipcRenderer.invoke('data-manager:get-patient-responses', patientMrn),
    
    getQuestionResponses: (questionId: string) => 
      ipcRenderer.invoke('data-manager:get-question-responses', questionId),
    
    getAllResponses: () => 
      ipcRenderer.invoke('data-manager:get-all-responses'),
    
    removeResponse: (patientMrn: string, questionId: string) => 
      ipcRenderer.invoke('data-manager:remove-response', patientMrn, questionId),
    
    clearAllResponses: () => 
      ipcRenderer.invoke('data-manager:clear-all-responses'),
    
    getResponseCount: () => 
      ipcRenderer.invoke('data-manager:get-response-count'),

    // Session state operations
    getCurrentSession: () => 
      ipcRenderer.invoke('data-manager:get-current-session'),
    
    updateSessionState: (updates: Partial<SessionState>) => 
      ipcRenderer.invoke('data-manager:update-session-state', updates),
    
    saveSessionState: () => 
      ipcRenderer.invoke('data-manager:save-session-state'),
    
    loadSessionState: () => 
      ipcRenderer.invoke('data-manager:load-session-state'),

    // Export operations
    exportResponses: (options: ExportOptions) => 
      ipcRenderer.invoke('data-manager:export-responses', options),

    // Statistics and utilities
    getDataStats: () => 
      ipcRenderer.invoke('data-manager:get-data-stats'),
    
    clearAllData: () => 
      ipcRenderer.invoke('data-manager:clear-all-data'),
    
    getConfig: () => 
      ipcRenderer.invoke('data-manager:get-config'),
    
    updateConfig: (updates: Partial<DataManagerConfig>) => 
      ipcRenderer.invoke('data-manager:update-config', updates)
  };
};

/**
 * Expose DataManager API to renderer process
 */
export const exposeDataManagerAPI = (): void => {
  try {
    contextBridge.exposeInMainWorld('dataManager', createDataManagerAPI());
    console.log('DataManager API exposed to renderer process');
  } catch (error) {
    console.error('Failed to expose DataManager API:', error);
  }
};

// Type declaration for global window object
declare global {
  interface Window {
    dataManager: DataManagerAPI;
  }
}