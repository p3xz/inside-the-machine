import { useEffect, useRef, useState } from "react";
import { INFO, STAGES, stageAt, CUT_IN, CUT_OUT, INSIDE } from "@/lib/journey-data";
import { rippleAdd, msb, toNum, type Bits, type GateKey } from "@/lib/adder";
import { audio } from "@/lib/audio";
import type { GateInputs } from "./MachineScene";

function useProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const v = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setP((old) => (Math.abs(old - v) > 0.0005 ? v : old));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

const fade = (p: number, a: number, b: number, edge = 0.012) =>
  Math.max(0, Math.min(1, (p - a) / edge, (b - p) / edge));

const black = (p: number, w: { rise: number; full: number; clear: number; done: number }) =>
  p <= w.rise || p >= w.done ? 0 : p < w.full ? (p - w.rise) / (w.full - w.rise) : p <= w.clear ? 1 : 1 - (p - w.clear) / (w.done - w.clear);

export type Phase = "off" | "boot" | "ready";
export type Quiz = { on: boolean; n: number; score: number; target: { bit: number; gate: GateKey } | null; last: "right" | "wrong" | null };
export type LegalTab = "privacy" | "credits" | "legal";

type Props = {
  phase: Phase;
  onPowerOn: () => void;
  selectedId: string | null;
  onClose: () => void;
  gates: GateInputs;
  activeGate: "and" | "or" | "not";
  setActiveGate: (g: "and" | "or" | "not") => void;
  onToggle: (k: string) => void;
  transistorOn: boolean;
  setTransistorOn: (v: boolean) => void;
  adderA: Bits;
  adderB: Bits;
  rippleStep: number;
  quiz: Quiz;
  onQuizStart: () => void;
  onQuizAnswer: (a: string) => void;
  onQuizExit: () => void;
  muted: boolean;
  onMute: () => void;
  onRestart: () => void;
  openLegal: (t: LegalTab) => void;
  mobileNote: boolean;
  onMobileContinue: () => void;
};

export const QUIZ_LEN = 5;

export function Hud(props: Props) {
  const p = useProgress();
  const idx = Math.max(0, stageAt(p));
  const stage = STAGES[idx]!;
  const info = props.selectedId ? INFO[props.selectedId] : null;
  const ready = props.phase === "ready";

  // audio arc + whoosh on cuts
  const prev = useRef(p);
  useEffect(() => {
    const a = prev.current;
    prev.current = p;
    const inside = p > INSIDE.from && p < INSIDE.to ? 1 : 0;
    audio.setMix(inside);
    const crossed = (t: number) => (a < t) !== (p < t);
    if (crossed(CUT_IN.full) || crossed(CUT_OUT.full)) audio.whoosh();
  }, [p]);

  const g = props.activeGate;
  const ins = props.gates[g] as number[];
  const i0 = ins[0] ?? 0;
  const i1 = ins[1] ?? 0;
  const out = g === "and" ? i0 & i1 : g === "or" ? i0 | i1 : i0 ? 0 : 1;

  const add = rippleAdd(props.adderA, props.adderB);
  const done = props.rippleStep >= 4;
  const q = props.quiz;
  const dark = Math.max(black(p, CUT_IN), black(p, CUT_OUT));

  const go = (v: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: v * max, behavior: "smooth" });
  };

  return (
    <div className="hud">
      {/* black beat between room and inside */}
      <div className="blackout" style={{ opacity: dark }} />

      {/* top-left */}
      <div className="hud-brand" style={{ opacity: ready ? 1 : 0 }}>
        <div className="hud-title">INSIDE THE MACHINE</div>
        <div className="hud-meta">
          COMPUTING / <span className="text-primary">{stage.num}</span>—{STAGES.length}
          {q.on ? <span className="hud-quiz"> · QUIZ {String(Math.min(q.n + 1, QUIZ_LEN)).padStart(2, "0")}/{String(QUIZ_LEN).padStart(2, "0")} · SCORE {q.score}</span> : null}
        </div>
      </div>

      {ready && (
        <button className="mute" onClick={props.onMute} aria-pressed={!props.muted} aria-label={props.muted ? "Turn sound on" : "Mute sound"}>
          <span className="mute-bars" data-on={!props.muted}>
            <i /><i /><i />
          </span>
          {props.muted ? "SOUND OFF" : "SOUND ON"}
        </button>
      )}

      {/* stage rail */}
      {ready && (
        <nav className="hud-rail" aria-label="Journey stages">
          <div className="hud-rail-line">
            <div className="hud-rail-fill" style={{ height: `${p * 100}%` }} />
          </div>
          <ol>
            {STAGES.map((s, i) => (
              <li key={s.id} data-active={i === idx}>
                <button className="hud-rail-btn" onClick={() => go(s.id === "room" ? 0 : s.start + 0.012)}>
                  <span className="hud-rail-num">{s.num}</span>
                  <span className="hud-rail-name">{s.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* intro over the room */}
      {ready && p < 0.05 && (
        <div className="intro" style={{ opacity: 1 - Math.min(1, p / 0.035) }}>
          <h1 className="intro-title">INSIDE THE MACHINE</h1>
          <p className="eyebrow">A JOURNEY THROUGH COMPUTATION</p>
          <div className="scroll-cue">
            <span>SCROLL TO ENTER</span>
            <span className="scroll-cue-line" />
          </div>
        </div>
      )}

      {/* stage captions */}
      {ready &&
        STAGES.map((s) => {
          if (s.id === "room") return null;
          const a = s.id === "computer" ? 0.058 : s.start + 0.008;
          const b = s.id === "computer" ? CUT_IN.rise : s.id === "return" ? 0.915 : s.end - 0.004;
          const o = fade(p, a, b);
          if (o <= 0) return null;
          return (
            <section key={s.id} className="caption" style={{ opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>
              <p className="eyebrow">
                {s.num} / {s.name}
              </p>
              <h2 className="caption-title">{s.title}</h2>
              <p className="caption-sub">{s.sub}</p>
            </section>
          );
        })}

      {/* logic console */}
      {fade(p, 0.57, 0.648) > 0 && (
        <div className="console" style={{ opacity: fade(p, 0.57, 0.648) }}>
          <div className="console-tabs" role="tablist">
            {(["and", "or", "not"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={g === k} className="console-tab" onClick={() => props.setActiveGate(k)}>
                {k.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="console-row">
            <button className="bit" data-on={!!ins[0]} onClick={() => props.onToggle(`${g}-a`)} aria-label="Toggle input A">
              <span>{g === "not" ? "IN" : "A"}</span>
              <b>{ins[0]}</b>
            </button>
            {g !== "not" && (
              <button className="bit" data-on={!!ins[1]} onClick={() => props.onToggle(`${g}-b`)} aria-label="Toggle input B">
                <span>B</span>
                <b>{ins[1]}</b>
              </button>
            )}
            <span className="console-arrow">→</span>
            <div className="bit bit-out" data-on={!!out}>
              <span>OUT</span>
              <b>{out}</b>
            </div>
          </div>
          <p className="console-eq">{g === "not" ? `NOT ${ins[0]} = ${out}` : `${ins[0]} ${g.toUpperCase()} ${ins[1]} = ${out}`}</p>
        </div>
      )}

      {/* transistor console */}
      {fade(p, 0.67, 0.757) > 0 && (
        <div className="console" style={{ opacity: fade(p, 0.67, 0.757) }}>
          <p className="eyebrow">GATE VOLTAGE</p>
          <button className="switch" role="switch" aria-checked={props.transistorOn} onClick={() => props.setTransistorOn(!props.transistorOn)}>
            <span className="switch-knob" />
            <span className="switch-label">{props.transistorOn ? "ON" : "OFF"}</span>
          </button>
          <p className="console-eq">
            OUTPUT <span className={props.transistorOn ? "text-primary" : ""}>{props.transistorOn ? "1" : "0"}</span>
          </p>
        </div>
      )}

      {/* adder console */}
      {fade(p, 0.775, 0.868) > 0 && (
        <div className="console adder" style={{ opacity: fade(p, 0.775, 0.868) }}>
          {(["a", "b"] as const).map((k) => {
            const bits = k === "a" ? props.adderA : props.adderB;
            return (
              <div key={k} className="adder-row">
                <span className="adder-label">INPUT {k.toUpperCase()}</span>
                {[3, 2, 1, 0].map((i) => (
                  <button key={i} className="abit" data-on={!!bits[i]} onClick={() => props.onToggle(`add-${k}-${i}`)} aria-label={`Toggle ${k.toUpperCase()}${i}`}>
                    {bits[i]}
                  </button>
                ))}
                <span className="adder-dec">{toNum(bits)}</span>
              </div>
            );
          })}
          <div className="adder-row adder-sum">
            <span className="adder-label">SUM</span>
            {[3, 2, 1, 0].map((i) => (
              <span key={i} className="abit" data-on={done && !!add.sum[i]}>
                {i < props.rippleStep ? add.sum[i] : "·"}
              </span>
            ))}
            <span className="adder-dec">{done ? toNum(add.sum) + add.carry * 16 : "…"}</span>
          </div>
          <p className="console-eq">
            CARRY OUT <span className={done && add.carry ? "text-violet" : ""}>{done ? add.carry : "·"}</span>
            <span className="adder-bin">
              {msb(props.adderA)} + {msb(props.adderB)} = {done ? `${add.carry}${msb(add.sum)}` : "…"}
            </span>
          </p>

          <div className="quiz">
            {!q.on ? (
              <button className="quiz-start" onClick={props.onQuizStart}>
                QUIZ MODE →
              </button>
            ) : q.n >= QUIZ_LEN ? (
              <div className="quiz-done">
                <p>
                  QUIZ COMPLETE · {q.score}/{QUIZ_LEN}
                </p>
                <button className="quiz-start" onClick={props.onQuizStart}>
                  AGAIN
                </button>
                <button className="quiz-start" onClick={props.onQuizExit}>
                  EXIT
                </button>
              </div>
            ) : q.target ? (
              <>
                <p className="quiz-q">
                  WHICH GATE JUST FIRED? <span className="quiz-hint">(FLASHING · BIT {q.target.bit})</span>
                </p>
                <div className="quiz-answers">
                  {["AND", "OR", "XOR", "NOT"].map((a) => (
                    <button key={a} className="console-tab" onClick={() => props.onQuizAnswer(a)}>
                      {a}
                    </button>
                  ))}
                </div>
                {q.last && <p className={`quiz-fb ${q.last}`}>{q.last === "right" ? "CORRECT" : "NOT QUITE"}</p>}
              </>
            ) : (
              <p className="quiz-q">SET A BIT TO 1 TO MAKE A GATE FIRE</p>
            )}
          </div>
        </div>
      )}

      {/* ending: back in the room */}
      {p > 0.968 && (
        <div className="ending" style={{ opacity: Math.min(1, (p - 0.968) / 0.02) }}>
          <p className="ending-line">THE JOURNEY HAPPENED BETWEEN TWO KEYSTROKES.</p>
          <button className="explore" onClick={props.onRestart}>
            EXPLORE AGAIN
          </button>
          <nav className="legal-links" aria-label="Legal">
            <button onClick={() => props.openLegal("privacy")}>PRIVACY</button>
            <button onClick={() => props.openLegal("credits")}>CREDITS</button>
            <button onClick={() => props.openLegal("legal")}>LEGAL</button>
          </nav>
          <p className="ending-note">An educational visualization. Some hardware details are simplified.</p>
        </div>
      )}

      {/* info panel */}
      {info && (
        <aside className="panel" aria-live="polite">
          <p className="panel-name">{info.name}</p>
          <p className="panel-full">{info.full}</p>
          <p className="panel-text">{info.text}</p>
          <button className="panel-close" onClick={props.onClose}>
            CLOSE
          </button>
        </aside>
      )}

      {/* boot sequence */}
      {props.phase !== "ready" &&
        (props.mobileNote ? (
          <MobileNote onContinue={props.onMobileContinue} />
        ) : (
          <Boot phase={props.phase} onPowerOn={props.onPowerOn} openLegal={props.openLegal} />
        ))}
    </div>
  );
}

function MobileNote({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="boot" data-phase="mobile">
      <div className="boot-center">
        <p className="eyebrow">INSIDE THE MACHINE</p>
        <p className="mobile-note-text">FOR A BETTER EXPERIENCE, USE A PC.</p>
        <div className="mobile-note-bar" aria-hidden="true">
          <i />
        </div>
        <button className="power" onClick={onContinue}>
          CONTINUE ON PHONE
        </button>
      </div>
    </div>
  );
}

const BOOT_LOG = ["POST ........ OK", "CPU  0x01 ... OK", "MEM  32768 MB OK", "DISPLAY ..... ON"];

function Boot({ phase, onPowerOn, openLegal }: { phase: Phase; onPowerOn: () => void; openLegal: (t: LegalTab) => void }) {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    if (phase !== "boot") return;
    const ids = BOOT_LOG.map((_, i) => window.setTimeout(() => setLines(i + 1), 160 + i * 190));
    return () => ids.forEach(clearTimeout);
  }, [phase]);
  return (
    <div className="boot" data-phase={phase}>
      {phase === "off" ? (
        <div className="boot-center">
          <p className="eyebrow">INSIDE THE MACHINE</p>
          <button className="power" onClick={onPowerOn} autoFocus>
            <span className="power-icon" aria-hidden="true" />
            POWER ON
          </button>
          <p className="boot-hint">BEST WITH SOUND · SCROLL TO TRAVEL</p>
        </div>
      ) : (
        <pre className="boot-log" aria-live="polite">{BOOT_LOG.slice(0, lines).join("\n")}</pre>
      )}
      {phase === "off" && (
        <nav className="legal-links boot-legal" aria-label="Legal">
          <button onClick={() => openLegal("privacy")}>PRIVACY</button>
          <button onClick={() => openLegal("credits")}>CREDITS</button>
          <button onClick={() => openLegal("legal")}>LEGAL</button>
        </nav>
      )}
    </div>
  );
}
