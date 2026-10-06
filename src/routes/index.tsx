import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MachineScene, type GateInputs } from "@/components/machine/MachineScene";
import { Hud } from "@/components/machine/Hud";
import { bitToggle, click, power, select, unlockAudio } from "@/lib/audio";

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

  useEffect(() => {
    unlockAudio();
  }, []);

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
      <MachineScene selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} gates={gates} transistorOn={transistorOn} />
      <Hud
        selectedId={selectedId}
        onClose={onClose}
        gates={gates}
        activeGate={activeGate}
        setActiveGate={onGateTab}
        onToggle={onToggle}
        transistorOn={transistorOn}
        setTransistorOn={onTransistor}
      />
      <div className="scroll-track" aria-hidden="true" />
    </main>
  );
}
