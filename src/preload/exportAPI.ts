/**
 * Export Preload API
 * Provides secure access to ExportManager functionality from renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ExportSettings, ExportResult, ExportStatistics } from '../main/ExportManager';

export interface ExportAPI {
  // Export operations
  exportWithDialog: (settings: ExportSettings) => Promise<ExportResult>;
  exportToFile: (filePath: string, settings: ExportSettings) => Promise<ExportResult>;
  exportToString: (settings: ExportSettings) => Promise<{ success: boolean; content?: string; error?: string }>;

  // Statistics and information
  getStatistics: (settings?: ExportSettings) => Promise<{ success: boolean; statistics?: ExportStatistics; error?: string }>;
  validateSettings: (settings: ExportSettings) => Promise<{ success: boolean; validation?: { valid: boolean; errors: string[] }; error?: string }>;
  getAvailableFormats: () => Promise<{ success: boolean; formats?: Array<{ format: string; name: string; description: string; extension: string }>; error?: string }>;
  generatePreview: (settings: ExportSettings, maxRows?: number) => Promise<{ success: boolean; preview?: string; error?: string }>;
}

/**
 * Create Export API for renderer process
 */
const createExportAPI = (): ExportAPI => {
  return {
    // Export operations
    exportWithDialog: (settings: ExportSettings) => 
      ipcRenderer.invoke('export:with-dialog', settings),
    
    exportToFile: (filePath: string, settings: ExportSettings) => 
      ipcRenderer.invoke('export:to-file', filePath, settings),
    
    exportToString: (settings: ExportSettings) => 
      ipcRenderer.invoke('export:to-string', settings),

    // Statistics and information
    getStatistics: (settings?: ExportSettings) => 
      ipcRenderer.invoke('export:get-statistics', settings),
    
    validateSettings: (settings: ExportSettings) => 
      ipcRenderer.invoke('export:validate-settings', settings),
    
    getAvailableFormats: () => 
      ipcRenderer.invoke('export:get-available-formats'),
    
    generatePreview: (settings: ExportSettings, maxRows?: number) => 
      ipcRenderer.invoke('export:generate-preview', settings, maxRows)
  };
};

/**
 * Expose Export API to renderer process
 */
export const exposeExportAPI = (): void => {
  try {
    contextBridge.exposeInMainWorld('exportManager', createExportAPI());
    console.log('Export API exposed to renderer process');
  } catch (error) {
    console.error('Failed to expose Export API:', error);
  }
};

// Type declaration for global window object
declare global {
  interface Window {
    exportManager: ExportAPI;
  }
}