# Implementation Plan

- [x] 1. Fix high transcription lag - enable interim results for live display
  - Enable interim results in Google Speech API configuration
  - Display partial transcription results immediately as they arrive
  - Optimize audio streaming to reduce end-to-end latency
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 2. Fix button behavior - auto-start recording and toggle Start/Stop states
  - Auto-start recording when overlay loads (remove need to click Test button)
  - Change button text to "Stop" when recording, "Start" when paused
  - Add visual indicator showing current recording state
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Reduce empty transcription results - improve audio detection
  - Add audio level monitoring to detect if microphone is working
  - Implement silence detection and prompt user to speak if no audio
  - Add basic noise suppression to improve audio quality
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 4. Improve accuracy for "Yes" and date responses - add speech contexts
  - Add Google Speech contexts to boost "yes", "no", "yeah", "yep" recognition
  - Add speech contexts for common date patterns and month names
  - Configure enhanced model if available for better accuracy
  - _Requirements: 4.1, 4.2, 4.4_