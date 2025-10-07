/**
 * DataManagerIPC - IPC handlers for DataManager communication
 * Provides secure communication between main process DataManager and renderer
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { DataManager, DataManagerConfig, DataStats, ExportOptions } from './DataManager';
import { PatientRecord, Question, ProcessedResponse, SessionState, AppError } from '../shared/types';

export class DataManagerIPC {
  private dataManager: DataManager;

  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
    this.setupIpcHandlers();
  }

  /**
   * Setup all IPC handlers for DataManager operations
   */
  private setupIpcHandlers(): void {
    // Patient data operations
    ipcMain.handle('data-manager:load-patient-data', this.handleLoadPatientData.bind(this));
    ipcMain.handle('data-manager:select-and-load-patient-data', this.handleSelectAndLoadPatientData.bind(this));
    ipcMain.handle('data-manager:get-all-patients', this.handleGetAllPatients.bind(this));
    ipcMain.handle('data-manager:get-patient', this.handleGetPatient.bind(this));
    ipcMain.handle('data-manager:set-patient', this.handleSetPatient.bind(this));
    ipcMain.handle('data-manager:remove-patient', this.handleRemovePatient.bind(this));
    ipcMain.handle('data-manager:get-patient-count', this.handleGetPatientCount.bind(this));

    // Questions operations
    ipcMain.handle('data-manager:load-questions', this.handleLoadQuestions.bind(this));
    ipcMain.handle('data-manager:select-and-load-questions', this.handleSelectAndLoadQuestions.bind(this));
    ipcMain.handle('data-manager:get-all-questions', this.handleGetAllQuestions.bind(this));
    ipcMain.handle('data-manager:get-question', this.handleGetQuestion.bind(this));
    ipcMain.handle('data-manager:set-question', this.handleSetQuestion.bind(this));
    ipcMain.handle('data-manager:remove-question', this.handleRemoveQuestion.bind(this));
    ipcMain.handle('data-manager:get-question-count', this.handleGetQuestionCount.bind(this));

    // Responses operations
    ipcMain.handle('data-manager:add-response', this.handleAddResponse.bind(this));
    ipcMain.handle('data-manager:get-response', this.handleGetResponse.bind(this));
    ipcMain.handle('data-manager:get-patient-responses', this.handleGetPatientResponses.bind(this));
    ipcMain.handle('data-manager:get-question-responses', this.handleGetQuestionResponses.bind(this));
    ipcMain.handle('data-manager:get-all-responses', this.handleGetAllResponses.bind(this));
    ipcMain.handle('data-manager:remove-response', this.handleRemoveResponse.bind(this));
    ipcMain.handle('data-manager:clear-all-responses', this.handleClearAllResponses.bind(this));
    ipcMain.handle('data-manager:get-response-count', this.handleGetResponseCount.bind(this));

    // Session state operations
    ipcMain.handle('data-manager:get-current-session', this.handleGetCurrentSession.bind(this));
    ipcMain.handle('data-manager:update-session-state', this.handleUpdateSessionState.bind(this));
    ipcMain.handle('data-manager:save-session-state', this.handleSaveSessionState.bind(this));
    ipcMain.handle('data-manager:load-session-state', this.handleLoadSessionState.bind(this));

    // Export operations
    ipcMain.handle('data-manager:export-responses', this.handleExportResponses.bind(this));

    // Statistics and utilities
    ipcMain.handle('data-manager:get-data-stats', this.handleGetDataStats.bind(this));
    ipcMain.handle('data-manager:clear-all-data', this.handleClearAllData.bind(this));
    ipcMain.handle('data-manager:get-config', this.handleGetConfig.bind(this));
    ipcMain.handle('data-manager:update-config', this.handleUpdateConfig.bind(this));

    console.log('DataManager IPC handlers registered');
  }

  // ===== PATIENT DATA HANDLERS =====

  private async handleLoadPatientData(event: IpcMainInvokeEvent, csvPath: string): Promise<PatientRecord[]> {
    try {
      return await this.dataManager.loadPatientData(csvPath);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleSelectAndLoadPatientData(event: IpcMainInvokeEvent): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { dialog, BrowserWindow } = require('electron');
      const parentWindow = BrowserWindow.fromWebContents(event.sender);
      
      const result = await dialog.showOpenDialog(parentWindow, {
        title: 'Select Patient Data CSV File',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, error: 'File selection cancelled' };
      }

      const patients = await this.dataManager.loadPatientData(result.filePaths[0]);
      return { success: true, count: patients.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async handleGetAllPatients(event: IpcMainInvokeEvent): Promise<PatientRecord[]> {
    console.log('🔄 IPC: data-manager:get-all-patients called');
    try {
      const patients = this.dataManager.getAllPatients();
      console.log(`🔄 IPC: Returning ${patients.length} patients to renderer`);
      return patients;
    } catch (error) {
      console.error('🔄 IPC: Error in handleGetAllPatients:', error);
      throw this.createIPCError(error);
    }
  }

  private async handleGetPatient(event: IpcMainInvokeEvent, mrn: string): Promise<PatientRecord | null> {
    try {
      return this.dataManager.getPatient(mrn);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleSetPatient(event: IpcMainInvokeEvent, patient: PatientRecord): Promise<void> {
    try {
      this.dataManager.setPatient(patient);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleRemovePatient(event: IpcMainInvokeEvent, mrn: string): Promise<boolean> {
    try {
      return this.dataManager.removePatient(mrn);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetPatientCount(event: IpcMainInvokeEvent): Promise<number> {
    try {
      return this.dataManager.getPatientCount();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== QUESTIONS HANDLERS =====

  private async handleLoadQuestions(event: IpcMainInvokeEvent, questionsPath: string): Promise<Question[]> {
    try {
      return await this.dataManager.loadQuestions(questionsPath);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleSelectAndLoadQuestions(event: IpcMainInvokeEvent): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { dialog, BrowserWindow } = require('electron');
      const parentWindow = BrowserWindow.fromWebContents(event.sender);
      
      const result = await dialog.showOpenDialog(parentWindow, {
        title: 'Select Questions CSV File',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, error: 'File selection cancelled' };
      }

      const questions = await this.dataManager.loadQuestions(result.filePaths[0]);
      return { success: true, count: questions.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async handleGetAllQuestions(event: IpcMainInvokeEvent): Promise<Question[]> {
    console.log('🔄 IPC: data-manager:get-all-questions called');
    try {
      const questions = this.dataManager.getAllQuestions();
      console.log(`🔄 IPC: Returning ${questions.length} questions to renderer`);
      return questions;
    } catch (error) {
      console.error('🔄 IPC: Error in handleGetAllQuestions:', error);
      throw this.createIPCError(error);
    }
  }

  private async handleGetQuestion(event: IpcMainInvokeEvent, id: string): Promise<Question | null> {
    try {
      return this.dataManager.getQuestion(id);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleSetQuestion(event: IpcMainInvokeEvent, question: Question): Promise<void> {
    try {
      this.dataManager.setQuestion(question);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleRemoveQuestion(event: IpcMainInvokeEvent, id: string): Promise<boolean> {
    try {
      return this.dataManager.removeQuestion(id);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetQuestionCount(event: IpcMainInvokeEvent): Promise<number> {
    try {
      return this.dataManager.getQuestionCount();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== RESPONSES HANDLERS =====

  private async handleAddResponse(event: IpcMainInvokeEvent, response: ProcessedResponse): Promise<void> {
    try {
      // Ensure timestamp is properly converted from JSON
      if (typeof response.timestamp === 'string') {
        response.timestamp = new Date(response.timestamp);
      }
      this.dataManager.addResponse(response);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetResponse(event: IpcMainInvokeEvent, patientMrn: string, questionId: string): Promise<ProcessedResponse | null> {
    try {
      return this.dataManager.getResponse(patientMrn, questionId);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetPatientResponses(event: IpcMainInvokeEvent, patientMrn: string): Promise<ProcessedResponse[]> {
    try {
      return this.dataManager.getPatientResponses(patientMrn);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetQuestionResponses(event: IpcMainInvokeEvent, questionId: string): Promise<ProcessedResponse[]> {
    try {
      return this.dataManager.getQuestionResponses(questionId);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetAllResponses(event: IpcMainInvokeEvent): Promise<ProcessedResponse[]> {
    try {
      return this.dataManager.getAllResponses();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleRemoveResponse(event: IpcMainInvokeEvent, patientMrn: string, questionId: string): Promise<boolean> {
    try {
      return this.dataManager.removeResponse(patientMrn, questionId);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleClearAllResponses(event: IpcMainInvokeEvent): Promise<void> {
    try {
      this.dataManager.clearAllResponses();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetResponseCount(event: IpcMainInvokeEvent): Promise<number> {
    try {
      return this.dataManager.getResponseCount();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== SESSION STATE HANDLERS =====

  private async handleGetCurrentSession(event: IpcMainInvokeEvent): Promise<SessionState> {
    try {
      return this.dataManager.getCurrentSession();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleUpdateSessionState(event: IpcMainInvokeEvent, updates: Partial<SessionState>): Promise<void> {
    try {
      // Ensure dates are properly converted from JSON
      if (updates.lastSaved && typeof updates.lastSaved === 'string') {
        updates.lastSaved = new Date(updates.lastSaved);
      }
      this.dataManager.updateSessionState(updates);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleSaveSessionState(event: IpcMainInvokeEvent): Promise<void> {
    try {
      await this.dataManager.saveSessionState();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleLoadSessionState(event: IpcMainInvokeEvent): Promise<void> {
    try {
      await this.dataManager.loadSessionState();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== EXPORT HANDLERS =====

  private async handleExportResponses(event: IpcMainInvokeEvent, options: ExportOptions): Promise<string> {
    try {
      return await this.dataManager.exportResponses(options);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== STATISTICS AND UTILITIES HANDLERS =====

  private async handleGetDataStats(event: IpcMainInvokeEvent): Promise<DataStats> {
    try {
      return this.dataManager.getDataStats();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleClearAllData(event: IpcMainInvokeEvent): Promise<void> {
    try {
      this.dataManager.clearAllData();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleGetConfig(event: IpcMainInvokeEvent): Promise<DataManagerConfig> {
    try {
      return this.dataManager.getConfig();
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  private async handleUpdateConfig(event: IpcMainInvokeEvent, updates: Partial<DataManagerConfig>): Promise<void> {
    try {
      this.dataManager.updateConfig(updates);
    } catch (error) {
      throw this.createIPCError(error);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Convert errors to IPC-safe format
   */
  private createIPCError(error: unknown): Error {
    if (error instanceof AppError) {
      // Create a plain Error object with AppError properties
      const ipcError = new Error(error.message);
      (ipcError as any).code = error.code;
      (ipcError as any).category = error.category;
      (ipcError as any).name = 'AppError';
      return ipcError;
    }
    
    if (error instanceof Error) {
      return error;
    }
    
    return new Error(String(error));
  }

  /**
   * Cleanup IPC handlers
   */
  cleanup(): void {
    // Remove all DataManager IPC handlers
    const handlers = [
      'data-manager:load-patient-data',
      'data-manager:get-all-patients',
      'data-manager:get-patient',
      'data-manager:set-patient',
      'data-manager:remove-patient',
      'data-manager:get-patient-count',
      'data-manager:load-questions',
      'data-manager:get-all-questions',
      'data-manager:get-question',
      'data-manager:set-question',
      'data-manager:remove-question',
      'data-manager:get-question-count',
      'data-manager:add-response',
      'data-manager:get-response',
      'data-manager:get-patient-responses',
      'data-manager:get-question-responses',
      'data-manager:get-all-responses',
      'data-manager:remove-response',
      'data-manager:clear-all-responses',
      'data-manager:get-response-count',
      'data-manager:get-current-session',
      'data-manager:update-session-state',
      'data-manager:save-session-state',
      'data-manager:load-session-state',
      'data-manager:export-responses',
      'data-manager:get-data-stats',
      'data-manager:clear-all-data',
      'data-manager:get-config',
      'data-manager:update-config'
    ];

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler);
    });

    console.log('DataManager IPC handlers cleaned up');
  }
}