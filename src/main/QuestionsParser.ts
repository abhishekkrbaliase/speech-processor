import * as fs from 'fs';
import * as path from 'path';
import { Question, AppError } from '../shared/types';

/**
 * JSON parser for questions with validation and error handling
 * Handles question format validation, type checking, and ordering
 */
export class QuestionsParser {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private static readonly MAX_QUESTIONS = 1000; // Maximum number of questions
  private static readonly VALID_RESPONSE_TYPES = ['yes_no', 'date_time', 'not_applicable', 'any'];

  /**
   * Parse questions file (JSON or CSV) and return validated questions
   * @param filePath - Path to the JSON or CSV file
   * @returns Promise<Question[]> - Array of validated questions
   * @throws AppError - If file is invalid or parsing fails
   */
  static async parseQuestionsFile(filePath: string): Promise<Question[]> {
    try {
      // Validate file exists and is accessible
      await this.validateFile(filePath);

      // Read file content
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      
      // Determine file type and parse accordingly
      const fileExtension = path.extname(filePath).toLowerCase();
      let rawQuestions: any[];
      
      if (fileExtension === '.csv') {
        rawQuestions = this.parseCSVContent(fileContent);
      } else {
        rawQuestions = this.parseJSONContent(fileContent);
      }
      
      // Validate and process questions
      const validatedQuestions = this.validateQuestions(rawQuestions);
      
      console.log(`Successfully parsed ${validatedQuestions.length} questions from ${path.basename(filePath)}`);
      
      // Log first few questions for debugging
      if (validatedQuestions.length > 0) {
        console.log('❓ First 3 questions:');
        validatedQuestions.slice(0, 3).forEach((question, index) => {
          console.log(`  ${index + 1}. ID: ${question.id}, Text: "${question.text}"`);
        });
      }
      
      return validatedQuestions;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Failed to parse questions file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUESTIONS_PARSE_ERROR',
        'file'
      );
    }
  }

  /**
   * Validate file exists, is readable, and meets size requirements
   * @param filePath - Path to validate
   * @throws AppError - If file validation fails
   */
  private static async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath);
      
      if (!stats.isFile()) {
        throw new AppError(
          'Selected path is not a file',
          'INVALID_FILE_TYPE',
          'file'
        );
      }
      
      if (stats.size === 0) {
        throw new AppError(
          'Questions file is empty',
          'EMPTY_FILE',
          'file'
        );
      }
      
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new AppError(
          `Questions file is too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE',
          'file'
        );
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.json' && ext !== '.csv') {
        throw new AppError(
          `Invalid file extension '${ext}'. Expected '.json' or '.csv'`,
          'INVALID_FILE_EXTENSION',
          'file'
        );
      }
      
      // Test read access
      await fs.promises.access(filePath, fs.constants.R_OK);
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError(
          'Questions file not found',
          'FILE_NOT_FOUND',
          'file'
        );
      }
      
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new AppError(
          'Permission denied. Cannot read questions file',
          'FILE_ACCESS_DENIED',
          'file'
        );
      }
      
      throw new AppError(
        `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_VALIDATION_ERROR',
        'file'
      );
    }
  }

  /**
   * Parse JSON content and validate basic structure
   * @param content - JSON file content as string
   * @returns Array of raw question objects
   * @throws AppError - If JSON format is invalid
   */
  private static parseJSONContent(content: string): any[] {
    let parsedContent: any;
    
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      throw new AppError(
        `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`,
        'INVALID_JSON',
        'file'
      );
    }
    
    if (!Array.isArray(parsedContent)) {
      throw new AppError(
        'Questions file must contain an array of question objects',
        'INVALID_JSON_STRUCTURE',
        'file'
      );
    }
    
    if (parsedContent.length === 0) {
      throw new AppError(
        'Questions file contains no questions',
        'NO_QUESTIONS',
        'file'
      );
    }
    
    if (parsedContent.length > this.MAX_QUESTIONS) {
      throw new AppError(
        `Too many questions (${parsedContent.length}). Maximum allowed is ${this.MAX_QUESTIONS}`,
        'TOO_MANY_QUESTIONS',
        'file'
      );
    }
    
    return parsedContent;
  }

  /**
   * Parse CSV content and convert to question objects
   * @param content - CSV file content as string
   * @returns Array of raw question objects
   * @throws AppError - If CSV format is invalid
   */
  private static parseCSVContent(content: string): any[] {
    try {
      const lines = content.trim().split('\n');
      
      if (lines.length < 2) {
        throw new AppError(
          'CSV file must contain at least a header row and one data row',
          'INVALID_CSV_STRUCTURE',
          'file'
        );
      }

      // Parse header
      const header = lines[0].split(',').map(col => col.trim());
      const expectedColumns = ['QuestionID', 'QuestionText', 'ExpectedResponseType', 'Order'];
      
      // Validate header columns
      for (const expectedCol of expectedColumns) {
        if (!header.includes(expectedCol)) {
          throw new AppError(
            `Missing required column: ${expectedCol}. Expected columns: ${expectedColumns.join(', ')}`,
            'INVALID_CSV_HEADER',
            'file'
          );
        }
      }

      // Parse data rows
      const questions: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = this.parseCSVLine(line);
        if (values.length !== header.length) {
          throw new AppError(
            `Row ${i + 1} has ${values.length} columns, expected ${header.length}`,
            'INVALID_CSV_ROW',
            'file'
          );
        }

        // Create question object
        const question: any = {};
        header.forEach((col, index) => {
          const value = values[index];
          
          switch (col) {
            case 'QuestionID':
              question.id = value;
              break;
            case 'QuestionText':
              question.text = value;
              break;
            case 'ExpectedResponseType':
              question.expectedResponseType = value;
              break;
            case 'Order':
              question.order = parseInt(value, 10);
              if (isNaN(question.order)) {
                throw new AppError(
                  `Invalid order value "${value}" in row ${i + 1}. Must be a number.`,
                  'INVALID_ORDER_VALUE',
                  'file'
                );
              }
              break;
          }
        });

        questions.push(question);
      }

      if (questions.length === 0) {
        throw new AppError(
          'CSV file contains no valid question data',
          'NO_QUESTIONS',
          'file'
        );
      }

      if (questions.length > this.MAX_QUESTIONS) {
        throw new AppError(
          `Too many questions (${questions.length}). Maximum allowed is ${this.MAX_QUESTIONS}`,
          'TOO_MANY_QUESTIONS',
          'file'
        );
      }

      return questions;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Failed to parse CSV content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CSV_PARSE_ERROR',
        'file'
      );
    }
  }

  /**
   * Parse a single CSV line, handling quoted values
   * @param line - CSV line to parse
   * @returns Array of column values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  }

  /**
   * Validate and convert raw questions to Question objects
   * @param rawQuestions - Array of raw question objects
   * @returns Array of validated Question objects
   * @throws AppError - If validation fails
   */
  private static validateQuestions(rawQuestions: any[]): Question[] {
    const validatedQuestions: Question[] = [];
    const errors: string[] = [];
    const seenIds = new Set<string>();
    const seenOrders = new Set<number>();
    
    for (let i = 0; i < rawQuestions.length; i++) {
      const rawQuestion = rawQuestions[i];
      const questionIndex = i + 1;
      
      try {
        const question = this.validateSingleQuestion(rawQuestion, questionIndex);
        
        // Check for duplicate IDs
        if (seenIds.has(question.id)) {
          errors.push(`Question ${questionIndex}: Duplicate question ID '${question.id}'`);
          continue;
        }
        
        // Check for duplicate orders
        if (seenOrders.has(question.order)) {
          errors.push(`Question ${questionIndex}: Duplicate order number ${question.order}`);
          continue;
        }
        
        seenIds.add(question.id);
        seenOrders.add(question.order);
        validatedQuestions.push(question);
        
      } catch (error) {
        errors.push(`Question ${questionIndex}: ${error instanceof Error ? error.message : 'Validation error'}`);
      }
    }
    
    if (errors.length > 0) {
      const errorMessage = `Question validation errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`;
      
      if (validatedQuestions.length === 0) {
        throw new AppError(errorMessage, 'ALL_QUESTIONS_INVALID', 'file');
      } else {
        console.warn(errorMessage);
        console.warn(`Proceeding with ${validatedQuestions.length} valid questions out of ${rawQuestions.length} total questions`);
      }
    }
    
    // Sort questions by order
    validatedQuestions.sort((a, b) => a.order - b.order);
    
    // Only validate order sequence if we have questions and no validation errors
    if (validatedQuestions.length > 0 && errors.length === 0) {
      this.validateOrderSequence(validatedQuestions);
    }
    
    return validatedQuestions;
  }

  /**
   * Validate a single question object
   * @param rawQuestion - Raw question object
   * @param questionIndex - Question index for error reporting
   * @returns Validated Question object
   * @throws Error - If validation fails
   */
  private static validateSingleQuestion(rawQuestion: any, questionIndex: number): Question {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      throw new Error('Question must be an object');
    }
    
    // Validate ID
    const id = rawQuestion.id;
    if (!id || typeof id !== 'string') {
      throw new Error('Question ID is required and must be a string');
    }
    
    if (id.trim().length === 0) {
      throw new Error('Question ID cannot be empty');
    }
    
    if (id.length > 100) {
      throw new Error(`Question ID is too long (${id.length} characters). Maximum length is 100`);
    }
    
    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
      throw new Error('Question ID can only contain letters, numbers, hyphens, and underscores');
    }
    
    // Validate text
    const text = rawQuestion.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Question text is required and must be a string');
    }
    
    if (text.trim().length === 0) {
      throw new Error('Question text cannot be empty');
    }
    
    if (text.length > 1000) {
      throw new Error(`Question text is too long (${text.length} characters). Maximum length is 1000`);
    }
    
    // Validate expectedResponseType
    const expectedResponseType = rawQuestion.expectedResponseType;
    if (!expectedResponseType || typeof expectedResponseType !== 'string') {
      throw new Error('expectedResponseType is required and must be a string');
    }
    
    if (!this.VALID_RESPONSE_TYPES.includes(expectedResponseType)) {
      throw new Error(`Invalid expectedResponseType '${expectedResponseType}'. Valid types are: ${this.VALID_RESPONSE_TYPES.join(', ')}`);
    }
    
    // Validate order
    const order = rawQuestion.order;
    if (order === undefined || order === null) {
      throw new Error('Question order is required');
    }
    
    if (typeof order !== 'number' || !Number.isInteger(order)) {
      throw new Error('Question order must be an integer');
    }
    
    if (order < 1) {
      throw new Error('Question order must be a positive integer (starting from 1)');
    }
    
    if (order > 10000) {
      throw new Error('Question order is too large. Maximum order is 10000');
    }
    
    // Check for additional properties (warn but don't fail)
    const allowedProperties = ['id', 'text', 'expectedResponseType', 'order'];
    const extraProperties = Object.keys(rawQuestion).filter(key => !allowedProperties.includes(key));
    if (extraProperties.length > 0) {
      console.warn(`Question ${questionIndex} (${id}): Ignoring extra properties: ${extraProperties.join(', ')}`);
    }
    
    return {
      id: id.trim(),
      text: text.trim(),
      expectedResponseType: expectedResponseType as 'yes_no' | 'date_time' | 'not_applicable' | 'any',
      order
    };
  }

  /**
   * Validate that question orders form a proper sequence
   * @param questions - Array of validated questions (sorted by order)
   * @throws AppError - If order sequence is invalid
   */
  private static validateOrderSequence(questions: Question[]): void {
    if (questions.length === 0) return;
    
    const orders = questions.map(q => q.order);
    const minOrder = Math.min(...orders);
    const maxOrder = Math.max(...orders);
    
    // Check if orders start from 1
    if (minOrder !== 1) {
      throw new AppError(
        `Question orders must start from 1, but the lowest order found is ${minOrder}`,
        'INVALID_ORDER_SEQUENCE',
        'file'
      );
    }
    
    // Check for gaps in sequence
    const expectedOrders = Array.from({ length: maxOrder }, (_, i) => i + 1);
    const missingOrders = expectedOrders.filter(order => !orders.includes(order));
    
    if (missingOrders.length > 0) {
      throw new AppError(
        `Missing question orders: ${missingOrders.join(', ')}. Question orders must be consecutive starting from 1`,
        'MISSING_ORDER_NUMBERS',
        'file'
      );
    }
  }

  /**
   * Get questions file statistics
   * @param filePath - Path to questions file
   * @returns Promise<object> - File statistics
   */
  static async getQuestionsStats(filePath: string): Promise<{
    fileSize: number;
    estimatedQuestions: number;
    lastModified: Date;
  }> {
    try {
      const stats = await fs.promises.stat(filePath);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      let estimatedQuestions = 0;
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          estimatedQuestions = parsed.length;
        }
      } catch (error) {
        // If JSON is invalid, we can't estimate questions
        estimatedQuestions = 0;
      }
      
      return {
        fileSize: stats.size,
        estimatedQuestions,
        lastModified: stats.mtime
      };
    } catch (error) {
      throw new AppError(
        `Failed to get questions statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUESTIONS_STATS_ERROR',
        'file'
      );
    }
  }

  /**
   * Validate questions file format without full parsing (quick check)
   * @param filePath - Path to questions file
   * @returns Promise<object> - Validation result
   */
  static async quickValidateQuestions(filePath: string): Promise<{
    isValid: boolean;
    isValidJSON: boolean;
    isArray: boolean;
    estimatedQuestions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      await this.validateFile(filePath);
      
      // Read and parse JSON
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      let parsedContent: any;
      let isValidJSON = false;
      let isArray = false;
      let estimatedQuestions = 0;
      
      try {
        parsedContent = JSON.parse(content);
        isValidJSON = true;
        
        if (Array.isArray(parsedContent)) {
          isArray = true;
          estimatedQuestions = parsedContent.length;
          
          if (estimatedQuestions === 0) {
            errors.push('Questions array is empty');
          } else if (estimatedQuestions > this.MAX_QUESTIONS) {
            errors.push(`Too many questions (${estimatedQuestions}). Maximum allowed is ${this.MAX_QUESTIONS}`);
          } else {
            // Quick validation of first few questions
            const samplesToCheck = Math.min(3, estimatedQuestions);
            for (let i = 0; i < samplesToCheck; i++) {
              const question = parsedContent[i];
              if (!question || typeof question !== 'object') {
                errors.push(`Question ${i + 1} is not a valid object`);
                continue;
              }
              
              if (!question.id || typeof question.id !== 'string') {
                errors.push(`Question ${i + 1} missing or invalid ID`);
              }
              
              if (!question.text || typeof question.text !== 'string') {
                errors.push(`Question ${i + 1} missing or invalid text`);
              }
              
              if (!question.expectedResponseType || !this.VALID_RESPONSE_TYPES.includes(question.expectedResponseType)) {
                errors.push(`Question ${i + 1} missing or invalid expectedResponseType`);
              }
              
              if (typeof question.order !== 'number') {
                errors.push(`Question ${i + 1} missing or invalid order`);
              }
            }
          }
        } else {
          errors.push('File content must be an array of questions');
        }
      } catch (jsonError) {
        errors.push(`Invalid JSON format: ${jsonError instanceof Error ? jsonError.message : 'Parse error'}`);
      }
      
      return {
        isValid: errors.length === 0,
        isValidJSON,
        isArray,
        estimatedQuestions,
        errors
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        errors.push(error.message);
      } else {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
      
      return {
        isValid: false,
        isValidJSON: false,
        isArray: false,
        estimatedQuestions: 0,
        errors
      };
    }
  }

  /**
   * Create a sample questions file for testing/demo purposes
   * @param filePath - Path where to create the sample file
   * @returns Promise<void>
   */
  static async createSampleQuestionsFile(filePath: string): Promise<void> {
    const sampleQuestions: Question[] = [
      {
        id: 'q1',
        text: 'Do you have any known allergies?',
        expectedResponseType: 'yes_no',
        order: 1
      },
      {
        id: 'q2',
        text: 'When was your last medical appointment?',
        expectedResponseType: 'date_time',
        order: 2
      },
      {
        id: 'q3',
        text: 'Are you currently taking any medications?',
        expectedResponseType: 'yes_no',
        order: 3
      },
      {
        id: 'q4',
        text: 'Do you have a family history of heart disease?',
        expectedResponseType: 'yes_no',
        order: 4
      },
      {
        id: 'q5',
        text: 'When did you first notice the symptoms?',
        expectedResponseType: 'date_time',
        order: 5
      },
      {
        id: 'q6',
        text: 'Have you had any surgeries in the past year?',
        expectedResponseType: 'yes_no',
        order: 6
      },
      {
        id: 'q7',
        text: 'Do you smoke or use tobacco products?',
        expectedResponseType: 'yes_no',
        order: 7
      },
      {
        id: 'q8',
        text: 'Is there anything else you would like to mention?',
        expectedResponseType: 'any',
        order: 8
      }
    ];
    
    const jsonContent = JSON.stringify(sampleQuestions, null, 2);
    await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
  }

  /**
   * Validate question response type compatibility
   * @param questions - Array of questions to validate
   * @returns Object with compatibility analysis
   */
  static analyzeQuestionTypes(questions: Question[]): {
    typeDistribution: Record<string, number>;
    totalQuestions: number;
    hasComplexTypes: boolean;
    recommendations: string[];
  } {
    const typeDistribution: Record<string, number> = {};
    const recommendations: string[] = [];
    
    questions.forEach(question => {
      typeDistribution[question.expectedResponseType] = (typeDistribution[question.expectedResponseType] || 0) + 1;
    });
    
    const hasComplexTypes = questions.some(q => q.expectedResponseType === 'date_time' || q.expectedResponseType === 'any');
    
    // Generate recommendations
    if (typeDistribution.date_time > 0) {
      recommendations.push(`${typeDistribution.date_time} questions expect date/time responses. Ensure speech recognition is configured for date parsing.`);
    }
    
    if (typeDistribution.any > 0) {
      recommendations.push(`${typeDistribution.any} questions accept any response type. These may require manual review.`);
    }
    
    if (typeDistribution.yes_no > questions.length * 0.8) {
      recommendations.push('Most questions are yes/no type. Consider adding variety with date/time or open-ended questions.');
    }
    
    return {
      typeDistribution,
      totalQuestions: questions.length,
      hasComplexTypes,
      recommendations
    };
  }
}