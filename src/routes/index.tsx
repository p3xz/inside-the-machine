import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { MachineScene, type GateInputs } from "@/components/machine/MachineScene";
import { Hud, QUIZ_LEN, type LegalTab, type Phase, type Quiz } from "@/components/machine/Hud";
import { LegalModal } from "@/components/machine/LegalModal";
import { GATE_KEYS, GATE_TYPE, rippleAdd, type Bits, type GateKey } from "@/lib/adder";
import { audio } from "@/lib/audio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inside the Machine — The journey between two keystrokes" },
      { name: "description", content: "Power on a computer, dive through its vent and travel down to a single transistor, then make a 4-bit adder compute in 3D." },
      { property: "og:title", content: "Inside the Machine" },
      { property: "og:description", content: "A scroll-driven 3D journey from a quiet desk, through a CPU, down to a transistor and back." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MUTE_KEY = "itm:muted";
type Target = { bit: number; gate: GateKey };

function firing(a: Bits, b: Bits): Target[] {
  const out: Target[] = [];
  rippleAdd(a, b).cols.forEach((c, bit) => GATE_KEYS.forEach((gate) => c[gate] && out.push({ bit, gate })));
  return out;
}

function Index() {
  const [phase, setPhase] = useState<Phase>("off");
  // Phones get a short waiting screen suggesting a PC for the best experience.
  const [mobileNote, setMobileNote] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const coarse =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const ua = /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    );
    return coarse || ua;
  });
  useEffect(() => {
    if (!mobileNote) return;
    const id = window.setTimeout(() => setMobileNote(false), 3200);
    return () => window.clearTimeout(id);
  }, [mobileNote]);
  const [monitorOn, setMonitorOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gates, setGates] = useState<GateInputs>({ and: [0, 0], or: [0, 0], not: [0] });
  const [activeGate, setActiveGate] = useState<"and" | "or" | "not">("and");
  const [transistorOn, setTransistorOn] = useState(false);
  const [adderA, setA] = useState<Bits>([1, 0, 1, 0]);
  const [adderB, setB] = useState<Bits>([1, 1, 0, 0]);
  const [rippleStep, setRipple] = useState(4);
  const [quiz, setQuiz] = useState<Quiz>({ on: false, n: 0, score: 0, target: null, last: null });
  const [muted, setMuted] = useState(false);
  const [legal, setLegal] = useState<LegalTab | null>(null);
  const justFired = useRef<Target[]>([]);
  const monitorOverlayRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const m = localStorage.getItem(MUTE_KEY) === "1";
    setMuted(m);
    audio.setMuted(m);
  }, []);

  // A-Frame attaches a non-passive touchmove listener on its canvas that calls
  // preventDefault ("prevent overscroll on mobile"), which kills native touch
  // scrolling on phones. Intercept touchmove in the capture phase before it
  // reaches the canvas and stop it there, so the browser performs a normal
  // native scroll with momentum. Taps still work: touchstart/touchend/click
  // are untouched.
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest(".machine-canvas")) {
        e.stopPropagation();
      }
    };
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    return () => window.removeEventListener("touchmove", onTouchMove, { capture: true });
  }, []);

  // no scrolling until the machine is powered on.
  // iOS Safari does not reliably re-enable scrolling when overflow is toggled
  // on documentElement alone, so lock both html and body and force a reflow.
  useEffect(() => {
    const locked = phase !== "ready";
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = locked ? "hidden" : "";
    body.style.overflow = locked ? "hidden" : "";
    if (!locked) void html.offsetHeight;
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [phase]);

  // visible carry ripple, one column at a time
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRipple(0);
    let s = 0;
    const id = window.setInterval(() => {
      s++;
      setRipple(s);
      if (s >= 4) clearInterval(id);
    }, 230);
    return () => clearInterval(id);
  }, [adderA, adderB]);

  // quiz: pick a gate that is actually firing, preferring ones that just switched on
  useEffect(() => {
    if (!quiz.on || quiz.target || quiz.n >= QUIZ_LEN) return;
    const fresh = justFired.current;
    const pool = fresh.length ? fresh : firing(adderA, adderB);
    if (!pool.length) return;
    const t = pool[Math.floor(Math.random() * pool.length)]!;
    justFired.current = [];
    setQuiz((q) => ({ ...q, target: t }));
  }, [quiz, adderA, adderB]);

  const powerOn = useCallback(() => {
    audio.init();
    audio.startup();
    setPhase("boot");
    window.setTimeout(() => setMonitorOn(true), 950);
    window.setTimeout(() => setPhase("ready"), 2300);
  }, []);

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id === "and" || id === "or" || id === "not") setActiveGate(id);
  }, []);

  const onToggle = useCallback(
    (key: string) => {
      if (key.startsWith("add-")) {
        const [, which, bit] = key.split("-") as [string, "a" | "b", string];
        const i = +bit;
        const before = firing(adderA, adderB);
        const nextA = [...adderA] as Bits;
        const nextB = [...adderB] as Bits;
        const t = which === "a" ? nextA : nextB;
        t[i] = t[i] ? 0 : 1;
        justFired.current = firing(nextA, nextB).filter((f) => !before.some((x) => x.bit === f.bit && x.gate === f.gate));
        setA(nextA);
        setB(nextB);
        return;
      }
      const [g, pin] = key.split("-") as ["and" | "or" | "not", "a" | "b"];
      const i = pin === "a" ? 0 : 1;
      setActiveGate(g);
      setGates((prev) => {
        const arr = [...prev[g]] as number[];
        arr[i] = arr[i] ? 0 : 1;
        return { ...prev, [g]: arr } as GateInputs;
      });
    },
    [adderA, adderB],
  );

  const onQuizAnswer = useCallback((ans: string) => {
    setQuiz((q) => {
      if (!q.target) return q;
      const right = GATE_TYPE[q.target.gate] === ans;
      return { ...q, n: q.n + 1, score: q.score + (right ? 1 : 0), target: null, last: right ? "right" : "wrong" };
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const n = !m;
      audio.setMuted(n);
      localStorage.setItem(MUTE_KEY, n ? "1" : "0");
      return n;
    });
  }, []);

  const restart = useCallback(() => {
    setSelectedId(null);
    setGates({ and: [0, 0], or: [0, 0], not: [0] });
    setActiveGate("and");
    setTransistorOn(false);
    setA([1, 0, 1, 0]);
    setB([1, 1, 0, 0]);
    setRipple(4);
    setQuiz({ on: false, n: 0, score: 0, target: null, last: null });
    setLegal(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <main>
      <MachineScene
        selectedId={selectedId}
        onSelect={onSelect}
        onToggle={onToggle}
        gates={gates}
        transistorOn={transistorOn}
        monitorOn={monitorOn}
        adderA={adderA}
        adderB={adderB}
        rippleStep={rippleStep}
        quizTarget={quiz.on ? quiz.target : null}
        monitorOverlayRef={monitorOverlayRef}
      />
      <a
        ref={monitorOverlayRef}
        href="https://namishhh.vercel.app"
        target="_blank"
        rel="noopener"
        className="monitor-overlay"
        aria-label="Open portfolio"
      >
        <img src="/portfolio-shot.jpg" alt="Namish's portfolio" draggable={false} />
      </a>
      <Hud
        phase={phase}
        onPowerOn={powerOn}
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
        gates={gates}
        activeGate={activeGate}
        setActiveGate={setActiveGate}
        onToggle={onToggle}
        transistorOn={transistorOn}
        setTransistorOn={setTransistorOn}
        adderA={adderA}
        adderB={adderB}
        rippleStep={rippleStep}
        quiz={quiz}
        onQuizStart={() => {
          justFired.current = [];
          setQuiz({ on: true, n: 0, score: 0, target: null, last: null });
        }}
        onQuizAnswer={onQuizAnswer}
        onQuizExit={() => setQuiz({ on: false, n: 0, score: 0, target: null, last: null })}
        muted={muted}
        onMute={toggleMute}
        onRestart={restart}
        openLegal={setLegal}
        mobileNote={mobileNote}
        onMobileContinue={() => setMobileNote(false)}
      />
      {legal && <LegalModal tab={legal} setTab={setLegal} onClose={() => setLegal(null)} />}
      <div className="scroll-track" aria-hidden="true" />
    </main>
  );
}
