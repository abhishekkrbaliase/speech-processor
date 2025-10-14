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

- [x] 4. Improve accuracy for "Yes", "No" and date responses - add speech contexts
  - Add Google Speech contexts to boost "yes", "no", "yeah", "yep" recognition
  - Add speech contexts for common date patterns and month names. The dates can be called like "13th November 2025", "13th November 2025 11 AM". Note that there can be pauses between calling out these words
  - Configure enhanced model if available for better accuracy
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 5. Improve user experience
  - Disable Debug Tool.
  - The Overlay size is very big. 
      - The Font size of text (not patient details) can be reduced. 
      - Minimise the space taken by overlay by having intuitive buttons much smaller in size
  - Overlay should have a slider which can make the overlay upto completely transparent
  - Test button should be removed. This should be handled by current "Pause" button which can initially have text as "Start"
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 6. Implement CSV-driven dynamic speech contexts for enhanced accuracy
  - Parse question CSV to extract ExpectedResponseType for each question
  - Create dynamic speech context selection based on response type (yes_no, date_time, etc.)
  - Implement context switching when questions change to optimize for expected answer type
  - Add support for additional response types like numeric, text, multiple_choice
  - _Requirements: 4.1, 4.2, 4.4_