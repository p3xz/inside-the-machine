// Tiny synthesized audio engine: soft UI clicks and a peaceful ambient pad.
// Everything is generated with the Web Audio API. No audio assets.

let ctx: AudioContext | null = null;
let muted = false;
let ambientNodes: { stop: () => void } | null = null;

try {
  muted = localStorage.getItem("itm-muted") === "1";
} catch {
  muted = false;
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem("itm-muted", m ? "1" : "0");
  } catch {
    // ignore
  }
  if (m) stopAmbient();
  else startAmbient();
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number
): void {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Soft UI click for buttons and rail navigation. */
export function click(): void {
  blip(620, 0.07, "triangle", 0.06);
}

/** Bit toggle: higher pitch when turning on, lower when turning off. */
export function bitToggle(on: boolean): void {
  blip(on ? 740 : 520, 0.09, "triangle", 0.07);
  blip(on ? 1108 : 780, 0.12, "sine", 0.04, 0.03);
}

/** Gentle two-note chime when selecting a 3D part. */
export function select(): void {
  blip(523.25, 0.16, "sine", 0.05);
  blip(783.99, 0.22, "sine", 0.05, 0.09);
}

/** Soft power sweep for the transistor switch. */
export function power(on: boolean): void {
  if (on) {
    blip(220, 0.22, "sine", 0.07, 0, 660);
    blip(880, 0.18, "sine", 0.035, 0.14);
  } else {
    blip(660, 0.22, "sine", 0.06, 0, 220);
  }
}

// ---------------------------------------------------------------------------
// Peaceful ambient pad: slow evolving chords, very quiet.
// Cmaj9 -> Am9 -> Fmaj9 -> G6/9, each held ~9s with soft crossfades.
// ---------------------------------------------------------------------------

const CHORDS: number[][] = [
  [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 130.81, 164.81, 196.0, 246.94], // Am9
  [87.31, 130.81, 174.61, 220.0, 261.63], // Fmaj9
  [98.0, 146.83, 196.0, 220.0, 293.66], // G6/9
];

export function startAmbient(): void {
  if (muted || ambientNodes) return;
  const c = ac();
  if (!c) return;

  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 4);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, c.currentTime);
  filter.Q.setValueAtTime(0.4, c.currentTime);
  master.connect(filter);
  filter.connect(c.destination);

  // Slow breathing on the filter for an evolving feel.
  const lfo = c.createOscillator();
  lfo.frequency.setValueAtTime(0.06, c.currentTime);
  const lfoGain = c.createGain();
  lfoGain.gain.setValueAtTime(350, c.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  let chordIdx = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const playChord = (notes: number[]) => {
    const t = c.currentTime;
    // fade out previous
    for (const g of gains) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    }
    const old = oscs.splice(0);
    gains.splice(0);
    setTimeout(() => old.forEach((o) => { try { o.stop(); } catch { /* noop */ } }), 3500);
    // fade in new
    for (const f of notes) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f * (1 + (Math.random() - 0.5) * 0.0015), t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 3.5);
      o.connect(g);
      g.connect(master);
      o.start(t);
      oscs.push(o);
      gains.push(g);
    }
  };

  playChord(CHORDS[0]!);
  timer = setInterval(() => {
    chordIdx = (chordIdx + 1) % CHORDS.length;
    playChord(CHORDS[chordIdx]!);
  }, 9000);

  ambientNodes = {
    stop: () => {
      if (timer) clearInterval(timer);
      try { lfo.stop(); } catch { /* noop */ }
      for (const o of oscs) { try { o.stop(); } catch { /* noop */ } }
      try { master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6); } catch { /* noop */ }
    },
  };
}

export function stopAmbient(): void {
  ambientNodes?.stop();
  ambientNodes = null;
}

/** Call once from a user gesture; browsers block audio before interaction. */
export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  const start = () => {
    if (!muted) startAmbient();
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
  };
  if (c.state === "running" && !muted) startAmbient();
  else {
    window.addEventListener("pointerdown", start, { once: false });
    window.addEventListener("keydown", start, { once: false });
  }
}
