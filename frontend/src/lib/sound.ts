// Web Audio API procedural sound engine + HTML5 Audio track player for cozy clicks and soft ambient tunes

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicActive: boolean = false;
  private musicInterval: any = null;
  private arpeggioInterval: any = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private audioPlayer: HTMLAudioElement | null = null;
  private audioTrackLoaded: boolean = false;

  private init() {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.45;
        this.masterGain.connect(this.ctx.destination);

        // Warm lowpass filter for gentle acoustic lofi warmth
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = "lowpass";
        this.filterNode.frequency.value = 2200; // soft warm roll-off
        this.filterNode.connect(this.masterGain);

        // Music Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.filterNode);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    // Try initializing audio element for custom MP3 file
    if (!this.audioPlayer && typeof Audio !== "undefined") {
      this.initAudioFilePlayer();
    }
  }

  // Attempt to load and play user provided MP3 files from public/audio/
  private initAudioFilePlayer() {
    try {
      const audioSources = [
        "/audio/cozy_tunes.mp3",
        "/audio/cozy.mp3",
        "/audio/music.mp3",
        "/audio/ambient.mp3"
      ];

      this.audioPlayer = new Audio();
      this.audioPlayer.loop = true;
      this.audioPlayer.volume = this.isMuted ? 0 : 0.4;

      let idx = 0;
      const tryNextSource = () => {
        if (!this.audioPlayer) return;
        if (idx >= audioSources.length) {
          this.audioTrackLoaded = false;
          return;
        }
        this.audioPlayer.src = audioSources[idx++];
        this.audioPlayer.load();
      };

      this.audioPlayer.oncanplay = () => {
        this.audioTrackLoaded = true;
        if (this.musicActive && !this.isMuted) {
          this.audioPlayer?.play().catch(() => {});
        }
      };

      this.audioPlayer.onerror = () => {
        this.audioTrackLoaded = false;
        tryNextSource();
      };

      tryNextSource();
    } catch {
      this.audioTrackLoaded = false;
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
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, this.ctx.currentTime + 0.045);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.055);
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

        gain.gain.setValueAtTime(0.22, this.ctx!.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(this.ctx!.currentTime + idx * 0.06);
        osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.38);
      });
    } catch {}
  }

  // Generative cozy pentatonic ambient background tunes + MP3 player
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
      if (this.arpeggioInterval) {
        clearInterval(this.arpeggioInterval);
        this.arpeggioInterval = null;
      }
      if (this.audioPlayer) {
        this.audioPlayer.pause();
      }
      return false;
    }

    // Try playing MP3 audio file if present
    if (this.audioPlayer && this.audioTrackLoaded) {
      this.audioPlayer.play().catch(() => {});
      return true;
    }

    // Procedural Lush Kalimba & Piano Ambient Engine
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
      [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [196.00, 246.94, 293.66, 392.00]  // G7 (G3, B3, D4, G4)
    ];

    let chordIdx = 0;

    const playChordPad = () => {
      if (!this.musicActive || this.isMuted || !this.ctx || !this.musicGain) return;
      try {
        if (this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {});
        }

        const chord = chords[chordIdx % chords.length];
        chordIdx++;

        chord.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = idx === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

          const now = this.ctx!.currentTime;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

          osc.connect(gain);
          gain.connect(this.musicGain!);

          osc.start(now);
          osc.stop(now + 5.8);
        });
      } catch {}
    };

    // Soft gentle kalimba melody notes
    const playKalimbaNote = () => {
      if (!this.musicActive || this.isMuted || !this.ctx || !this.musicGain) return;
      try {
        const chord = chords[chordIdx % chords.length];
        const randomNote = chord[Math.floor(Math.random() * chord.length)] * (Math.random() > 0.4 ? 2 : 1);
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(randomNote, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 1.5);
      } catch {}
    };

    // Start chord loops and melody
    playChordPad();
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = setInterval(playChordPad, 4800);

    if (this.arpeggioInterval) clearInterval(this.arpeggioInterval);
    this.arpeggioInterval = setInterval(playKalimbaNote, 1200);

    return true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    }
    if (this.audioPlayer) {
      this.audioPlayer.volume = this.isMuted ? 0 : 0.4;
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
