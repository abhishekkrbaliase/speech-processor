# Code Integration Guide

## How Each File Works and Integrates

### Main Process Architecture

#### 1. `src/main/main.ts` - Application Entry Point

**Purpose**: Orchestrates the entire application, manages services, and handles IPC communication.

**Key Responsibilities**:
- Initialize all services (Google Speech, Audio Capture, Data Management)
- Set up IPC handlers for renderer communication
- Manage application lifecycle

**Integration Points**:
```typescript
// Service Initialization
this.speechManager = new GoogleSpeechManager(googleSpeechConfig);
this.streamingManager = new GoogleSpeechStreamingManager(config);
this.audioCaptureHandler = new CrossPlatformAudioCaptureHandler();
this.dataManager = new DataManager(config);

// IPC Handler Setup
ipcMain.handle('liveTranscription:initialize', async () => { ... });
ipcMain.handle('audio:startCapture', async (_, options) => { ... });
ipcMain.handle('data-manager:load-patients', async (_, filePath) => { ... });
```

**Dependencies**: All other main process modules

---

#### 2. `src/main/WindowManager.ts` - Window Management

**Purpose**: Creates and manages Electron windows, especially the overlay window.

**Key Features**:
- Creates translucent, always-on-top overlay
- Handles window positioning and properties
- Manages click-through behavior

**Integration**:
```typescript
// Called from main.ts
const windowManager = new WindowManager();
const overlayWindow = windowManager.createOverlayWindow();

// Overlay properties
overlayWindow.setAlwaysOnTop(true);
overlayWindow.setIgnoreMouseEvents(true, { forward: true });
```

**Used by**: `main.ts` for overlay creation and management

---

#### 3. `src/main/GoogleSpeechStreamingManager.ts` - Live Speech Recognition

**Purpose**: Handles real-time Google Speech-to-Text streaming API integration.

**Key Features**:
- Streaming audio recognition
- Partial and final result handling
- Session management with error recovery

**Integration Flow**:
```typescript
// Initialization
const manager = new GoogleSpeechStreamingManager(config);
await manager.initializeGoogleSpeech();

// Start streaming session
const session = await manager.startStreamingRecognition();

// Event handling
session.onPartialResult((result) => {
  // Send to renderer via IPC
  window.webContents.send('liveTranscription:partialResult', result);
});

session.onFinalResult((result) => {
  // Process final transcription
  window.webContents.send('liveTranscription:finalResult', result);
});
```

**Used by**: `main.ts` for live transcription functionality

---

#### 4. `src/main/AudioCaptureHandler.ts` - Audio Processing

**Purpose**: Cross-platform audio capture and streaming to speech recognition.

**Key Features**:
- Microphone access and permissions
- Real-time audio streaming
- Audio format conversion for Google Speech API

**Integration**:
```typescript
// Start audio capture
await audioCaptureHandler.startListening({
  sampleRate: 16000,
  channels: 1,
  bufferSize: 4096
});

// Audio events
audioCaptureHandler.on('audioData', (buffer) => {
  // Send to Google Speech streaming
  currentSession.sendAudioChunk(buffer);
});
```

**Used by**: `main.ts` and integrated with `GoogleSpeechStreamingManager`

---

#### 5. `src/main/DataManager.ts` - Data Management

**Purpose**: Manages patient records, questions, and responses.

**Key Features**:
- CSV file loading and parsing
- In-memory data storage
- Session state persistence
- Response collection and management

**Integration**:
```typescript
// Load data
const patients = await dataManager.loadPatientsFromCSV(filePath);
const questions = await dataManager.loadQuestionsFromCSV(filePath);

// Store responses
await dataManager.addResponse({
  questionId: 'q1',
  patientMrn: 'MRN001',
  rawText: 'yes',
  responseType: 'yes',
  confidence: 0.95
});
```

**Used by**: `main.ts` via `DataManagerIPC.ts`

---

#### 6. `src/main/QuestionnaireController.ts` - Flow Control

**Purpose**: Manages questionnaire flow, navigation, and state.

**Key Features**:
- Question progression logic
- Patient navigation
- Response validation
- Session state management

**Integration**:
```typescript
// Initialize with data
controller.initialize(patients, questions);

// Navigate
const nextQuestion = await controller.nextQuestion();
const currentState = controller.getCurrentState();

// Handle responses
await controller.processResponse(response);
```

**Used by**: `main.ts` via `QuestionnaireControllerIPC.ts`

---

### Renderer Process Architecture

#### 7. `src/renderer/overlay.ts` - Overlay Logic

**Purpose**: Main overlay functionality, speech integration, and UI management.

**Key Features**:
- Live transcription display
- Question and patient information display
- Speech recognition event handling
- User interaction management

**Integration Flow**:
```typescript
// Initialize live transcription
await window.electronAPI.initializeLiveTranscription();
await window.electronAPI.startLiveTranscriptionStreaming();

// Handle transcription results
window.electronAPI.onPartialResult((result) => {
  this.updateLiveTranscription(result);
});

window.electronAPI.onFinalResult((result) => {
  this.processFinalTranscriptionResult(result);
});

// Audio processing
window.electronAPI.onAudioDetected((audioBuffer) => {
  this.sendAudioToLiveTranscription(audioBuffer);
});
```

**Dependencies**: 
- `LiveDisplayManager.ts` for transcription display
- Preload APIs for IPC communication
- `overlay.html` for UI structure

---

#### 8. `src/renderer/LiveDisplayManager.ts` - Transcription Display

**Purpose**: Manages real-time transcription display with confidence indicators.

**Key Features**:
- Partial result animation
- Confidence visualization
- Word-level uncertainty highlighting
- Smooth transitions between states

**Integration**:
```typescript
// Used by overlay.ts
const displayManager = new LiveDisplayManager(
  responseElement,
  statusElement,
  transcriptionElement,
  options
);

// Update display
displayManager.updateLiveTranscription(result);
displayManager.showFinalResponse(response);
```

**Used by**: `overlay.ts` for enhanced transcription display

---

### Preload Scripts - IPC Bridge

#### 9. `src/main/preload.ts` - Main IPC Bridge

**Purpose**: Exposes secure IPC APIs to renderer processes.

**Key APIs Exposed**:
```typescript
window.electronAPI = {
  // Live Transcription
  initializeLiveTranscription: () => ipcRenderer.invoke('liveTranscription:initialize'),
  startLiveTranscriptionStreaming: () => ipcRenderer.invoke('liveTranscription:startStreaming'),
  sendAudioToLiveTranscription: (chunk) => ipcRenderer.invoke('liveTranscription:sendAudio', chunk),
  
  // Audio Capture
  startAudioCapture: (options) => ipcRenderer.invoke('audio:startCapture', options),
  stopAudioCapture: () => ipcRenderer.invoke('audio:stopCapture'),
  
  // Event Listeners
  onPartialResult: (callback) => ipcRenderer.on('liveTranscription:partialResult', callback),
  onFinalResult: (callback) => ipcRenderer.on('liveTranscription:finalResult', callback),
  onAudioDetected: (callback) => ipcRenderer.on('audio:detected', callback)
};
```

**Security**: Uses `contextBridge` to safely expose APIs without giving full Node.js access.

---

### Configuration Management

#### 10. `src/config/app-config.ts` - Application Configuration

**Purpose**: Manages application-wide configuration settings.

**Integration**:
```typescript
const configManager = ConfigManager.getInstance();
const googleSpeechConfig = configManager.getGoogleSpeechConfig();
```

#### 11. `src/config/live-transcription-config.ts` - Speech Configuration

**Purpose**: Specialized configuration for Google Speech-to-Text streaming.

**Features**:
- Google Speech API settings
- Audio processing parameters
- Recognition behavior configuration
- UI display preferences

---

### Data Flow Integration

#### Complete Speech Recognition Flow:

1. **Audio Capture**:
   ```
   Microphone → AudioCaptureHandler → Audio Events
   ```

2. **Speech Processing**:
   ```
   Audio Events → GoogleSpeechStreamingManager → Google Speech API
   ```

3. **Result Processing**:
   ```
   Google Speech API → Streaming Results → IPC Events → Overlay Display
   ```

4. **Response Handling**:
   ```
   Final Results → Response Processing → DataManager → Storage
   ```

#### Questionnaire Flow Integration:

1. **Data Loading**:
   ```
   CSV Files → CSVParser → DataManager → In-Memory Storage
   ```

2. **Question Display**:
   ```
   QuestionnaireController → IPC → Overlay → UI Display
   ```

3. **Response Collection**:
   ```
   Speech Recognition → Response Processing → DataManager → Session State
   ```

4. **Navigation**:
   ```
   User Action/Auto → QuestionnaireController → Next Question → UI Update
   ```

### Error Handling Integration

Each component includes error handling that propagates through the system:

```typescript
// Audio errors
audioCaptureHandler.on('error', (error) => {
  window.webContents.send('audio:error', error);
});

// Speech recognition errors
session.onError((error) => {
  window.webContents.send('liveTranscription:error', error);
});

// Renderer error handling
window.electronAPI.onLiveTranscriptionError((error) => {
  this.showError(error.message, error.recoverable);
});
```

### Build Integration

The webpack configuration bundles everything together:

```javascript
// webpack.config.js
module.exports = [
  {
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: { filename: 'main.js' }
  },
  {
    target: 'electron-renderer',
    entry: './src/renderer/overlay.ts',
    output: { filename: 'overlay.js' }
  },
  {
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: { filename: 'preload.js' }
  }
];
```

This creates separate bundles that work together in the Electron environment while maintaining security boundaries.