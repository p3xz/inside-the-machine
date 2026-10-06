import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { MachineScene, type GateInputs } from "@/components/machine/MachineScene";
import { Hud } from "@/components/machine/Hud";

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

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id === "and" || id === "or" || id === "not") setActiveGate(id);
  }, []);

  const onToggle = useCallback((key: string) => {
    const [g, pin] = key.split("-") as ["and" | "or" | "not", "a" | "b"];
    const i = pin === "a" ? 0 : 1;
    setActiveGate(g);
    setGates((prev) => {
      const arr = [...prev[g]] as number[];
      arr[i] = arr[i] ? 0 : 1;
      return { ...prev, [g]: arr } as GateInputs;
    });
  }, []);

  return (
    <main>
      <MachineScene selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} gates={gates} transistorOn={transistorOn} />
      <Hud
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
        gates={gates}
        activeGate={activeGate}
        setActiveGate={setActiveGate}
        onToggle={onToggle}
        transistorOn={transistorOn}
        setTransistorOn={setTransistorOn}
      />
      <div className="scroll-track" aria-hidden="true" />
    </main>
  );
}
