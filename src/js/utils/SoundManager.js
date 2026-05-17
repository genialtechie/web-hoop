const SFX_SOURCES = {
  score: "/audio/correct.mp3",
  streak: "/audio/streak.mp3",
  highScore: "/audio/high-score.mp3",
  miss: "/audio/wrong-short.mp3",
};

const MUSIC_SOURCE = "/audio/bg-loop.mp3";
const SILENCE_SOURCE = "/audio/silence.mp3";

export class SoundManager {
  constructor() {
    this.masterVolume = 0.55;
    this.musicVolume = 0.26;
    this.enabled = true;
    this.initialized = false;
    this.musicShouldPlay = false;
    this.lastMusicResumeAttempt = 0;

    this.sfxAudio = this.createAudio(SILENCE_SOURCE, this.masterVolume);
    this.musicAudio = this.createAudio(MUSIC_SOURCE, this.musicVolume);
    this.musicAudio.loop = true;
  }

  init() {
    return this.unlock();
  }

  createAudio(src, volume) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = volume;
    return audio;
  }

  unlock() {
    if (!this.enabled) return false;
    if (this.initialized) return true;

    this.initialized = true;
    this.unlockSfxChannel();
    return true;
  }

  unlockSfxChannel() {
    this.sfxAudio.pause();
    this.sfxAudio.src = SILENCE_SOURCE;
    this.sfxAudio.currentTime = 0;
    this.sfxAudio.muted = false;
    this.sfxAudio.volume = 0;

    const playResult = this.sfxAudio.play();
    if (!playResult || typeof playResult.then !== "function") {
      this.finishSfxUnlock();
      return;
    }

    playResult
      .then(() => {
        this.finishSfxUnlock();
      })
      .catch((error) => {
        console.warn("Unable to unlock SFX channel:", error);
        this.finishSfxUnlock();
      });
  }

  finishSfxUnlock() {
    this.sfxAudio.pause();
    this.sfxAudio.currentTime = 0;
    this.sfxAudio.muted = false;
    this.sfxAudio.volume = this.masterVolume;
  }

  play(name, volumeScale = 1) {
    if (!this.enabled) return;
    if (!this.initialized) this.unlock();

    const src = SFX_SOURCES[name];
    if (!src) return;

    this.sfxAudio.pause();
    this.sfxAudio.src = src;
    this.sfxAudio.currentTime = 0;
    this.sfxAudio.muted = false;
    this.sfxAudio.volume = Math.max(
      0,
      Math.min(1, this.masterVolume * volumeScale),
    );

    const playResult = this.sfxAudio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch((error) => {
        console.warn(`Unable to play ${name} sound:`, error);
      });
    }

    this.resumeMusicSoon();
  }

  playBounce() {
    // Disabled for now: the bounce asset was too noisy during gameplay.
  }

  playSwish() {
    // Disabled for now: score feedback uses one clear made-shot sound.
  }

  playRimHit() {
    // Disabled for now: keep impact feedback visual only.
  }

  playScore(streak = 1) {
    this.play(streak >= 3 ? "streak" : "score", streak >= 3 ? 0.9 : 0.75);
  }

  playCheer() {
    this.play("streak", 0.9);
  }

  playHighScore() {
    this.play("highScore", 0.95);
  }

  playMiss() {
    this.play("miss", 0.8);
  }

  playRelease() {
    // Disabled: Start and shot release should not create extra audio clutter.
  }

  playMusic() {
    if (!this.enabled) return;
    if (!this.initialized) this.unlock();

    this.musicShouldPlay = true;
    this.musicAudio.muted = false;
    this.musicAudio.volume = this.musicVolume;

    const playResult = this.musicAudio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch((error) => {
        console.warn("Unable to play background music:", error);
      });
    }
  }

  stopMusic() {
    this.musicShouldPlay = false;
    this.musicAudio.pause();
    this.musicAudio.currentTime = 0;
  }

  ensureMusicPlaying() {
    if (!this.enabled || !this.initialized || !this.musicShouldPlay) return;
    if (!this.musicAudio.paused && !this.musicAudio.ended) return;

    const now = performance.now();
    if (now - this.lastMusicResumeAttempt < 700) return;

    this.lastMusicResumeAttempt = now;
    this.playMusic();
  }

  resumeMusicSoon() {
    if (!this.musicShouldPlay) return;

    setTimeout(() => {
      this.ensureMusicPlaying();
    }, 80);
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.musicAudio.volume = this.musicVolume;
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sfxAudio.volume = this.masterVolume;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
      this.sfxAudio.pause();
    }
    return this.enabled;
  }
}
