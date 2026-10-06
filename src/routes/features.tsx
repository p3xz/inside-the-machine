import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [{ title: "Features — Inside the Machine" }],
  }),
  component: Features,
});

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "THE JOURNEY",
    body: "A scroll-driven 3D flight from a quiet desk down to a single transistor. Seven layers: computer, motherboard, CPU packaging, CPU internals, instruction pipeline, logic gates, transistor. Your scroll position drives the camera, smoothed every frame.",
  },
  {
    title: "BOOT SEQUENCE",
    body: "Press POWER ON. The machine runs POST, the monitor flickers alive, and the room fades in around you. Scrolling stays locked until the machine is ready.",
  },
  {
    title: "CLICKABLE COMPONENTS",
    body: "Tap any glowing part of the machine to open its info panel: what it is, what it does, and why it matters.",
  },
  {
    title: "LOGIC GATE CONSOLE",
    body: "A working AND, OR and NOT playground. Flip the inputs and watch the output change. Real boolean logic, computed live.",
  },
  {
    title: "4-BIT RIPPLE-CARRY ADDER",
    body: "Set two 4-bit numbers and watch the machine add them. The carry propagates bit by bit through real XOR, AND and OR gates. Nothing is hardcoded.",
  },
  {
    title: "TRANSISTOR SWITCH",
    body: "Drive the gate voltage yourself and watch a single transistor switch between ON and OFF. This tiny switch is the fundamental unit of all computing.",
  },
  {
    title: "QUIZ MODE",
    body: "Five questions that test what the journey taught you. Your score is tracked in the HUD as you travel.",
  },
  {
    title: "SYNTHESIZED SOUND",
    body: "Every sound is generated live with the Web Audio API: startup hum, room tone, ambient pad, UI clicks, gate blips. No audio files. Mute it anytime; your preference is saved.",
  },
  {
    title: "STAGE RAIL",
    body: "Jump straight to any layer from the stage rail on the side of the screen. No need to scroll the whole way down.",
  },
];

function Features() {
  return (
    <main className="features">
      <p className="eyebrow">INSIDE THE MACHINE</p>
      <h1 className="features-title">FEATURES</h1>
      <p className="features-sub">EVERYTHING THIS SITE DOES, IN WRITING.</p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="features-section">
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
      <Link to="/" className="features-back">
        BACK TO THE JOURNEY
      </Link>
    </main>
  );
}
