/* Procedural audio: everything is synthesised in the browser, no audio files. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

class Engine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  room: GainNode | null = null;
  pad: GainNode | null = null;
  noise: AudioBuffer | null = null;
  muted = false;
  inside = 0;
  typingTimer = 0;

  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as Any).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx: AudioContext = new AC();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.8;
      master.connect(ctx.destination);
      this.master = master;

      // brown noise buffer
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      this.noise = buf;

      // room tone
      const rs = ctx.createBufferSource();
      rs.buffer = buf;
      rs.loop = true;
      const rf = ctx.createBiquadFilter();
      rf.type = "lowpass";
      rf.frequency.value = 380;
      const rg = ctx.createGain();
      rg.gain.value = 0;
      rs.connect(rf).connect(rg).connect(master);
      rs.start();
      this.room = rg;

      // ambient electronic pad
      const pf = ctx.createBiquadFilter();
      pf.type = "lowpass";
      pf.frequency.value = 700;
      pf.Q.value = 3;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = 320;
      lfo.connect(lg).connect(pf.frequency);
      lfo.start();
      const pg = ctx.createGain();
      pg.gain.value = 0;
      [110, 110.6, 164.8, 220.4, 329.2].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? "sawtooth" : "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i % 2 ? 0.08 : 0.25;
        o.connect(g).connect(pf);
        o.start();
      });
      pf.connect(pg).connect(master);
      this.pad = pg;

      this.scheduleTyping();
      this.setMix(this.inside);
    } catch {
      this.ctx = null;
    }
  }

  private scheduleTyping() {
    const tick = () => {
      const ctx = this.ctx;
      if (ctx && this.noise && this.inside < 0.5 && ctx.state === "running") {
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 2200 + Math.random() * 1800;
        f.Q.value = 4;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        const v = 0.25 * (1 - this.inside * 2);
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        s.connect(f).connect(g).connect(this.master!);
        s.start(t, Math.random() * 2, 0.05);
      }
      const pause = Math.random() < 0.08 ? 900 + Math.random() * 1400 : 80 + Math.random() * 190;
      this.typingTimer = window.setTimeout(tick, pause);
    };
    tick();
  }

  /** 0 = room, 1 = inside the computer */
  setMix(inside: number) {
    this.inside = inside;
    const ctx = this.ctx;
    if (!ctx || !this.room || !this.pad) return;
    this.room.gain.setTargetAtTime((1 - inside) * 0.22, ctx.currentTime, 0.4);
    this.pad.gain.setTargetAtTime(inside * 0.1, ctx.currentTime, 0.6);
  }

  whoosh() {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
    f.frequency.exponentialRampToValueAtTime(320, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.6, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, 0, 1.2);
  }

  startup() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime;
    // rising hum
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 2.1);
    // fan spin-up
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(150, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 1.6);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(0.0001, t);
    fg.gain.exponentialRampToValueAtTime(0.5, t + 1.2);
    fg.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    s.connect(f).connect(fg).connect(this.master);
    s.start(t, 0, 2.7);
    // short POST beep
    const b = ctx.createOscillator();
    b.type = "square";
    b.frequency.value = 1046;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t + 0.9);
    bg.gain.exponentialRampToValueAtTime(0.05, t + 0.92);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    b.connect(bg).connect(this.master);
    b.start(t + 0.9);
    b.stop(t + 1.1);
  }

  setMuted(m: boolean) {
    this.muted = m;
    const ctx = this.ctx;
    if (ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.1);
  }
}

export const audio = new Engine();
