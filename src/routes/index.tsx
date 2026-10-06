import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MachineScene, type BootPhase, type GateInputs } from "@/components/machine/MachineScene";
import { Hud } from "@/components/machine/Hud";
import { bitToggle, click, power, select, setAudioZone, startup, stopAll, whoosh } from "@/lib/audio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inside the Machine — A journey from computer to transistor" },
      { name: "description", content: "Scroll through a computer in 3D: motherboard, CPU, logic gates, down to a single transistor switch." },
      { property: "og:title", content: "Inside the Machine" },
      { property: "og:description", content: "A scroll-driven 3D journey from a computer down to a transistor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gates, setGates] = useState<GateInputs>({ and: [0, 0], or: [0, 0], not: [0] });
  const [activeGate, setActiveGate] = useState<"and" | "or" | "not">("and");
  const [transistorOn, setTransistorOn] = useState(false);
  const [boot, setBoot] = useState<BootPhase>("off");

  const onPower = useCallback(() => {
    startup(); // runs inside the click gesture, unlocking browser audio
    setAudioZone("room");
    setBoot("starting");
    window.setTimeout(() => setBoot("on"), 1700);
  }, []);

  const onReset = useCallback(() => {
    setSelectedId(null);
    stopAll();
    setBoot("off");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // lock scroll until the machine is powered on
  useEffect(() => {
    document.body.style.overflow = boot === "off" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [boot]);

  // soundscape follows the journey: room tone outside, ambient pad inside
  useEffect(() => {
    if (boot === "off") return;
    let raf = 0;
    let whooshed = false;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setAudioZone(p < 0.28 || p > 0.9 ? "room" : "inside");
      if (!whooshed && p > 0.33) {
        whooshed = true;
        whoosh();
      } else if (p < 0.2) {
        whooshed = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [boot]);

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id === "and" || id === "or" || id === "not") setActiveGate(id);
    if (id) select();
  }, []);

  const onClose = useCallback(() => {
    setSelectedId(null);
    click();
  }, []);

  const onToggle = useCallback((key: string) => {
    const [g, pin] = key.split("-") as ["and" | "or" | "not", "a" | "b"];
    const i = pin === "a" ? 0 : 1;
    setActiveGate(g);
    setGates((prev) => {
      const arr = [...prev[g]] as number[];
      const next = arr[i] ? 0 : 1;
      arr[i] = next;
      bitToggle(!!next);
      return { ...prev, [g]: arr } as GateInputs;
    });
  }, []);

  const onTransistor = useCallback((v: boolean) => {
    setTransistorOn(v);
    power(v);
  }, []);

  const onGateTab = useCallback((g: "and" | "or" | "not") => {
    setActiveGate(g);
    click();
  }, []);

  return (
    <main>
      <MachineScene selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} gates={gates} transistorOn={transistorOn} bootPhase={boot} />
      <Hud
        selectedId={selectedId}
        onClose={onClose}
        gates={gates}
        activeGate={activeGate}
        setActiveGate={onGateTab}
        onToggle={onToggle}
        transistorOn={transistorOn}
        setTransistorOn={onTransistor}
        boot={boot}
        onPower={onPower}
        onReset={onReset}
      />
      <div className="scroll-track" aria-hidden="true" />
    </main>
  );
}
