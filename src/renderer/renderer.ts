// Basic renderer process entry point
class SpeechOverlayRenderer {
  constructor() {
    this.initializeRenderer();
  }

  private async initializeRenderer(): Promise<void> {
    console.log('Speech Overlay App Renderer Initialized');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  private async setupUI(): Promise<void> {
    try {
      // Check if APIs are available
      console.log('Available APIs:', {
        electronAPI: !!window.electronAPI,
        dataManager: !!window.dataManager,
        exportManager: !!window.exportManager
      });

      // Get app information
      const version = await window.electronAPI.getVersion();
      const platform = await window.electronAPI.getPlatform();
      
      // Update UI with app information
      const appInfo = document.getElementById('app-info');
      if (appInfo) {
        appInfo.innerHTML = `
          <h2>Speech Overlay App</h2>
          <p>Version: ${version}</p>
          <p>Platform: ${platform}</p>
          <p>Status: Ready for development</p>
        `;
      }

      console.log(`App initialized - Version: ${version}, Platform: ${platform}`);
      
      // Set up overlay test button
      this.setupOverlayTest();
      
      // Set up smart speech test button
      this.setupSmartSpeechTest();
      
      // Set up overlay test button
      this.setupOverlayButton();
      
      // Set up file loading buttons
      this.setupFileLoadingButtons();
      
      // Update data status
      this.updateDataStatus();
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  }

  private setupOverlayTest(): void {
    const testButton = document.getElementById('test-overlay-btn');
    if (testButton) {
      console.log('Test overlay button found, setting up event listener');
      testButton.addEventListener('click', async () => {
        console.log('Test overlay button clicked');
        
        // Visual feedback
        testButton.textContent = 'Loading...';
        testButton.style.backgroundColor = '#ffc107';
        
        try {
          if (!window.electronAPI) {
            console.error('electronAPI not available');
            testButton.textContent = 'Error: No API';
            testButton.style.backgroundColor = '#dc3545';
            return;
          }
          if (!window.electronAPI.toggleOverlay) {
            console.error('toggleOverlay method not available');
            testButton.textContent = 'Error: No Method';
            testButton.style.backgroundColor = '#dc3545';
            return;
          }
          console.log('Calling toggleOverlay...');
          await window.electronAPI.toggleOverlay();
          console.log('Overlay toggled successfully');
          testButton.textContent = 'Overlay Toggled!';
          testButton.style.backgroundColor = '#28a745';
          
          // Reset button after 2 seconds
          setTimeout(() => {
            testButton.textContent = 'Test Overlay';
            testButton.style.backgroundColor = '#007bff';
          }, 2000);
          
        } catch (error) {
          console.error('Failed to toggle overlay:', error);
          testButton.textContent = 'Error: ' + (error as Error).message;
          testButton.style.backgroundColor = '#dc3545';
          
          // Reset button after 3 seconds
          setTimeout(() => {
            testButton.textContent = 'Test Overlay';
            testButton.style.backgroundColor = '#007bff';
          }, 3000);
        }
      });
    } else {
      console.error('Test overlay button not found');
    }
  }



  private setupSmartSpeechTest(): void {
    const testButton = document.getElementById('smart-speech-btn');
    if (testButton) {
      console.log('Smart speech test button found, setting up event listener');
      testButton.addEventListener('click', async () => {
        console.log('Smart speech test button clicked');
        
        // Check if AI is initialized
        try {
          const isInitialized = await window.electronAPI.isAIInitialized();
          
          if (isInitialized) {
            // Open Google speech test page
            window.location.href = './google-speech-test.html';
          } else {
            // Try to initialize first
            testButton.textContent = 'Initializing...';
            testButton.style.backgroundColor = '#ffc107';
            
            const initResult = await window.electronAPI.initializeAI();
            
            if (initResult.success) {
              testButton.textContent = 'Opening Speech Test...';
              testButton.style.backgroundColor = '#28a745';
              setTimeout(() => {
                window.location.href = './google-speech-test.html';
              }, 1000);
            } else {
              // Show setup dialog
              testButton.textContent = 'Setup Required';
              testButton.style.backgroundColor = '#dc3545';
              
              console.log('Opening setup dialog...');
              await window.electronAPI.openSetup();
              
              // Reset button
              setTimeout(() => {
                testButton.textContent = '🎤 Google Speech Recognition';
                testButton.style.backgroundColor = '#4285f4';
              }, 3000);
            }
          }
        } catch (error) {
          console.error('Error checking AI initialization:', error);
          testButton.textContent = 'Error - Check Console';
          testButton.style.backgroundColor = '#dc3545';
          
          setTimeout(() => {
            testButton.textContent = '🎤 Google Speech Recognition';
            testButton.style.backgroundColor = '#4285f4';
          }, 3000);
        }
      });
    } else {
      console.error('Smart speech test button not found');
    }
  }

  private setupOverlayButton(): void {
    const overlayButton = document.getElementById('overlay-btn');
    if (overlayButton) {
      console.log('Overlay button found, setting up event listener');
      overlayButton.addEventListener('click', async () => {
        console.log('Overlay button clicked');
        
        // Visual feedback
        overlayButton.textContent = 'Opening...';
        overlayButton.style.backgroundColor = '#ffc107';
        
        try {
          if (!window.electronAPI) {
            console.error('electronAPI not available');
            overlayButton.textContent = 'Error: No API';
            overlayButton.style.backgroundColor = '#dc3545';
            return;
          }
          
          console.log('Calling toggleOverlay...');
          await window.electronAPI.toggleOverlay();
          console.log('Overlay toggled successfully');
          overlayButton.textContent = 'Overlay Opened!';
          overlayButton.style.backgroundColor = '#28a745';
          
          // Reset button after 2 seconds
          setTimeout(() => {
            overlayButton.textContent = '📱 Speech Overlay';
            overlayButton.style.backgroundColor = '#34a853';
          }, 2000);
          
        } catch (error) {
          console.error('Failed to toggle overlay:', error);
          overlayButton.textContent = 'Error: ' + (error as Error).message;
          overlayButton.style.backgroundColor = '#dc3545';
          
          // Reset button after 3 seconds
          setTimeout(() => {
            overlayButton.textContent = '📱 Speech Overlay';
            overlayButton.style.backgroundColor = '#34a853';
          }, 3000);
        }
      });
    } else {
      console.error('Overlay button not found');
    }
  }

  private setupFileLoadingButtons(): void {
    // Load Patients CSV button
    const loadPatientsBtn = document.getElementById('load-patients-btn');
    if (loadPatientsBtn) {
      loadPatientsBtn.addEventListener('click', async () => {
        console.log('Load patients button clicked');
        
        loadPatientsBtn.textContent = 'Loading...';
        (loadPatientsBtn as HTMLButtonElement).disabled = true;
        
        try {
          // Check if API is available
          if (!window.dataManager || !window.dataManager.selectAndLoadPatientData) {
            throw new Error('DataManager API not available');
          }
          
          // Use file dialog to select CSV file
          const result = await window.dataManager.selectAndLoadPatientData();
          
          if (result.success) {
            loadPatientsBtn.textContent = `✅ Loaded ${result.count} patients`;
            loadPatientsBtn.style.backgroundColor = '#28a745';
            this.updateDataStatus();
          } else {
            loadPatientsBtn.textContent = '❌ Load Failed';
            loadPatientsBtn.style.backgroundColor = '#dc3545';
            console.error('Failed to load patients:', result.error);
          }
        } catch (error) {
          console.error('Error loading patients:', error);
          loadPatientsBtn.textContent = '❌ Error';
          loadPatientsBtn.style.backgroundColor = '#dc3545';
        }
        
        // Reset button after 3 seconds
        setTimeout(() => {
          loadPatientsBtn.textContent = '📋 Load Patient CSV';
          loadPatientsBtn.style.backgroundColor = '#007bff';
          (loadPatientsBtn as HTMLButtonElement).disabled = false;
        }, 3000);
      });
    }

    // Load Questions CSV button
    const loadQuestionsBtn = document.getElementById('load-questions-btn');
    if (loadQuestionsBtn) {
      loadQuestionsBtn.addEventListener('click', async () => {
        console.log('Load questions button clicked');
        
        loadQuestionsBtn.textContent = 'Loading...';
        (loadQuestionsBtn as HTMLButtonElement).disabled = true;
        
        try {
          // Check if API is available
          if (!window.dataManager || !window.dataManager.selectAndLoadQuestions) {
            throw new Error('DataManager API not available');
          }
          
          // Use file dialog to select CSV file
          const result = await window.dataManager.selectAndLoadQuestions();
          
          if (result.success) {
            loadQuestionsBtn.textContent = `✅ Loaded ${result.count} questions`;
            loadQuestionsBtn.style.backgroundColor = '#28a745';
            this.updateDataStatus();
          } else {
            loadQuestionsBtn.textContent = '❌ Load Failed';
            loadQuestionsBtn.style.backgroundColor = '#dc3545';
            console.error('Failed to load questions:', result.error);
          }
        } catch (error) {
          console.error('Error loading questions:', error);
          loadQuestionsBtn.textContent = '❌ Error';
          loadQuestionsBtn.style.backgroundColor = '#dc3545';
        }
        
        // Reset button after 3 seconds
        setTimeout(() => {
          loadQuestionsBtn.textContent = '❓ Load Questions CSV';
          loadQuestionsBtn.style.backgroundColor = '#28a745';
          (loadQuestionsBtn as HTMLButtonElement).disabled = false;
        }, 3000);
      });
    }

    // Export Data button
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', async () => {
        console.log('Export data button clicked');
        
        exportDataBtn.textContent = 'Exporting...';
        (exportDataBtn as HTMLButtonElement).disabled = true;
        
        try {
          // Check if API is available
          if (!window.exportManager || !window.exportManager.exportWithDialog) {
            throw new Error('ExportManager API not available');
          }
          
          // Export with dialog
          const exportSettings = {
            format: 'csv' as const,
            includeTimestamps: true,
            includeConfidence: true,
            includeRawText: true,
            includePatientDetails: true,
            includeQuestionDetails: true,
            sortBy: 'timestamp' as const
          };
          
          const result = await window.exportManager.exportWithDialog(exportSettings);
          
          if (result.success) {
            exportDataBtn.textContent = `✅ Exported ${result.recordCount} responses`;
            exportDataBtn.style.backgroundColor = '#28a745';
          } else {
            exportDataBtn.textContent = '❌ Export Failed';
            exportDataBtn.style.backgroundColor = '#dc3545';
            console.error('Failed to export:', result.error);
          }
        } catch (error) {
          console.error('Error exporting:', error);
          exportDataBtn.textContent = '❌ Error';
          exportDataBtn.style.backgroundColor = '#dc3545';
        }
        
        // Reset button after 3 seconds
        setTimeout(() => {
          exportDataBtn.textContent = '📤 Export Responses';
          exportDataBtn.style.backgroundColor = '#ffc107';
          exportDataBtn.style.color = 'black';
          (exportDataBtn as HTMLButtonElement).disabled = false;
        }, 3000);
      });
    }
  }

  private async updateDataStatus(): Promise<void> {
    try {
      // Check if API is available
      if (!window.dataManager || !window.dataManager.getDataStats) {
        console.error('DataManager API not available for status update');
        return;
      }
      
      // Get current data counts
      const stats = await window.dataManager.getDataStats();
      
      // Update status display
      const patientsStatus = document.getElementById('patients-status');
      const questionsStatus = document.getElementById('questions-status');
      const responsesStatus = document.getElementById('responses-status');
      const exportBtn = document.getElementById('export-data-btn') as HTMLButtonElement;
      
      if (patientsStatus) {
        patientsStatus.textContent = `👥 Patients: ${stats.patientsCount} loaded`;
        patientsStatus.style.color = stats.patientsCount > 0 ? '#28a745' : '#6c757d';
      }
      
      if (questionsStatus) {
        questionsStatus.textContent = `❓ Questions: ${stats.questionsCount} loaded`;
        questionsStatus.style.color = stats.questionsCount > 0 ? '#28a745' : '#6c757d';
      }
      
      if (responsesStatus) {
        responsesStatus.textContent = `💬 Responses: ${stats.responsesCount} collected`;
        responsesStatus.style.color = stats.responsesCount > 0 ? '#28a745' : '#6c757d';
      }
      
      // Enable export button if there are responses
      if (exportBtn) {
        exportBtn.disabled = stats.responsesCount === 0;
        if (stats.responsesCount > 0) {
          exportBtn.style.opacity = '1';
          exportBtn.style.cursor = 'pointer';
        } else {
          exportBtn.style.opacity = '0.6';
          exportBtn.style.cursor = 'not-allowed';
        }
      }
      
    } catch (error) {
      console.error('Error updating data status:', error);
    }
  }
}

// Initialize the renderer when the script loads
new SpeechOverlayRenderer();