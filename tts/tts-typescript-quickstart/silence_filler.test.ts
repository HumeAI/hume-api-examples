import { SilenceFiller } from './silence_filler';

describe('SilenceFiller', () => {
  const sampleRate = 48000;
  const bytesPerSample = 2;
  const msOfAudio = (ms: number) => ms * sampleRate / 1000; // Returns samples
  const msOfAudioBytes = (ms: number) => ms * bytesPerSample * sampleRate / 1000; // Returns bytes
  const prebufferBytes = msOfAudioBytes(200); // 200ms worth of audio

  // Helper function to create audio buffer with specific pattern
  const createAudioBuffer = (bytes: number, pattern: 'sine' | 'silence') => {
    const buffer = Buffer.alloc(bytes);
    if (pattern === 'sine') {
      for (let i = 0; i < bytes; i++) {
        buffer[i] = Math.floor(127 * Math.sin(i * 0.1)) + 128;
      }
    }
    return buffer;
  };

  // Helper function to validate buffer against expected segments
  const validateBufferSegments = (buffer: Buffer | null, expectedSegments: { type: 'sound' | 'silence', bytes: number }[]): void => {
    if (!buffer) {
      throw new Error('Buffer is null');
    }
    
    const totalExpectedBytes = expectedSegments.reduce((sum, segment) => sum + segment.bytes, 0);
    expect(buffer.length).toBe(totalExpectedBytes);
    
    let offset = 0;
    for (const segment of expectedSegments) {
      const segmentBuffer = buffer.subarray(offset, offset + segment.bytes);
      const zeroCount = segmentBuffer.filter(byte => byte === 0).length;
      const isSilence = zeroCount > segmentBuffer.length * 0.8;
      
      if (segment.type === 'silence') {
        expect(isSilence).toBe(true);
      } else {
        expect(isSilence).toBe(false);
      }
      
      offset += segment.bytes;
    }
  };

  test('simple', () => {
    const filler = new SilenceFiller(prebufferBytes, sampleRate, bytesPerSample);
    
    // Interspersed timeline: writes and reads in chronological order
    const timeline = [
      [0, 'write', msOfAudioBytes(300), 'sine'], // Write 300ms of audio
      [100, 'read', { type: 'sound', bytes: msOfAudioBytes(100) }],
      [200, 'read', { type: 'sound', bytes: msOfAudioBytes(100) }],
      [300, 'read', { type: 'sound', bytes: msOfAudioBytes(100) }],
      [400, 'read', { type: 'silence', bytes: msOfAudioBytes(100) }],
      [400, 'write', msOfAudioBytes(100), 'sine'],
      [600, 'read', [{ type: 'sound', bytes: msOfAudioBytes(100)}, { type: 'silence', bytes: msOfAudioBytes(100) }]],
      [700, 'read', [{ type: 'silence', bytes: msOfAudioBytes(100)}]],
    ];

    for (const [timestamp, action, ...args] of timeline) {
      if (action === 'write') {
        const [bytes, type] = args as [number, string];
        const audioBuffer = createAudioBuffer(bytes, type as 'sine' | 'silence');
        filler.writeAudio(audioBuffer, timestamp as number);
      } else if (action === 'read') {
        const [expectedResult] = args as [any];
        const result = filler.readAudio(timestamp as number);
        
        if (expectedResult === null) {
          expect(result).toBe(null);
        } else if (Array.isArray(expectedResult)) {
          // Handle mixed audio/silence results
          validateBufferSegments(result, expectedResult);
        } else {
          // Handle single result
          validateBufferSegments(result, [expectedResult]);
        }
      }
    }
  });
});