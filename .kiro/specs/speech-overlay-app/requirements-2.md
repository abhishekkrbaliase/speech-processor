# Requirements Document

## Introduction

This document outlines the requirements for a cross-platform desktop application built using Electron that provides a translucent overlay interface for collecting speech-based responses to questionnaires. The application will process CSV data containing Medical Record Numbers (MRNs) and patient details, present questions through an overlay interface, and capture spoken responses using Google Cloud Speech-to-Text API for high-quality, real-time speech recognition. The application must be deployable on Windows and macOS and requires internet connectivity for speech processing, similar to how Cluely implements its overlay functionality.

## Requirements

### Requirement 1

**User Story:** As a healthcare administrator, I want to load patient data from a CSV file, so that I can process questionnaires for multiple patients efficiently.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL provide an interface to load a CSV file containing MRN, patient names, and other details
2. WHEN a CSV file is selected THEN the system SHALL validate the file format and display the number of records loaded
3. IF the CSV file is malformed THEN the system SHALL display clear error messages indicating the specific issues
4. WHEN CSV data is loaded THEN the system SHALL store the patient information in memory for questionnaire processing

### Requirement 2

**User Story:** As a healthcare administrator, I want to load a list of questions from a file, so that I can standardize the questionnaire process across all patients.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL provide an interface to load a questions file
2. WHEN questions are loaded THEN the system SHALL validate that each question is properly formatted
3. WHEN questions are loaded THEN the system SHALL display the total number of questions to be asked per patient
4. IF the questions file is invalid THEN the system SHALL display specific error messages

### Requirement 3

**User Story:** As a data collector, I want a translucent overlay interface that doesn't interfere with other applications, so that I can continue working while collecting responses.

#### Acceptance Criteria

1. WHEN the questionnaire mode is activated THEN the system SHALL display a translucent overlay window
2. WHEN the overlay is displayed THEN the system SHALL ensure it does not capture keyboard or mouse events intended for underlying applications
3. WHEN the overlay is active THEN the system SHALL remain always on top of other windows
4. WHEN the overlay is displayed THEN the system SHALL show the current question clearly and prominently
5. WHEN the overlay is active THEN the system SHALL display the current patient's MRN and name for context

### Requirement 4

**User Story:** As a data collector, I want to capture spoken responses in multiple English accents, so that I can accommodate diverse patient populations.

#### Acceptance Criteria

1. WHEN a question is displayed THEN the system SHALL begin listening for speech input automatically
2. WHEN speech is detected THEN the system SHALL stream audio to Google Cloud Speech-to-Text API for real-time transcription
3. WHEN processing speech THEN the system SHALL support multiple English accents including Indian, American, and Canadian variants
4. WHEN speech contains dates THEN the system SHALL recognize various date formats including "twelve september 1992 11 15 am"
5. WHEN speech is processed THEN the system SHALL categorize responses as Yes, No, Not Applicable, or specific date/time values
6. IF speech is unclear or unrecognizable THEN the system SHALL prompt the user to repeat their response
7. WHEN using Google Speech-to-Text THEN the system SHALL handle API authentication and network connectivity requirements

### Requirement 5

**User Story:** As a data collector, I want to see captured answers and reset them if needed, so that I can ensure accuracy before proceeding.

#### Acceptance Criteria

1. WHEN a response is captured THEN the system SHALL display the interpreted answer in the overlay
2. WHEN an answer is displayed THEN the system SHALL provide a reset button to clear the current response
3. WHEN the reset button is clicked THEN the system SHALL clear the current answer and restart speech listening
4. WHEN an answer is confirmed THEN the system SHALL automatically proceed to the next question
5. WHEN all questions for a patient are completed THEN the system SHALL automatically move to the next patient

### Requirement 6

**User Story:** As a system administrator, I want the application to be self-contained and portable, so that I can deploy it without requiring additional software installations.

#### Acceptance Criteria

1. WHEN the application is distributed THEN the system SHALL be packaged as a standalone Electron executable for Windows and macOS
2. WHEN the application is installed THEN the system SHALL NOT require Node.js, Python, or any other runtime to be pre-installed by the user
3. WHEN the application runs THEN the system SHALL include the Electron runtime and all dependencies within the package
4. WHEN the application is launched THEN the system SHALL initialize all Electron components and establish connection to Google Speech-to-Text API
5. WHEN the application starts THEN the system SHALL require internet connectivity for speech recognition functionality
6. WHEN Google API credentials are needed THEN the system SHALL provide secure credential management and configuration

### Requirement 7

**User Story:** As a data collector, I want to export collected responses, so that I can analyze the questionnaire results.

#### Acceptance Criteria

1. WHEN questionnaire collection is complete THEN the system SHALL provide an export function
2. WHEN data is exported THEN the system SHALL generate a CSV file containing MRN, patient details, questions, and responses
3. WHEN exporting data THEN the system SHALL include timestamps for each response
4. WHEN export is complete THEN the system SHALL display the location of the saved file

### Requirement 8

**User Story:** As a data collector, I want to pause and resume questionnaire sessions, so that I can handle interruptions without losing progress.

#### Acceptance Criteria

1. WHEN collecting responses THEN the system SHALL provide a pause function that stops speech listening
2. WHEN paused THEN the system SHALL save current progress automatically
3. WHEN resumed THEN the system SHALL continue from the exact question and patient where it was paused
4. WHEN the application is closed THEN the system SHALL save session state and restore it on next launch