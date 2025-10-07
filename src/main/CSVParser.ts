import * as fs from 'fs';
import * as path from 'path';
import { PatientRecord, AppError } from '../shared/types';

/**
 * CSV Parser for patient data with validation and error handling
 * Handles MRN, name, and additional details parsing from CSV files
 */
export class CSVParser {
  private static readonly REQUIRED_COLUMNS = ['mrn', 'name'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
  private static readonly MAX_RECORDS = 10000; // Maximum number of records

  /**
   * Parse CSV file and return validated patient records
   * @param filePath - Path to the CSV file
   * @returns Promise<PatientRecord[]> - Array of validated patient records
   * @throws AppError - If file is invalid or parsing fails
   */
  static async parseCSVFile(filePath: string): Promise<PatientRecord[]> {
    try {
      // Validate file exists and is accessible
      await this.validateFile(filePath);

      // Read file content
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      
      // Parse CSV content
      const records = this.parseCSVContent(fileContent);
      
      // Validate records
      const validatedRecords = this.validateRecords(records);
      
      console.log(`Successfully parsed ${validatedRecords.length} patient records from ${path.basename(filePath)}`);
      
      // Log first few patient records for debugging
      if (validatedRecords.length > 0) {
        console.log('📋 First 3 patient records:');
        validatedRecords.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. MRN: ${record.mrn}, Name: ${record.name}, Details: ${JSON.stringify(record.additionalDetails)}`);
        });
      }
      
      return validatedRecords;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CSV_PARSE_ERROR',
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
          'CSV file is empty',
          'EMPTY_FILE',
          'file'
        );
      }
      
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new AppError(
          `CSV file is too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE',
          'file'
        );
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.csv') {
        throw new AppError(
          `Invalid file extension '${ext}'. Expected '.csv'`,
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
          'CSV file not found',
          'FILE_NOT_FOUND',
          'file'
        );
      }
      
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new AppError(
          'Permission denied. Cannot read CSV file',
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
   * Parse CSV content into raw records
   * @param content - CSV file content as string
   * @returns Array of raw record objects
   * @throws AppError - If CSV format is invalid
   */
  private static parseCSVContent(content: string): Record<string, string>[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      throw new AppError(
        'CSV file contains no data',
        'NO_DATA',
        'file'
      );
    }
    
    if (lines.length === 1) {
      throw new AppError(
        'CSV file contains only headers, no data rows',
        'NO_DATA_ROWS',
        'file'
      );
    }
    
    if (lines.length > this.MAX_RECORDS + 1) { // +1 for header
      throw new AppError(
        `CSV file contains too many records (${lines.length - 1}). Maximum allowed is ${this.MAX_RECORDS}`,
        'TOO_MANY_RECORDS',
        'file'
      );
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = this.parseCSVRow(headerLine);
    
    if (headers.length === 0) {
      throw new AppError(
        'CSV file has no columns in header row',
        'NO_COLUMNS',
        'file'
      );
    }

    // Validate required columns exist
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const missingColumns = this.REQUIRED_COLUMNS.filter(
      col => !normalizedHeaders.includes(col.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      throw new AppError(
        `Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`,
        'MISSING_REQUIRED_COLUMNS',
        'file'
      );
    }

    // Check for duplicate columns
    const duplicateHeaders = headers.filter((header, index) => 
      headers.indexOf(header) !== index
    );
    
    if (duplicateHeaders.length > 0) {
      throw new AppError(
        `Duplicate column headers found: ${duplicateHeaders.join(', ')}`,
        'DUPLICATE_COLUMNS',
        'file'
      );
    }

    // Parse data rows
    const records: Record<string, string>[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      try {
        const values = this.parseCSVRow(line);
        
        if (values.length !== headers.length) {
          errors.push(`Line ${lineNumber}: Expected ${headers.length} columns, found ${values.length}`);
          continue;
        }
        
        // Create record object
        const record: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          record[headers[j].trim()] = values[j].trim();
        }
        
        records.push(record);
        
      } catch (error) {
        errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
    
    if (errors.length > 0) {
      throw new AppError(
        `CSV parsing errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`,
        'CSV_FORMAT_ERRORS',
        'file'
      );
    }
    
    if (records.length === 0) {
      throw new AppError(
        'No valid data rows found in CSV file',
        'NO_VALID_ROWS',
        'file'
      );
    }
    
    return records;
  }

  /**
   * Parse a single CSV row, handling quoted values and commas
   * @param row - CSV row string
   * @returns Array of column values
   */
  private static parseCSVRow(row: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    values.push(current);
    
    return values;
  }

  /**
   * Validate and convert raw records to PatientRecord objects
   * @param rawRecords - Array of raw record objects
   * @returns Array of validated PatientRecord objects
   * @throws AppError - If validation fails
   */
  private static validateRecords(rawRecords: Record<string, string>[]): PatientRecord[] {
    const validatedRecords: PatientRecord[] = [];
    const errors: string[] = [];
    const seenMRNs = new Set<string>();
    
    for (let i = 0; i < rawRecords.length; i++) {
      const record = rawRecords[i];
      const rowNumber = i + 2; // +2 because we start from row 1 and skip header
      
      try {
        const patientRecord = this.validateSingleRecord(record, rowNumber);
        
        // Check for duplicate MRNs
        if (seenMRNs.has(patientRecord.mrn)) {
          errors.push(`Row ${rowNumber}: Duplicate MRN '${patientRecord.mrn}'`);
          continue;
        }
        
        seenMRNs.add(patientRecord.mrn);
        validatedRecords.push(patientRecord);
        
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Validation error'}`);
      }
    }
    
    if (errors.length > 0) {
      const errorMessage = `Patient record validation errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`;
      
      if (validatedRecords.length === 0) {
        throw new AppError(errorMessage, 'ALL_RECORDS_INVALID', 'file');
      } else {
        console.warn(errorMessage);
        console.warn(`Proceeding with ${validatedRecords.length} valid records out of ${rawRecords.length} total records`);
      }
    }
    
    return validatedRecords;
  }

  /**
   * Validate a single patient record
   * @param record - Raw record object
   * @param rowNumber - Row number for error reporting
   * @returns Validated PatientRecord
   * @throws Error - If validation fails
   */
  private static validateSingleRecord(record: Record<string, string>, rowNumber: number): PatientRecord {
    // Find MRN field (case-insensitive)
    const mrnKey = Object.keys(record).find(key => key.toLowerCase().trim() === 'mrn');
    const nameKey = Object.keys(record).find(key => key.toLowerCase().trim() === 'name');
    
    if (!mrnKey) {
      throw new Error('MRN column not found');
    }
    
    if (!nameKey) {
      throw new Error('Name column not found');
    }
    
    const mrn = record[mrnKey]?.trim();
    const name = record[nameKey]?.trim();
    
    // Validate MRN
    if (!mrn) {
      throw new Error('MRN is required and cannot be empty');
    }
    
    if (mrn.length > 50) {
      throw new Error(`MRN is too long (${mrn.length} characters). Maximum length is 50`);
    }
    
    // Basic MRN format validation (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9\-_]+$/.test(mrn)) {
      throw new Error(`MRN contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed`);
    }
    
    // Validate Name
    if (!name) {
      throw new Error('Name is required and cannot be empty');
    }
    
    if (name.length > 100) {
      throw new Error(`Name is too long (${name.length} characters). Maximum length is 100`);
    }
    
    // Basic name format validation (allow Unicode letters)
    if (!/^[\p{L}\s\-'.,]+$/u.test(name)) {
      throw new Error(`Name contains invalid characters. Only letters, spaces, hyphens, apostrophes, periods, and commas are allowed`);
    }
    
    // Collect additional details (all other columns)
    const additionalDetails: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase().trim() !== 'mrn' && key.toLowerCase().trim() !== 'name') {
        const cleanKey = key.trim();
        const cleanValue = value?.trim();
        
        if (cleanValue) {
          // Try to parse as different types
          additionalDetails[cleanKey] = this.parseValue(cleanValue);
        }
      }
    }
    
    return {
      mrn,
      name,
      additionalDetails
    };
  }

  /**
   * Parse a string value to appropriate type (string, number, date, boolean)
   * @param value - String value to parse
   * @returns Parsed value
   */
  private static parseValue(value: string): any {
    if (!value || value.trim() === '') {
      return null;
    }
    
    const trimmed = value.trim();
    
    // Boolean values
    if (/^(true|false|yes|no|y|n)$/i.test(trimmed)) {
      return /^(true|yes|y)$/i.test(trimmed);
    }
    
    // Numeric values
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return isNaN(num) ? trimmed : num;
    }
    
    if (/^\d*\.\d+$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return isNaN(num) ? trimmed : num;
    }
    
    // Date values (basic ISO format detection)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Default to string
    return trimmed;
  }

  /**
   * Get CSV parsing statistics
   * @param filePath - Path to CSV file
   * @returns Promise<object> - File statistics
   */
  static async getCSVStats(filePath: string): Promise<{
    fileSize: number;
    estimatedRows: number;
    lastModified: Date;
  }> {
    try {
      const stats = await fs.promises.stat(filePath);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      return {
        fileSize: stats.size,
        estimatedRows: Math.max(0, lines.length - 1), // Subtract header row
        lastModified: stats.mtime
      };
    } catch (error) {
      throw new AppError(
        `Failed to get CSV statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CSV_STATS_ERROR',
        'file'
      );
    }
  }

  /**
   * Validate CSV file format without full parsing (quick check)
   * @param filePath - Path to CSV file
   * @returns Promise<boolean> - Whether file appears to be valid CSV
   */
  static async quickValidateCSV(filePath: string): Promise<{
    isValid: boolean;
    hasRequiredColumns: boolean;
    columnCount: number;
    estimatedRows: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      await this.validateFile(filePath);
      
      // Read first few lines for quick validation
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 10).map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length === 0) {
        errors.push('File is empty');
        return { isValid: false, hasRequiredColumns: false, columnCount: 0, estimatedRows: 0, errors };
      }
      
      // Check header
      const headers = this.parseCSVRow(lines[0]);
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
      const hasRequiredColumns = this.REQUIRED_COLUMNS.every(col => 
        normalizedHeaders.includes(col.toLowerCase())
      );
      
      if (!hasRequiredColumns) {
        const missing = this.REQUIRED_COLUMNS.filter(col => 
          !normalizedHeaders.includes(col.toLowerCase())
        );
        errors.push(`Missing required columns: ${missing.join(', ')}`);
      }
      
      // Estimate total rows
      const totalLines = content.split('\n').filter(line => line.trim().length > 0);
      const estimatedRows = Math.max(0, totalLines.length - 1);
      
      return {
        isValid: errors.length === 0,
        hasRequiredColumns,
        columnCount: headers.length,
        estimatedRows,
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
        hasRequiredColumns: false,
        columnCount: 0,
        estimatedRows: 0,
        errors
      };
    }
  }
}