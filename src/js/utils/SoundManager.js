export class SoundManager {
  constructor() {
    // Create audio context
    this.audioContext = null;
    this.masterVolume = 0.3;
    this.enabled = true;

    // Initialize on user interaction (required by browsers)
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Resume audio context (required for Safari)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.initialized = true;
      console.log("SoundManager initialized", this.audioContext.state);
    } catch (error) {
      console.warn("Web Audio API not supported:", error);
      this.enabled = false;
    }
  }

  // Ensure audio context is resumed (Safari can suspend it)
  async ensureResumed() {
    if (!this.audioContext) return false;

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn("Failed to resume audio context:", error);
        return false;
      }
    }

    return this.audioContext.state === "running";
  }

  // Play basketball bounce sound
  async playBounce(intensity = 0.5) {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Lower frequency for bounce sound
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      40,
      ctx.currentTime + 0.1,
    );

    // Volume envelope
    const volume = this.masterVolume * intensity * 0.3;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.type = "sine";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  // Play swish sound (perfect shot through net)
  async playSwish() {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;

    // Create white noise for swish
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // High-pass filter for swish sound
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(6000, ctx.currentTime + 0.2);

    // Volume envelope
    gainNode.gain.setValueAtTime(this.masterVolume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.3);
  }

  // Play rim hit sound
  async playRimHit(intensity = 0.7) {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Metallic clank sound
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      150,
      ctx.currentTime + 0.08,
    );

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(5, ctx.currentTime);

    // Sharp attack, quick decay
    const volume = this.masterVolume * intensity * 0.5;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    oscillator.type = "square";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);
  }

  // Play score celebration sound
  async playScore(streak = 1) {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.type = "sine";

      const startTime = ctx.currentTime + index * 0.05;
      const volume = this.masterVolume * 0.3;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });

    // Extra celebration for streaks
    if (streak >= 3) {
      this.playCheer(streak);
    }
  }

  // Play crowd cheer for streaks
  async playCheer(streak) {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const duration = Math.min(0.5 + streak * 0.1, 1.5);

    // Create crowd noise
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Band-pass filter for human voice range
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);

    // Volume swell
    const volume = this.masterVolume * Math.min(0.2 + streak * 0.05, 0.5);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  }

  // Play miss sound (sad trombone)
  async playMiss() {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Descending tone
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      110,
      ctx.currentTime + 0.5,
    );

    const volume = this.masterVolume * 0.2;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.type = "sawtooth";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  // Play release sound when starting to aim
  async playRelease() {
    if (!this.enabled || !this.initialized) return;
    await this.ensureResumed();

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      400,
      ctx.currentTime + 0.05,
    );

    const volume = this.masterVolume * 0.15;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.type = "sine";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
