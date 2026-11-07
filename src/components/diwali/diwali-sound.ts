// Synthesized audio effects for Diwali fireworks using the Web Audio API
// 100% self-contained, no external audio files needed, works offline, zero lag

class DiwaliSoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Default muted for smooth user experience

  constructor() {}

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initCtx();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // --- ROCKET ASCENT VOICES (when rockets go up) ---

  // Ascent Voice 1: Classic High-Pitched Whistling Screamer ("WssshhheeeeeeEEEEE!")
  public playScreamerWhistle() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";

      const startFreq = 380 + Math.random() * 80;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 3.8, now + 1.1);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      // Safe catch
    }
  }

  // Ascent Voice 2: Pressurized Hissing Rocket Flare Whoosh ("FFSSSSHHH-whoosh")
  public playHissingWhoosh() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Filtered noise swoosh
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * decay * 0.45;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
      filter.Q.setValueAtTime(2.2, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 1.15);
    } catch {
      // Safe catch
    }
  }

  // Ascent Voice 3: Crackling Tail Ascent with rapid sizzle ("Sshhh-CHAR-CHAR-CRACKLE")
  public playCrackleAscent() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Base rising tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);

      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.linearRampToValueAtTime(0.05, now + 0.2);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      const oscFilter = this.ctx.createBiquadFilter();
      oscFilter.type = "lowpass";
      oscFilter.frequency.setValueAtTime(1000, now);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);

      // Crackling spark pops along ascent
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        const isCrackle = Math.random() < 0.06;
        data[i] = (isCrackle ? (Math.random() * 2 - 1) * 1.2 : (Math.random() * 2 - 1) * 0.15) * env;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(2800, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 1.15);
    } catch {
      // Safe catch
    }
  }

  // Master launch voice selector: plays one of the 3 ascending voices randomly
  public playRocketLaunch(preferredVoice?: "whistle" | "hiss" | "crackle") {
    if (this.isMuted) return;
    if (preferredVoice === "whistle") {
      this.playScreamerWhistle();
      return;
    }
    if (preferredVoice === "hiss") {
      this.playHissingWhoosh();
      return;
    }
    if (preferredVoice === "crackle") {
      this.playCrackleAscent();
      return;
    }

    const r = Math.random();
    if (r < 0.35) {
      this.playScreamerWhistle();
    } else if (r < 0.7) {
      this.playHissingWhoosh();
    } else {
      this.playCrackleAscent();
    }
  }

  // --- EXPLOSION & DETONATION VOICES ---

  // Voice 1: Deep resonant booming shell ("DHOOM / THUD")
  public playDeepBoom() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(130 + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.7);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * 0.2));
        data[i] = (Math.random() * 2 - 1) * decay * 0.6;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.65);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.75);
    } catch {
      // Safe catch
    }
  }

  // Voice 2: Crisp crackling sizzler ("CHAR-CHAR-CRACKLE / PAT-PAT")
  public playCrispCrackle() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * 0.16));
        const isPop = Math.random() < 0.08;
        const popAmp = isPop ? (Math.random() * 2 - 1) * 1.6 : (Math.random() * 2 - 1) * 0.2;
        data[i] = popAmp * decay;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2800 + Math.random() * 800, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.55);
    } catch {
      // Safe catch
    }
  }

  // Voice 3: Whistle-snap pop ("Ssshhwweee-THWACK")
  public playWhistlePop() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.3);

      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * 0.12));
        data[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2200, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.4);
    } catch {
      // Safe catch
    }
  }

  // Voice 4: Secondary sub-burst pop ("POP-CRACKLE")
  public playSubBurstPop() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(240 + Math.random() * 60, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Safe catch
    }
  }

  // Random explosion sound selector matching cracker burst personality
  public playRandomExplosion(type?: "boom" | "crackle" | "subburst" | "random") {
    if (this.isMuted) return;
    if (type === "boom") {
      this.playDeepBoom();
      return;
    }
    if (type === "crackle") {
      this.playCrispCrackle();
      return;
    }
    if (type === "subburst") {
      this.playWhistlePop();
      return;
    }

    const r = Math.random();
    if (r < 0.4) {
      this.playDeepBoom();
    } else if (r < 0.75) {
      this.playCrispCrackle();
    } else {
      this.playWhistlePop();
    }
  }

  // Sparkler chime sound
  public playSparkler() {
    this.playCrispCrackle();
  }
}

export const diwaliSound = new DiwaliSoundManager();
