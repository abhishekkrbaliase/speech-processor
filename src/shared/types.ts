// Shared type definitions for the Speech Overlay App

export interface PatientRecord {
  mrn: string;
  name: string;
  additionalDetails: Record<string, any>;
}

export interface Question {
  id: string;
  text: string;
  expectedResponseType: 'yes_no' | 'date_time' | 'not_applicable' | 'any';
  order: number;
}

export interface ProcessedResponse {
  questionId: string;
  patientMrn: string;
  rawText: string;
  parsedValue: string | Date | boolean | null;
  responseType: ResponseType;
  confidence: number;
  timestamp: Date;
}

export interface SessionState {
  currentPatientIndex: number;
  currentQuestionIndex: number;
  responses: ProcessedResponse[];
  isPaused: boolean;
  lastSaved: Date;
}

export enum ResponseType {
  YES = 'yes',
  NO = 'no',
  NOT_APPLICABLE = 'not_applicable',
  DATE_TIME = 'date_time',
  UNCLEAR = 'unclear'
}

export interface OverlayPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// IPC Message Types
export interface IPCMessage<T = any> {
  type: string;
  payload: T;
}

// Live Transcription Types
export interface LiveTranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  words?: Array<{
    word: string;
    confidence: number;
    startTime: number;
    endTime: number;
  }>;
}

export interface UncertainWord {
  word: string;
  confidence: number;
  position: number;
  startTime?: number;
  endTime?: number;
  reason: 'low_confidence' | 'ambiguous' | 'short_word' | 'filler_word';
  severity: 'low' | 'medium' | 'high';
}

export interface ConfidenceAnalysis {
  overallConfidence: number;
  uncertainWords: UncertainWord[];
  recommendedAction: 'accept' | 'confirm' | 'retry';
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  qualityScore: number;
  riskFactors: string[];
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'file' | 'ai' | 'audio' | 'system'
  ) {
    super(message);
    this.name = 'AppError';
  }
}