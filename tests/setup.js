// Testing Library setup for React components
import '@testing-library/jest-dom';

// Mock Electron APIs that might be used in renderer components
global.window = global.window || {};
global.window.api = {
  selectFolder: jest.fn(),
  importMusic: jest.fn(),
  getTracks: jest.fn(),
  getAlbums: jest.fn(),
  getPlaylists: jest.fn(),
  updateTrack: jest.fn(),
  createPlaylist: jest.fn(),
  onImportProgress: jest.fn(),
};

// Mock Web Audio API for AudioEngine tests
class MockAudioBuffer {
  constructor(options = {}) {
    this.duration = options.duration || 180;
    this.length = options.length || 44100 * this.duration;
    this.sampleRate = options.sampleRate || 44100;
    this.numberOfChannels = options.numberOfChannels || 2;
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.onended = null;
    this._connected = false;
    this._started = false;
    this._stopped = false;
  }

  connect(destination) {
    this._connected = true;
    return destination;
  }

  disconnect() {
    this._connected = false;
  }

  start(when = 0, offset = 0) {
    this._started = true;
    this._startWhen = when;
    this._startOffset = offset;
  }

  stop() {
    this._stopped = true;
    this._started = false;
  }
}

class MockGainNode {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: jest.fn((value, time) => {
        this.gain.value = value;
      }),
    };
    this._connected = false;
  }

  connect(destination) {
    this._connected = true;
    return destination;
  }

  disconnect() {
    this._connected = false;
  }
}

class MockAnalyserNode {
  constructor() {
    this.fftSize = 2048;
    this._connected = false;
  }

  connect(destination) {
    this._connected = true;
    return destination;
  }

  disconnect() {
    this._connected = false;
  }

  getByteFrequencyData(array) {
    // Fill with mock data
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { _isMockDestination: true };
    this._sourceNodes = [];
  }

  createBufferSource() {
    const source = new MockAudioBufferSourceNode();
    this._sourceNodes.push(source);
    return source;
  }

  createGain() {
    return new MockGainNode();
  }

  createAnalyser() {
    return new MockAnalyserNode();
  }

  async decodeAudioData(arrayBuffer) {
    // Simulate decoding delay
    await new Promise(resolve => setTimeout(resolve, 0));
    return new MockAudioBuffer({ duration: 180 });
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

// Expose mocks globally
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock fetch for file:// protocol
global.fetch = jest.fn((url) => {
  if (url.startsWith('file://')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  }
  return Promise.reject(new Error('Network error'));
});
