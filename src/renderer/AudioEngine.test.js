// AudioEngine tests
import AudioEngine from './AudioEngine';

describe('AudioEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AudioEngine();
    // Reset fetch mock
    global.fetch.mockClear();
  });

  afterEach(() => {
    if (engine) {
      engine.dispose();
    }
  });

  describe('initialization', () => {
    test('should create instance without AudioContext initially', () => {
      expect(engine.audioContext).toBeNull();
      expect(engine.isPlaying).toBe(false);
      expect(engine.currentTrack).toBeNull();
    });

    test('should initialize AudioContext on first use', () => {
      engine.initialize();

      expect(engine.audioContext).not.toBeNull();
      expect(engine.gainNode).not.toBeNull();
      expect(engine.analyserNode).not.toBeNull();
    });

    test('should not reinitialize if already initialized', () => {
      engine.initialize();
      const context = engine.audioContext;

      engine.initialize();

      expect(engine.audioContext).toBe(context);
    });
  });

  describe('loadTrack', () => {
    test('should load and decode audio file', async () => {
      const filePath = '/path/to/track.mp3';

      const track = await engine.loadTrack(filePath);

      expect(global.fetch).toHaveBeenCalledWith(`file://${filePath}`);
      expect(track).toBeDefined();
      expect(track.filePath).toBe(filePath);
      expect(track.duration).toBe(180); // Mock duration
      expect(track.buffer).toBeDefined();
    });

    test('should initialize AudioContext when loading', async () => {
      expect(engine.audioContext).toBeNull();

      await engine.loadTrack('/path/to/track.mp3');

      expect(engine.audioContext).not.toBeNull();
    });

    test('should stop current playback before loading new track', async () => {
      await engine.loadTrack('/path/to/track1.mp3');
      engine.play();

      expect(engine.isPlaying).toBe(true);

      await engine.loadTrack('/path/to/track2.mp3');

      expect(engine.isPlaying).toBe(false);
      expect(engine.pauseTime).toBe(0);
    });

    test('should throw error for failed fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(engine.loadTrack('/missing.mp3')).rejects.toThrow(
        'Failed to load track'
      );
    });

    test('should call onError callback on failure', async () => {
      const errorHandler = jest.fn();
      engine.onError = errorHandler;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      try {
        await engine.loadTrack('/missing.mp3');
      } catch (e) {
        // Expected
      }

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should start playback', () => {
      engine.play();

      expect(engine.isPlaying).toBe(true);
      expect(engine.sourceNode).not.toBeNull();
    });

    test('should not play without loaded track', () => {
      const emptyEngine = new AudioEngine();
      emptyEngine.play();

      expect(emptyEngine.isPlaying).toBe(false);
    });

    test('should not restart if already playing', () => {
      engine.play();
      const sourceNode = engine.sourceNode;

      engine.play();

      expect(engine.sourceNode).toBe(sourceNode);
    });

    test('should connect source to gain node', () => {
      engine.play();

      expect(engine.sourceNode._connected).toBe(true);
    });

    test('should start from pause position', () => {
      engine.pauseTime = 30;
      engine.play();

      expect(engine.sourceNode._startOffset).toBe(30);
    });
  });

  describe('pause', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should pause playback', () => {
      engine.play();
      engine.pause();

      expect(engine.isPlaying).toBe(false);
    });

    test('should save current time when pausing', () => {
      engine.play();
      // Simulate time passing
      engine.startTime = engine.audioContext.currentTime - 45;

      engine.pause();

      expect(engine.pauseTime).toBeCloseTo(45, 0);
    });

    test('should disconnect source node', () => {
      engine.play();
      engine.pause();

      expect(engine.sourceNode).toBeNull();
    });

    test('should do nothing if not playing', () => {
      engine.pause();

      expect(engine.isPlaying).toBe(false);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should stop playback', () => {
      engine.play();
      engine.stop();

      expect(engine.isPlaying).toBe(false);
    });

    test('should reset pause time to 0', () => {
      engine.play();
      engine.pauseTime = 30;

      engine.stop();

      expect(engine.pauseTime).toBe(0);
    });

    test('should clear source node', () => {
      engine.play();
      engine.stop();

      expect(engine.sourceNode).toBeNull();
    });
  });

  describe('getCurrentTime', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should return 0 when no track loaded', () => {
      const emptyEngine = new AudioEngine();
      expect(emptyEngine.getCurrentTime()).toBe(0);
    });

    test('should return pause time when paused', () => {
      engine.pauseTime = 60;

      expect(engine.getCurrentTime()).toBe(60);
    });

    test('should return elapsed time when playing', () => {
      engine.play();
      engine.startTime = engine.audioContext.currentTime - 30;

      expect(engine.getCurrentTime()).toBeCloseTo(30, 0);
    });

    test('should clamp to duration', () => {
      engine.play();
      // Simulate being past track end
      engine.startTime = engine.audioContext.currentTime - 200;

      expect(engine.getCurrentTime()).toBe(180); // Track duration
    });
  });

  describe('getDuration', () => {
    test('should return 0 when no track loaded', () => {
      expect(engine.getDuration()).toBe(0);
    });

    test('should return track duration', async () => {
      await engine.loadTrack('/path/to/track.mp3');

      expect(engine.getDuration()).toBe(180);
    });
  });

  describe('seek', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should update pause time when paused', () => {
      engine.seek(60);

      expect(engine.pauseTime).toBe(60);
    });

    test('should restart playback at new position when playing', () => {
      engine.play();

      engine.seek(90);

      expect(engine.isPlaying).toBe(true);
      expect(engine.sourceNode._startOffset).toBe(90);
    });

    test('should clamp time to valid range', () => {
      engine.seek(-10);
      expect(engine.pauseTime).toBe(0);

      engine.seek(300);
      expect(engine.pauseTime).toBe(180); // Track duration
    });

    test('should do nothing if no track loaded', () => {
      const emptyEngine = new AudioEngine();
      emptyEngine.seek(30);

      expect(emptyEngine.pauseTime).toBe(0);
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      engine.initialize();
    });

    test('should set volume', () => {
      engine.setVolume(0.5);

      expect(engine.gainNode.gain.setValueAtTime).toHaveBeenCalled();
    });

    test('should clamp volume to 0-1 range', () => {
      engine.setVolume(1.5);
      expect(engine.getVolume()).toBe(1);

      engine.setVolume(-0.5);
      expect(engine.getVolume()).toBe(0);
    });

    test('should return current volume', () => {
      engine.setVolume(0.75);

      expect(engine.getVolume()).toBe(0.75);
    });

    test('should return 1 if not initialized', () => {
      const uninitEngine = new AudioEngine();
      expect(uninitEngine.getVolume()).toBe(1);
    });
  });

  describe('track ended callback', () => {
    beforeEach(async () => {
      await engine.loadTrack('/path/to/track.mp3');
    });

    test('should call onTrackEnded when track finishes', () => {
      const callback = jest.fn();
      engine.onTrackEnded = callback;

      engine.play();

      // Simulate track ending
      engine.sourceNode.onended();

      expect(callback).toHaveBeenCalled();
      expect(engine.isPlaying).toBe(false);
      expect(engine.pauseTime).toBe(0);
    });

    test('should not call callback if stopped programmatically', () => {
      const callback = jest.fn();
      engine.onTrackEnded = callback;

      engine.play();
      engine.stop();

      // The onended would fire, but isPlaying is false
      if (engine.sourceNode?.onended) {
        engine.sourceNode.onended();
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    test('hasTrack should return track status', async () => {
      expect(engine.hasTrack()).toBe(false);

      await engine.loadTrack('/path/to/track.mp3');

      expect(engine.hasTrack()).toBe(true);
    });

    test('getIsPlaying should return playing status', async () => {
      await engine.loadTrack('/path/to/track.mp3');

      expect(engine.getIsPlaying()).toBe(false);

      engine.play();

      expect(engine.getIsPlaying()).toBe(true);
    });

    test('getAnalyser should return analyser node', () => {
      engine.initialize();

      expect(engine.getAnalyser()).toBe(engine.analyserNode);
    });
  });

  describe('dispose', () => {
    test('should clean up all resources', async () => {
      await engine.loadTrack('/path/to/track.mp3');
      engine.play();

      engine.dispose();

      expect(engine.audioContext).toBeNull();
      expect(engine.gainNode).toBeNull();
      expect(engine.analyserNode).toBeNull();
      expect(engine.currentTrack).toBeNull();
      expect(engine.isPlaying).toBe(false);
    });
  });

  describe('ensureContextRunning', () => {
    test('should resume suspended context', async () => {
      engine.initialize();
      engine.audioContext.state = 'suspended';

      await engine.ensureContextRunning();

      expect(engine.audioContext.state).toBe('running');
    });

    test('should initialize if not yet initialized', async () => {
      expect(engine.audioContext).toBeNull();

      await engine.ensureContextRunning();

      expect(engine.audioContext).not.toBeNull();
    });
  });
});
