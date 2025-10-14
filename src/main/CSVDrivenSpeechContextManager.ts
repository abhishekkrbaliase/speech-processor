/**
 * CSV-Driven Speech Context Manager
 * Dynamically manages speech contexts based on CSV question data
 * Implements Requirements 4.1, 4.2, 4.4 for enhanced accuracy
 */

import { Question } from '../shared/types';
import { ContextAwareSpeechManager, ExtendedResponseType, CSVQuestionContext, ContextAwareSpeechContexts } from './ContextAwareSpeechManager';
import { GoogleSpeechStreamingManager } from './GoogleSpeechStreamingManager';
import { logger } from '../shared/logger';

export interface CSVContextConfig {
  questionId: string;
  expectedResponseType: ExtendedResponseType;
  customPhrases?: string[];
  customBoost?: number;
  priority?: number; // For ordering contexts
}

export interface ContextSwitchingMetrics {
  totalSwitches: number;
  switchesByType: Record<ExtendedResponseType, number>;
  lastSwitchTime: Date;
  averageSwitchLatency: number;
  contextCacheHits: number;
  contextCacheMisses: number;
}

/**
 * Manages dynamic speech context switching based on CSV question data
 */
export class CSVDrivenSpeechContextManager {
  private questionContexts: Map<string, CSVContextConfig> = new Map();
  private contextCache: Map<ExtendedResponseType, ContextAwareSpeechContexts> = new Map();
  private currentQuestionId: string | null = null;
  private currentResponseType: ExtendedResponseType | null = null;
  private speechManager: GoogleSpeechStreamingManager | null = null;
  private metrics: ContextSwitchingMetrics;

  constructor() {
    this.metrics = {
      totalSwitches: 0,
      switchesByType: {} as Record<ExtendedResponseType, number>,
      lastSwitchTime: new Date(),
      averageSwitchLatency: 0,
      contextCacheHits: 0,
      contextCacheMisses: 0
    };

    logger.info('🎯 CSV-Driven Speech Context Manager initialized', {}, 'CSV-CONTEXT');
    console.log('🎯 CSV-Driven Speech Context Manager initialized');
  }

  /**
   * Initialize with questions from CSV/JSON data
   */
  initializeFromQuestions(questions: Question[]): void {
    logger.info('📋 Initializing contexts from questions', { 
      questionCount: questions.length 
    }, 'CSV-CONTEXT');
    
    console.log(`📋 Initializing contexts from ${questions.length} questions`);

    // Clear existing contexts
    this.questionContexts.clear();
    this.contextCache.clear();

    // Process each question
    questions.forEach((question, index) => {
      const config: CSVContextConfig = {
        questionId: question.id,
        expectedResponseType: this.mapResponseType(question.expectedResponseType),
        priority: question.order || index + 1
      };

      this.questionContexts.set(question.id, config);

      // Update metrics
      const responseType = config.expectedResponseType;
      if (!this.metrics.switchesByType[responseType]) {
        this.metrics.switchesByType[responseType] = 0;
      }
    });

    // Pre-generate contexts for common types to improve performance
    this.preGenerateCommonContexts();

    logger.info('✅ Context initialization complete', {
      totalQuestions: questions.length,
      uniqueTypes: Object.keys(this.metrics.switchesByType).length,
      cachedContexts: this.contextCache.size
    }, 'CSV-CONTEXT');

    console.log(`✅ Context initialization complete: ${questions.length} questions, ${Object.keys(this.metrics.switchesByType).length} unique types`);
  }

  /**
   * Set the Google Speech Streaming Manager for context updates
   */
  setSpeechManager(speechManager: GoogleSpeechStreamingManager): void {
    this.speechManager = speechManager;
    logger.info('🔗 Speech manager connected to CSV context manager', {}, 'CSV-CONTEXT');
    console.log('🔗 Speech manager connected to CSV context manager');
  }

  /**
   * Switch contexts when question changes
   */
  async switchContextForQuestion(questionId: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Switching context for question', { 
        questionId,
        previousQuestion: this.currentQuestionId 
      }, 'CSV-CONTEXT');

      console.log(`🔄 Switching context for question: ${questionId}`);

      // Get question context configuration
      const contextConfig = this.questionContexts.get(questionId);
      if (!contextConfig) {
        logger.warn('⚠️ No context configuration found for question', { questionId }, 'CSV-CONTEXT');
        console.warn(`⚠️ No context configuration found for question: ${questionId}`);
        return false;
      }

      // Check if context actually needs to change
      if (this.currentQuestionId === questionId && this.currentResponseType === contextConfig.expectedResponseType) {
        logger.info('ℹ️ Context already set for this question type', { 
          questionId, 
          responseType: contextConfig.expectedResponseType 
        }, 'CSV-CONTEXT');
        console.log(`ℹ️ Context already set for question ${questionId} (${contextConfig.expectedResponseType})`);
        return true;
      }

      // Generate or retrieve contexts
      const contexts = await this.getContextsForType(contextConfig.expectedResponseType, contextConfig.customPhrases, contextConfig.customBoost);

      // Update speech manager if available
      if (this.speechManager) {
        // Use the existing updateSpeechContextsForQuestion method
        // Map extended types back to basic types for compatibility
        const basicType = this.mapToBasicResponseType(contextConfig.expectedResponseType);
        this.speechManager.updateSpeechContextsForQuestion(basicType);

        logger.info('🎯 Speech contexts updated', {
          questionId,
          responseType: contextConfig.expectedResponseType,
          basicType,
          contextGroups: contexts.speechContexts.length,
          totalPhrases: contexts.speechContexts.reduce((sum, ctx) => sum + ctx.phrases.length, 0)
        }, 'CSV-CONTEXT');

        console.log(`🎯 Speech contexts updated for ${questionId}: ${contextConfig.expectedResponseType} -> ${basicType}`);
      } else {
        logger.warn('⚠️ No speech manager available for context update', { questionId }, 'CSV-CONTEXT');
        console.warn('⚠️ No speech manager available for context update');
      }

      // Update current state
      this.currentQuestionId = questionId;
      this.currentResponseType = contextConfig.expectedResponseType;

      // Update metrics
      this.updateMetrics(contextConfig.expectedResponseType, Date.now() - startTime);

      logger.info('✅ Context switch completed', {
        questionId,
        responseType: contextConfig.expectedResponseType,
        latency: Date.now() - startTime
      }, 'CSV-CONTEXT');

      console.log(`✅ Context switch completed for ${questionId} in ${Date.now() - startTime}ms`);
      return true;

    } catch (error) {
      logger.error('❌ Context switch failed', {
        questionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      }, 'CSV-CONTEXT');

      console.error(`❌ Context switch failed for ${questionId}:`, error);
      return false;
    }
  }

  /**
   * Add custom context configuration for a specific question
   */
  addCustomContextForQuestion(questionId: string, customPhrases: string[], customBoost?: number): void {
    const existingConfig = this.questionContexts.get(questionId);
    if (existingConfig) {
      existingConfig.customPhrases = customPhrases;
      existingConfig.customBoost = customBoost;

      // Clear cache for this type to force regeneration
      this.contextCache.delete(existingConfig.expectedResponseType);

      logger.info('🎨 Custom context added for question', {
        questionId,
        customPhrasesCount: customPhrases.length,
        customBoost
      }, 'CSV-CONTEXT');

      console.log(`🎨 Custom context added for question ${questionId}: ${customPhrases.length} phrases, boost: ${customBoost}`);
    } else {
      logger.warn('⚠️ Cannot add custom context for unknown question', { questionId }, 'CSV-CONTEXT');
      console.warn(`⚠️ Cannot add custom context for unknown question: ${questionId}`);
    }
  }

  /**
   * Get current context information
   */
  getCurrentContextInfo(): {
    questionId: string | null;
    responseType: ExtendedResponseType | null;
    contextSummary: string | null;
  } {
    if (!this.currentQuestionId || !this.currentResponseType) {
      return {
        questionId: null,
        responseType: null,
        contextSummary: null
      };
    }

    const config = this.questionContexts.get(this.currentQuestionId);
    const contextSummary = config ? 
      ContextAwareSpeechManager.getExtendedContextSummary(
        config.expectedResponseType, 
        config.customPhrases, 
        config.customBoost
      ) : null;

    return {
      questionId: this.currentQuestionId,
      responseType: this.currentResponseType,
      contextSummary
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): ContextSwitchingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalSwitches: 0,
      switchesByType: {} as Record<ExtendedResponseType, number>,
      lastSwitchTime: new Date(),
      averageSwitchLatency: 0,
      contextCacheHits: 0,
      contextCacheMisses: 0
    };

    logger.info('📊 Context switching metrics reset', {}, 'CSV-CONTEXT');
    console.log('📊 Context switching metrics reset');
  }

  // ===== PRIVATE METHODS =====

  /**
   * Map response type to extended response type (handles both basic and extended types)
   */
  private mapResponseType(responseType: 'yes_no' | 'date_time' | 'not_applicable' | 'any' | 'numeric' | 'text' | 'multiple_choice'): ExtendedResponseType {
    // Direct mapping - all types are now supported
    return responseType as ExtendedResponseType;
  }

  /**
   * Map extended response type back to basic type for compatibility
   */
  private mapToBasicResponseType(extendedType: ExtendedResponseType): 'yes_no' | 'date_time' | 'not_applicable' | 'any' {
    switch (extendedType) {
      case 'yes_no':
      case 'date_time':
      case 'not_applicable':
      case 'any':
        return extendedType;
      case 'numeric':
        return 'any'; // Numeric responses are treated as open-ended
      case 'text':
        return 'any'; // Text responses are treated as open-ended
      case 'multiple_choice':
        return 'any'; // Multiple choice can be treated as open-ended
      default:
        return 'any';
    }
  }

  /**
   * Get or generate contexts for a specific response type
   */
  private async getContextsForType(
    responseType: ExtendedResponseType, 
    customPhrases?: string[], 
    customBoost?: number
  ): Promise<ContextAwareSpeechContexts> {
    // Check cache first
    const cacheKey = `${responseType}_${customPhrases?.length || 0}_${customBoost || 0}`;
    
    if (this.contextCache.has(responseType) && !customPhrases && !customBoost) {
      this.metrics.contextCacheHits++;
      return this.contextCache.get(responseType)!;
    }

    this.metrics.contextCacheMisses++;

    // Generate new contexts
    const contexts = ContextAwareSpeechManager.generateContextsForExtendedType(
      responseType, 
      customPhrases, 
      customBoost
    );

    // Cache if no custom parameters
    if (!customPhrases && !customBoost) {
      this.contextCache.set(responseType, contexts);
    }

    return contexts;
  }

  /**
   * Pre-generate contexts for common response types
   */
  private preGenerateCommonContexts(): void {
    const commonTypes: ExtendedResponseType[] = ['yes_no', 'date_time', 'not_applicable', 'any'];
    
    commonTypes.forEach(type => {
      const contexts = ContextAwareSpeechManager.generateContextsForExtendedType(type);
      this.contextCache.set(type, contexts);
    });

    logger.info('🚀 Pre-generated common contexts', { 
      types: commonTypes,
      cacheSize: this.contextCache.size 
    }, 'CSV-CONTEXT');

    console.log(`🚀 Pre-generated contexts for ${commonTypes.length} common types`);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseType: ExtendedResponseType, latency: number): void {
    this.metrics.totalSwitches++;
    this.metrics.switchesByType[responseType] = (this.metrics.switchesByType[responseType] || 0) + 1;
    this.metrics.lastSwitchTime = new Date();

    // Update average latency
    const totalLatency = this.metrics.averageSwitchLatency * (this.metrics.totalSwitches - 1) + latency;
    this.metrics.averageSwitchLatency = totalLatency / this.metrics.totalSwitches;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.questionContexts.clear();
    this.contextCache.clear();
    this.speechManager = null;
    this.currentQuestionId = null;
    this.currentResponseType = null;

    logger.info('🧹 CSV-Driven Speech Context Manager cleaned up', {}, 'CSV-CONTEXT');
    console.log('🧹 CSV-Driven Speech Context Manager cleaned up');
  }
}