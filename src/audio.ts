import type { RaceSnapshot } from './simulation';

/**
 * Lightweight opt-in race sound. The canonical RaceEngine remains the only
 * source of driving, gates, pads, collisions, laps and race results.
 *
 * No samples, remote assets, telemetry or generated audio files. Oscillators
 * are created only after a pilot deliberately enables audio in a browser
 * gesture; audio is disabled for each new browser session by default.
 */
export class RaceAudio {
  private context: AudioContext | null = null;
  private motor: OscillatorNode | null = null;
  private harmonic: OscillatorNode | null = null;
  private output: GainNode | null = null;
  private previous: RaceSnapshot | null = null;
  private on = false;
  private closed = false;
  // Cancellation sequence for pending browser AudioContext.resume() promises.
  private activation = 0;

  get enabled() { return this.on; }

  /** StrictMode runs development effect cleanup once before real mounting. */
  reopen() { if (this.closed) { this.closed = false; this.previous = null; } }

  async enable(): Promise<boolean> {
    if (this.closed) return false;
    const request = ++this.activation;
    try {
      if (!this.context) {
        if (typeof AudioContext === 'undefined') return false;
        const ctx = new AudioContext();
        const output = ctx.createGain();
        output.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 720;
        filter.Q.value = 0.65;
        const motor = ctx.createOscillator();
        motor.type = 'sawtooth';
        motor.frequency.value = 65;
        const harmonic = ctx.createOscillator();
        harmonic.type = 'triangle';
        harmonic.frequency.value = 98;
        const harmonicGain = ctx.createGain();
        harmonicGain.gain.value = 0.20;
        motor.connect(filter);
        harmonic.connect(harmonicGain);
        harmonicGain.connect(filter);
        filter.connect(output);
        output.connect(ctx.destination);
        motor.start();
        harmonic.start();
        this.context = ctx;
        this.motor = motor;
        this.harmonic = harmonic;
        this.output = output;
      }
      // Called directly from the user's audio-toggle click so browsers can
      // grant audio activation without an autoplay workaround.
      const ctx=this.context;
      if (!ctx) return false;
      await ctx.resume();
      // A prior audio-on request must not reactivate sound after the user
      // muted it, disposed this app, or made a newer activation attempt.
      if (this.closed || request !== this.activation ||
          this.context !== ctx || ctx.state !== 'running') return false;
      this.on = true;
      this.applyMotor(this.previous);
      return true;
    } catch {
      if (request === this.activation) this.on = false;
      return false;
    }
  }

  disable() {
    ++this.activation;
    this.on = false;
    this.applyMotor(null);
    // Suspend the silent audio graph instead of running it in the background.
    void this.context?.suspend().catch(() => {});
  }

  private applyMotor(snapshot: RaceSnapshot | null) {
    const ctx = this.context;
    if (!ctx || !this.output || !this.motor || !this.harmonic) return;
    const now = ctx.currentTime;
    const racing = this.on && snapshot?.phase === 'racing';
    const speed = racing ? Math.max(0, snapshot.speedKmh) : 0;
    const boost = racing && (snapshot.isBoosting || snapshot.padSurge);
    const pitch = 65 + Math.min(110, speed * 0.29);
    this.motor.frequency.setTargetAtTime(pitch, now, 0.08);
    this.harmonic.frequency.setTargetAtTime(pitch * (boost ? 2.1 : 1.54), now, 0.09);
    this.output.gain.setTargetAtTime(
      racing ? Math.min(0.035, 0.007 + speed * 0.000052 + (boost ? 0.008 : 0)) : 0,
      now, 0.09
    );
  }

  private cue(startHz: number, endHz: number, seconds: number, volume: number, shape: OscillatorType = 'sine') {
    const ctx = this.context;
    if (!this.on || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const voice = ctx.createOscillator();
    const envelope = ctx.createGain();
    voice.type = shape;
    voice.frequency.setValueAtTime(Math.max(10, startHz), now);
    voice.frequency.exponentialRampToValueAtTime(Math.max(10, endHz), now + seconds);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.014);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    voice.connect(envelope);
    envelope.connect(ctx.destination);
    voice.start(now);
    voice.stop(now + seconds + 0.025);
    voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
  }

  update(snapshot: RaceSnapshot) {
    const prior = this.previous;
    this.previous = snapshot;
    this.applyMotor(snapshot);
    if (!this.on || !prior) return;
    // Race end is a state transition, not a racing frame. Sound it before
    // the new non-racing state silences the continuous motor.
    if (snapshot.phase === 'finished' && prior.phase === 'racing') {
      if (snapshot.reason === 'complete') this.cue(440, 990, 0.44, 0.055);
      else this.cue(230, 72, 0.43, 0.055, 'triangle');
      return;
    }
    if (snapshot.phase !== 'racing') return;

    if (prior.phase === 'countdown') {
      this.cue(380, 660, 0.25, 0.048);
      return;
    }
    if (prior.phase !== 'racing') return;
    if (snapshot.lapTimes.length > prior.lapTimes.length) {
      this.cue(430, 890, 0.36, 0.056);
      return;
    }
    if (snapshot.lastSector !== prior.lastSector &&
        snapshot.lastSector !== null && snapshot.lastSector >= 1 &&
        snapshot.lastSector <= 3) {
      this.cue(580, 790, 0.16, 0.039);
    }
    if (snapshot.padSurge && !prior.padSurge) {
      this.cue(190, 390, 0.20, 0.037, 'triangle');
    }
    // A physics impact raises source 'impact' to one, then decays. Only its
    // rising edge is sounded; continuous rail scraping cannot spam impacts.
    if (snapshot.impact >= 0.60 && snapshot.impact > prior.impact + 0.18) {
      this.cue(180, 65, 0.20, 0.052, 'triangle');
    }
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    ++this.activation;
    this.on = false;
    this.motor?.stop();
    this.harmonic?.stop();
    this.motor?.disconnect();
    this.harmonic?.disconnect();
    this.output?.disconnect();
    void this.context?.close().catch(() => {});
    this.motor = null;
    this.harmonic = null;
    this.output = null;
    this.context = null;
  }
}
