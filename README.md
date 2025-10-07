# Speech Overlay Application

A desktop application for conducting questionnaires with live speech-to-text transcription using Google Cloud Speech-to-Text API.

## Features

- **CSV Data Loading**: Load questions and patient MRN lists from CSV files
- **Google Speech-to-Text Integration**: Real-time transcription of answers (Yes/No, dates, etc.)
- **Translucent Overlay**: Always-on-top, click-through overlay showing MRN details, questions, and transcribed answers
- **Live Transcription**: Real-time display of speech recognition with confidence indicators
- **Response Processing**: Automatic classification of Yes/No responses and date parsing
- **Export Functionality**: Save questionnaire responses to CSV format

## Requirements

- Node.js 16+ 
- Google Cloud Speech-to-Text API credentials
- Microphone access

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Google Speech-to-Text**:
   - Create a Google Cloud project and enable Speech-to-Text API
   - Create a service account and download the JSON credentials file
   - Place the credentials file as `google-credentials.json` in the project root
   - Update `config.json` with the path to your credentials:
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

3. **Prepare CSV Files**:
   - **Questions CSV**: Should have columns `id` and `text`
   - **Patients CSV**: Should have columns `mrn` and `name`
   - Example files are provided in the `examples/` directory

## Usage

1. **Start the Application**:
   ```bash
   npm start
   ```

2. **Load Data**:
   - Use the main window to load your questions and patients CSV files
   - The application will validate and import the data

3. **Open Overlay**:
   - Click "Toggle Overlay" to show the speech overlay window
   - The overlay will appear as a translucent, always-on-top window

4. **Conduct Questionnaire**:
   - The overlay shows the current patient MRN and question
   - Speak your answers naturally (Yes/No, dates, etc.)
   - Live transcription appears in real-time
   - Use the "Test" button to simulate speech input
   - Navigate through questions using the controls

5. **Export Results**:
   - After completing questionnaires, export responses to CSV
   - Results include timestamps, confidence scores, and processed answers

## Controls

- **Reset**: Clear current response and restart question
- **Next**: Move to next question (or start listening if no response)
- **Pause**: Pause/resume speech recognition
- **Test**: Simulate speech input for testing
- **Keyboard Shortcuts**:
  - `Space`: Start/stop listening
  - `Enter`: Next question
  - `Escape`: Pause
  - `Ctrl+S`: Check transcription status

## Architecture

The application consists of:

- **Main Process**: Electron main process handling Google Speech API, audio capture, and data management
- **Overlay Renderer**: Translucent overlay window for questionnaire display
- **Main Renderer**: Primary application window for configuration and data loading
- **Preload Scripts**: Secure IPC bridge between main and renderer processes

## File Structure

```
src/
├── main/                    # Main process (Node.js/Electron)
│   ├── main.ts             # Application entry point
│   ├── WindowManager.ts    # Window management
│   ├── GoogleSpeech*.ts    # Speech recognition services
│   ├── AudioCaptureHandler.ts # Audio capture
│   ├── DataManager*.ts     # Data management
│   └── *Parser.ts          # CSV parsing utilities
├── renderer/               # Renderer processes (Browser/UI)
│   ├── overlay.html/ts     # Speech overlay
│   ├── index.html          # Main window
│   └── renderer.ts         # Main window logic
├── preload/                # Preload scripts (IPC bridge)
├── config/                 # Configuration management
└── shared/                 # Shared types and utilities
```

## Development

- **Build**: `npm run build`
- **Development**: `npm run dev` (with hot reload)
- **Production**: `npm start`

## Troubleshooting

1. **No Speech Recognition**:
   - Check microphone permissions
   - Verify Google Speech API credentials
   - Check network connectivity

2. **Audio Issues**:
   - Ensure microphone is not being used by other applications
   - Check audio device settings
   - Try restarting the application

3. **CSV Loading Issues**:
   - Verify CSV format matches expected columns
   - Check file encoding (UTF-8 recommended)
   - Ensure files are not locked by other applications

## Documentation

- [Architecture Guide](ARCHITECTURE.md) - Detailed system architecture
- [Code Integration Guide](CODE_INTEGRATION_GUIDE.md) - How components work together

## License

MIT License