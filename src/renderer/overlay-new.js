// Simple overlay JavaScript - no TypeScript, no modules, just plain JS
console.log('🚀 OVERLAY-NEW.JS: Script starting...');
console.log('📍 Timestamp:', new Date().toISOString());

// Global state
let overlayState = {
    patients: [],
    questions: [],
    currentPatientIndex: 0,
    currentQuestionIndex: 0,
    currentResponse: null,
    isListening: false,
    isPaused: false,
    allQuestionnairesCompleted: false
};

// Helper function to update visual indicators
function updateStatusIndicator(state) {
    var indicator = document.getElementById('status-indicator');
    if (!indicator) return;
    
    indicator.className = 'status-indicator';
    if (state === 'listening') {
        indicator.classList.add('listening');
    } else if (state === 'processing') {
        indicator.classList.add('processing');
    } else if (state === 'error') {
        indicator.classList.add('error');
    }
}

// Helper function to update confidence indicator
function updateConfidenceIndicator(confidence) {
    var indicator = document.getElementById('confidence-indicator');
    if (!indicator) return;
    
    if (confidence === null || confidence === undefined) {
        indicator.textContent = '';
        return;
    }
    
    var percent = Math.round(confidence * 100);
    if (percent >= 80) {
        indicator.textContent = '✓✓';
        indicator.style.color = '#4CAF50';
    } else if (percent >= 60) {
        indicator.textContent = '✓';
        indicator.style.color = '#FF9800';
    } else {
        indicator.textContent = '?';
        indicator.style.color = '#F44336';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ OVERLAY-NEW: DOMContentLoaded fired');
    
    try {
        initializeOverlay();
        setupEventListeners();
        updateDisplay();
        console.log('🎉 OVERLAY-NEW: Initialization complete');
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Initialization failed:', error);
    }
});

function initializeOverlay() {
    console.log('🔧 OVERLAY-NEW: Initializing...');
    
    // Initialize opacity slider to set initial overlay opacity
    console.log('🔧 OVERLAY-NEW: Initializing opacity slider...');
    var opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
        var initialOpacity = opacitySlider.value / 100;
        console.log('🔍 OVERLAY-NEW: Initial opacity value:', initialOpacity);
        
        // Set initial window opacity
        if (window.electronAPI && window.electronAPI.setWindowOpacity) {
            window.electronAPI.setWindowOpacity(initialOpacity);
            console.log('🎨 OVERLAY-NEW: Setting initial window opacity to:', initialOpacity);
        } else {
            // Fallback to body opacity if window API not available
            var body = document.body;
            if (body) {
                body.style.opacity = initialOpacity;
                console.log('🎨 OVERLAY-NEW: Setting initial body opacity to:', initialOpacity, '(fallback)');
            }
        }
    } else {
        console.error('❌ OVERLAY-NEW: Opacity slider not found during initialization!');
    }
    
    // Load data from main process
    if (window.dataManager) {
        console.log('📊 OVERLAY-NEW: Loading data...');
        window.dataManager.getAllPatients().then(function(patients) {
            overlayState.patients = patients;
            console.log('✅ OVERLAY-NEW: Patients loaded:', patients.length);
            updateDisplay();
        }).catch(function(error) {
            console.error('❌ OVERLAY-NEW: Failed to load patients:', error);
        });
        
        window.dataManager.getAllQuestions().then(function(questions) {
            overlayState.questions = questions;
            console.log('✅ OVERLAY-NEW: Questions loaded:', questions.length);
            updateDisplay();
        }).catch(function(error) {
            console.error('❌ OVERLAY-NEW: Failed to load questions:', error);
        });
    } else {
        console.warn('⚠️ OVERLAY-NEW: DataManager not available');
    }
}

function setupEventListeners() {
    console.log('🔧 OVERLAY-NEW: Setting up event listeners...');
    
    // Get button elements
    var resetBtn = document.getElementById('reset-btn');
    var nextBtn = document.getElementById('next-btn');
    var testBtn = document.getElementById('test-btn');

    console.log('🔍 OVERLAY-NEW: Button elements found:', {
        resetBtn: !!resetBtn,
        nextBtn: !!nextBtn,
        testBtn: !!testBtn
    });

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('🔄 OVERLAY-NEW: RESET BUTTON CLICKED!');
            console.log('📍 Timestamp:', new Date().toISOString());
            handleReset();
        });
    }

    // Next button
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            console.log('▶️ OVERLAY-NEW: NEXT BUTTON CLICKED!');
            console.log('📍 Timestamp:', new Date().toISOString());
            handleNext();
        });
    }

    // Start/Pause button - Combined functionality
    if (testBtn) {
        testBtn.addEventListener('click', function() {
            console.log('🚀 OVERLAY-NEW: START/PAUSE BUTTON CLICKED!');
            console.log('📍 Timestamp:', new Date().toISOString());
            console.log('🔍 Current State:', overlayState);
            
            // Toggle between start and pause
            if (overlayState.isPaused || !overlayState.isRecording) {
                // Start/Resume
                var responseDisplay = document.getElementById('response-display');
                if (responseDisplay) {
                    responseDisplay.textContent = 'START BUTTON WORKS!';
                    responseDisplay.style.color = '#4CAF50';
                }
                handleTest();
            } else {
                // Pause
                handlePause();
            }
        });
        console.log('✅ OVERLAY-NEW: Start/Pause button event listener attached');
    } else {
        console.error('❌ OVERLAY-NEW: Start/Pause button not found!');
    }

    // Opacity slider
    var opacitySlider = document.getElementById('opacity-slider');
    console.log('🔍 OVERLAY-NEW: Opacity slider element:', opacitySlider);
    if (opacitySlider) {
        console.log('🔍 OVERLAY-NEW: Initial slider value:', opacitySlider.value);
        
        opacitySlider.addEventListener('input', function() {
            // Map slider value (44-100) to opacity (0.44-1.0)
            var opacity = this.value / 100;
            console.log('🎚️ OVERLAY-NEW: Slider changed to:', this.value, 'opacity:', opacity);
            
            // Set window opacity (affects the entire window including background)
            if (window.electronAPI && window.electronAPI.setWindowOpacity) {
                window.electronAPI.setWindowOpacity(opacity);
                console.log('🎨 OVERLAY-NEW: Setting window opacity to:', opacity);
            } else {
                // Fallback to body opacity if window API not available
                var body = document.body;
                if (body) {
                    body.style.opacity = opacity;
                    console.log('🎨 OVERLAY-NEW: Setting body opacity to:', opacity, '(fallback)');
                }
            }
            
            // Enable click-through when opacity is very low (less than 50% = 0.5)
            if (window.electronAPI && window.electronAPI.setClickThrough) {
                var enableClickThrough = opacity < 0.5;
                console.log('🖱️ OVERLAY-NEW: Setting click-through:', enableClickThrough);
                window.electronAPI.setClickThrough(enableClickThrough);
            }
        });
        
        // Trigger initial update
        var initialEvent = new Event('input');
        opacitySlider.dispatchEvent(initialEvent);
        
        console.log('✅ OVERLAY-NEW: Opacity slider event listener attached');
    } else {
        console.error('❌ OVERLAY-NEW: Opacity slider not found!');
    }

    console.log('✅ OVERLAY-NEW: Event listeners setup complete');
}

function updateDisplay() {
    console.log('🖥️ OVERLAY-NEW: Updating display...');
    
    // Update patient info
    var patientMrn = document.getElementById('patient-mrn');
    var patientName = document.getElementById('patient-name');
    var progressText = document.getElementById('progress-text');
    
    if (overlayState.patients.length > 0) {
        var patient = overlayState.patients[overlayState.currentPatientIndex];
        if (patientMrn) patientMrn.textContent = 'MRN: ' + patient.mrn;
        if (patientName) patientName.textContent = patient.name;
        if (progressText) progressText.textContent = (overlayState.currentQuestionIndex + 1) + '/' + overlayState.questions.length;
        
        console.log('👤 OVERLAY-NEW: Patient displayed:', {
            mrn: patient.mrn,
            name: patient.name,
            progress: (overlayState.currentQuestionIndex + 1) + '/' + overlayState.questions.length
        });
    }
    
    // Update question
    var questionText = document.getElementById('question-text');
    if (overlayState.questions.length > 0) {
        var question = overlayState.questions[overlayState.currentQuestionIndex];
        if (questionText) questionText.textContent = question.text;
        
        console.log('❓ OVERLAY-NEW: Question displayed:', question.text);
    }
    
    // Update status indicator
    updateStatusIndicator(overlayState.isListening ? 'listening' : null);
}

function handleTest() {
    console.log('🧪 OVERLAY-NEW: Starting comprehensive test...');
    
    try {
        // Test 1: Check APIs
        console.log('🧪 TEST 1: Checking available APIs...');
        console.log('   - window.electronAPI:', !!window.electronAPI);
        console.log('   - window.dataManager:', !!window.dataManager);
        console.log('   - navigator.mediaDevices:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        
        // Test 2: Start browser-based audio capture (like the working version)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            console.log('🧪 TEST 2: Starting browser-based audio capture...');
            
            // Update Start button to show it's now a Start/Stop toggle
            var testBtn = document.getElementById('test-btn');
            if (testBtn) {
                if (isListening) {
                    testBtn.textContent = '🛑 Stop';
                    testBtn.className = 'control-button danger';
                    stopBrowserAudioCapture();
                } else {
                    testBtn.textContent = '🎤 Start';
                    testBtn.className = 'control-button test';
                    startBrowserAudioCapture();
                }
            }
        } else {
            console.error('❌ OVERLAY-NEW: Browser audio APIs not available');
        }
        
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Test failed:', error);
        
        var responseDisplay = document.getElementById('response-display');
        if (responseDisplay) {
            responseDisplay.textContent = 'TEST FAILED: ' + error.message;
        }
    }
}

// Browser-based audio capture (like the working google-speech-test.html)
var audioContext = null;
var microphone = null;
var scriptProcessor = null;
var audioBuffer = [];
var isListening = false;
var speechDetected = false;
var silenceCounter = 0;
var isProcessing = false;
var lastStatusUpdate = 0;
var audioLevelHistory = [];
var maxBufferDuration = 4.0; // Maximum buffer duration in seconds (reduced from 7.7s)

function startBrowserAudioCapture() {
    console.log('🎤 OVERLAY-NEW: Starting browser audio capture...');
    
    // First, initialize the Google Speech service
    if (window.electronAPI && window.electronAPI.initializeAI) {
        console.log('🤖 OVERLAY-NEW: Initializing Google Speech service...');
        window.electronAPI.initializeAI().then(function(initResult) {
            console.log('📊 OVERLAY-NEW: AI initialization result:', initResult);
            
            if (initResult.success) {
                console.log('✅ OVERLAY-NEW: Google Speech service initialized, starting audio capture...');
                startMicrophoneCapture();
            } else {
                console.error('❌ OVERLAY-NEW: Failed to initialize Google Speech service:', initResult.error);
                var responseDisplay = document.getElementById('response-display');
                if (responseDisplay) {
                    responseDisplay.textContent = 'Speech service initialization failed';
                }
            }
        }).catch(function(error) {
            console.error('❌ OVERLAY-NEW: AI initialization error:', error);
            var responseDisplay = document.getElementById('response-display');
            if (responseDisplay) {
                responseDisplay.textContent = 'Speech service error';
            }
        });
    } else {
        console.error('❌ OVERLAY-NEW: ElectronAPI not available');
        var responseDisplay = document.getElementById('response-display');
        if (responseDisplay) {
            responseDisplay.textContent = 'ElectronAPI not available';
        }
    }
}

function startMicrophoneCapture() {
    console.log('🎤 OVERLAY-NEW: Starting microphone capture...');
    
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
        } 
    }).then(function(stream) {
        console.log('✅ OVERLAY-NEW: Microphone access granted');
        
        // Set up audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });
        
        setupAudioProcessing(stream);
        
        isListening = true;
        overlayState.isListening = true;
        
        // Update UI
        var responseDisplay = document.getElementById('response-display');
        if (responseDisplay) {
            responseDisplay.textContent = 'Listening for speech...';
            responseDisplay.classList.add('listening');
        }
        
        updateStatusIndicator('listening');
        
        console.log('🎉 OVERLAY-NEW: Browser audio capture started successfully');
        
    }).catch(function(error) {
        console.error('❌ OVERLAY-NEW: Microphone access failed:', error);
        
        var responseDisplay = document.getElementById('response-display');
        if (responseDisplay) {
            responseDisplay.textContent = 'Microphone access denied';
        }
    });
}

function setupAudioProcessing(stream) {
    microphone = audioContext.createMediaStreamSource(stream);
    
    // Create audio processor
    var bufferSize = 4096;
    scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    scriptProcessor.onaudioprocess = function(event) {
        if (!isListening) return;
        
        var inputData = event.inputBuffer.getChannelData(0);
        
        // Calculate audio level (RMS)
        var sum = 0;
        for (var i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
        }
        var rms = Math.sqrt(sum / inputData.length);
        
        // Audio quality monitoring
        var speechThreshold = 0.005; // Lower threshold for better sensitivity
        var noiseThreshold = 0.001;   // Minimum level to detect microphone working
        var isSpeech = rms > speechThreshold;
        var hasAudio = rms > noiseThreshold;
        
        // Monitor microphone health
        if (!hasAudio && audioBuffer.length === 0) {
            // No audio detected - show error indicator
            if (Date.now() - lastStatusUpdate > 3000) {
                updateStatusIndicator('error');
                lastStatusUpdate = Date.now();
            }
            return; // Skip processing if no audio at all
        }
        
        if (isSpeech) {
            speechDetected = true;
            silenceCounter = 0;
            
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
                console.log('🗣️ OVERLAY-NEW: Speech detected, level:', rms.toFixed(4));
            }
        } else {
            silenceCounter++;
        }
        
        // Collect audio data only when speech is detected or recently detected
        if (isSpeech || silenceCounter < 20) { // Keep collecting for 20 frames after speech stops
            for (var i = 0; i < inputData.length; i++) {
                audioBuffer.push(inputData[i]);
            }
        }
        
        // Improved processing timing for better accuracy
        var bufferDuration = audioBuffer.length / audioContext.sampleRate;
        var silenceDuration = silenceCounter * (inputData.length / audioContext.sampleRate);
        
        var shouldProcess = false;
        var reason = '';
        
        // Enhanced adaptive processing with audio quality validation
        if (bufferDuration >= 1.2 && silenceDuration >= 0.6) {
            // Quick processing for short responses (Yes/No) - reduced thresholds
            shouldProcess = true;
            reason = 'short response detected';
        } else if (bufferDuration >= 2.5 && silenceDuration >= 1.0) {
            // Medium processing for dates/times - reduced from 3.0s
            shouldProcess = true;
            reason = 'medium response detected';
        } else if (bufferDuration >= maxBufferDuration) {
            // Force processing before buffer gets too long (4.0s instead of 6.0s)
            shouldProcess = true;
            reason = 'max buffer duration reached - preventing quality degradation';
        }
        
        // Audio quality validation before processing
        if (shouldProcess && speechDetected && !isProcessing && audioBuffer.length > 8000) {
            // Check if buffer has sufficient speech content
            var speechRatio = calculateSpeechRatio(audioBuffer);
            if (speechRatio < 0.1) {
                // Buffer is mostly silence - don't process
                console.log('⚠️ OVERLAY-NEW: Skipping processing - insufficient speech content (' + Math.round(speechRatio * 100) + '%)');
                audioBuffer = []; // Clear buffer and wait for better audio
                speechDetected = false;
                return;
            }
        }
        
        if (shouldProcess && speechDetected && !isProcessing && audioBuffer.length > 8000) {
            console.log('🎤 OVERLAY-NEW: Processing audio buffer:', bufferDuration.toFixed(1) + 's (' + reason + ')');
            processAudioBufferWithQualityCheck();
        }
    };
    
    // Connect audio nodes
    microphone.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
}

// Helper function to calculate speech content ratio in audio buffer
function calculateSpeechRatio(buffer) {
    if (buffer.length === 0) return 0;
    
    var speechSamples = 0;
    var speechThreshold = 0.005;
    
    // Analyze in chunks to get better speech detection
    var chunkSize = 1024;
    for (var i = 0; i < buffer.length; i += chunkSize) {
        var chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
        
        // Calculate RMS for this chunk
        var sum = 0;
        for (var j = 0; j < chunk.length; j++) {
            sum += chunk[j] * chunk[j];
        }
        var rms = Math.sqrt(sum / chunk.length);
        
        if (rms > speechThreshold) {
            speechSamples += chunk.length;
        }
    }
    
    return speechSamples / buffer.length;
}

// Enhanced audio processing with quality checks
function processAudioBufferWithQualityCheck() {
    if (audioBuffer.length === 0 || isProcessing) return;
    
    // Don't process audio if all questionnaires are completed
    if (overlayState.allQuestionnairesCompleted) {
        console.log('ℹ️ OVERLAY-NEW: All questionnaires completed - skipping Google Speech API call');
        resetAudioBuffer();
        return;
    }
    
    isProcessing = true;
    
    try {
        // Pre-process audio: remove silence from beginning and end
        var cleanedBuffer = removeLeadingTrailingSilence(audioBuffer);
        
        if (cleanedBuffer.length < 4000) {
            // Buffer too short after cleaning - likely just noise
            console.log('⚠️ OVERLAY-NEW: Buffer too short after silence removal, skipping');
            resetAudioBuffer();
            return;
        }
        
        // Convert to ArrayBuffer for processing
        var float32Array = new Float32Array(cleanedBuffer);
        var arrayBuffer = float32Array.buffer;
        
        console.log('🎤 OVERLAY-NEW: Processing', cleanedBuffer.length, 'audio samples (cleaned from', audioBuffer.length, ')');
        
        // Check if we have electronAPI for processing
        if (window.electronAPI && window.electronAPI.processAudioStream) {
            window.electronAPI.processAudioStream(arrayBuffer).then(function(result) {
                if (result.success && result.response && result.response.rawText) {
                    var text = result.response.rawText.trim();
                    var confidence = result.response.confidence || 0;
                    
                    console.log('✅ OVERLAY-NEW: Transcribed:', text, '(' + Math.round(confidence * 100) + '% confidence)');
                    
                    // Update UI with result
                    var responseDisplay = document.getElementById('response-display');
                    if (responseDisplay) {
                        responseDisplay.textContent = '"' + text + '"';
                        responseDisplay.style.color = '#4CAF50';
                    }
                    
                    updateStatusIndicator(null);
                    updateConfidenceIndicator(confidence);
                    
                } else {
                    console.log('ℹ️ OVERLAY-NEW: No transcription result - trying shorter buffer next time');
                    
                    // Show error indicator
                    updateStatusIndicator('error');
                }
            }).catch(function(error) {
                console.error('❌ OVERLAY-NEW: Processing failed:', error);
                updateStatusIndicator('error');
            }).finally(function() {
                resetAudioBuffer();
            });
        } else {
            console.error('❌ OVERLAY-NEW: electronAPI not available');
            resetAudioBuffer();
        }
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Buffer processing error:', error);
        resetAudioBuffer();
    }
}

// Helper function to remove silence from beginning and end of audio buffer
function removeLeadingTrailingSilence(buffer) {
    if (buffer.length === 0) return buffer;
    
    var silenceThreshold = 0.002;
    var start = 0;
    var end = buffer.length - 1;
    
    // Find start of speech (skip leading silence)
    for (var i = 0; i < buffer.length; i++) {
        if (Math.abs(buffer[i]) > silenceThreshold) {
            start = Math.max(0, i - 1000); // Keep a small buffer before speech
            break;
        }
    }
    
    // Find end of speech (skip trailing silence)
    for (var i = buffer.length - 1; i >= 0; i--) {
        if (Math.abs(buffer[i]) > silenceThreshold) {
            end = Math.min(buffer.length - 1, i + 1000); // Keep a small buffer after speech
            break;
        }
    }
    
    return buffer.slice(start, end + 1);
}

// Helper function to reset audio buffer and state
function resetAudioBuffer() {
    audioBuffer = [];
    speechDetected = false;
    silenceCounter = 0;
    isProcessing = false;
}

function processAudioBuffer() {
    if (audioBuffer.length === 0 || isProcessing) return;
    
    // Don't process audio if all questionnaires are completed
    if (overlayState.allQuestionnairesCompleted) {
        console.log('ℹ️ OVERLAY-NEW: All questionnaires completed - skipping Google Speech API call');
        resetAudioBuffer();
        return;
    }
    
    isProcessing = true;
    
    try {
        // Convert to ArrayBuffer for processing
        var float32Array = new Float32Array(audioBuffer);
        var arrayBuffer = float32Array.buffer;
        
        console.log('🎤 OVERLAY-NEW: Processing', audioBuffer.length, 'audio samples');
        
        // Check if we have electronAPI for processing
        if (window.electronAPI && window.electronAPI.processAudioStream) {
            window.electronAPI.processAudioStream(arrayBuffer).then(function(result) {
                if (result.success && result.response && result.response.rawText) {
                    var text = result.response.rawText.trim();
                    var confidence = result.response.confidence || 0;
                    
                    console.log('✅ OVERLAY-NEW: Transcribed:', text, '(' + Math.round(confidence * 100) + '% confidence)');
                    
                    // Update UI with result
                    var responseDisplay = document.getElementById('response-display');
                    if (responseDisplay) {
                        responseDisplay.textContent = '"' + text + '"';
                        responseDisplay.style.color = '#4CAF50';
                    }
                    
                    updateConfidenceIndicator(confidence);
                    
                } else {
                    console.log('ℹ️ OVERLAY-NEW: No transcription result');
                }
            }).catch(function(error) {
                console.error('❌ OVERLAY-NEW: Processing failed:', error);
            }).finally(function() {
                resetAudioBuffer();
            });
        } else {
            console.log('❌ OVERLAY-NEW: No electronAPI available for processing');
            resetAudioBuffer();
        }
        
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Audio processing error:', error);
        resetAudioBuffer();
    }
}

function stopBrowserAudioCapture() {
    console.log('🛑 OVERLAY-NEW: Stopping browser audio capture...');
    
    isListening = false;
    overlayState.isListening = false;
    
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    
    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    audioBuffer = [];
    speechDetected = false;
    silenceCounter = 0;
    
    // Update UI
    var responseDisplay = document.getElementById('response-display');
    if (responseDisplay) {
        responseDisplay.classList.remove('listening');
    }
    
    updateStatusIndicator(null);
    updateConfidenceIndicator(null);
    
    console.log('✅ OVERLAY-NEW: Browser audio capture stopped');
}

function handleReset() {
    console.log('🔄 OVERLAY-NEW: Resetting current question...');
    overlayState.currentResponse = null;
    
    var responseDisplay = document.getElementById('response-display');
    if (responseDisplay) {
        responseDisplay.textContent = 'Speak your answer...';
        responseDisplay.classList.remove('listening');
        responseDisplay.style.color = '';
    }
    
    updateStatusIndicator(null);
    updateConfidenceIndicator(null);
    
    overlayState.isListening = false;
}

async function handleNext() {
    console.log('▶️ OVERLAY-NEW: Next button clicked');
    
    // Step 1: Save the current response
    await saveCurrentResponse();
    
    // Step 2: Move to next question
    overlayState.currentQuestionIndex++;
    
    // Step 3: Check if we need to move to next patient
    if (overlayState.currentQuestionIndex >= overlayState.questions.length) {
        overlayState.currentQuestionIndex = 0;
        overlayState.currentPatientIndex++;
        
        // Step 4: Check if we're done with all patients
        if (overlayState.currentPatientIndex >= overlayState.patients.length) {
            console.log('🎉 OVERLAY-NEW: All questionnaires completed!');
            overlayState.allQuestionnairesCompleted = true;
            
            // Stop any ongoing audio capture
            if (overlayState.isListening) {
                stopBrowserAudioCapture();
            }
            
            await showExportDialog();
            return;
        }
    }
    
    // Step 5: Reset for new question
    overlayState.currentResponse = null;
    updateDisplay();
    handleReset();
}

function handlePause() {
    console.log('⏸️ OVERLAY-NEW: Toggling pause state...');
    overlayState.isPaused = !overlayState.isPaused;
    
    var testBtn = document.getElementById('test-btn');
    if (testBtn) {
        testBtn.textContent = overlayState.isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    
    if (overlayState.isPaused) {
        // Stop audio capture when paused
        stopBrowserAudioCapture();
        updateStatusIndicator(null);
    } else {
        // Resume audio capture when unpaused
        if (overlayState.questions.length > 0) {
            startBrowserAudioCapture();
        }
    }
}

// Helper function to determine response type
function determineResponseType(text) {
    var lowerText = text.toLowerCase().trim();
    
    // Check for yes/no responses
    if (lowerText.match(/^(yes|yeah|yep|y|true|correct|right)\.?$/)) {
        return 'yes';
    }
    if (lowerText.match(/^(no|nope|n|false|incorrect|wrong)\.?$/)) {
        return 'no';
    }
    
    // Check for not applicable responses
    if (lowerText.match(/^(not applicable|n\/a|na|none|not relevant)\.?$/)) {
        return 'not_applicable';
    }
    
    // Check for date/time patterns
    if (lowerText.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/) || // 12/31/2023, 12-31-23
        lowerText.match(/\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i) || // 1st January
        lowerText.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i) || // January 1
        lowerText.match(/\d{1,2}:\d{2}/) || // 12:30
        lowerText.match(/(morning|afternoon|evening|night|am|pm)/i) || // time indicators
        lowerText.match(/\d{4}/) // year
    ) {
        return 'date_time';
    }
    
    // Default to unclear for anything else
    return 'unclear';
}

// Step 1: Save current response function
async function saveCurrentResponse() {
    // Get the current displayed text (what the user sees)
    var responseDisplay = document.getElementById('response-display');
    var displayedText = responseDisplay ? responseDisplay.textContent.trim() : '';
    
    // Skip if no meaningful text
    if (!displayedText || displayedText === 'Speak your answer...' || displayedText === 'START BUTTON WORKS!') {
        console.log('⚠️ OVERLAY-NEW: No response to save - displayed text:', displayedText);
        return;
    }
    
    // Get current patient and question
    var currentPatient = overlayState.patients[overlayState.currentPatientIndex];
    var currentQuestion = overlayState.questions[overlayState.currentQuestionIndex];
    
    if (!currentPatient || !currentQuestion) {
        console.error('❌ OVERLAY-NEW: Missing patient or question data');
        return;
    }
    
    // Clean the displayed text (remove quotes)
    var cleanText = displayedText.replace(/"/g, '');
    
    // Determine correct response type based on content
    var responseType = determineResponseType(cleanText);
    
    // Create response object
    var response = {
        questionId: currentQuestion.id,
        patientMrn: currentPatient.mrn,
        rawText: cleanText,
        parsedValue: cleanText,
        responseType: responseType,
        confidence: 0.8,
        timestamp: new Date()
    };
    
    console.log('💾 OVERLAY-NEW: Saving response:', {
        patient: currentPatient.name + ' (' + currentPatient.mrn + ')',
        question: currentQuestion.text,
        answer: cleanText,
        responseType: responseType
    });
    
    try {
        // Save to DataManager
        await window.dataManager.addResponse(response);
        console.log('✅ OVERLAY-NEW: Response saved successfully');
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Failed to save response:', error);
    }
}

// Step 3: Show export dialog when all questions completed
async function showExportDialog() {
    console.log('📤 OVERLAY-NEW: Showing export dialog');
    
    // First, log what responses we have
    await logSavedResponses();
    
    // Create simple export dialog
    var dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
        z-index: 1000;
    `;
    
    dialog.innerHTML = `
        <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h2>🎉 All Questionnaires Completed!</h2>
            <p>All questions for all patients have been completed successfully.</p>
            <p>Would you like to export the captured answers?</p>
            <button id="export-csv-btn" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 10px; cursor: pointer;">
                📊 Export CSV
            </button>
            <button id="export-later-btn" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 10px; cursor: pointer;">
                Later
            </button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('export-csv-btn').addEventListener('click', async function() {
        await handleExportCSV();
        document.body.removeChild(dialog);
    });
    
    document.getElementById('export-later-btn').addEventListener('click', function() {
        document.body.removeChild(dialog);
    });
}

// Step 4: Log what responses were saved (for debugging)
async function logSavedResponses() {
    try {
        var allResponses = await window.dataManager.getAllResponses();
        console.log('📋 OVERLAY-NEW: Retrieved responses for export:', allResponses.length);
        
        allResponses.forEach(function(response, index) {
            console.log('📝 OVERLAY-NEW: Response ' + (index + 1) + ':', {
                patient: response.patientMrn,
                question: response.questionId,
                answer: response.rawText
            });
        });
        
        return allResponses;
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Failed to retrieve responses:', error);
        return [];
    }
}

// Step 5: Handle CSV export
async function handleExportCSV() {
    console.log('📤 OVERLAY-NEW: Starting CSV export');
    
    var responses = await logSavedResponses();
    
    if (responses.length === 0) {
        alert('No responses found to export');
        return;
    }
    
    // Use the existing export manager
    var exportSettings = {
        format: 'csv',
        includeTimestamps: true,
        includeConfidence: true,
        includeRawText: true,
        includePatientDetails: true,
        includeQuestionDetails: true,
        sortBy: 'patient'
    };
    
    try {
        var exportResult = await window.exportManager.exportWithDialog(exportSettings);
        
        if (exportResult.success) {
            console.log('✅ OVERLAY-NEW: Export successful:', exportResult.filePath);
            alert('Export completed successfully!\nFile: ' + exportResult.filePath);
            
            // Close the overlay window after successful export
            console.log('🔒 OVERLAY-NEW: Closing overlay window after export');
            if (window.electron && window.electron.ipcRenderer) {
                window.electron.ipcRenderer.send('close-overlay');
            } else {
                window.close();
            }
        } else {
            console.error('❌ OVERLAY-NEW: Export failed:', exportResult.error);
            alert('Export failed: ' + exportResult.error);
        }
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Export error:', error);
        alert('Export error: ' + error.message);
    }
}

// Global error handlers
window.addEventListener('error', function(event) {
    console.error('❌ OVERLAY-NEW: Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ OVERLAY-NEW: Unhandled promise rejection:', event.reason);
});

// Test function to set a response manually (for testing)
function setTestResponse(text) {
    var responseDisplay = document.getElementById('response-display');
    if (responseDisplay) {
        responseDisplay.textContent = '"' + text + '"';
        responseDisplay.style.color = '#4CAF50';
    }
    console.log('🧪 OVERLAY-NEW: Test response set:', text);
}

// Expose for testing
window.setTestResponse = setTestResponse;

console.log('🎯 OVERLAY-NEW: Script loaded completely');