export class AudioQueue {
  private tasks: Array<() => Promise<void>>
  private currentClip: Promise<void> | null;
  constructor() {
    this.tasks = []
    this.currentClip = null
  }

  private advance() {
    if (this.tasks.length === 0) {
      this.currentClip = null;
      return
    }
    this.currentClip = this.tasks.shift()!().then(() => this.advance())
  }

  public add(playAudio: () => Promise<void>) {
    this.tasks.push(playAudio)

    if (!this.currentClip) {
      this.advance()
    }
  }

  public clear() {
    this.tasks = []
    this.currentClip = null
  }
}
