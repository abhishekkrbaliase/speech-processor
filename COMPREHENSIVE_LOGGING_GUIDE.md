# Comprehensive Logging Guide for Speech Overlay App

## Overview
This document outlines all the comprehensive logging that has been added to track the speech overlay functionality, particularly focusing on button clicks, audio capture, and Google Speech-to-Text integration.

## 1. Overlay Display and Initialization Logging

### Location: `src/renderer/overlay.ts`

**When overlay loads:**
```
🚀 OVERLAY.TS SCRIPT STARTING TO LOAD!
📍 Timestamp: [timestamp]
✅ DOMContentLoaded fired
🔍 Button elements found: {testBtn: true, resetBtn: true, nextBtn: true, pauseBtn: true}
✅ Test button event listener attached
🎉 OVERLAY BUTTON EVENT LISTENERS ATTACHED!
🎯 OVERLAY.TS SCRIPT FULLY LOADED!
```

**Patient and Question Display:**
```
🖥️ LOGGING OVERLAY DISPLAY INFORMATION
👤 PATIENT INFORMATION DISPLAYED:
   - MRN: [patient MRN]
   - Name: [patient name]
   - Progress: [current/total]
❓ QUESTION INFORMATION DISPLAYED:
   - Question: [question text]
📊 STATUS INFORMATION DISPLAYED:
   - Status: [current status]
   - Response: [current response]
```

**Data Loading:**
```
📊 LOADING PATIENT AND QUESTION DATA...
✅ DATA LOADED SUCCESSFULLY:
   - Patients loaded: [number]
   - Questions loaded: [number]
👤 FIRST PATIENT DETAILS: [patient object]
❓ FIRST QUESTION DETAILS: [question object]
```

## 2. Button Click Logging

### All Button Clicks Are Logged:

**Test Button:**
```
🧪 TEST BUTTON CLICKED!
📍 Timestamp: [timestamp]
✅ Button click handler is working!
```

**Reset Button:**
```
🔄 RESET BUTTON CLICKED!
📍 Timestamp: [timestamp]
```

**Next Button:**
```
▶️ NEXT BUTTON CLICKED!
📍 Timestamp: [timestamp]
```

**Pause Button:**
```
⏸️ PAUSE BUTTON CLICKED!
📍 Timestamp: [timestamp]
```

## 3. Audio and Speech Test Logging

### When Test Button is Clicked:

**Test Sequence:**
```
🧪 STARTING AUDIO AND SPEECH TEST
📍 Timestamp: [timestamp]
✅ ElectronAPI available
🧪 TEST 1: Initializing live transcription...
📊 Live transcription init result: [result object]
🧪 TEST 2: Starting live transcription streaming...
📊 Streaming start result: [result object]
🧪 TEST 3: Starting audio capture...
📊 Audio capture result: [result object]
🧪 TEST 4: Sending dummy audio data...
📊 Audio send result: [result object]
🎉 AUDIO AND SPEECH TEST COMPLETED
```

## 4. Main Process Logging

### Location: `src/main/main.ts`

**Application Startup:**
```
🚀 SPEECH OVERLAY APP STARTING
📍 Timestamp: [timestamp]
✅ WindowManager initialized
✅ GoogleSpeechManager initialized
✅ LiveTranscriptionConfigManager initialized
✅ Live transcription config updated with Google Speech credentials
```

**Audio Capture IPC:**
```
🎤 IPC: AUDIO START CAPTURE CALLED
📍 Options: [audio options object]
✅ Audio capture started successfully
```

**Live Transcription Initialization:**
```
🎤 IPC: LIVE TRANSCRIPTION INITIALIZE CALLED
📋 Reloading live transcription configuration
🔍 Validating live transcription configuration
✅ Configuration validation passed
⚙️ Google Speech config for live transcription: [config object]
🎵 Initializing Google Speech Streaming Manager
```

**Audio Data Sent to Google Speech:**
```
📨 IPC: LIVE TRANSCRIPTION SEND AUDIO RECEIVED
📍 Audio chunk size: [bytes] bytes
🔍 State check: {hasStreamingManager: true, hasCurrentSession: true}
📤 SENDING TO GOOGLE SPEECH: [send data object]
✅ GOOGLE SPEECH AUDIO SENT SUCCESSFULLY
```

## 5. Audio Capture Logging

### Location: `src/main/AudioCaptureHandler.ts`

**Audio Detection:**
```
🔊 AUDIO DETECTED - Emitting audio data: {
  audioBufferSize: [bytes],
  audioLevel: [level],
  confidence: [confidence]
}
```

**Silence Detection:**
```
🔇 SILENCE DETECTED - Audio level below threshold: {
  audioLevel: [level],
  vadThreshold: [threshold]
}
```

## 6. Google Speech API Response Logging

### Location: `src/main/GoogleSpeechStreamingManager.ts`

**API Response Processing:**
```
📝 GOOGLE SPEECH RESULT DETAILS: {
  hasAlternative: true,
  isFinal: false,
  stability: [stability],
  alternativesCount: [count]
}
📄 GOOGLE SPEECH TRANSCRIPT: {
  transcript: "[transcribed text]",
  confidence: [confidence],
  isFinal: [boolean]
}
```

## 7. File Logging

### Location: `src/shared/logger.ts`

All console logs are also written to log files in the `logs/` directory:
- **File Location:** `logs/speech-overlay-[date].log`
- **Log Rotation:** Files are rotated when they exceed 10MB
- **Retention:** Up to 5 log files are kept

**Log Format:**
```
[timestamp] [LEVEL] [SOURCE] message | Data: {json data}
```

**Example:**
```
[2024-01-15T10:30:45.123Z] [INFO] [MAIN-IPC] 🎤 IPC: AUDIO START CAPTURE CALLED | Data: {"sampleRate":16000,"channels":1}
[2024-01-15T10:30:45.124Z] [INFO] [AUDIO-CAPTURE] 🔊 AUDIO DETECTED - Emitting audio data | Data: {"audioBufferSize":1024,"audioLevel":"0.0234"}
[2024-01-15T10:30:45.125Z] [INFO] [GOOGLE-SPEECH] 📄 GOOGLE SPEECH TRANSCRIPT | Data: {"transcript":"hello","confidence":0.95,"isFinal":false}
```

## 8. How to Use This Logging for Debugging

### Step 1: Check Overlay Loading
Look for these logs in the browser console when the overlay opens:
- `🚀 OVERLAY.TS SCRIPT STARTING TO LOAD!`
- `✅ DOMContentLoaded fired`
- `🎉 OVERLAY BUTTON EVENT LISTENERS ATTACHED!`

### Step 2: Verify Button Clicks
Click the Test button and look for:
- `🧪 TEST BUTTON CLICKED!`
- If this doesn't appear, the event listener isn't working

### Step 3: Check Audio Pipeline
When Test button is clicked, look for this sequence:
1. `🧪 STARTING AUDIO AND SPEECH TEST`
2. `✅ ElectronAPI available`
3. `📊 Live transcription init result:`
4. `📊 Audio capture result:`
5. `📊 Audio send result:`

### Step 4: Monitor Audio Capture
In the main process console, look for:
- `🔊 AUDIO DETECTED - Emitting audio data`
- If you see only `🔇 SILENCE DETECTED`, the microphone isn't picking up audio

### Step 5: Check Google Speech Integration
Look for:
- `📨 IPC: LIVE TRANSCRIPTION SEND AUDIO RECEIVED`
- `✅ GOOGLE SPEECH AUDIO SENT SUCCESSFULLY`
- `📄 GOOGLE SPEECH TRANSCRIPT`

### Step 6: Review Log Files
Check the `logs/` directory for persistent logs that include all the above information with timestamps and structured data.

## 9. Common Issues and What to Look For

**No button click logs:** Event listeners not attached properly
**No audio detection:** Microphone permissions or audio capture issues
**No Google Speech responses:** API credentials or network issues
**Empty transcripts:** Audio quality or Google Speech configuration issues

This comprehensive logging system will help identify exactly where the speech recognition pipeline is failing.