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
    isPaused: false
};

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
    var pauseBtn = document.getElementById('pause-btn');
    var testBtn = document.getElementById('test-btn');

    console.log('🔍 OVERLAY-NEW: Button elements found:', {
        resetBtn: !!resetBtn,
        nextBtn: !!nextBtn,
        pauseBtn: !!pauseBtn,
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

    // Pause button
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            console.log('⏸️ OVERLAY-NEW: PAUSE BUTTON CLICKED!');
            console.log('📍 Timestamp:', new Date().toISOString());
            handlePause();
        });
    }

    // Test button - MOST IMPORTANT
    if (testBtn) {
        testBtn.addEventListener('click', function() {
            console.log('🧪 OVERLAY-NEW: TEST BUTTON CLICKED!');
            console.log('📍 Timestamp:', new Date().toISOString());
            console.log('🔍 Current State:', overlayState);
            
            // Immediate visual feedback
            var responseDisplay = document.getElementById('response-display');
            if (responseDisplay) {
                responseDisplay.textContent = 'TEST BUTTON WORKS!';
                responseDisplay.style.color = '#4CAF50';
            }
            
            // Call the full test
            handleTest();
        });
        console.log('✅ OVERLAY-NEW: Test button event listener attached');
    } else {
        console.error('❌ OVERLAY-NEW: Test button not found!');
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
    
    // Update status
    var statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = overlayState.isListening ? 'Listening...' : 'Ready';
    }
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
            
            // Update Test button to show it's now a Start/Stop toggle
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
        
        var statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = 'Listening - Speak now!';
        }
        
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
        
        // Calculate audio level
        var sum = 0;
        for (var i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
        }
        var rms = Math.sqrt(sum / inputData.length);
        
        // Improved speech detection with better threshold
        var speechThreshold = 0.005; // Lower threshold for better sensitivity
        var isSpeech = rms > speechThreshold;
        
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
        
        // Adaptive processing based on speech patterns
        if (bufferDuration >= 1.5 && silenceDuration >= 0.8) {
            // Quick processing for short responses (Yes/No)
            shouldProcess = true;
            reason = 'short response detected';
        } else if (bufferDuration >= 3.0 && silenceDuration >= 1.2) {
            // Medium processing for dates/times
            shouldProcess = true;
            reason = 'medium response detected';
        } else if (bufferDuration >= 6.0) {
            // Force processing for long responses
            shouldProcess = true;
            reason = 'long response - force processing';
        }
        
        if (shouldProcess && speechDetected && !isProcessing && audioBuffer.length > 8000) {
            console.log('🎤 OVERLAY-NEW: Processing audio buffer:', bufferDuration.toFixed(1) + 's (' + reason + ')');
            processAudioBuffer();
        }
    };
    
    // Connect audio nodes
    microphone.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
}

function processAudioBuffer() {
    if (audioBuffer.length === 0 || isProcessing) return;
    
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
                    
                    var statusText = document.getElementById('status-text');
                    if (statusText) {
                        statusText.textContent = 'Captured: ' + Math.round(confidence * 100) + '% confidence';
                    }
                    
                } else {
                    console.log('ℹ️ OVERLAY-NEW: No transcription result');
                }
            }).catch(function(error) {
                console.error('❌ OVERLAY-NEW: Processing failed:', error);
            }).finally(function() {
                // Reset for next chunk
                audioBuffer = [];
                speechDetected = false;
                silenceCounter = 0;
                isProcessing = false;
            });
        } else {
            console.log('❌ OVERLAY-NEW: No electronAPI available for processing');
            // Reset anyway
            audioBuffer = [];
            speechDetected = false;
            silenceCounter = 0;
            isProcessing = false;
        }
        
    } catch (error) {
        console.error('❌ OVERLAY-NEW: Audio processing error:', error);
        audioBuffer = [];
        speechDetected = false;
        silenceCounter = 0;
        isProcessing = false;
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
    
    var statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = 'Ready';
    }
    
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
    
    var statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = 'Ready';
    }
    
    overlayState.isListening = false;
}

function handleNext() {
    console.log('▶️ OVERLAY-NEW: Moving to next question...');
    
    // Move to next question
    overlayState.currentQuestionIndex++;
    
    // Check if we need to move to next patient
    if (overlayState.currentQuestionIndex >= overlayState.questions.length) {
        overlayState.currentQuestionIndex = 0;
        overlayState.currentPatientIndex++;
        
        // Check if we're done with all patients
        if (overlayState.currentPatientIndex >= overlayState.patients.length) {
            console.log('🎉 OVERLAY-NEW: All questionnaires completed!');
            alert('All questionnaires completed!');
            return;
        }
    }
    
    // Reset response for new question
    overlayState.currentResponse = null;
    
    // Update display
    updateDisplay();
    handleReset();
}

function handlePause() {
    console.log('⏸️ OVERLAY-NEW: Toggling pause state...');
    overlayState.isPaused = !overlayState.isPaused;
    
    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.textContent = overlayState.isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    
    if (overlayState.isPaused) {
        // Stop audio capture when paused
        stopBrowserAudioCapture();
        var statusText = document.getElementById('status-text');
        if (statusText) statusText.textContent = 'Paused';
    } else {
        // Resume audio capture when unpaused
        if (overlayState.questions.length > 0) {
            startBrowserAudioCapture();
        }
    }
}

// Global error handlers
window.addEventListener('error', function(event) {
    console.error('❌ OVERLAY-NEW: Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ OVERLAY-NEW: Unhandled promise rejection:', event.reason);
});

console.log('🎯 OVERLAY-NEW: Script loaded completely');