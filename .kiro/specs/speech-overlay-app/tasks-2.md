# Implementation Plan

- [x] 1. Set up Electron project structure using free open-source tools
  - Initialize Electron project with TypeScript support (both free and open-source)
  - Configure build tools using electron-builder (MIT license, free) for cross-platform packaging
  - Set up development environment with free tools (webpack-dev-server, nodemon)
  - Create basic main process entry point using only free Electron APIs
  - Verify all dependencies are free, open-source, and license-compatible
  - _Requirements: 6.1, 6.2_

- [x] 2. Implement basic window management and overlay functionality
  - [x] 2.1 Create Window Manager class for overlay window creation
    - Implement BrowserWindow creation with transparency and click-through options
    - Configure window properties for always-on-top behavior
    - Add window positioning and sizing controls
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Implement overlay UI renderer process
    - Create HTML/CSS structure for translucent overlay interface
    - Implement responsive layout that adapts to different screen sizes
    - Add basic styling for question display and response areas
    - Set up overlay renderer TypeScript class with state management
    - _Requirements: 3.4, 3.5_

  - [x] 2.3 Fix electron based speech overlay
    - The Speech recognition using Google Speech-To-Text was implemented
    - The Overlay has integrated with CSV to display question
    - Post this integration with CSV for patient MRN (and other details) along with questions, the Speech recognition has stopped to listen the audio (for live transcribe)
  
  

    

- [ ] 3. Implement data export
  - [] 3.1 Create CSV parser for patient data
    - Write CSV parsing logic with validation for MRN, name, and additional details
    - Implement error handling for malformed CSV files
    - Add IPC handlers in main process for CSV file operations
    - Create file dialog integration for CSV file selection
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Fix Speech Recognition
    - The Speech Recognition stays in 'Ready' State

  - [x] 3.3 Create data store classes for runtime data management
    - Implement DataManager class in main process for centralized data handling
    - Create in-memory storage with CRUD operations for patients, questions, and responses
    - Add data validation and type checking using existing shared types
    - Implement IPC communication between main process data store and renderer
    - _Requirements: 1.4, 2.3_

- [ ] 4. Integrate Google Speech-to-Text API for speech processing
  - [x] 4.1 Set up Google Cloud Speech-to-Text client integration
    - Check if Google Speech-to-Text API is integrated for live transcribe from Overlay
    - Add logs for Speech-to-Text API calls and implement error logs
    - Ensure that once the overlay is launched, irrespective of the questions or patient MRN csv loaded or not
    - Run the overlay application and check if any live transcription is happening or not. if not, fix the root cause
    - Ensure this doesn't break the Question / Patient MRN display on the overlay
    

  - [ ] 4.2 Implement secure credential management system
    - Create CredentialManager class for secure API key storage
    - Implement credential encryption and decryption using Node.js crypto
    - Add credential validation and testing functionality
    - Create UI for credential setup and configuration
    - Implement secure credential loading on application startup
    - _Requirements: 6.6, 4.7_

  - [ ] 4.3 Implement audio capture and streaming for Google Speech API
    - Create audio capture handler using MediaDevices API for browser-based recording
    - Implement audio format conversion to Google Speech API requirements (LINEAR16, 16kHz)
    - Add real-time audio streaming to Google Speech-to-Text streaming API
    - Implement voice activity detection for efficient streaming
    - Create audio buffering and chunking for optimal API performance
    - _Requirements: 4.1, 4.2_

  - [ ] 4.4 Implement Google Speech-to-Text streaming recognition
    - Create streaming recognition session with Google Speech API
    - Implement real-time transcription result processing
    - Add support for interim results and final transcriptions
    - Configure language models for multiple English accents (en-US, en-IN, en-CA)
    - Implement confidence scoring and alternative transcription handling
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ] 4.5 Create response parsing and classification system
    - Implement response classification logic for Yes/No/Not Applicable/DateTime responses
    - Create natural language date/time parsing for formats like "twelve september 1992 11 15 am"
    - Add fuzzy matching for common response variations
    - Implement confidence-based response validation
    - Create fallback handling for unclear or ambiguous responses
    - _Requirements: 4.4, 4.5, 4.6_

- [ ] 5. Implement questionnaire workflow and user interaction
  - [x] 5.1 Create questionnaire controller
    - Implement QuestionnaireController class in main process
    - Add logic to iterate through patients and questions sequentially
    - Create state management for current patient and question tracking
    - Add automatic progression through questionnaire workflow
    - Implement IPC communication to update overlay UI with current question/patient
    - _Requirements: 5.5, 3.5_

  - [ ] 5.2 Implement response capture and display with audio feedback
    - Connect overlay UI controls to questionnaire workflow via IPC
    - Implement reset functionality to clear responses and restart audio capture
    - Add visual indicators for microphone status (listening, processing, completed) using existing overlay UI
    - Create confirmation mechanism before proceeding to next question
    - Integrate audio level indicators to show microphone input activity
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 5.3 Add progress tracking and navigation
    - Enhance existing overlay progress display with real questionnaire data
    - Create navigation controls for manual question/patient switching
    - Add visual cues for completed vs pending questions in overlay UI
    - Implement keyboard shortcuts for navigation (already partially implemented)
    - _Requirements: 3.5, 5.5_

- [ ] 6. Implement session management and data persistence
  - [ ] 6.1 Create session state management
    - Implement SessionManager class in main process using existing SessionState type
    - Create automatic session saving on progress changes to local file storage
    - Add session restoration on application restart
    - Integrate with existing IPC handlers for session operations
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 6.2 Implement pause and resume functionality
    - Connect existing overlay pause button to session management via IPC
    - Implement pause controls that stop speech listening and save state
    - Implement resume functionality that restores exact position
    - Enhance existing overlay visual indicators for paused state
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 7. Implement data export and reporting
  - [ ] 7.1 Create response export functionality
    - Implement CSV export functionality in main process DataManager
    - Add timestamp information for each response using existing ProcessedResponse type
    - Create export file naming and location selection using Electron dialog API
    - Add IPC handler for export operations and integrate with existing preload API
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 7.2 Add export validation and error handling
    - Validate export data completeness before generating files
    - Implement error handling for file write permissions using existing AppError class
    - Add success confirmation with file location display
    - Create export UI controls in main renderer window
    - _Requirements: 7.4_

- [ ] 8. Implement error handling and user feedback
  - [ ] 8.1 Create comprehensive error handling system
    - Extend existing AppError class for different failure types (file, API, audio, network, system)
    - Create error recovery mechanisms with user-friendly messages
    - Add specific handling for Google API errors (authentication, rate limiting, network)
    - Implement retry logic with exponential backoff for transient failures
    - Add logging system for debugging and troubleshooting
    - Integrate error handling with existing IPC communication
    - _Requirements: 1.3, 2.4, 4.6, 4.7_

  - [ ] 8.2 Implement user feedback and notification system
    - Enhance existing overlay UI with toast notifications for status updates and errors
    - Add visual feedback for speech processing and API connection status using existing status indicators
    - Implement network connectivity indicators and offline mode notifications
    - Create credential setup wizard and validation feedback
    - Implement help system with usage instructions in main renderer window
    - Create error display mechanisms in both main and overlay windows
    - _Requirements: 4.6, 4.7, 5.1, 6.5_

- [ ] 9. Add cross-platform packaging and deployment
  - [ ] 9.1 Complete packaging configuration and resolve build pipeline issues
    - Fix existing electron-builder configuration to resolve file structure conflicts
    - Optimize webpack configuration to output files in electron-builder compatible structure
    - Resolve path resolution issues for proper asset bundling
    - Test complete build-to-package workflow to ensure reliable distribution creation
    - Verify self-contained executables work independently without external dependencies
    - _Requirements: 6.1, 6.2_

  - [ ] 9.2 Optimize bundle size and performance
    - Optimize asset bundling using existing webpack configuration
    - Implement lazy loading for Google Speech client library
    - Add startup performance optimizations and connection pooling
    - Optimize audio streaming and buffering for reduced latency
    - Implement efficient credential caching and validation
    - _Requirements: 6.4, 6.5_

- [ ] 10. Create comprehensive testing suite
  - [ ] 10.1 Implement unit tests for core functionality
    - Set up testing framework (Jest or similar testing tools)
    - Write tests for CSV parsing, question validation, and response processing
    - Create mock implementations for Google Speech API testing
    - Add tests for credential management and encryption/decryption
    - Test response parsing and classification logic
    - Add tests for existing data models and validation logic in shared/types.ts
    - Test WindowManager and overlay functionality
    - _Requirements: 1.2, 1.3, 2.2, 2.4, 4.7, 6.6_

  - [ ] 10.2 Create integration tests for end-to-end workflows
    - Test complete questionnaire workflow from CSV load to export
    - Verify existing IPC communication between main and renderer processes
    - Test Google Speech API integration with real and mock services
    - Test network failure scenarios and recovery mechanisms
    - Test credential setup and validation workflows
    - Test session persistence and restoration functionality
    - Test overlay window creation and management
    - _Requirements: 7.1, 8.3, 8.4, 4.7, 6.6_

  - [ ] 10.3 Add platform-specific testing
    - Test existing overlay functionality on Windows and macOS with different display configurations
    - Verify microphone permissions and audio device access on both platforms
    - Test Google Speech API connectivity and performance across platforms
    - Test audio capture quality and streaming performance across platforms
    - Validate credential storage security on different operating systems
    - Test network connectivity handling and offline behavior
    - Validate packaging and installation on target platforms with different system configurations
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.7, 6.1, 6.5, 6.6_