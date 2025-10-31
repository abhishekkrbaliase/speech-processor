# Speech Overlay Application Architecture

## Overview

The Speech Overlay Application is an Electron-based desktop application that provides a translucent, always-on-top overlay for conducting questionnaires with live speech-to-text transcription using Google Cloud Speech-to-Text API.

## High-Level Requirements

1. **CSV Data Loading**: Load questions and patient MRN lists from CSV files
2. **Google Speech-to-Text Integration**: Real-time transcription of answers (Yes/No, dates, etc.)
3. **Translucent Overlay**: Always-on-top, click-through overlay showing MRN details, questions, and transcribed answers

## Architecture Components

### 1. Main Process (`src/main/`)

#### Core Files:
- **`main.ts`** - Application entry point and IPC coordination
- **`WindowManager.ts`** - Manages overlay window creation and positioning
- **`GoogleSpeechManager.ts`** - Basic Google Speech-to-Text integration
- **`GoogleSpeechStreamingManager.ts`** - Live streaming speech recognition
- **`AudioCaptureHandler.ts`** - Cross-platform audio capture
- **`DataManager.ts`** - CSV data loading and management
- **`QuestionnaireController.ts`** - Questionnaire flow control
- **`ExportManager.ts`** - Response data export functionality

#### IPC Handlers:
- **`DataManagerIPC.ts`** - Patient and question data IPC
- **`QuestionnaireControllerIPC.ts`** - Questionnaire flow IPC
- **`ExportManagerIPC.ts`** - Export functionality IPC

#### Data Processing:
- **`CSVParser.ts`** - CSV file parsing utilities
- **`QuestionsParser.ts`** - Question format parsing

### 2. Renderer Process (`src/renderer/`)

#### Core Files:
- **`overlay.html`** - Overlay UI structure
- **`overlay.js`** - Overlay logic and speech integration
- **`LiveDisplayManager.ts`** - Real-time transcription display
- **`renderer.ts`** - Main window renderer
- **`index.html`** - Main application window

### 3. Preload Scripts (`src/preload/`)

#### API Exposure:
- **`preload.ts`** - Main preload script with IPC API exposure
- **`dataManagerAPI.ts`** - Data management API
- **`questionnaireAPI.ts`** - Questionnaire control API
- **`exportAPI.ts`** - Export functionality API

### 4. Configuration (`src/config/`)

- **`app-config.ts`** - Application configuration management
- **`live-transcription-config.ts`** - Google Speech configuration

### 5. Shared Types (`src/shared/`)

- **`types.ts`** - TypeScript interfaces and types

## Data Flow

### 1. Application Startup
```
main.ts → WindowManager → Create Main Window → Load CSV Data
```

### 2. Overlay Creation
```
User Action → WindowManager.createOverlayWindow() → overlay.html → overlay.js
```

### 3. Speech Recognition Flow
```
Audio Input → AudioCaptureHandler → GoogleSpeechStreamingManager → 
Live Transcription → overlay.js → Display Results
```

### 4. Questionnaire Flow
```
Load Questions → Display Question → Capture Speech → Process Response → 
Next Question → Export Results
```

## Key Integrations

### Google Speech-to-Text
- **Authentication**: Service account JSON file (`google-credentials.json`)
- **Configuration**: `config.json` with `keyFilename` path
- **Streaming**: Real-time audio processing with partial and final results
- **Response Types**: Yes/No detection, date parsing, general text

### Audio Processing
- **Capture**: Cross-platform microphone access
- **Streaming**: Real-time audio chunks to Google Speech API
- **Permissions**: Automatic microphone permission handling

### Data Management
- **CSV Loading**: Questions and patient data from CSV files
- **Session State**: Persistent questionnaire progress
- **Export**: Results export to CSV format

## File Structure

```
src/
├── main/                    # Main process (Node.js/Electron)
│   ├── main.ts             # Application entry point
│   ├── WindowManager.ts    # Window management
│   ├── GoogleSpeech*.ts    # Speech recognition
│   ├── AudioCaptureHandler.ts # Audio capture
│   ├── DataManager*.ts     # Data management
│   ├── Questionnaire*.ts   # Questionnaire logic
│   ├── Export*.ts          # Export functionality
│   └── *Parser.ts          # Data parsing utilities
├── renderer/               # Renderer process (Browser/UI)
│   ├── overlay.html        # Overlay UI
│   ├── overlay.js          # Overlay logic
│   ├── index.html          # Main window UI
│   ├── renderer.ts         # Main window logic
│   └── LiveDisplayManager.ts # Live transcription display
├── preload/                # Preload scripts (IPC bridge)
│   ├── preload.ts          # Main preload
│   └── *API.ts             # Specific API exposures
├── config/                 # Configuration management
│   ├── app-config.ts       # App configuration
│   └── live-transcription-config.ts # Speech config
└── shared/                 # Shared types and utilities
    └── types.ts            # TypeScript definitions
```

## Configuration Files

### `config.json`
```json
{
  "googleSpeech": {
    "keyFilename": "./google-credentials.json"
  },
  "audio": {
    "sampleRate": 16000,
    "channels": 1
  }
}
```

### `google-credentials.json`
Google Cloud service account credentials for Speech-to-Text API access.

## Build Process

1. **TypeScript Compilation**: `src/` → `dist/`
2. **Webpack Bundling**: Separate bundles for main, renderer, and preload
3. **Asset Copying**: HTML files and static assets
4. **Electron Packaging**: Complete application bundle

## Usage Flow

1. **Start Application**: `npm start`
2. **Load Data**: Import questions and patient CSV files
3. **Open Overlay**: Toggle overlay window
4. **Conduct Questionnaire**: 
   - Overlay shows current question and patient MRN
   - Speak answers (Yes/No, dates, etc.)
   - Live transcription appears in real-time
   - Navigate through questions automatically or manually
5. **Export Results**: Save responses to CSV file

## Error Handling

- **Audio Permissions**: Automatic microphone access requests
- **Google Speech Errors**: Retry logic and fallback handling
- **Network Issues**: Connection status monitoring
- **Data Validation**: CSV format validation and error reporting
- **Session Recovery**: Automatic session state persistence