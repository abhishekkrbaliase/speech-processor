/**
 * QuestionnaireController - Manages questionnaire workflow and progression
 * Handles sequential iteration through patients and questions with state management
 */

import { EventEmitter } from 'events';
import { DataManager } from './DataManager';
import { PatientRecord, Question, ProcessedResponse, SessionState, AppError } from '../shared/types';

export interface QuestionnaireState {
  isActive: boolean;
  currentPatientIndex: number;
  currentQuestionIndex: number;
  currentPatient: PatientRecord | null;
  currentQuestion: Question | null;
  totalPatients: number;
  totalQuestions: number;
  completedResponses: number;
  isWaitingForResponse: boolean;
  lastResponse: ProcessedResponse | null;
  progressPercentage: number;
}

export interface QuestionnaireConfig {
  autoProgressOnResponse: boolean;
  autoProgressToNextPatient: boolean;
  requireConfirmation: boolean;
  saveProgressAutomatically: boolean;
  allowManualNavigation: boolean;
}

export interface QuestionnaireEvents {
  'state-changed': (state: QuestionnaireState) => void;
  'question-changed': (patient: PatientRecord, question: Question, questionIndex: number, totalQuestions: number) => void;
  'patient-changed': (patient: PatientRecord, patientIndex: number, totalPatients: number) => void;
  'response-received': (response: ProcessedResponse) => void;
  'questionnaire-completed': (totalResponses: number) => void;
  'error': (error: AppError) => void;
  'progress-updated': (completed: number, total: number, percentage: number) => void;
}

/**
 * QuestionnaireController manages the questionnaire workflow
 */
export class QuestionnaireController extends EventEmitter {
  private dataManager: DataManager;
  private config: QuestionnaireConfig;
  private state: QuestionnaireState;
  private patients: PatientRecord[] = [];
  private questions: Question[] = [];

  constructor(dataManager: DataManager, config: Partial<QuestionnaireConfig> = {}) {
    super();
    
    this.dataManager = dataManager;
    this.config = {
      autoProgressOnResponse: true,
      autoProgressToNextPatient: true,
      requireConfirmation: false,
      saveProgressAutomatically: true,
      allowManualNavigation: true,
      ...config
    };

    // Initialize state
    this.state = {
      isActive: false,
      currentPatientIndex: 0,
      currentQuestionIndex: 0,
      currentPatient: null,
      currentQuestion: null,
      totalPatients: 0,
      totalQuestions: 0,
      completedResponses: 0,
      isWaitingForResponse: false,
      lastResponse: null,
      progressPercentage: 0
    };

    console.log('QuestionnaireController initialized');
  }

  // ===== QUESTIONNAIRE LIFECYCLE =====

  /**
   * Start the questionnaire workflow
   */
  async startQuestionnaire(): Promise<void> {
    try {
      // Load patients and questions from DataManager
      this.patients = this.dataManager.getAllPatients();
      this.questions = this.dataManager.getAllQuestions();

      if (this.patients.length === 0) {
        throw new AppError('No patients loaded. Please load patient data first.', 'NO_PATIENTS', 'system');
      }

      if (this.questions.length === 0) {
        throw new AppError('No questions loaded. Please load questions first.', 'NO_QUESTIONS', 'system');
      }

      // Restore session state if available
      const sessionState = this.dataManager.getCurrentSession();
      this.state.currentPatientIndex = Math.min(sessionState.currentPatientIndex, this.patients.length - 1);
      this.state.currentQuestionIndex = Math.min(sessionState.currentQuestionIndex, this.questions.length - 1);

      // Update state
      this.state.isActive = true;
      this.state.totalPatients = this.patients.length;
      this.state.totalQuestions = this.questions.length;
      this.state.completedResponses = this.dataManager.getResponseCount();

      // Set current patient and question
      this.updateCurrentItems();
      this.updateProgress();

      console.log(`Questionnaire started: ${this.state.totalPatients} patients, ${this.state.totalQuestions} questions`);
      this.emitStateChanged();
      this.emitCurrentItems();

    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(
        `Failed to start questionnaire: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUESTIONNAIRE_START_FAILED',
        'system'
      );
      this.emit('error', appError);
      throw appError;
    }
  }

  /**
   * Stop the questionnaire workflow
   */
  async stopQuestionnaire(): Promise<void> {
    try {
      this.state.isActive = false;
      this.state.isWaitingForResponse = false;

      if (this.config.saveProgressAutomatically) {
        await this.saveProgress();
      }

      console.log('Questionnaire stopped');
      this.emitStateChanged();

    } catch (error) {
      const appError = new AppError(
        `Failed to stop questionnaire: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUESTIONNAIRE_STOP_FAILED',
        'system'
      );
      this.emit('error', appError);
      throw appError;
    }
  }

  /**
   * Pause the questionnaire workflow
   */
  pauseQuestionnaire(): void {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    this.state.isWaitingForResponse = false;
    
    // Update session state
    this.dataManager.updateSessionState({
      isPaused: true,
      currentPatientIndex: this.state.currentPatientIndex,
      currentQuestionIndex: this.state.currentQuestionIndex
    });

    console.log('Questionnaire paused');
    this.emitStateChanged();
  }

  /**
   * Resume the questionnaire workflow
   */
  resumeQuestionnaire(): void {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    // Update session state
    this.dataManager.updateSessionState({
      isPaused: false,
      currentPatientIndex: this.state.currentPatientIndex,
      currentQuestionIndex: this.state.currentQuestionIndex
    });

    console.log('Questionnaire resumed');
    this.emitStateChanged();
  }

  // ===== NAVIGATION METHODS =====

  /**
   * Move to the next question
   */
  async nextQuestion(): Promise<boolean> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    // Check if we're at the last question for current patient
    if (this.state.currentQuestionIndex >= this.questions.length - 1) {
      // Move to next patient if auto-progression is enabled
      if (this.config.autoProgressToNextPatient) {
        return await this.nextPatient();
      } else {
        console.log('Reached last question for current patient');
        return false;
      }
    }

    // Move to next question
    this.state.currentQuestionIndex++;
    this.updateCurrentItems();
    this.updateProgress();

    await this.saveProgressIfEnabled();

    console.log(`Moved to question ${this.state.currentQuestionIndex + 1}/${this.questions.length}`);
    this.emitStateChanged();
    this.emitCurrentItems();

    return true;
  }

  /**
   * Move to the previous question
   */
  async previousQuestion(): Promise<boolean> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    if (!this.config.allowManualNavigation) {
      throw new AppError('Manual navigation is disabled', 'MANUAL_NAVIGATION_DISABLED', 'system');
    }

    // Check if we're at the first question
    if (this.state.currentQuestionIndex <= 0) {
      // Move to previous patient if possible
      if (this.state.currentPatientIndex > 0) {
        this.state.currentPatientIndex--;
        this.state.currentQuestionIndex = this.questions.length - 1; // Go to last question of previous patient
        this.updateCurrentItems();
        this.updateProgress();
        
        await this.saveProgressIfEnabled();
        
        console.log(`Moved to previous patient: ${this.state.currentPatientIndex + 1}/${this.patients.length}`);
        this.emitStateChanged();
        this.emitCurrentItems();
        return true;
      } else {
        console.log('Already at first question of first patient');
        return false;
      }
    }

    // Move to previous question
    this.state.currentQuestionIndex--;
    this.updateCurrentItems();
    this.updateProgress();

    await this.saveProgressIfEnabled();

    console.log(`Moved to question ${this.state.currentQuestionIndex + 1}/${this.questions.length}`);
    this.emitStateChanged();
    this.emitCurrentItems();

    return true;
  }

  /**
   * Move to the next patient
   */
  async nextPatient(): Promise<boolean> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    // Check if we're at the last patient
    if (this.state.currentPatientIndex >= this.patients.length - 1) {
      // Questionnaire completed
      await this.completeQuestionnaire();
      return false;
    }

    // Move to next patient
    this.state.currentPatientIndex++;
    this.state.currentQuestionIndex = 0; // Reset to first question
    this.updateCurrentItems();
    this.updateProgress();

    await this.saveProgressIfEnabled();

    console.log(`Moved to patient ${this.state.currentPatientIndex + 1}/${this.patients.length}`);
    this.emitStateChanged();
    this.emitCurrentItems();

    return true;
  }

  /**
   * Move to the previous patient
   */
  async previousPatient(): Promise<boolean> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    if (!this.config.allowManualNavigation) {
      throw new AppError('Manual navigation is disabled', 'MANUAL_NAVIGATION_DISABLED', 'system');
    }

    // Check if we're at the first patient
    if (this.state.currentPatientIndex <= 0) {
      console.log('Already at first patient');
      return false;
    }

    // Move to previous patient
    this.state.currentPatientIndex--;
    this.state.currentQuestionIndex = 0; // Reset to first question
    this.updateCurrentItems();
    this.updateProgress();

    await this.saveProgressIfEnabled();

    console.log(`Moved to patient ${this.state.currentPatientIndex + 1}/${this.patients.length}`);
    this.emitStateChanged();
    this.emitCurrentItems();

    return true;
  }

  /**
   * Jump to a specific patient and question
   */
  async goToPosition(patientIndex: number, questionIndex: number): Promise<void> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    if (!this.config.allowManualNavigation) {
      throw new AppError('Manual navigation is disabled', 'MANUAL_NAVIGATION_DISABLED', 'system');
    }

    // Validate indices
    if (patientIndex < 0 || patientIndex >= this.patients.length) {
      throw new AppError(`Invalid patient index: ${patientIndex}`, 'INVALID_PATIENT_INDEX', 'system');
    }

    if (questionIndex < 0 || questionIndex >= this.questions.length) {
      throw new AppError(`Invalid question index: ${questionIndex}`, 'INVALID_QUESTION_INDEX', 'system');
    }

    // Update position
    this.state.currentPatientIndex = patientIndex;
    this.state.currentQuestionIndex = questionIndex;
    this.updateCurrentItems();
    this.updateProgress();

    await this.saveProgressIfEnabled();

    console.log(`Jumped to patient ${patientIndex + 1}/${this.patients.length}, question ${questionIndex + 1}/${this.questions.length}`);
    this.emitStateChanged();
    this.emitCurrentItems();
  }

  // ===== RESPONSE HANDLING =====

  /**
   * Submit a response for the current question
   */
  async submitResponse(response: ProcessedResponse): Promise<void> {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    if (!this.state.currentPatient || !this.state.currentQuestion) {
      throw new AppError('No current patient or question', 'NO_CURRENT_ITEMS', 'system');
    }

    try {
      // Validate response matches current context
      if (response.patientMrn !== this.state.currentPatient.mrn) {
        throw new AppError('Response patient MRN does not match current patient', 'RESPONSE_PATIENT_MISMATCH', 'system');
      }

      if (response.questionId !== this.state.currentQuestion.id) {
        throw new AppError('Response question ID does not match current question', 'RESPONSE_QUESTION_MISMATCH', 'system');
      }

      // Add response to DataManager
      this.dataManager.addResponse(response);

      // Update state
      this.state.lastResponse = response;
      this.state.isWaitingForResponse = false;
      this.state.completedResponses = this.dataManager.getResponseCount();
      this.updateProgress();

      console.log(`Response submitted for ${response.patientMrn} - ${response.questionId}: ${response.rawText}`);
      this.emit('response-received', response);
      this.emitStateChanged();

      // Auto-progress if enabled
      if (this.config.autoProgressOnResponse) {
        await this.nextQuestion();
      }

    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(
        `Failed to submit response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESPONSE_SUBMIT_FAILED',
        'system'
      );
      this.emit('error', appError);
      throw appError;
    }
  }

  /**
   * Clear the current response and restart
   */
  clearCurrentResponse(): void {
    if (!this.state.isActive) {
      throw new AppError('Questionnaire is not active', 'QUESTIONNAIRE_NOT_ACTIVE', 'system');
    }

    if (!this.state.currentPatient || !this.state.currentQuestion) {
      throw new AppError('No current patient or question', 'NO_CURRENT_ITEMS', 'system');
    }

    // Remove existing response if any
    this.dataManager.removeResponse(this.state.currentPatient.mrn, this.state.currentQuestion.id);

    // Update state
    this.state.lastResponse = null;
    this.state.isWaitingForResponse = true;
    this.state.completedResponses = this.dataManager.getResponseCount();
    this.updateProgress();

    console.log(`Cleared response for ${this.state.currentPatient.mrn} - ${this.state.currentQuestion.id}`);
    this.emitStateChanged();
  }

  /**
   * Get existing response for current question
   */
  getCurrentResponse(): ProcessedResponse | null {
    if (!this.state.currentPatient || !this.state.currentQuestion) {
      return null;
    }

    return this.dataManager.getResponse(this.state.currentPatient.mrn, this.state.currentQuestion.id);
  }

  // ===== STATE MANAGEMENT =====

  /**
   * Get current questionnaire state
   */
  getState(): QuestionnaireState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): QuestionnaireConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QuestionnaireConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('QuestionnaireController configuration updated');
  }

  /**
   * Check if questionnaire is complete
   */
  isComplete(): boolean {
    const totalQuestions = this.patients.length * this.questions.length;
    return this.state.completedResponses >= totalQuestions;
  }

  /**
   * Get completion statistics
   */
  getCompletionStats(): {
    totalQuestions: number;
    completedResponses: number;
    remainingQuestions: number;
    completionPercentage: number;
    completedPatients: number;
    currentPatientProgress: number;
  } {
    const totalQuestions = this.patients.length * this.questions.length;
    const completedPatients = Math.floor(this.state.completedResponses / this.questions.length);
    const currentPatientResponses = this.state.currentPatient ? 
      this.dataManager.getPatientResponses(this.state.currentPatient.mrn).length : 0;

    return {
      totalQuestions,
      completedResponses: this.state.completedResponses,
      remainingQuestions: totalQuestions - this.state.completedResponses,
      completionPercentage: this.state.progressPercentage,
      completedPatients,
      currentPatientProgress: Math.round((currentPatientResponses / this.questions.length) * 100)
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Update current patient and question references
   */
  private updateCurrentItems(): void {
    this.state.currentPatient = this.patients[this.state.currentPatientIndex] || null;
    this.state.currentQuestion = this.questions[this.state.currentQuestionIndex] || null;

    // Check if there's an existing response
    if (this.state.currentPatient && this.state.currentQuestion) {
      this.state.lastResponse = this.dataManager.getResponse(
        this.state.currentPatient.mrn,
        this.state.currentQuestion.id
      );
      this.state.isWaitingForResponse = !this.state.lastResponse;
    }
  }

  /**
   * Update progress calculation
   */
  private updateProgress(): void {
    const totalQuestions = this.patients.length * this.questions.length;
    this.state.completedResponses = this.dataManager.getResponseCount();
    this.state.progressPercentage = totalQuestions > 0 ? 
      Math.round((this.state.completedResponses / totalQuestions) * 100) : 0;

    this.emit('progress-updated', this.state.completedResponses, totalQuestions, this.state.progressPercentage);
  }

  /**
   * Save progress if auto-save is enabled
   */
  private async saveProgressIfEnabled(): Promise<void> {
    if (this.config.saveProgressAutomatically) {
      await this.saveProgress();
    }
  }

  /**
   * Save current progress to session state
   */
  private async saveProgress(): Promise<void> {
    try {
      this.dataManager.updateSessionState({
        currentPatientIndex: this.state.currentPatientIndex,
        currentQuestionIndex: this.state.currentQuestionIndex,
        isPaused: false
      });

      await this.dataManager.saveSessionState();
      console.log('Progress saved');
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  /**
   * Complete the questionnaire
   */
  private async completeQuestionnaire(): Promise<void> {
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;

    await this.saveProgress();

    console.log(`Questionnaire completed! Total responses: ${this.state.completedResponses}`);
    this.emit('questionnaire-completed', this.state.completedResponses);
    this.emitStateChanged();
  }

  /**
   * Emit state changed event
   */
  private emitStateChanged(): void {
    this.emit('state-changed', this.getState());
  }

  /**
   * Emit current items changed events
   */
  private emitCurrentItems(): void {
    if (this.state.currentPatient) {
      this.emit('patient-changed', 
        this.state.currentPatient, 
        this.state.currentPatientIndex, 
        this.state.totalPatients
      );
    }

    if (this.state.currentQuestion) {
      this.emit('question-changed', 
        this.state.currentPatient!, 
        this.state.currentQuestion, 
        this.state.currentQuestionIndex, 
        this.state.totalQuestions
      );
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.removeAllListeners();
    console.log('QuestionnaireController cleaned up');
  }
}