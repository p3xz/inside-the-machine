# Inside the Machine

A scroll-driven 3D journey from a computer down to a single transistor. Scroll to fly through seven stages: computer case, motherboard, CPU internals, instruction pipeline, logic gates, and a working transistor switch, with clickable parts, live logic-gate playgrounds, synthesized sound, and a peaceful ambient soundtrack.

![Tech](https://skillicons.dev/icons?i=react,typescript,vite,tailwind)

## Quick start

```bash
bun install
bun run dev
```

Then open the printed localhost URL. No accounts, no keys.

## How it works

- **Scroll camera**: page scroll maps to keyframed camera waypoints; the camera lerps between them every frame for a smooth flight.
- **3D scene** (`src/components/machine/MachineScene.tsx`): A-Frame entities for every stage, a procedural starfield, data pulses travelling along traces, and clickable parts with hover glow.
- **HUD** (`src/components/machine/Hud.tsx`): stage rail, narration captions, a logic-gate console (AND/OR/NOT with flippable inputs), and a transistor gate-voltage switch.
- **Audio** (`src/lib/audio.ts`): everything synthesized with the Web Audio API. Soft clicks for UI, pitched blips for bit toggles, chimes for part selection, a power sweep for the transistor, and a slow evolving ambient pad (Cmaj9 Am9 Fmaj7 G6/9). Starts on first interaction; toggle in the top-left HUD, preference saved.
- **Journey data** (`src/lib/journey-data.ts`): stage definitions, keyframes, and the info-panel copy.

## Tech stack

- TanStack Start (React, file-based routing, SSR off for the 3D route)
- A-Frame + Three.js for the 3D scene
- Tailwind CSS for the HUD
- Bun for install/dev/build
- Web Audio API for all sound (no audio assets)

## Project structure

- `src/components/machine/MachineScene.tsx`: the 3D world
- `src/components/machine/Hud.tsx`: overlay UI
- `src/lib/audio.ts`: synthesized sound engine
- `src/lib/journey-data.ts`: stages, keyframes, copy
- `src/routes/index.tsx`: state wiring

## License

MIT
