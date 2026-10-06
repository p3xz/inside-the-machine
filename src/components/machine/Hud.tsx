import { useEffect, useState } from "react";
import { INFO, STAGES, stageAt } from "@/lib/journey-data";
import { click, isMuted, setMuted } from "@/lib/audio";
import type { BootPhase, GateInputs } from "./MachineScene";

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

const fade = (p: number, a: number, b: number, edge = 0.02) =>
  Math.max(0, Math.min(1, (p - a) / edge, (b - p) / edge));

/** short black beat when the camera passes through the case */
const beat = (p: number) => {
  const a = 0.322;
  const pk = 0.335;
  const b = 0.352;
  if (p < a || p > b) return 0;
  return p < pk ? (p - a) / (pk - a) : 1 - (p - pk) / (b - pk);
};

type Props = {
  selectedId: string | null;
  onClose: () => void;
  gates: GateInputs;
  activeGate: "and" | "or" | "not";
  setActiveGate: (g: "and" | "or" | "not") => void;
  onToggle: (k: string) => void;
  transistorOn: boolean;
  setTransistorOn: (v: boolean) => void;
  boot: BootPhase;
  onPower: () => void;
  onReset: () => void;
};

export function Hud(props: Props) {
  const p = useProgress();
  const idx = Math.max(0, stageAt(p));
  const stage = STAGES[idx]!;
  const info = props.selectedId ? INFO[props.selectedId] : null;
  const [soundOn, setSoundOn] = useState(() => !isMuted());

  const g = props.activeGate;
  const ins = props.gates[g] as number[];
  const i0 = ins[0] ?? 0;
  const i1 = ins[1] ?? 0;
  const out = g === "and" ? i0 & i1 : g === "or" ? i0 | i1 : i0 ? 0 : 1;

  return (
    <div className="hud">
      {/* boot overlay */}
      {props.boot !== "on" && (
        <div className="boot-overlay" data-state={props.boot}>
          {props.boot === "off" && (
            <button className="power-btn" onClick={props.onPower} aria-label="Power on">
              <span className="power-ring" aria-hidden="true" />
              POWER ON
            </button>
          )}
        </div>
      )}

      {/* black beat when entering the case */}
      <div className="dive-black" style={{ opacity: beat(p) }} aria-hidden="true" />

      {/* top-left */}
      {props.boot === "on" && (
      <div className="hud-brand">
        <div className="hud-title">INSIDE THE MACHINE</div>
        <div className="hud-meta">
          COMPUTING / <span className="text-primary">{stage.num}</span>—08
        </div>
        <button
          className="sound-toggle"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setMuted(!next);
            if (next) click();
          }}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          title={soundOn ? "Mute sound" : "Unmute sound"}
        >
          <span className="sound-icon" data-on={soundOn}>
            <span className="sound-waves" />
          </span>
          <span className="sound-label">{soundOn ? "SOUND ON" : "SOUND OFF"}</span>
        </button>
      </div>
      )}

      {/* stage rail */}
      {props.boot === "on" && (
      <nav className="hud-rail" aria-label="Journey stages">
        <div className="hud-rail-line">
          <div className="hud-rail-fill" style={{ height: `${p * 100}%` }} />
        </div>
        <ol>
          {STAGES.map((s, i) => (
            <li key={s.id} data-active={i === idx}>
              <button
                className="hud-rail-btn"
                onClick={() => {
                  click();
                  const max = document.documentElement.scrollHeight - window.innerHeight;
                  window.scrollTo({ top: (s.start + 0.02) * max, behavior: "smooth" });
                }}
              >
                <span className="hud-rail-num">{s.num}</span>
                <span className="hud-rail-name">{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      )}

      {/* intro */}
      {props.boot === "on" && (
      <div className="intro" style={{ opacity: 1 - Math.min(1, p / 0.04) }}>
        <p className="eyebrow">A JOURNEY THROUGH COMPUTATION</p>
        <h1 className="intro-title">Inside the Machine</h1>
        <p className="intro-sub">
          Modern computation comes down to enormous numbers of tiny electronic switches.
        </p>
        <div className="scroll-cue">
          <span>SCROLL TO ENTER</span>
          <span className="scroll-cue-line" />
        </div>
      </div>
      )}

      {/* stage captions */}
      {STAGES.map((s) => {
        const a = s.id === "room" ? 0.045 : s.id === "return" ? 0.915 : s.start + 0.01;
        const b =
          s.id === "transistor" ? 0.89
          : s.id === "return" ? 0.975
          : s.id === "room" ? 0.095
          : s.end - 0.005;
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
      {fade(p, 0.688, 0.80) > 0 && (
        <div className="console" style={{ opacity: fade(p, 0.688, 0.80) }}>
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
          <p className="console-eq">
            {g === "not" ? `NOT ${ins[0]} = ${out}` : `${ins[0]} ${g.toUpperCase()} ${ins[1]} = ${out}`}
          </p>
        </div>
      )}

      {/* transistor console */}
      {fade(p, 0.824, 0.866) > 0 && (
        <div className="console" style={{ opacity: fade(p, 0.824, 0.866) }}>
          <p className="eyebrow">GATE VOLTAGE</p>
          <button
            className="switch"
            role="switch"
            aria-checked={props.transistorOn}
            onClick={() => props.setTransistorOn(!props.transistorOn)}
          >
            <span className="switch-knob" />
            <span className="switch-label">{props.transistorOn ? "ON" : "OFF"}</span>
          </button>
          <p className="console-eq">
            OUTPUT <span className={props.transistorOn ? "text-primary" : ""}>{props.transistorOn ? "1" : "0"}</span>
          </p>
        </div>
      )}

      {/* ending */}
      {p > 0.985 && props.boot === "on" && (
        <div className="ending" style={{ opacity: Math.min(1, (p - 0.985) / 0.015) }}>
          <p className="eyebrow">INSIDE THE MACHINE</p>
          <p className="ending-line">The journey happened between two keystrokes.</p>
          <button className="explore" onClick={() => { click(); props.onReset(); }}>
            EXPLORE AGAIN ↑
          </button>
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
    </div>
  );
}
