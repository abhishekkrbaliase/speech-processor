/**
 * QuestionnaireControllerIPC - IPC handlers for QuestionnaireController communication
 * Provides secure communication between main process QuestionnaireController and renderer
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { QuestionnaireController, QuestionnaireState, QuestionnaireConfig } from './QuestionnaireController';
import { ProcessedResponse, PatientRecord, Question, AppError } from '../shared/types';

export class QuestionnaireControllerIPC {
  private controller: QuestionnaireController;

  constructor(controller: QuestionnaireController) {
    this.controller = controller;
    this.setupIpcHandlers();
    this.setupEventForwarding();
  }

  /**
   * Setup all IPC handlers for QuestionnaireController operations
   */
  private setupIpcHandlers(): void {
    // Lifecycle operations
    ipcMain.handle('questionnaire:start', this.handleStartQuestionnaire.bind(this));
    ipcMain.handle('questionnaire:stop', this.handleStopQuestionnaire.bind(this));
    ipcMain.handle('questionnaire:pause', this.handlePauseQuestionnaire.bind(this));
    ipcMain.handle('questionnaire:resume', this.handleResumeQuestionnaire.bind(this));

    // Navigation operations
    ipcMain.handle('questionnaire:next-question', this.handleNextQuestion.bind(this));
    ipcMain.handle('questionnaire:previous-question', this.handlePreviousQuestion.bind(this));
    ipcMain.handle('questionnaire:next-patient', this.handleNextPatient.bind(this));
    ipcMain.handle('questionnaire:previous-patient', this.handlePreviousPatient.bind(this));
    ipcMain.handle('questionnaire:go-to-position', this.handleGoToPosition.bind(this));

    // Response operations
    ipcMain.handle('questionnaire:submit-response', this.handleSubmitResponse.bind(this));
    ipcMain.handle('questionnaire:clear-response', this.handleClearResponse.bind(this));
    ipcMain.handle('questionnaire:get-current-response', this.handleGetCurrentResponse.bind(this));

    // State and configuration operations
    ipcMain.handle('questionnaire:get-state', this.handleGetState.bind(this));
    ipcMain.handle('questionnaire:get-config', this.handleGetConfig.bind(this));
    ipcMain.handle('questionnaire:update-config', this.handleUpdateConfig.bind(this));
    ipcMain.handle('questionnaire:is-complete', this.handleIsComplete.bind(this));
    ipcMain.handle('questionnaire:get-completion-stats', this.handleGetCompletionStats.bind(this));

    console.log('QuestionnaireController IPC handlers registered');
  }

  /**
   * Setup event forwarding from controller to renderer processes
   */
  private setupEventForwarding(): void {
    // Forward state changes to all renderer windows
    this.controller.on('state-changed', (state: QuestionnaireState) => {
      this.broadcastToRenderers('questionnaire:state-changed', state);
    });

    // Forward question changes to all renderer windows
    this.controller.on('question-changed', (patient: PatientRecord, question: Question, questionIndex: number, totalQuestions: number) => {
      this.broadcastToRenderers('questionnaire:question-changed', {
        patient,
        question,
        questionIndex,
        totalQuestions
      });
    });

    // Forward patient changes to all renderer windows
    this.controller.on('patient-changed', (patient: PatientRecord, patientIndex: number, totalPatients: number) => {
      this.broadcastToRenderers('questionnaire:patient-changed', {
        patient,
        patientIndex,
        totalPatients
      });
    });

    // Forward response events to all renderer windows
    this.controller.on('response-received', (response: ProcessedResponse) => {
      this.broadcastToRenderers('questionnaire:response-received', response);
    });

    // Forward completion events to all renderer windows
    this.controller.on('questionnaire-completed', (totalResponses: number) => {
      this.broadcastToRenderers('questionnaire:completed', { totalResponses });
    });

    // Forward progress updates to all renderer windows
    this.controller.on('progress-updated', (completed: number, total: number, percentage: number) => {
      this.broadcastToRenderers('questionnaire:progress-updated', {
        completed,
        total,
        percentage
      });
    });

    // Forward errors to all renderer windows
    this.controller.on('error', (error: AppError) => {
      this.broadcastToRenderers('questionnaire:error', {
        message: error.message,
        code: error.code,
        category: error.category
      });
    });

    console.log('QuestionnaireController event forwarding setup complete');
  }

  // ===== LIFECYCLE HANDLERS =====

  private async handleStartQuestionnaire(event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
    try {
      await this.controller.startQuestionnaire();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleStopQuestionnaire(event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
    try {
      await this.controller.stopQuestionnaire();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handlePauseQuestionnaire(event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
    try {
      this.controller.pauseQuestionnaire();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleResumeQuestionnaire(event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
    try {
      this.controller.resumeQuestionnaire();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== NAVIGATION HANDLERS =====

  private async handleNextQuestion(event: IpcMainInvokeEvent): Promise<{ success: boolean; hasNext: boolean; error?: string }> {
    try {
      const hasNext = await this.controller.nextQuestion();
      return { success: true, hasNext };
    } catch (error) {
      return {
        success: false,
        hasNext: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handlePreviousQuestion(event: IpcMainInvokeEvent): Promise<{ success: boolean; hasPrevious: boolean; error?: string }> {
    try {
      const hasPrevious = await this.controller.previousQuestion();
      return { success: true, hasPrevious };
    } catch (error) {
      return {
        success: false,
        hasPrevious: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleNextPatient(event: IpcMainInvokeEvent): Promise<{ success: boolean; hasNext: boolean; error?: string }> {
    try {
      const hasNext = await this.controller.nextPatient();
      return { success: true, hasNext };
    } catch (error) {
      return {
        success: false,
        hasNext: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handlePreviousPatient(event: IpcMainInvokeEvent): Promise<{ success: boolean; hasPrevious: boolean; error?: string }> {
    try {
      const hasPrevious = await this.controller.previousPatient();
      return { success: true, hasPrevious };
    } catch (error) {
      return {
        success: false,
        hasPrevious: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGoToPosition(event: IpcMainInvokeEvent, patientIndex: number, questionIndex: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.controller.goToPosition(patientIndex, questionIndex);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== RESPONSE HANDLERS =====

  private async handleSubmitResponse(event: IpcMainInvokeEvent, response: ProcessedResponse): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure timestamp is properly converted from JSON
      if (typeof response.timestamp === 'string') {
        response.timestamp = new Date(response.timestamp);
      }
      
      await this.controller.submitResponse(response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleClearResponse(event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
    try {
      this.controller.clearCurrentResponse();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetCurrentResponse(event: IpcMainInvokeEvent): Promise<{ success: boolean; response?: ProcessedResponse | null; error?: string }> {
    try {
      const response = this.controller.getCurrentResponse();
      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== STATE AND CONFIGURATION HANDLERS =====

  private async handleGetState(event: IpcMainInvokeEvent): Promise<{ success: boolean; state?: QuestionnaireState; error?: string }> {
    try {
      const state = this.controller.getState();
      return { success: true, state };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetConfig(event: IpcMainInvokeEvent): Promise<{ success: boolean; config?: QuestionnaireConfig; error?: string }> {
    try {
      const config = this.controller.getConfig();
      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleUpdateConfig(event: IpcMainInvokeEvent, updates: Partial<QuestionnaireConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      this.controller.updateConfig(updates);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleIsComplete(event: IpcMainInvokeEvent): Promise<{ success: boolean; isComplete?: boolean; error?: string }> {
    try {
      const isComplete = this.controller.isComplete();
      return { success: true, isComplete };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetCompletionStats(event: IpcMainInvokeEvent): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const stats = this.controller.getCompletionStats();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Broadcast event to all renderer windows
   */
  private broadcastToRenderers(channel: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  /**
   * Cleanup IPC handlers
   */
  cleanup(): void {
    // Remove all QuestionnaireController IPC handlers
    const handlers = [
      'questionnaire:start',
      'questionnaire:stop',
      'questionnaire:pause',
      'questionnaire:resume',
      'questionnaire:next-question',
      'questionnaire:previous-question',
      'questionnaire:next-patient',
      'questionnaire:previous-patient',
      'questionnaire:go-to-position',
      'questionnaire:submit-response',
      'questionnaire:clear-response',
      'questionnaire:get-current-response',
      'questionnaire:get-state',
      'questionnaire:get-config',
      'questionnaire:update-config',
      'questionnaire:is-complete',
      'questionnaire:get-completion-stats'
    ];

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler);
    });

    console.log('QuestionnaireController IPC handlers cleaned up');
  }
}