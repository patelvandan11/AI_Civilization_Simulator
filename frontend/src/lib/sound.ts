// Web Audio API procedural sound engine for cozy clicks and soft ambient tunes

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicActive: boolean = false;
  private musicInterval: any = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.25;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.15;
        this.musicGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Soft cozy wooden UI click sound
  public playClick(freq = 620, type: OscillatorType = "sine") {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  // Soft melodic chime for successful actions / saves
  public playChime(success = true) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const notes = success ? [523.25, 659.25, 783.99, 1046.50] : [440, 392, 349.23];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(this.ctx!.currentTime + idx * 0.06);
        osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.28);
      });
    } catch {}
  }

  // Generative cozy pentatonic ambient background tunes
  public toggleMusic(enable?: boolean): boolean {
    this.init();
    if (enable !== undefined) {
      this.musicActive = enable;
    } else {
      this.musicActive = !this.musicActive;
    }

    if (!this.musicActive) {
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
      return false;
    }

    // Pentatonic scale notes (C Major / A Minor cozy chords: C4, D4, E4, G4, A4, C5, D5, E5)
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

    const playAmbientChord = () => {
      if (!this.musicActive || this.isMuted || !this.ctx || !this.musicGain) return;
      try {
        const root = scale[Math.floor(Math.random() * scale.length)];
        const third = root * 1.25; // major third
        const fifth = root * 1.5;  // perfect fifth

        [root, third, fifth].forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const panner = (typeof this.ctx!.createStereoPanner === "function") ? this.ctx!.createStereoPanner() : null;

          osc.type = i === 0 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(f * (Math.random() > 0.5 ? 1 : 0.5), this.ctx!.currentTime);

          const now = this.ctx!.currentTime;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04 / (i + 1), now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

          if (panner) {
            panner.pan.setValueAtTime((Math.random() - 0.5) * 0.8, now);
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.musicGain!);
          } else {
            osc.connect(gain);
            gain.connect(this.musicGain!);
          }

          osc.start(now);
          osc.stop(now + 4.0);
        });
      } catch {}
    };

    playAmbientChord();
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = setInterval(playAmbientChord, 3200);

    return true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public isMusicPlaying(): boolean {
    return this.musicActive;
  }
}

export const soundEngine = new SoundEngine();
