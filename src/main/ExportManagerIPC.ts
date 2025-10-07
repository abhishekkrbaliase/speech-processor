/**
 * ExportManagerIPC - IPC handlers for ExportManager communication
 * Provides secure communication between main process ExportManager and renderer
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { ExportManager, ExportSettings, ExportResult, ExportStatistics } from './ExportManager';
import { AppError } from '../shared/types';

export class ExportManagerIPC {
  private exportManager: ExportManager;

  constructor(exportManager: ExportManager) {
    this.exportManager = exportManager;
    this.setupIpcHandlers();
  }

  /**
   * Setup all IPC handlers for ExportManager operations
   */
  private setupIpcHandlers(): void {
    // Export operations
    ipcMain.handle('export:with-dialog', this.handleExportWithDialog.bind(this));
    ipcMain.handle('export:to-file', this.handleExportToFile.bind(this));
    ipcMain.handle('export:to-string', this.handleExportToString.bind(this));

    // Statistics and information
    ipcMain.handle('export:get-statistics', this.handleGetStatistics.bind(this));
    ipcMain.handle('export:validate-settings', this.handleValidateSettings.bind(this));
    ipcMain.handle('export:get-available-formats', this.handleGetAvailableFormats.bind(this));
    ipcMain.handle('export:generate-preview', this.handleGeneratePreview.bind(this));

    console.log('ExportManager IPC handlers registered');
  }

  // ===== EXPORT OPERATION HANDLERS =====

  private async handleExportWithDialog(
    event: IpcMainInvokeEvent, 
    settings: ExportSettings
  ): Promise<ExportResult> {
    try {
      // Get the parent window for the dialog
      const parentWindow = BrowserWindow.fromWebContents(event.sender);
      
      return await this.exportManager.exportWithDialog(parentWindow, settings);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  private async handleExportToFile(
    event: IpcMainInvokeEvent,
    filePath: string,
    settings: ExportSettings
  ): Promise<ExportResult> {
    try {
      return await this.exportManager.exportToFile(filePath, settings);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  private async handleExportToString(
    event: IpcMainInvokeEvent,
    settings: ExportSettings
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      return await this.exportManager.exportToString(settings);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  // ===== STATISTICS AND INFORMATION HANDLERS =====

  private async handleGetStatistics(
    event: IpcMainInvokeEvent,
    settings?: ExportSettings
  ): Promise<{ success: boolean; statistics?: ExportStatistics; error?: string }> {
    try {
      const statistics = this.exportManager.getExportStatistics(settings);
      return {
        success: true,
        statistics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export statistics'
      };
    }
  }

  private async handleValidateSettings(
    event: IpcMainInvokeEvent,
    settings: ExportSettings
  ): Promise<{ success: boolean; validation?: { valid: boolean; errors: string[] }; error?: string }> {
    try {
      const validation = this.exportManager.validateExportSettings(settings);
      return {
        success: true,
        validation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate export settings'
      };
    }
  }

  private async handleGetAvailableFormats(
    event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; formats?: Array<{ format: string; name: string; description: string; extension: string }>; error?: string }> {
    try {
      const formats = this.exportManager.getAvailableFormats();
      return {
        success: true,
        formats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available formats'
      };
    }
  }

  private async handleGeneratePreview(
    event: IpcMainInvokeEvent,
    settings: ExportSettings,
    maxRows: number = 5
  ): Promise<{ success: boolean; preview?: string; error?: string }> {
    try {
      return await this.exportManager.generatePreview(settings, maxRows);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview'
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Cleanup IPC handlers
   */
  cleanup(): void {
    // Remove all ExportManager IPC handlers
    const handlers = [
      'export:with-dialog',
      'export:to-file',
      'export:to-string',
      'export:get-statistics',
      'export:validate-settings',
      'export:get-available-formats',
      'export:generate-preview'
    ];

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler);
    });

    console.log('ExportManager IPC handlers cleaned up');
  }
}