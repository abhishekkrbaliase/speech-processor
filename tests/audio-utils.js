/**
 * Audio Utilities for Testing
 * Handles audio file conversion and processing for unit tests
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AudioTestUtils {
  /**
   * Convert M4A file to LINEAR16 PCM format for Google Speech API
   * @param {string} inputPath - Path to M4A file
   * @param {string} outputPath - Path for output WAV file
   * @param {number} sampleRate - Target sample rate (default: 16000)
   * @returns {Promise<boolean>} - Success status
   */
  static async convertM4AToWAV(inputPath, outputPath, sampleRate = 16000) {
    return new Promise((resolve, reject) => {
      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`Input file not found: ${inputPath}`));
        return;
      }

      // Use ffmpeg to convert M4A to WAV with specific format
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,           // Input file
        '-ar', sampleRate.toString(), // Sample rate
        '-ac', '1',                // Mono channel
        '-f', 'wav',               // WAV format
        '-acodec', 'pcm_s16le',    // 16-bit PCM
        '-y',                      // Overwrite output
        outputPath                 // Output file
      ]);

      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Audio conversion successful: ${outputPath}`);
          resolve(true);
        } else {
          console.error(`❌ FFmpeg failed with code ${code}`);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg conversion failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg spawn error:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Read WAV file and extract LINEAR16 PCM data
   * @param {string} wavPath - Path to WAV file
   * @returns {Promise<ArrayBuffer>} - PCM audio data
   */
  static async readWAVFile(wavPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(wavPath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Parse WAV header (simplified)
          const buffer = Buffer.from(data);
          
          // Find data chunk (skip WAV header)
          let dataOffset = 44; // Standard WAV header size
          
          // Look for 'data' chunk marker
          for (let i = 12; i < buffer.length - 4; i++) {
            if (buffer.toString('ascii', i, i + 4) === 'data') {
              dataOffset = i + 8; // Skip 'data' + size (4 bytes each)
              break;
            }
          }

          // Extract PCM data
          const pcmData = buffer.slice(dataOffset);
          const arrayBuffer = pcmData.buffer.slice(
            pcmData.byteOffset,
            pcmData.byteOffset + pcmData.byteLength
          );

          console.log(`📊 WAV file read: ${pcmData.length} bytes of PCM data`);
          resolve(arrayBuffer);
        } catch (error) {
          reject(new Error(`Failed to parse WAV file: ${error.message}`));
        }
      });
    });
  }

  /**
   * Split audio buffer into chunks for streaming
   * @param {ArrayBuffer} audioBuffer - Full audio data
   * @param {number} chunkSize - Size of each chunk in bytes
   * @returns {ArrayBuffer[]} - Array of audio chunks
   */
  static splitIntoChunks(audioBuffer, chunkSize = 1600) {
    const chunks = [];
    const totalBytes = audioBuffer.byteLength;
    
    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const remainingBytes = Math.min(chunkSize, totalBytes - offset);
      const chunk = audioBuffer.slice(offset, offset + remainingBytes);
      chunks.push(chunk);
    }

    console.log(`📊 Audio split into ${chunks.length} chunks of ~${chunkSize} bytes each`);
    return chunks;
  }

  /**
   * Process test audio file for live transcription testing
   * @param {string} audioFilePath - Path to audio file (M4A)
   * @returns {Promise<Object>} - Processing result with chunks and metadata
   */
  static async processTestAudioFile(audioFilePath) {
    try {
      console.log(`🎵 Processing test audio file: ${audioFilePath}`);
      
      // Create temporary WAV file path
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const wavPath = path.join(tempDir, 'test-audio.wav');
      
      // Convert M4A to WAV
      await this.convertM4AToWAV(audioFilePath, wavPath);
      
      // Read WAV file as PCM data
      const audioBuffer = await this.readWAVFile(wavPath);
      
      // Split into chunks for streaming
      const chunks = this.splitIntoChunks(audioBuffer, 1600); // 100ms chunks
      
      // Calculate duration
      const sampleRate = 16000;
      const bytesPerSample = 2; // 16-bit
      const totalSamples = audioBuffer.byteLength / bytesPerSample;
      const durationSeconds = totalSamples / sampleRate;
      
      // Clean up temporary file
      try {
        fs.unlinkSync(wavPath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
      }
      
      const result = {
        chunks,
        metadata: {
          originalFile: audioFilePath,
          totalBytes: audioBuffer.byteLength,
          chunkCount: chunks.length,
          durationSeconds,
          sampleRate,
          channels: 1,
          bitDepth: 16
        }
      };
      
      console.log('✅ Audio processing complete:', result.metadata);
      return result;
      
    } catch (error) {
      console.error('❌ Audio processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if FFmpeg is available
   * @returns {Promise<boolean>} - True if FFmpeg is available
   */
  static async checkFFmpegAvailable() {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Create mock audio data for testing when real audio files aren't available
   * @param {number} durationMs - Duration in milliseconds
   * @param {number} sampleRate - Sample rate (default: 16000)
   * @returns {ArrayBuffer[]} - Array of audio chunks
   */
  static createMockAudioChunks(durationMs = 4000, sampleRate = 16000) {
    const totalSamples = Math.floor((durationMs / 1000) * sampleRate);
    const totalBytes = totalSamples * 2; // 16-bit samples
    const buffer = new ArrayBuffer(totalBytes);
    const view = new Int16Array(buffer);
    
    // Generate a simple sine wave pattern
    const frequency = 440; // A4 note
    for (let i = 0; i < totalSamples; i++) {
      const time = i / sampleRate;
      view[i] = Math.sin(2 * Math.PI * frequency * time) * 16384; // 50% volume
    }
    
    // Split into 100ms chunks
    return this.splitIntoChunks(buffer, 1600);
  }
}

module.exports = AudioTestUtils;