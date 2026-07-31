class AudioEngine {
  private ctx: AudioContext | null = null;
  private isSoundEnabled = true;

  constructor() {
    // Lazy initialized on user gesture
  }

  setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
  }

  getSoundEnabled() {
    return this.isSoundEnabled;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Create a 0.2s white noise buffer for realistic impacts and crunches
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playTap(isCrit = false, comboMultiplier = 1, material: string = 'stone') {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Pitch & snap scaling factors based on comboMultiplier
    const pitchOffset = (Math.random() - 0.5) * 0.15;
    const comboFactor = 1 + Math.min(Math.max(comboMultiplier - 1, 0), 15) * 0.12; // 1.0x to 2.8x pitch scaling

    // Material base frequencies
    let matBaseFreq = 220;
    if (material === 'wood') matBaseFreq = 160;
    else if (material === 'metal') matBaseFreq = 380;
    else if (material === 'ice') matBaseFreq = 540;
    else if (material === 'neon') matBaseFreq = 440;
    else if (material === 'lava') matBaseFreq = 140;
    else if (material === 'crystal') matBaseFreq = 620;

    if (isCrit) {
      // High power CRITICAL HIT - metallic ring + sharp pitch escalation
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startFreq = (matBaseFreq * 2.5 + pitchOffset * 150) * comboFactor;
      const endFreq = startFreq * 2;

      osc.type = material === 'metal' || material === 'neon' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);

      // Add a heavy thud sub layer
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(160 * comboFactor, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.15);

      // High combo snap harmonic tone for extra satisfaction
      if (comboMultiplier >= 3) {
        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.type = 'square';
        snapOsc.frequency.setValueAtTime(1200 * comboFactor, now);
        snapOsc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        snapGain.gain.setValueAtTime(0.08, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        snapOsc.connect(snapGain);
        snapGain.connect(this.ctx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.06);
      }
    } else {
      // Solid stone/material hit with dynamic combo pitch & snap crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = (matBaseFreq + pitchOffset * 40) * comboFactor;
      osc.type = material === 'wood' ? 'square' : material === 'metal' || material === 'crystal' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, baseFreq * 0.2), now + 0.08);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

      // Noise layer for crisp stone crumble/snap contact sound
      const noiseBuffer = this.createNoiseBuffer();
      if (noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = material === 'wood' || material === 'lava' ? 'lowpass' : 'bandpass';
        let noiseCutoff = 1200;
        if (material === 'metal') noiseCutoff = 2200;
        else if (material === 'ice' || material === 'crystal') noiseCutoff = 3000;
        else if (material === 'wood') noiseCutoff = 750;

        const cutoffFreq = (noiseCutoff + pitchOffset * 150) * Math.pow(comboFactor, 1.1);
        filter.frequency.setValueAtTime(cutoffFreq, now);
        filter.Q.setValueAtTime(2 + Math.min(comboMultiplier, 10) * 0.3, now); // Higher resonance Q at higher combos

        const noiseGain = this.ctx.createGain();
        const noiseVolume = 0.12 + Math.min(comboMultiplier, 10) * 0.01;
        noiseGain.gain.setValueAtTime(noiseVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.06);
      }

      // Add a crisp snap click trigger on higher combos (3x+)
      if (comboMultiplier >= 3) {
        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.type = 'sine';
        snapOsc.frequency.setValueAtTime(800 * comboFactor, now);
        snapOsc.frequency.exponentialRampToValueAtTime(1500 * comboFactor, now + 0.04);

        snapGain.gain.setValueAtTime(0.1, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        snapOsc.connect(snapGain);
        snapGain.connect(this.ctx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.05);
      }
    }
  }

  playBreak() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Deep shattering bass rumble
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc1.frequency.exponentialRampToValueAtTime(20, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Stone wall collapsing noise rumble
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.38);
    }
  }

  playCoinCollect() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBuy() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Upward chiptune coin cascade
    const duration = 0.22;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.10); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.15); // C6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.05);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playPrestige() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Cosmic sweep sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  playLocked() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.setValueAtTime(110, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playEvent() {
    if (!this.isSoundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const audio = new AudioEngine();
export default audio;
