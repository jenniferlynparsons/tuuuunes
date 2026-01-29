// AudioEngine - Web Audio API wrapper for audio playback
// Handles loading, decoding, and playback of audio files

/**
 * Audio playback engine using Web Audio API
 * Supports MP3, FLAC, and M4A formats
 */
class AudioEngine {
  constructor() {
    // Create AudioContext lazily to avoid autoplay restrictions
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;

    // Track state
    this.currentTrack = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;

    // Callbacks
    this.onTrackEnded = null;
    this.onError = null;
  }

  /**
   * Initialize the AudioContext (must be called after user gesture)
   */
  initialize() {
    if (this.audioContext) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();

    // Create analyser node for future visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;

    // Connect gain → analyser → destination
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  /**
   * Ensure AudioContext is running (handle browser autoplay policy)
   */
  async ensureContextRunning() {
    if (!this.audioContext) {
      this.initialize();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Load and decode an audio file
   * @param {string} filePath - Absolute path to the audio file
   * @returns {Promise<Object>} Track object with buffer and metadata
   */
  async loadTrack(filePath) {
    await this.ensureContextRunning();

    // Stop any currently playing track
    if (this.isPlaying) {
      this.stop();
    }

    try {
      // Fetch the audio file using file protocol
      const response = await fetch(`file://${filePath}`);

      if (!response.ok) {
        throw new Error(`Failed to load audio file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.currentTrack = {
        buffer: audioBuffer,
        filePath: filePath,
        duration: audioBuffer.duration
      };

      // Reset playback position
      this.pauseTime = 0;

      return this.currentTrack;
    } catch (error) {
      const wrappedError = new Error(`Failed to load track: ${error.message}`);
      if (this.onError) {
        this.onError(wrappedError);
      }
      throw wrappedError;
    }
  }

  /**
   * Start or resume playback
   */
  play() {
    if (!this.currentTrack) {
      console.warn('AudioEngine: No track loaded');
      return;
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    this.ensureContextRunning();

    // Create new source node (BufferSource can only be used once)
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.currentTrack.buffer;

    // Connect source → gain (gain is already connected to destination)
    this.sourceNode.connect(this.gainNode);

    // Start playback from pause position
    const offset = this.pauseTime;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;

    // Handle track end
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        // Track ended naturally (not stopped programmatically)
        this.isPlaying = false;
        this.pauseTime = 0;

        if (this.onTrackEnded) {
          this.onTrackEnded();
        }
      }
    };
  }

  /**
   * Pause playback
   */
  pause() {
    if (!this.sourceNode || !this.isPlaying) {
      return;
    }

    // Save current position before stopping
    this.pauseTime = this.getCurrentTime();

    // Stop the source node
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;

    this.isPlaying = false;
  }

  /**
   * Stop playback and reset position
   */
  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Source may already be stopped
      }
      this.sourceNode = null;
    }

    this.pauseTime = 0;
    this.isPlaying = false;
  }

  /**
   * Get current playback time in seconds
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
    if (!this.currentTrack) {
      return 0;
    }

    if (!this.isPlaying) {
      return this.pauseTime;
    }

    const elapsed = this.audioContext.currentTime - this.startTime;
    // Clamp to duration to handle edge cases
    return Math.min(elapsed, this.currentTrack.duration);
  }

  /**
   * Get track duration in seconds
   * @returns {number} Duration in seconds, or 0 if no track loaded
   */
  getDuration() {
    return this.currentTrack ? this.currentTrack.duration : 0;
  }

  /**
   * Seek to a specific time
   * @param {number} time - Time in seconds to seek to
   */
  seek(time) {
    if (!this.currentTrack) {
      return;
    }

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, this.currentTrack.duration));

    const wasPlaying = this.isPlaying;

    // Stop current playback
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Source may already be stopped
      }
      this.sourceNode = null;
      this.isPlaying = false;
    }

    // Update pause time
    this.pauseTime = clampedTime;

    // Resume if was playing
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set playback volume
   * @param {number} value - Volume from 0.0 to 1.0
   */
  setVolume(value) {
    // Clamp value to valid range
    const clampedValue = Math.max(0, Math.min(1, value));

    if (this.gainNode) {
      // Use setValueAtTime for smooth transition without clicks
      this.gainNode.gain.setValueAtTime(
        clampedValue,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Get current volume
   * @returns {number} Current volume (0.0 to 1.0)
   */
  getVolume() {
    return this.gainNode ? this.gainNode.gain.value : 1;
  }

  /**
   * Get analyser node for visualization
   * @returns {AnalyserNode|null} The analyser node or null if not initialized
   */
  getAnalyser() {
    return this.analyserNode;
  }

  /**
   * Check if a track is currently loaded
   * @returns {boolean} True if a track is loaded
   */
  hasTrack() {
    return this.currentTrack !== null;
  }

  /**
   * Check if audio is currently playing
   * @returns {boolean} True if playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
    this.analyserNode = null;
    this.currentTrack = null;
    this.onTrackEnded = null;
    this.onError = null;
  }
}

export default AudioEngine;
