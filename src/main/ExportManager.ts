/**
 * ExportManager - Enhanced export functionality with file dialogs and UI integration
 * Provides comprehensive data export capabilities with user-friendly file selection
 */

import { dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DataManager, ExportOptions } from './DataManager';
import { AppError } from '../shared/types';

export interface ExportSettings {
  format: 'csv' | 'json';
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeRawText: boolean;
  includePatientDetails: boolean;
  includeQuestionDetails: boolean;
  sortBy: 'timestamp' | 'patient' | 'question';
  filterByDateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filterByPatients?: string[]; // MRNs
  filterByQuestions?: string[]; // Question IDs
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  recordCount?: number;
  fileSize?: number;
  error?: string;
}

export interface ExportStatistics {
  totalResponses: number;
  exportedResponses: number;
  uniquePatients: number;
  uniqueQuestions: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
  averageConfidence: number;
  responseTypeDistribution: Record<string, number>;
}

/**
 * ExportManager provides enhanced export functionality
 */
export class ExportManager {
  private dataManager: DataManager;

  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
  }

  /**
   * Export responses with file dialog for location selection
   */
  async exportWithDialog(
    parentWindow: BrowserWindow | null,
    settings: ExportSettings
  ): Promise<ExportResult> {
    try {
      // Validate that there's data to export
      const responses = this.dataManager.getAllResponses();
      if (responses.length === 0) {
        return {
          success: false,
          error: 'No responses available to export'
        };
      }

      // Generate default filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFilename = `questionnaire-responses-${timestamp}.${settings.format}`;

      // Show save dialog
      const dialogOptions = {
        title: 'Export Questionnaire Responses',
        defaultPath: defaultFilename,
        filters: [
          {
            name: settings.format.toUpperCase() + ' Files',
            extensions: [settings.format]
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ],
        properties: ['createDirectory' as const]
      };

      const result = parentWindow 
        ? await dialog.showSaveDialog(parentWindow, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions);

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: 'Export cancelled by user'
        };
      }

      // Perform the export
      return await this.exportToFile(result.filePath, settings);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Export responses to a specific file path
   */
  async exportToFile(filePath: string, settings: ExportSettings): Promise<ExportResult> {
    try {
      // Get and filter responses
      const responses = this.getFilteredResponses(settings);
      
      if (responses.length === 0) {
        return {
          success: false,
          error: 'No responses match the specified filters'
        };
      }

      // Sort responses
      const sortedResponses = this.sortResponses(responses, settings.sortBy);

      // Create export options for DataManager
      const exportOptions: ExportOptions = {
        format: settings.format,
        includeTimestamps: settings.includeTimestamps,
        includeConfidence: settings.includeConfidence,
        includeRawText: settings.includeRawText,
        filePath: filePath
      };

      // Export the filtered and sorted responses
      let content: string;
      if (settings.format === 'csv') {
        content = await this.generateCSVContent(sortedResponses, exportOptions);
      } else {
        content = await this.generateJSONContent(sortedResponses, exportOptions);
      }

      // Write to file
      await fs.writeFile(filePath, content, 'utf8');

      // Get file statistics
      const stats = await fs.stat(filePath);

      console.log(`Export completed: ${responses.length} responses exported to ${filePath}`);

      return {
        success: true,
        filePath: filePath,
        recordCount: responses.length,
        fileSize: stats.size
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      console.error('Export failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Export responses and return content without saving to file
   */
  async exportToString(settings: ExportSettings): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      // Get and filter responses
      const responses = this.getFilteredResponses(settings);
      
      if (responses.length === 0) {
        return {
          success: false,
          error: 'No responses match the specified filters'
        };
      }

      // Sort responses
      const sortedResponses = this.sortResponses(responses, settings.sortBy);

      // Create export options for DataManager (without file path)
      const exportOptions: ExportOptions = {
        format: settings.format,
        includeTimestamps: settings.includeTimestamps,
        includeConfidence: settings.includeConfidence,
        includeRawText: settings.includeRawText
      };

      // Generate content for the filtered and sorted responses
      let content: string;
      if (settings.format === 'csv') {
        content = await this.generateCSVContent(sortedResponses, exportOptions);
      } else {
        content = await this.generateJSONContent(sortedResponses, exportOptions);
      }

      return {
        success: true,
        content: content
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Get export statistics for the current data
   */
  getExportStatistics(settings?: ExportSettings): ExportStatistics {
    const allResponses = this.dataManager.getAllResponses();
    const responses = settings ? this.getFilteredResponses(settings) : allResponses;

    // Calculate statistics
    const uniquePatients = new Set(responses.map(r => r.patientMrn)).size;
    const uniqueQuestions = new Set(responses.map(r => r.questionId)).size;

    const timestamps = responses.map(r => r.timestamp).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      earliest: timestamps.length > 0 ? timestamps[0] : null,
      latest: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null
    };

    const averageConfidence = responses.length > 0 
      ? responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length 
      : 0;

    const responseTypeDistribution: Record<string, number> = {};
    responses.forEach(response => {
      responseTypeDistribution[response.responseType] = 
        (responseTypeDistribution[response.responseType] || 0) + 1;
    });

    return {
      totalResponses: allResponses.length,
      exportedResponses: responses.length,
      uniquePatients,
      uniqueQuestions,
      dateRange,
      averageConfidence,
      responseTypeDistribution
    };
  }

  /**
   * Validate export settings
   */
  validateExportSettings(settings: ExportSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate format
    if (!['csv', 'json'].includes(settings.format)) {
      errors.push('Invalid export format. Must be "csv" or "json".');
    }

    // Validate sort option
    if (!['timestamp', 'patient', 'question'].includes(settings.sortBy)) {
      errors.push('Invalid sort option. Must be "timestamp", "patient", or "question".');
    }

    // Validate date range
    if (settings.filterByDateRange) {
      const { startDate, endDate } = settings.filterByDateRange;
      if (startDate >= endDate) {
        errors.push('Start date must be before end date.');
      }
    }

    // Validate patient filters
    if (settings.filterByPatients && settings.filterByPatients.length > 0) {
      const allPatients = this.dataManager.getAllPatients();
      const validMrns = new Set(allPatients.map(p => p.mrn));
      const invalidMrns = settings.filterByPatients.filter(mrn => !validMrns.has(mrn));
      if (invalidMrns.length > 0) {
        errors.push(`Invalid patient MRNs: ${invalidMrns.join(', ')}`);
      }
    }

    // Validate question filters
    if (settings.filterByQuestions && settings.filterByQuestions.length > 0) {
      const allQuestions = this.dataManager.getAllQuestions();
      const validIds = new Set(allQuestions.map(q => q.id));
      const invalidIds = settings.filterByQuestions.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid question IDs: ${invalidIds.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available export formats with descriptions
   */
  getAvailableFormats(): Array<{ format: string; name: string; description: string; extension: string }> {
    return [
      {
        format: 'csv',
        name: 'CSV (Comma Separated Values)',
        description: 'Spreadsheet-compatible format, ideal for analysis in Excel or similar tools',
        extension: 'csv'
      },
      {
        format: 'json',
        name: 'JSON (JavaScript Object Notation)',
        description: 'Structured data format, ideal for programmatic processing and APIs',
        extension: 'json'
      }
    ];
  }

  /**
   * Generate export preview (first few rows)
   */
  async generatePreview(settings: ExportSettings, maxRows: number = 5): Promise<{ success: boolean; preview?: string; error?: string }> {
    try {
      const responses = this.getFilteredResponses(settings).slice(0, maxRows);
      
      if (responses.length === 0) {
        return {
          success: false,
          error: 'No data available for preview'
        };
      }

      // Create temporary export options
      const exportOptions: ExportOptions = {
        format: settings.format,
        includeTimestamps: settings.includeTimestamps,
        includeConfidence: settings.includeConfidence,
        includeRawText: settings.includeRawText
      };

      // Generate preview content
      let previewContent: string;
      if (settings.format === 'csv') {
        previewContent = await this.generateCSVPreview(responses, exportOptions);
      } else {
        previewContent = await this.generateJSONPreview(responses, exportOptions);
      }

      return {
        success: true,
        preview: previewContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview generation failed'
      };
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Get filtered responses based on settings
   */
  private getFilteredResponses(settings: ExportSettings) {
    let responses = this.dataManager.getAllResponses();

    // Filter by date range
    if (settings.filterByDateRange) {
      const { startDate, endDate } = settings.filterByDateRange;
      responses = responses.filter(r => 
        r.timestamp >= startDate && r.timestamp <= endDate
      );
    }

    // Filter by patients
    if (settings.filterByPatients && settings.filterByPatients.length > 0) {
      const patientSet = new Set(settings.filterByPatients);
      responses = responses.filter(r => patientSet.has(r.patientMrn));
    }

    // Filter by questions
    if (settings.filterByQuestions && settings.filterByQuestions.length > 0) {
      const questionSet = new Set(settings.filterByQuestions);
      responses = responses.filter(r => questionSet.has(r.questionId));
    }

    return responses;
  }

  /**
   * Sort responses based on criteria
   */
  private sortResponses(responses: any[], sortBy: string) {
    switch (sortBy) {
      case 'timestamp':
        return responses.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      case 'patient':
        return responses.sort((a, b) => a.patientMrn.localeCompare(b.patientMrn));
      case 'question':
        return responses.sort((a, b) => a.questionId.localeCompare(b.questionId));
      default:
        return responses;
    }
  }

  /**
   * Generate CSV content for responses
   */
  private async generateCSVContent(responses: any[], options: ExportOptions): Promise<string> {
    const headers = ['MRN', 'Patient Name', 'Question ID', 'Question Text', 'Response'];
    
    if (options.includeRawText) headers.push('Raw Text');
    if (options.includeConfidence) headers.push('Confidence');
    if (options.includeTimestamps) headers.push('Timestamp');

    const rows = [headers.join(',')];

    for (const response of responses) {
      const patient = this.dataManager.getPatient(response.patientMrn);
      const question = this.dataManager.getQuestion(response.questionId);
      
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

    return rows.join('\n');
  }

  /**
   * Generate JSON content for responses
   */
  private async generateJSONContent(responses: any[], options: ExportOptions): Promise<string> {
    const exportData = responses.map(response => {
      const patient = this.dataManager.getPatient(response.patientMrn);
      const question = this.dataManager.getQuestion(response.questionId);
      
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

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate CSV preview
   */
  private async generateCSVPreview(responses: any[], options: ExportOptions): Promise<string> {
    return await this.generateCSVContent(responses, options);
  }

  /**
   * Generate JSON preview
   */
  private async generateJSONPreview(responses: any[], options: ExportOptions): Promise<string> {
    return await this.generateJSONContent(responses, options);
  }

  /**
   * Format response value for display/export
   */
  private formatResponseValue(response: any): string {
    if (response.parsedValue === null || response.parsedValue === undefined) {
      return response.rawText;
    }

    if (response.responseType === 'date_time' && response.parsedValue instanceof Date) {
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
}