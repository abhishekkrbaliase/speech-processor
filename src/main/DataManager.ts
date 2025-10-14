/**
 * DataManager - Centralized data handling for the Speech Overlay App
 * Manages in-memory storage with CRUD operations for patients, questions, and responses
 */

import { EventEmitter } from 'events';
import { PatientRecord, Question, ProcessedResponse, SessionState, ResponseType, AppError } from '../shared/types';
import { CSVParser } from './CSVParser';
import { QuestionsParser } from './QuestionsParser';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DataManagerConfig {
  maxPatients: number;
  maxQuestions: number;
  maxResponses: number;
  sessionFilePath?: string;
}

export interface DataStats {
  patientsCount: number;
  questionsCount: number;
  responsesCount: number;
  completedPatientsCount: number;
  totalQuestionsAnswered: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

export interface ExportOptions {
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeRawText: boolean;
  format: 'csv' | 'json';
  filePath?: string;
}

/**
 * DataManager class for centralized data handling
 */
export class DataManager extends EventEmitter {
  private patients: Map<string, PatientRecord> = new Map();
  private questions: Map<string, Question> = new Map();
  private responses: Map<string, ProcessedResponse> = new Map();
  private sessionState: SessionState;
  private config: DataManagerConfig;

  constructor(config: Partial<DataManagerConfig> = {}) {
    super();
    
    this.config = {
      maxPatients: 10000,
      maxQuestions: 1000,
      maxResponses: 100000,
      sessionFilePath: path.join(process.cwd(), 'session.json'),
      ...config
    };



    // Initialize session state
    this.sessionState = {
      currentPatientIndex: 0,
      currentQuestionIndex: 0,
      responses: [],
      isPaused: false,
      lastSaved: new Date()
    };
  }

  // ===== PATIENT DATA MANAGEMENT =====

  /**
   * Load patient data from CSV file
   */
  async loadPatientData(csvPath: string): Promise<PatientRecord[]> {
    try {
      const patients = await CSVParser.parseCSVFile(csvPath);
      
      if (patients.length > this.config.maxPatients) {
        throw new AppError(
          `Too many patients: ${patients.length}. Maximum allowed: ${this.config.maxPatients}`,
          'PATIENTS_LIMIT_EXCEEDED',
          'file'
        );
      }

      // Clear existing patients and load new ones
      this.patients.clear();
      patients.forEach(patient => {
        this.patients.set(patient.mrn, patient);
      });

      console.log(`Loaded ${patients.length} patients from ${csvPath}`);
      return patients;
    } catch (error) {
      throw new AppError(
        `Failed to load patient data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PATIENT_LOAD_FAILED',
        'file'
      );
    }
  }

  /**
   * Get all patients
   */
  getAllPatients(): PatientRecord[] {
    const patients = Array.from(this.patients.values()).sort((a, b) => a.mrn.localeCompare(b.mrn));
    console.log(`🏥 DataManager.getAllPatients() returning ${patients.length} patients`);
    if (patients.length > 0) {
      console.log(`   First patient: MRN=${patients[0].mrn}, Name=${patients[0].name}`);
    }
    return patients;
  }

  /**
   * Get patient by MRN
   */
  getPatient(mrn: string): PatientRecord | null {
    return this.patients.get(mrn) || null;
  }

  /**
   * Add or update patient
   */
  setPatient(patient: PatientRecord): void {
    this.validatePatient(patient);
    this.patients.set(patient.mrn, patient);
  }

  /**
   * Remove patient
   */
  removePatient(mrn: string): boolean {
    return this.patients.delete(mrn);
  }

  /**
   * Get patient count
   */
  getPatientCount(): number {
    return this.patients.size;
  }

  // ===== QUESTIONS MANAGEMENT =====

  /**
   * Load questions from file
   */
  async loadQuestions(questionsPath: string): Promise<Question[]> {
    try {
      const questions = await QuestionsParser.parseQuestionsFile(questionsPath);
      
      if (questions.length > this.config.maxQuestions) {
        throw new AppError(
          `Too many questions: ${questions.length}. Maximum allowed: ${this.config.maxQuestions}`,
          'QUESTIONS_LIMIT_EXCEEDED',
          'file'
        );
      }

      // Clear existing questions and load new ones
      this.questions.clear();
      questions.forEach(question => {
        this.questions.set(question.id, question);
      });

      console.log(`Loaded ${questions.length} questions from ${questionsPath}`);
      
      // Emit event for CSV context manager integration
      this.emit('questions-loaded', questions);
      
      return questions;
    } catch (error) {
      throw new AppError(
        `Failed to load questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUESTIONS_LOAD_FAILED',
        'file'
      );
    }
  }

  /**
   * Get all questions sorted by order
   */
  getAllQuestions(): Question[] {
    const questions = Array.from(this.questions.values()).sort((a, b) => a.order - b.order);
    console.log(`❓ DataManager.getAllQuestions() returning ${questions.length} questions`);
    if (questions.length > 0) {
      console.log(`   First question: ID=${questions[0].id}, Text="${questions[0].text}"`);
    }
    return questions;
  }

  /**
   * Get question by ID
   */
  getQuestion(id: string): Question | null {
    return this.questions.get(id) || null;
  }

  /**
   * Add or update question
   */
  setQuestion(question: Question): void {
    this.validateQuestion(question);
    this.questions.set(question.id, question);
  }

  /**
   * Remove question
   */
  removeQuestion(id: string): boolean {
    return this.questions.delete(id);
  }

  /**
   * Get question count
   */
  getQuestionCount(): number {
    return this.questions.size;
  }

  // ===== RESPONSES MANAGEMENT =====

  /**
   * Add response
   */
  addResponse(response: ProcessedResponse): void {
    this.validateResponse(response);
    
    if (this.responses.size >= this.config.maxResponses) {
      throw new AppError(
        `Maximum responses limit reached: ${this.config.maxResponses}`,
        'RESPONSES_LIMIT_EXCEEDED',
        'system'
      );
    }

    const responseKey = `${response.patientMrn}_${response.questionId}`;
    this.responses.set(responseKey, response);
    
    // Update session state
    this.sessionState.responses = Array.from(this.responses.values());
    this.sessionState.lastSaved = new Date();
  }

  /**
   * Get response by patient MRN and question ID
   */
  getResponse(patientMrn: string, questionId: string): ProcessedResponse | null {
    const responseKey = `${patientMrn}_${questionId}`;
    return this.responses.get(responseKey) || null;
  }

  /**
   * Get all responses for a patient
   */
  getPatientResponses(patientMrn: string): ProcessedResponse[] {
    return Array.from(this.responses.values())
      .filter(response => response.patientMrn === patientMrn)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all responses for a question
   */
  getQuestionResponses(questionId: string): ProcessedResponse[] {
    return Array.from(this.responses.values())
      .filter(response => response.questionId === questionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all responses
   */
  getAllResponses(): ProcessedResponse[] {
    return Array.from(this.responses.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Remove response
   */
  removeResponse(patientMrn: string, questionId: string): boolean {
    const responseKey = `${patientMrn}_${questionId}`;
    const deleted = this.responses.delete(responseKey);
    
    if (deleted) {
      this.sessionState.responses = Array.from(this.responses.values());
      this.sessionState.lastSaved = new Date();
    }
    
    return deleted;
  }

  /**
   * Clear all responses
   */
  clearAllResponses(): void {
    this.responses.clear();
    this.sessionState.responses = [];
    this.sessionState.lastSaved = new Date();
  }

  /**
   * Get response count
   */
  getResponseCount(): number {
    return this.responses.size;
  }

  // ===== SESSION STATE MANAGEMENT =====

  /**
   * Get current session state
   */
  getCurrentSession(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Update session state
   */
  updateSessionState(updates: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...updates,
      lastSaved: new Date()
    };
  }

  /**
   * Save session state to file
   */
  async saveSessionState(): Promise<void> {
    if (!this.config.sessionFilePath) {
      throw new AppError('Session file path not configured', 'SESSION_PATH_MISSING', 'system');
    }

    try {
      const sessionData = {
        ...this.sessionState,
        responses: Array.from(this.responses.values())
      };

      await fs.writeFile(
        this.config.sessionFilePath,
        JSON.stringify(sessionData, null, 2),
        'utf8'
      );

      console.log(`Session state saved to ${this.config.sessionFilePath}`);
    } catch (error) {
      throw new AppError(
        `Failed to save session state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SESSION_SAVE_FAILED',
        'file'
      );
    }
  }

  /**
   * Load session state from file
   */
  async loadSessionState(): Promise<void> {
    if (!this.config.sessionFilePath) {
      throw new AppError('Session file path not configured', 'SESSION_PATH_MISSING', 'system');
    }

    try {
      const sessionData = await fs.readFile(this.config.sessionFilePath, 'utf8');
      const parsed = JSON.parse(sessionData);

      // Validate and restore session state
      this.sessionState = {
        currentPatientIndex: parsed.currentPatientIndex || 0,
        currentQuestionIndex: parsed.currentQuestionIndex || 0,
        responses: [],
        isPaused: parsed.isPaused || false,
        lastSaved: new Date(parsed.lastSaved || Date.now())
      };

      // Restore responses
      if (parsed.responses && Array.isArray(parsed.responses)) {
        this.responses.clear();
        parsed.responses.forEach((response: any) => {
          try {
            const processedResponse: ProcessedResponse = {
              questionId: response.questionId,
              patientMrn: response.patientMrn,
              rawText: response.rawText,
              parsedValue: response.parsedValue,
              responseType: response.responseType,
              confidence: response.confidence,
              timestamp: new Date(response.timestamp)
            };
            
            const responseKey = `${processedResponse.patientMrn}_${processedResponse.questionId}`;
            this.responses.set(responseKey, processedResponse);
          } catch (error) {
            console.warn('Failed to restore response:', error);
          }
        });
      }

      this.sessionState.responses = Array.from(this.responses.values());
      console.log(`Session state loaded from ${this.config.sessionFilePath}`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('No existing session file found, starting with fresh state');
        return;
      }
      
      throw new AppError(
        `Failed to load session state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SESSION_LOAD_FAILED',
        'file'
      );
    }
  }

  // ===== DATA EXPORT =====

  /**
   * Export responses to CSV format
   */
  async exportResponses(options: ExportOptions): Promise<string> {
    const responses = this.getAllResponses();
    
    if (responses.length === 0) {
      throw new AppError('No responses to export', 'NO_DATA_TO_EXPORT', 'system');
    }

    try {
      if (options.format === 'csv') {
        return await this.exportToCSV(responses, options);
      } else {
        return await this.exportToJSON(responses, options);
      }
    } catch (error) {
      throw new AppError(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXPORT_FAILED',
        'file'
      );
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(responses: ProcessedResponse[], options: ExportOptions): Promise<string> {
    const headers = ['MRN', 'Patient Name', 'Question ID', 'Question Text', 'Response'];
    
    if (options.includeRawText) headers.push('Raw Text');
    if (options.includeConfidence) headers.push('Confidence');
    if (options.includeTimestamps) headers.push('Timestamp');

    const rows = [headers.join(',')];

    for (const response of responses) {
      const patient = this.getPatient(response.patientMrn);
      const question = this.getQuestion(response.questionId);
      
      const row = [
        this.escapeCsvValue(response.patientMrn),
        this.escapeCsvValue(patient?.name || 'Unknown'),
        this.escapeCsvValue(response.questionId),
        this.escapeCsvValue(question?.text || 'Unknown'),
        this.escapeCsvValue(this.formatResponseValue(response))
      ];

      if (options.includeRawText) row.push(this.escapeCsvValue(response.rawText));
      if (options.includeConfidence) row.push(response.confidence.toString());
      if (options.includeTimestamps) row.push(response.timestamp.toISOString());

      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');
    
    if (options.filePath) {
      await fs.writeFile(options.filePath, csvContent, 'utf8');
      return options.filePath;
    }
    
    return csvContent;
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(responses: ProcessedResponse[], options: ExportOptions): Promise<string> {
    const exportData = responses.map(response => {
      const patient = this.getPatient(response.patientMrn);
      const question = this.getQuestion(response.questionId);
      
      const data: any = {
        mrn: response.patientMrn,
        patientName: patient?.name || 'Unknown',
        questionId: response.questionId,
        questionText: question?.text || 'Unknown',
        response: this.formatResponseValue(response),
        responseType: response.responseType
      };

      if (options.includeRawText) data.rawText = response.rawText;
      if (options.includeConfidence) data.confidence = response.confidence;
      if (options.includeTimestamps) data.timestamp = response.timestamp.toISOString();

      return data;
    });

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    if (options.filePath) {
      await fs.writeFile(options.filePath, jsonContent, 'utf8');
      return options.filePath;
    }
    
    return jsonContent;
  }

  // ===== STATISTICS AND ANALYTICS =====

  /**
   * Get data statistics
   */
  getDataStats(): DataStats {
    const responses = this.getAllResponses();
    const patients = this.getAllPatients();
    const questions = this.getAllQuestions();

    // Calculate completed patients (patients with responses to all questions)
    const completedPatientsCount = patients.filter(patient => {
      const patientResponses = this.getPatientResponses(patient.mrn);
      return patientResponses.length === questions.length;
    }).length;

    // Calculate average response time (if we have timestamps)
    let averageResponseTime = 0;
    if (responses.length > 1) {
      const sortedResponses = responses.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const totalTime = sortedResponses[sortedResponses.length - 1].timestamp.getTime() - 
                       sortedResponses[0].timestamp.getTime();
      averageResponseTime = totalTime / responses.length;
    }

    return {
      patientsCount: patients.length,
      questionsCount: questions.length,
      responsesCount: responses.length,
      completedPatientsCount,
      totalQuestionsAnswered: responses.length,
      averageResponseTime,
      lastUpdated: new Date()
    };
  }

  // ===== VALIDATION METHODS =====

  /**
   * Validate patient record
   */
  private validatePatient(patient: PatientRecord): void {
    if (!patient.mrn || typeof patient.mrn !== 'string' || patient.mrn.trim().length === 0) {
      throw new AppError('Patient MRN is required and must be a non-empty string', 'INVALID_PATIENT_MRN', 'system');
    }

    if (!patient.name || typeof patient.name !== 'string' || patient.name.trim().length === 0) {
      throw new AppError('Patient name is required and must be a non-empty string', 'INVALID_PATIENT_NAME', 'system');
    }

    if (patient.additionalDetails && typeof patient.additionalDetails !== 'object') {
      throw new AppError('Patient additional details must be an object', 'INVALID_PATIENT_DETAILS', 'system');
    }
  }

  /**
   * Validate question
   */
  private validateQuestion(question: Question): void {
    if (!question.id || typeof question.id !== 'string' || question.id.trim().length === 0) {
      throw new AppError('Question ID is required and must be a non-empty string', 'INVALID_QUESTION_ID', 'system');
    }

    if (!question.text || typeof question.text !== 'string' || question.text.trim().length === 0) {
      throw new AppError('Question text is required and must be a non-empty string', 'INVALID_QUESTION_TEXT', 'system');
    }

    const validResponseTypes = ['yes_no', 'date_time', 'not_applicable', 'any'];
    if (!validResponseTypes.includes(question.expectedResponseType)) {
      throw new AppError(
        `Invalid question response type: ${question.expectedResponseType}. Must be one of: ${validResponseTypes.join(', ')}`,
        'INVALID_QUESTION_TYPE',
        'system'
      );
    }

    if (typeof question.order !== 'number' || question.order < 1) {
      throw new AppError('Question order must be a positive number', 'INVALID_QUESTION_ORDER', 'system');
    }
  }

  /**
   * Validate response
   */
  private validateResponse(response: ProcessedResponse): void {
    if (!response.questionId || typeof response.questionId !== 'string') {
      throw new AppError('Response question ID is required and must be a string', 'INVALID_RESPONSE_QUESTION_ID', 'system');
    }

    if (!response.patientMrn || typeof response.patientMrn !== 'string') {
      throw new AppError('Response patient MRN is required and must be a string', 'INVALID_RESPONSE_PATIENT_MRN', 'system');
    }

    if (!response.rawText || typeof response.rawText !== 'string') {
      throw new AppError('Response raw text is required and must be a string', 'INVALID_RESPONSE_RAW_TEXT', 'system');
    }

    const validResponseTypes = Object.values(ResponseType);
    if (!validResponseTypes.includes(response.responseType)) {
      throw new AppError(
        `Invalid response type: ${response.responseType}. Must be one of: ${validResponseTypes.join(', ')}`,
        'INVALID_RESPONSE_TYPE',
        'system'
      );
    }

    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
      throw new AppError('Response confidence must be a number between 0 and 1', 'INVALID_RESPONSE_CONFIDENCE', 'system');
    }

    if (!(response.timestamp instanceof Date)) {
      throw new AppError('Response timestamp must be a Date object', 'INVALID_RESPONSE_TIMESTAMP', 'system');
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Format response value for display/export
   */
  private formatResponseValue(response: ProcessedResponse): string {
    if (response.parsedValue === null || response.parsedValue === undefined) {
      return response.rawText;
    }

    if (response.responseType === ResponseType.DATE_TIME && response.parsedValue instanceof Date) {
      return response.parsedValue.toISOString();
    }

    if (typeof response.parsedValue === 'boolean') {
      return response.parsedValue ? 'Yes' : 'No';
    }

    return String(response.parsedValue);
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.patients.clear();
    this.questions.clear();
    this.responses.clear();
    this.sessionState = {
      currentPatientIndex: 0,
      currentQuestionIndex: 0,
      responses: [],
      isPaused: false,
      lastSaved: new Date()
    };
  }

  /**
   * Get configuration
   */
  getConfig(): DataManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DataManagerConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}