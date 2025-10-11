type Point2D = [number, number];
type MouthShape = Point2D[];

type PhonemeEvent = {
  phoneme: string;
  timestamp: number;
};

// I had GPT 5-pro generate some constant XY coordinates to represent the mouth shapes for each viseme, using
// `mirror` to enforce left-right symmetry.
function mirror(leftSide: [number, number][]): MouthShape {
  const centerX = 100;
  const [leftCorner, ...rest] = leftSide;

  const mirrored = rest
    .slice(0, -1) // exclude centerTop
    .map(([x, y]) => [2 * centerX - x, y] as [number, number])
    .reverse();

  const rightCorner: [number, number] = [2 * centerX - leftCorner![0], leftCorner![1]];

  const top = [leftCorner, ...rest, ...mirrored, rightCorner] as MouthShape;
  const bottom = [...top]
    .slice(1, -1) // exclude corners
    .reverse()
    .map(([x, y]) => [x, 150 - y] as [number, number]); // mirror vertically around baseline

  return [...top, ...bottom];
}

type Viseme =
  | 'sil'  // Silence
  | 'PP'   // P, B, M
  | 'FF'   // F, V
  | 'TH'   // Th
  | 'DD'   // D, T, N
  | 'KK'   // K, G
  | 'CH'   // Ch, J, Sh
  | 'SS'   // S, Z
  | 'NN'   // N, L
  | 'RR'   // R
  | 'AA'   // Ah
  | 'E'    // Eh, Ai
  | 'I'    // Ee
  | 'O'    // Oh
  | 'U';   // Oo

const VISEME_SHAPES: Record<Viseme, MouthShape> = {
  sil: mirror([
    [50, 75], [65, 74.8], [77, 74.8], [88, 74.8], [100, 74.8],
  ]),
  PP: mirror([
    [57, 75], [69.9, 74.6], [80.2, 74.5], [89.7, 74.3], [100, 74.1],
  ]),
  FF: mirror([
    [50, 75], [65, 72.5], [77, 72.4], [88, 72.3], [100, 72.0],
  ]),
  TH: mirror([
    [50, 75], [65, 72.8], [77, 72.7], [88, 72.4], [100, 71.9],
  ]),
  DD: mirror([
    [51, 75], [65.7, 74.0], [77.5, 73.9], [88.2, 73.6], [100, 73.2],
  ]),
  KK: mirror([
    [52, 75], [66.4, 73.5], [77.9, 73.4], [88.5, 73.1], [100, 72.6],
  ]),
  CH: mirror([
    [54, 75], [67.8, 73.8], [78.8, 73.7], [89.0, 73.5], [100, 73.3],
  ]),
  SS: mirror([
    [47, 75], [62.9, 73.2], [75.6, 73.1], [87.3, 73.0], [100, 72.7],
  ]),
  NN: mirror([
    [51, 75], [65.7, 74.5], [77.5, 74.4], [88.2, 74.1], [100, 73.8],
  ]),
  RR: mirror([
    [56, 75], [69.2, 73.0], [79.8, 72.9], [89.4, 72.8], [100, 72.6],
  ]),
  AA: mirror([
    [50, 75], [65, 62.0], [77, 61.7], [88, 60.8], [100, 59.7],
  ]),
  E: mirror([
    [49, 75], [64.3, 69.5], [76.5, 69.3], [87.8, 68.8], [100, 68.2],
  ]),
  I: mirror([
    [47, 75], [62.9, 72.0], [75.6, 71.8], [87.3, 71.3], [100, 70.7],
  ]),
  O: mirror([
    [57, 75], [69.9, 68.5], [80.2, 68.3], [89.7, 67.8], [100, 67.2],
  ]),
  U: mirror([
    [59, 75], [71.3, 69.5], [81.1, 69.4], [90.2, 69.0], [100, 68.5],
  ]),
};

const PHONEME_MAP: Array<[Viseme, string[]]> = [
  ['sil', ['', 'pau', 'sil']],              // Silence
  ['PP', ['p', 'b', 'm']],                  // Bilabial stops
  ['FF', ['f', 'v']],                       // Labiodental fricatives
  ['TH', ['th', 'dh', 'θ', 'ð']],           // Dental fricatives
  ['DD', ['t', 'd', 'n', 'ɾ']],             // Alveolar stops and taps
  ['KK', ['k', 'g', 'ɡ', 'ng', 'ŋ']],       // Velar stops
  ['CH', ['ch', 'jh', 'sh', 'zh', 'ʃ', 'ʒ', 'dʒ']], // Post-alveolar affricates/fricatives
  ['SS', ['s', 'z']],                       // Alveolar fricatives
  ['NN', ['l']],                            // Alveolar approximants
  ['RR', ['r', 'ɹ', 'ɚ', 'ɝ']],             // Rhotic
  ['AA', ['aa', 'ah', 'ao', 'ɑ', 'ɑː', 'a', 'aː', 'ʌ', 'ɐ']], // Open vowels
  ['E', ['eh', 'ae', 'ay', 'ey', 'ɛ', 'æ', 'eɪ', 'aɪ', 'aʊ']], // Mid vowels
  ['I', ['ih', 'iy', 'ee', 'i', 'iː', 'ɪ', 'j', 'y']], // Close front vowels + semi-vowel y
  ['O', ['oh', 'ow', 'oy', 'oʊ', 'ɔ', 'ɔː', 'ɒ']], // Back rounded vowels
  ['U', ['uh', 'uw', 'oo', 'u', 'uː', 'ʊ', 'ə', 'w']], // Close back rounded + semi-vowel w
];

function phonemeToViseme(phoneme: string): Viseme {
  for (const [viseme, phonemes] of PHONEME_MAP) {
    if (phonemes.includes(phoneme)) return viseme;
  }
  console.warn(`Unknown phoneme: ${phoneme}, defaulting to silence`);
  return 'sil';
}

const interpolatePoint = (a: Point2D, x: Point2D, t: number): Point2D =>
  [a[0] + (x[0] - a[0]) * t, a[1] + (x[1] - a[1]) * t];

const interpolateShape = (a: MouthShape, x: MouthShape, t: number): MouthShape =>
  a.map((p, i) => interpolatePoint(p, x[i]!, t)) as MouthShape;

class Mouth {
  private phonemeQueue: PhonemeEvent[] = [];
  private lastTimestamp: number = -Infinity;
  private currentViseme: Viseme = 'sil';
  private currentVisemeTime: number = 0;

  addPhoneme(phoneme: string, timestamp: number): void {
    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Phonemes must be added in chronological order. ` +
        `Got timestamp ${timestamp} after ${this.lastTimestamp}`
      );
    }
    this.lastTimestamp = timestamp;
    this.phonemeQueue.push({ phoneme, timestamp });
  }

  /**
   * Get the mouth shape at a specific time.
   * Processes queued phonemes up to that time and returns the interpolated shape.
   */
  getShapeAt(time: number): MouthShape {
    // Process any phonemes that have occurred by this time
    while (this.phonemeQueue.length > 0 && this.phonemeQueue[0]!.timestamp <= time) {
      const event = this.phonemeQueue.shift()!;
      this.currentViseme = phonemeToViseme(event.phoneme);
      this.currentVisemeTime = event.timestamp;
    }

    // If there's a future phoneme, interpolate toward it
    if (this.phonemeQueue.length > 0) {
      const nextEvent = this.phonemeQueue[0]!;
      const nextViseme = phonemeToViseme(nextEvent.phoneme);
      const duration = nextEvent.timestamp - this.currentVisemeTime;

      if (duration > 0) {
        const progress = Math.min(1, (time - this.currentVisemeTime) / duration);
        return interpolateShape(
          VISEME_SHAPES[this.currentViseme],
          VISEME_SHAPES[nextViseme],
          progress
        );
      }
    }

    // Hold at current viseme
    return VISEME_SHAPES[this.currentViseme];
  }

  /**
   * Clear all queued phonemes after the given timestamp and reset to silence
   */
  clearAfter(timestamp: number): void {
    this.phonemeQueue = this.phonemeQueue.filter(event => event.timestamp <= timestamp);
    this.lastTimestamp = timestamp;
  }

  /**
   * Reset the entire mouth state
   */
  reset(): void {
    this.phonemeQueue = [];
    this.lastTimestamp = -Infinity;
  }
}

// ============================================================================
// Rendering
// ============================================================================

/**
 * Draw a mouth shape on a canvas context by connecting all points in order.
 * Scales the shape to fit the canvas dimensions.
 */
function drawMouth(ctx: CanvasRenderingContext2D, shape: MouthShape, width: number, height: number): void {
  if (shape.length < 2) {
    return;
  }

  // Original mouth coordinates are in a 200x150 space (0-200 width, 0-150 height)
  const originalWidth = 200;
  const originalHeight = 150;
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;

  ctx.beginPath();
  const init = shape[0]
  if (!init) {
    console.warn("drawMouth: shape has no points");
    return
  }
  ctx.moveTo(init[0] * scaleX, init[1] * scaleY);

  for (const [x, y] of shape.slice(1)) {
    ctx.lineTo(x * scaleX, y * scaleY);
  }

  ctx.closePath();

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

class MouthAnimation {
  canvas: HTMLCanvasElement;
  private mouth: Mouth;
  private width: number;
  private height: number;
  private ctx: CanvasRenderingContext2D;
  private startTime: number | null = null;
  private animationRunning = false;

  constructor(mouth: Mouth, width: number = 400, height: number = 300) {
    this.mouth = mouth;
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  start(timestamp: number): void {
    this.startTime = timestamp;
    this.animationRunning = true;
    this.animate();
  }

  stop(): void {
    this.animationRunning = false;
  }

  private animate = (): void => {
    if (!this.animationRunning || this.startTime === null) return;

    const currentTime = performance.now() - this.startTime;
    const currentShape = this.mouth.getShapeAt(currentTime);

    this.ctx.clearRect(0, 0, this.width, this.height);
    drawMouth(this.ctx, currentShape, this.width, this.height);

    requestAnimationFrame(this.animate);
  }
}

export { Mouth, MouthAnimation };
