import { EventEmitter } from 'events';
import { AppError } from '../shared/types';
import { logger } from '../shared/logger';

export interface AudioSegment {
  audioBuffer: ArrayBuffer;
  timestamp: number;
  duration: number;
  isSpeech: boolean;
}

export interface VoiceActivityResult {
  isSpeaking: boolean;
  confidence: number;
  timestamp: number;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface AudioCaptureOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  deviceId?: string;
  threshold?: number; // Voice activity detection threshold
}

export interface AudioCaptureHandler {
  startListening(options?: AudioCaptureOptions): Promise<void>;
  stopListening(): void;
  getAudioBuffer(): ArrayBuffer | null;
  getAvailableDevices(): Promise<AudioDevice[]>;
  onAudioDetected(callback: (audio: ArrayBuffer) => void): void;
  onError(callback: (error: Error) => void): void;
  isListening(): boolean;
}

export class CrossPlatformAudioCaptureHandler extends EventEmitter implements AudioCaptureHandler {
  private isRecording: boolean = false;
  private audioBuffer: Buffer[] = [];
  private recordingProcess: any = null;
  private vadThreshold: number = 0.02;
  private options: AudioCaptureOptions = {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    threshold: 0.01
  };

  constructor() {
    super();
    this.setupErrorHandling();
  }

  /**
   * Start listening for audio input
   */
  async startListening(options?: AudioCaptureOptions): Promise<void> {
    if (this.isRecording) {
      throw new AppError('Audio capture is already active', 'AUDIO_ALREADY_ACTIVE', 'audio');
    }

    // Merge options with defaults
    this.options = { ...this.options, ...options };

    try {
      // Check for microphone permissions first
      await this.checkMicrophonePermissions();

      // Start recording based on platform
      if (process.platform === 'darwin' || process.platform === 'linux') {
        await this.startUnixRecording();
      } else if (process.platform === 'win32') {
        await this.startWindowsRecording();
      } else {
        throw new AppError(`Unsupported platform: ${process.platform}`, 'UNSUPPORTED_PLATFORM', 'audio');
      }

      this.isRecording = true;
      console.log('Audio capture started successfully');
      this.emit('started');

    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw new AppError(
        `Failed to start audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUDIO_START_FAILED',
        'audio'
      );
    }
  }

  /**
   * Stop listening for audio input
   */
  stopListening(): void {
    if (!this.isRecording) {
      return;
    }

    try {
      // Stop mock audio if running
      if (this.mockAudioInterval) {
        clearInterval(this.mockAudioInterval);
        this.mockAudioInterval = null;
        logger.info('🛑 Mock audio capture stopped', {}, 'AUDIO-CAPTURE');
      }

      // Stop real recording process if running
      if (this.recordingProcess && typeof this.recordingProcess.kill === 'function') {
        this.recordingProcess.kill();
        this.recordingProcess = null;
        logger.info('🛑 Real audio capture stopped', {}, 'AUDIO-CAPTURE');
      }

      this.isRecording = false;
      console.log('Audio capture stopped');
      this.emit('stopped');

    } catch (error) {
      console.error('Error stopping audio capture:', error);
      this.emit('error', new AppError(
        `Failed to stop audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUDIO_STOP_FAILED',
        'audio'
      ));
    }
  }

  /**
   * Get the current audio buffer
   */
  getAudioBuffer(): ArrayBuffer | null {
    if (this.audioBuffer.length === 0) {
      return null;
    }

    // Combine all buffer chunks
    const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = Buffer.concat(this.audioBuffer, totalLength);
    
    // Clear the buffer after reading
    this.audioBuffer = [];

    // Convert to ArrayBuffer
    return combinedBuffer.buffer.slice(
      combinedBuffer.byteOffset,
      combinedBuffer.byteOffset + combinedBuffer.byteLength
    );
  }

  /**
   * Get available audio input devices
   */
  async getAvailableDevices(): Promise<AudioDevice[]> {
    try {
      // This is a simplified implementation
      // In a real-world scenario, you'd use platform-specific APIs to enumerate devices
      const devices: AudioDevice[] = [
        {
          id: 'default',
          name: 'Default Microphone',
          isDefault: true
        }
      ];

      // On macOS, we could use system_profiler to get more device info
      if (process.platform === 'darwin') {
        // Add macOS-specific device enumeration if needed
        devices.push({
          id: 'built-in',
          name: 'Built-in Microphone',
          isDefault: false
        });
      }

      return devices;
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      throw new AppError(
        `Failed to get audio devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEVICE_ENUMERATION_FAILED',
        'audio'
      );
    }
  }

  /**
   * Register callback for audio detection
   */
  onAudioDetected(callback: (audio: ArrayBuffer) => void): void {
    this.on('audioDetected', callback);
  }

  /**
   * Register callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.isRecording;
  }

  /**
   * Check microphone permissions (platform-specific)
   */
  private async checkMicrophonePermissions(): Promise<void> {
    // This is a simplified permission check
    // In a real implementation, you'd use platform-specific APIs
    
    if (process.platform === 'darwin') {
      // On macOS, we could check permissions using system APIs
      // For now, we'll assume permissions are granted
      console.log('Checking macOS microphone permissions...');
    } else if (process.platform === 'win32') {
      // On Windows, we could check permissions using Windows APIs
      console.log('Checking Windows microphone permissions...');
    }

    // Simulate permission check
    return Promise.resolve();
  }

  /**
   * Start recording on Unix-like systems (macOS, Linux)
   */
  private async startUnixRecording(): Promise<void> {
    try {
      logger.info('🎤 Starting Unix audio recording', { platform: process.platform }, 'AUDIO-CAPTURE');
      
      // Use node-record-lpcm16 for Unix systems
      const record = require('node-record-lpcm16');
      
      // Try different recording programs for macOS
      let recordProgram = 'arecord'; // Default for Linux
      
      if (process.platform === 'darwin') {
        // For macOS, try sox first, then fall back to ffmpeg
        try {
          const { execSync } = require('child_process');
          (execSync as any)('which sox', { stdio: 'ignore' });
          recordProgram = 'sox';
          logger.info('✅ Using sox for macOS recording', {}, 'AUDIO-CAPTURE');
        } catch {
          try {
            const { execSync } = require('child_process');
            (execSync as any)('which ffmpeg', { stdio: 'ignore' });
            recordProgram = 'ffmpeg';
            logger.info('✅ Using ffmpeg for macOS recording', {}, 'AUDIO-CAPTURE');
          } catch {
            // Fall back to system audio - create a simple mock for testing
            logger.warn('⚠️ No audio recording program found, using mock audio', {}, 'AUDIO-CAPTURE');
            this.startMockAudioCapture();
            return;
          }
        }
      }
      
      const recordingOptions = {
        sampleRateHertz: this.options.sampleRate,
        threshold: this.options.threshold,
        verbose: false,
        recordProgram: recordProgram,
        silence: '1.0',
        device: this.options.deviceId || null
      };

      logger.info('🎤 Starting recording with options', recordingOptions, 'AUDIO-CAPTURE');
      this.recordingProcess = record.record(recordingOptions);

      // Handle audio data
      this.recordingProcess.stream().on('data', (chunk: Buffer) => {
        this.handleAudioChunk(chunk);
      });

      // Handle errors
      this.recordingProcess.stream().on('error', (error: Error) => {
        logger.error('❌ Recording stream error', { error: error.message }, 'AUDIO-CAPTURE');
        this.emit('error', new AppError(
          `Recording stream error: ${error.message}`,
          'RECORDING_STREAM_ERROR',
          'audio'
        ));
      });

      logger.info('✅ Unix recording started successfully', {}, 'AUDIO-CAPTURE');

    } catch (error) {
      logger.error('❌ Failed to start Unix recording', { error }, 'AUDIO-CAPTURE');
      throw new AppError(
        `Failed to start Unix recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNIX_RECORDING_FAILED',
        'audio'
      );
    }
  }

  /**
   * Start mock audio capture for testing when no recording program is available
   */
  private startMockAudioCapture(): void {
    logger.info('🎤 Starting mock audio capture for testing', {}, 'AUDIO-CAPTURE');
    
    // Generate mock audio data every 100ms
    this.mockAudioInterval = setInterval(() => {
      // Create a buffer with some random audio-like data
      const bufferSize = Math.floor(this.options.sampleRate! * 0.1 * 2); // 100ms of 16-bit audio for low latency
      const mockBuffer = Buffer.alloc(bufferSize);
      
      // Fill with some random data that simulates audio
      for (let i = 0; i < bufferSize; i += 2) {
        const sample = Math.floor(Math.random() * 1000 - 500); // Random audio sample
        mockBuffer.writeInt16LE(sample, i);
      }
      
      this.handleAudioChunk(mockBuffer);
    }, 100);
    
    this.isRecording = true;
    logger.info('✅ Mock audio capture started', {}, 'AUDIO-CAPTURE');
  }

  private mockAudioInterval: NodeJS.Timeout | null = null;

  /**
   * Start recording on Windows
   */
  private async startWindowsRecording(): Promise<void> {
    try {
      // Use node-record-lpcm16 for Windows as well
      const record = require('node-record-lpcm16');
      
      const recordingOptions = {
        sampleRateHertz: this.options.sampleRate,
        threshold: this.options.threshold,
        verbose: false,
        recordProgram: 'sox', // or 'rec' if available
        silence: '1.0',
        device: this.options.deviceId || null
      };

      this.recordingProcess = record.record(recordingOptions);

      // Handle audio data
      this.recordingProcess.stream().on('data', (chunk: Buffer) => {
        this.handleAudioChunk(chunk);
      });

      // Handle errors
      this.recordingProcess.stream().on('error', (error: Error) => {
        this.emit('error', new AppError(
          `Recording stream error: ${error.message}`,
          'RECORDING_STREAM_ERROR',
          'audio'
        ));
      });

    } catch (error) {
      throw new AppError(
        `Failed to start Windows recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WINDOWS_RECORDING_FAILED',
        'audio'
      );
    }
  }

  /**
   * Handle incoming audio chunks
   */
  private handleAudioChunk(chunk: Buffer): void {
    // Add chunk to buffer
    this.audioBuffer.push(chunk);

    // Simple audio processing - emit audio data directly
    try {
      const audioBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      
      // Simple voice activity detection based on audio level
      const audioLevel = this.calculateAudioLevel(chunk);
      
      console.log('🎤 AUDIO CAPTURE LOG:', {
        chunkSize: chunk.length,
        audioBufferSize: audioBuffer.byteLength,
        audioLevel: audioLevel.toFixed(4),
        vadThreshold: this.vadThreshold,
        isAboveThreshold: audioLevel > this.vadThreshold,
        timestamp: new Date().toISOString()
      });
      
      if (audioLevel > this.vadThreshold) {
        const audioData = {
          audioBufferSize: audioBuffer.byteLength,
          audioLevel: audioLevel.toFixed(4),
          confidence: Math.min(audioLevel * 10, 1.0).toFixed(2)
        };
        
        logger.info('🔊 AUDIO DETECTED - Emitting audio data', audioData, 'AUDIO-CAPTURE');
        console.log('🔊 AUDIO DETECTED - Emitting audio data:', audioData);
        
        this.emit('audioDetected', audioBuffer);
        this.emit('speechSegment', {
          audioBuffer: audioBuffer,
          timestamp: Date.now(),
          confidence: Math.min(audioLevel * 10, 1.0), // Convert level to confidence
          duration: audioBuffer.byteLength / (this.options.sampleRate || 16000) / 2,
          isSpeech: true
        });
      } else {
        // Log silence detection occasionally
        if (Math.random() < 0.01) { // 1% of the time
          const silenceData = {
            audioLevel: audioLevel.toFixed(4),
            vadThreshold: this.vadThreshold
          };
          logger.debug('🔇 SILENCE DETECTED - Audio level below threshold', silenceData, 'AUDIO-CAPTURE');
          console.log('🔇 SILENCE DETECTED - Audio level below threshold:', silenceData);
        }
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      // Fallback to basic processing
      const audioLevel = this.calculateAudioLevel(chunk);
      if (audioLevel > (this.options.threshold || 0.01)) {
        const audioData = this.getAudioBuffer();
        if (audioData) {
          this.emit('audioDetected', audioData);
        }
      }
    }

    // Limit buffer size to prevent memory issues (keep last 5 seconds)
    const maxBufferSize = (this.options.sampleRate || 16000) * 5 * 2; // 5 seconds * 2 bytes per sample
    let totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    
    while (totalSize > maxBufferSize && this.audioBuffer.length > 1) {
      const removed = this.audioBuffer.shift();
      if (removed) {
        totalSize -= removed.length;
      }
    }
  }

  /**
   * Calculate audio level for voice activity detection
   */
  private calculateAudioLevel(buffer: Buffer): number {
    if (buffer.length === 0) return 0;

    let sum = 0;
    // Assuming 16-bit PCM audio
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      sum += Math.abs(sample);
    }

    // Normalize to 0-1 range
    const average = sum / (buffer.length / 2);
    return average / 32768; // 16-bit max value
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('Audio capture error:', error);
      // Stop recording on error
      if (this.isRecording) {
        this.stopListening();
      }
    });

    // Handle process exit
    process.on('exit', () => {
      this.stopListening();
    });

    process.on('SIGINT', () => {
      this.stopListening();
      process.exit(0);
    });
  }

  /**
   * Convert audio buffer to format expected by AI model
   */
  convertToModelFormat(audioBuffer: ArrayBuffer): Float32Array {
    // Convert from 16-bit PCM to Float32Array expected by Transformers.js
    const int16Array = new Int16Array(audioBuffer);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      // Normalize from 16-bit integer to float (-1.0 to 1.0)
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    return float32Array;
  }



  /**
   * Get enhanced audio capture statistics
   */
  getStatistics(): { 
    bufferSize: number; 
    isRecording: boolean; 
    sampleRate: number;
    processorStats: any;
  } {
    const bufferSize = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    return {
      bufferSize,
      isRecording: this.isRecording,
      sampleRate: this.options.sampleRate || 16000,
      processorStats: { chunksProcessed: this.audioBuffer.length }
    };
  }

  /**
   * Update audio processing options
   */
  updateProcessingOptions(options: any): void {
    if (options.vadThreshold !== undefined) {
      this.vadThreshold = options.vadThreshold;
    }
    if (options.sampleRate !== undefined) {
      this.options.sampleRate = options.sampleRate;
    }
  }

  /**
   * Reset audio processor
   */
  resetProcessor(): void {
    this.audioBuffer = [];
  }
}