import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

export class FileLogger {
  private logFile: string;
  private logLevel: LogLevel;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor(logFile?: string, logLevel: LogLevel = LogLevel.INFO) {
    // Default log file location - use a safe directory
    let defaultLogDir: string;
    
    try {
      // Try to use Electron's app.getPath('userData') if available
      const { app } = require('electron');
      defaultLogDir = path.join(app.getPath('userData'), 'logs');
    } catch (error) {
      // Fallback to OS temp directory if Electron is not available
      const os = require('os');
      defaultLogDir = path.join(os.tmpdir(), 'speech-processor-logs');
    }
    
    this.logFile = logFile || path.join(defaultLogDir, `speech-processor-${new Date().toISOString().split('T')[0]}.log`);
    this.logLevel = logLevel;

    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    try {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      // If we can't create the log directory, fall back to console logging only
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Could not create log directory, falling back to console logging:', errorMessage);
      this.logFile = ''; // Disable file logging
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelName = levelNames[entry.level] || 'UNKNOWN';

    let logMessage = `[${entry.timestamp}] [${levelName}]`;
    if (entry.source) {
      logMessage += ` [${entry.source}]`;
    }
    logMessage += ` ${entry.message}`;

    if (entry.data) {
      logMessage += ` | Data: ${JSON.stringify(entry.data)}`;
    }

    return logMessage;
  }

  private writeToFile(entry: LogEntry): void {
    try {
      // Only write to file if file logging is enabled
      if (!this.logFile) {
        return; // File logging disabled
      }

      const formattedEntry = this.formatLogEntry(entry) + '\n';

      // Check file size and rotate if necessary
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFiles();
        }
      }

      fs.appendFileSync(this.logFile, formattedEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
      // Disable file logging if it fails
      this.logFile = '';
    }
  }

  private rotateLogFiles(): void {
    try {
      const logDir = path.dirname(this.logFile);
      const baseName = path.basename(this.logFile, '.log');

      // Remove oldest log file if it exists
      for (let i = this.maxFiles - 1; i >= 0; i--) {
        const oldFile = i === 0 ? this.logFile : path.join(logDir, `${baseName}.${i}.log`);
        const newFile = path.join(logDir, `${baseName}.${i + 1}.log`);

        if (fs.existsSync(oldFile)) {
          if (i + 1 >= this.maxFiles) {
            fs.unlinkSync(oldFile); // Remove oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source
    };

    // Always log to console
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelName = levelNames[level] || 'UNKNOWN';
    const logMessage = `[${entry.timestamp}] [${levelName}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage, data || '');
        break;
    }

    // Write to file
    this.writeToFile(entry);
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  fatal(message: string, data?: any, source?: string): void {
    this.log(LogLevel.FATAL, message, data, source);
  }

  // Get current log file path
  getLogFile(): string {
    return this.logFile;
  }

  // Set log level
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  // Set log file
  setLogFile(logFile: string): void {
    this.logFile = logFile;
    this.ensureLogDirectory();
  }
}

// Global logger instance
export const logger = new FileLogger();