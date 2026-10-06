import { memo, useEffect, useRef, useState } from "react";
import { INFO, KEYFRAMES } from "@/lib/journey-data";

/* 3D palette (scene-only; mirrors design tokens) */
const C = {
  bg: "#05070A",
  env: "#0B1117",
  board: "#0A1513",
  chip: "#16202A",
  cyan: "#00E5FF",
  violet: "#7C3AED",
  dim: "#1E2A36",
  text: "#F5F7FA",
  muted: "#8B98A7",
};

export type GateInputs = { and: [number, number]; or: [number, number]; not: [number] };

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggle: (key: string) => void;
  gates: GateInputs;
  transistorOn: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function registerComponents() {
  const A = (window as Any).AFRAME;
  if (A.components.starfield) return;
  const THREE = A.THREE;
  A.registerComponent("starfield", {
    init(this: Any) {
      const n = 900;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 24 + 1;
        arr[i * 3 + 2] = 18 - Math.random() * 80;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const m = new THREE.PointsMaterial({ color: 0x5fd8ea, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true });
      this.el.setObject3D("mesh", new THREE.Points(g, m));
    },
    tick(this: Any, t: number) {
      const o = this.el.getObject3D("mesh");
      if (o) o.rotation.z = t * 0.00001;
    },
  });
}

const ease = (t: number) => t * t * (3 - 2 * t);

function sample(p: number) {
  let i = 0;
  while (i < KEYFRAMES.length - 2 && p > KEYFRAMES[i + 1]!.p) i++;
  const a = KEYFRAMES[i]!;
  const b = KEYFRAMES[i + 1]!;
  const t = ease(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  const l = (x: number[], y: number[]) => x.map((v, k) => v + (y[k]! - v) * t);
  return { pos: l(a.pos, b.pos), look: l(a.look, b.look) };
}

const Label = ({ id, pos, show }: { id: string; pos: string; show: boolean }) => (
  <a-entity position={pos} visible={show ? "true" : "false"}>
    <a-plane width="1.7" height="0.36" position="0.78 0 -0.01" material={`color: ${C.bg}; opacity: 0.82; transparent: true; shader: flat`} />
    <a-plane width="0.015" height="0.36" position="-0.07 0 0" material={`color: ${C.cyan}; shader: flat`} />
    <a-text value={INFO[id]!.name} font="sourcecodepro" color={C.cyan} width="2.2" position="0 0.07 0" />
    <a-text value={INFO[id]!.full} font="sourcecodepro" color={C.muted} width="1.2" position="0 -0.08 0" />
  </a-entity>
);

/** a small glowing pulse travelling along a straight path */
const Pulse = ({ from, to, dur = 2200, delay = 0, color = C.cyan, r = 0.025 }: { from: string; to: string; dur?: number; delay?: number; color?: string; r?: number }) => (
  <a-sphere
    radius={r}
    segments-width="6"
    segments-height="6"
    material={`color: ${color}; shader: flat`}
    position={from}
    animation={`property: position; from: ${from}; to: ${to}; dur: ${dur}; delay: ${delay}; loop: true; easing: linear`}
  />
);

const wire = (on: boolean) => (on ? C.cyan : C.dim);

function SceneInner({ selectedId, onSelect, onToggle, gates, transistorOn }: Props) {
  const sceneRef = useRef<Any>(null);
  const camRef = useRef<Any>(null);
  const cb = useRef({ onSelect, onToggle });
  cb.current = { onSelect, onToggle };
  const sel = useRef(selectedId);
  sel.current = selectedId;

  // camera choreography + instruction token
  useEffect(() => {
    const A = (window as Any).AFRAME;
    const THREE = A.THREE;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pos = new THREE.Vector3(...KEYFRAMES[0]!.pos);
    const look = new THREE.Vector3(...KEYFRAMES[0]!.look);
    const tp = new THREE.Vector3();
    const tl = new THREE.Vector3();
    const m = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    let last = performance.now();
    let raf = 0;
    let tokenVal = "";
    const token = document.getElementById("token") as Any;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const s = sample(p);
      tp.set(s.pos[0]!, s.pos[1]!, s.pos[2]!);
      tl.set(s.look[0]!, s.look[1]!, s.look[2]!);
      const k = reduce ? 1 : 1 - Math.exp(-5 * dt);
      pos.lerp(tp, k);
      look.lerp(tl, k);
      const cam = camRef.current?.object3D;
      if (cam) {
        cam.position.copy(pos);
        m.lookAt(pos, look, up);
        cam.quaternion.setFromRotationMatrix(m);
      }
      const fog = sceneRef.current?.object3D?.fog;
      if (fog) {
        const f = Math.max(0, (p - 0.955) / 0.045);
        fog.far = 22 + ease(f) * 110;
        fog.near = 2 + ease(f) * 20;
      }
      if (token) {
        const t = (now % 4200) / 4200;
        const x = -4.5 + t * 9;
        token.object3D?.position.set(x, 1.95, -25.4);
        const v = x < 1.5 ? "5 + 3" : "8";
        if (v !== tokenVal) {
          tokenVal = v;
          token.setAttribute("value", v);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // interaction delegation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let hit = false;
    const idOf = (e: Event) => {
      const el = e.target as Any;
      return el?.classList?.contains("clickable") ? el : null;
    };
    const enter = (e: Event) => {
      const el = idOf(e);
      if (!el) return;
      el.object3D.scale.setScalar(1.06);
      el.setAttribute("material", "emissive", C.cyan);
      el.setAttribute("material", "emissiveIntensity", 0.35);
      document.body.style.cursor = "pointer";
    };
    const leave = (e: Event) => {
      const el = idOf(e);
      if (!el) return;
      el.object3D.scale.setScalar(1);
      const on = el.dataset.id === sel.current;
      el.setAttribute("material", "emissiveIntensity", on ? 0.55 : 0);
      if (!on) el.setAttribute("material", "emissive", "#000000");
      document.body.style.cursor = "";
    };
    const click = (e: Event) => {
      const el = idOf(e);
      if (!el) return;
      hit = true;
      if (el.dataset.toggle) cb.current.onToggle(el.dataset.toggle);
      else cb.current.onSelect(el.dataset.id);
    };
    const canvasClick = () => {
      requestAnimationFrame(() => {
        if (!hit) cb.current.onSelect(null);
        hit = false;
      });
    };
    scene.addEventListener("mouseenter", enter);
    scene.addEventListener("mouseleave", leave);
    scene.addEventListener("click", click);
    const attachCanvas = () => scene.canvas?.addEventListener("click", canvasClick);
    if (scene.canvas) attachCanvas();
    else scene.addEventListener("render-target-loaded", attachCanvas);
    return () => {
      scene.removeEventListener("mouseenter", enter);
      scene.removeEventListener("mouseleave", leave);
      scene.removeEventListener("click", click);
      scene.canvas?.removeEventListener("click", canvasClick);
    };
  }, []);

  // selection highlight
  useEffect(() => {
    document.querySelectorAll<Any>(".clickable[data-id]").forEach((el) => {
      if (!el.hasLoaded) return;
      const on = el.dataset.id === selectedId;
      el.setAttribute("material", "emissive", on ? C.cyan : "#000000");
      el.setAttribute("material", "emissiveIntensity", on ? 0.55 : 0);
    });
  }, [selectedId]);

  const is = (id: string) => selectedId === id;
  const andOut = gates.and[0] & gates.and[1];
  const orOut = gates.or[0] | gates.or[1];
  const notOut = gates.not[0] ? 0 : 1;

  return (
    <a-scene
      ref={sceneRef}
      embedded
      background={`color: ${C.bg}`}
      fog={`type: linear; color: ${C.bg}; near: 2; far: 22`}
      renderer="antialias: true; colorManagement: true; maxCanvasWidth: 1920; maxCanvasHeight: 1920"
      vr-mode-ui="enabled: false"
      loading-screen="enabled: false"
      device-orientation-permission-ui="enabled: false"
      cursor="rayOrigin: mouse; fuse: false"
      raycaster="objects: .clickable; far: 40"
    >
      <a-entity ref={camRef} camera="fov: 55; near: 0.05; far: 200" look-controls="enabled: false" wasd-controls="enabled: false" />

      <a-entity light="type: ambient; color: #6b7c8f; intensity: 0.55" />
      <a-entity light="type: directional; color: #cfe9ff; intensity: 0.9" position="4 8 10" />
      <a-entity light={`type: point; color: ${C.cyan}; intensity: 1.4; distance: 9`} position="0 2 2" />
      <a-entity starfield />

      {/* ============ 01 COMPUTER CASE ============ */}
      <a-entity position="0 1.2 -0.6">
        {[
          ["0 2.05 0", "5 0.08 2.6"],
          ["0 -2.05 0", "5 0.08 2.6"],
          ["-2.5 0 0", "0.08 4.1 2.6"],
          ["2.5 0 0", "0.08 4.1 2.6"],
        ].map(([p, s], i) => {
          const [w, h, d] = (s as string).split(" ");
          return <a-box key={i} position={p} width={w} height={h} depth={d} material={`color: ${C.env}; metalness: 0.6; roughness: 0.45`} />;
        })}
        <a-box position="0 2.0 1.31" width="5" height="0.015" depth="0.015" material={`color: ${C.cyan}; shader: flat`} />
        <a-box position="0 -2.0 1.31" width="5" height="0.015" depth="0.015" material={`color: ${C.cyan}; shader: flat; opacity: 0.4; transparent: true`} />
        <a-sphere position="2.3 1.85 1.32" radius="0.035" material={`color: ${C.cyan}; shader: flat`} animation="property: material.opacity; from: 1; to: 0.2; dir: alternate; loop: true; dur: 900" />
        <a-sphere position="2.15 1.85 1.32" radius="0.035" material={`color: ${C.violet}; shader: flat`} />
        <a-text value="SYS / ONLINE" font="sourcecodepro" color={C.muted} width="1.6" position="-2.3 1.85 1.32" />
      </a-entity>

      {/* ============ 02 MOTHERBOARD ============ */}
      <a-plane position="0 1.2 -1.75" width="4.6" height="3.7" material={`color: ${C.board}; roughness: 0.8`} />
      <a-plane position="0 1.2 -1.74" width="4.6" height="3.7" geometry="segmentsWidth: 23; segmentsHeight: 18" material={`color: ${C.cyan}; wireframe: true; opacity: 0.05; transparent: true; shader: flat`} />

      {/* data bus traces */}
      {[
        ["0.75 1.4 -1.72", "0.6 0.03 0.01"],
        ["0 0.85 -1.72", "0.03 0.5 0.01"],
        ["-0.95 2.0 -1.72", "1.5 0.03 0.01"],
        ["1.0 0.55 -1.72", "1.1 0.03 0.01"],
        ["0.45 0.55 -1.72", "0.03 0.6 0.01"],
      ].map(([p, s], i) => {
        const [w, h, d] = (s as string).split(" ");
        return <a-box key={i} className="clickable" data-id="bus" position={p} width={w} height={h} depth={d} material="color: #2a6b6f; roughness: 0.4" />;
      })}
      <a-box className="clickable" data-id="bus" position="-1.4 0.95 -1.71" width="0.7" height="0.12" depth="0.02" material="color: #20484c" />
      <a-text value="DATA BUS" font="sourcecodepro" color={C.muted} width="1.3" position="-1.72 1.08 -1.7" />
      <Pulse from="0.45 1.4 -1.7" to="1.1 1.4 -1.7" dur={1200} />
      <Pulse from="0 1.1 -1.7" to="0 0.6 -1.7" dur={1000} delay={300} />
      <Pulse from="-1.7 2.0 -1.7" to="-0.2 2.0 -1.7" dur={1600} delay={200} />
      <Pulse from="0.45 0.55 -1.7" to="1.55 0.55 -1.7" dur={1400} delay={500} />

      {/* CPU */}
      <a-box className="clickable" data-id="cpu" position="0 1.4 -1.66" width="0.9" height="0.9" depth="0.12" material={`color: ${C.chip}; metalness: 0.7; roughness: 0.3`} />
      <a-box position="0 1.4 -1.59" width="0.55" height="0.55" depth="0.02" material="color: #8d99a6; metalness: 0.9; roughness: 0.25" />
      <a-text value="CPU / CORE 01" font="sourcecodepro" color={C.cyan} width="1" position="-0.26 1.4 -1.57" />
      <Label id="cpu" pos="0.55 1.95 -1.5" show={is("cpu")} />

      {/* RAM */}
      {[1.25, 1.42, 1.59, 1.76].map((x) => (
        <a-box key={x} className="clickable" data-id="ram" position={`${x} 1.45 -1.64`} width="0.09" height="1.1" depth="0.16" material="color: #1a2e3a; metalness: 0.5; roughness: 0.4" />
      ))}
      <Label id="ram" pos="1.2 2.15 -1.5" show={is("ram")} />

      {/* GPU */}
      <a-box className="clickable" data-id="gpu" position="-0.55 0.35 -1.55" width="2.2" height="0.38" depth="0.32" material="color: #121a22; metalness: 0.6; roughness: 0.35" />
      <a-cylinder position="-1.15 0.35 -1.38" radius="0.15" height="0.02" rotation="90 0 0" material="color: #26323d" />
      <a-cylinder position="-0.55 0.35 -1.38" radius="0.15" height="0.02" rotation="90 0 0" material="color: #26323d" />
      <a-box position="-0.55 0.17 -1.38" width="2.2" height="0.012" depth="0.012" material={`color: ${C.violet}; shader: flat`} />
      <Label id="gpu" pos="-1.5 0.8 -1.3" show={is("gpu")} />

      {/* STORAGE */}
      <a-box className="clickable" data-id="storage" position="1.55 0.25 -1.68" width="0.7" height="0.24" depth="0.06" material="color: #18232d; metalness: 0.4" />
      <a-text value="NVME 2TB" font="sourcecodepro" color={C.muted} width="0.9" position="1.3 0.25 -1.64" />
      <Label id="storage" pos="1.2 0.62 -1.5" show={is("storage")} />

      {/* POWER */}
      <a-box className="clickable" data-id="power" position="-1.6 2.55 -1.5" width="0.95" height="0.55" depth="0.42" material="color: #0f151b; metalness: 0.7; roughness: 0.4" />
      <a-cylinder position="-1.6 2.55 -1.28" radius="0.2" height="0.015" rotation="90 0 0" material="color: #222c36" />
      <Label id="power" pos="-1.0 2.75 -1.2" show={is("power")} />
      <Label id="bus" pos="-1.8 1.3 -1.5" show={is("bus")} />

      {/* ============ 04 CPU INTERNALS ============ */}
      <a-plane position="0 -0.9 -14" rotation="-90 0 0" width="34" height="26" geometry="segmentsWidth: 34; segmentsHeight: 26" material={`color: ${C.violet}; wireframe: true; opacity: 0.18; transparent: true; shader: flat`} />
      <a-entity light={`type: point; color: ${C.violet}; intensity: 1.6; distance: 16`} position="0 4 -12" />
      <a-entity light={`type: point; color: ${C.cyan}; intensity: 1; distance: 10`} position="0 1 -10" />
      {[
        { id: "control", p: "0 2.4 -14", s: ["2.4", "0.7", "0.7"] },
        { id: "alu", p: "-2.8 0.6 -14", s: ["1.5", "1.1", "0.8"] },
        { id: "registers", p: "2.8 0.6 -14", s: ["1.5", "1.1", "0.8"] },
        { id: "cache", p: "0 -0.3 -14.5", s: ["3.2", "0.5", "1"] },
      ].map((b) => (
        <a-entity key={b.id}>
          <a-box className="clickable" data-id={b.id} position={b.p} width={b.s[0]} height={b.s[1]} depth={b.s[2]} material={`color: ${C.chip}; metalness: 0.5; roughness: 0.35`} />
          <a-text value={INFO[b.id]!.name} font="sourcecodepro" color={C.text} width="3" align="center" position={b.p.split(" ").map((v, i) => (i === 2 ? +v + +b.s[2]! / 2 + 0.01 : v)).join(" ")} />
        </a-entity>
      ))}
      {[
        ["-1.4 1.5 -14", "0.03 1.6 0.03", "0 0 -35"],
        ["1.4 1.5 -14", "0.03 1.6 0.03", "0 0 35"],
        ["0 0.6 -14", "4.1 0.03 0.03", "0 0 0"],
      ].map(([p, s, r], i) => {
        const [w, h, d] = (s as string).split(" ");
        return <a-box key={i} position={p} rotation={r} width={w} height={h} depth={d} material={`color: ${C.violet}; shader: flat; opacity: 0.6; transparent: true`} />;
      })}
      <Pulse from="0 2.05 -14" to="-2.4 1.15 -14" dur={1500} r={0.05} />
      <Pulse from="0 2.05 -14" to="2.4 1.15 -14" dur={1500} delay={700} r={0.05} />
      <Pulse from="-2.05 0.6 -14" to="2.05 0.6 -14" dur={1800} r={0.05} />
      <Pulse from="2.05 0.6 -14" to="-2.05 0.6 -14" dur={1800} delay={900} r={0.05} color={C.violet} />
      <a-text value="CLOCK 4.8 GHZ" font="sourcecodepro" color={C.muted} width="2" position="-3.5 3.2 -14" />
      {["control", "alu", "registers", "cache"].map((id) => (
        <Label key={id} id={id} pos={id === "control" ? "1.3 3.1 -13.6" : id === "alu" ? "-3.4 1.5 -13.5" : id === "registers" ? "2.2 1.5 -13.5" : "1.7 0.1 -13.9"} show={is(id)} />
      ))}

      {/* ============ 05 INSTRUCTION FLOW ============ */}
      <a-plane position="0 -0.6 -26" rotation="-90 0 0" width="24" height="14" geometry="segmentsWidth: 24; segmentsHeight: 14" material={`color: ${C.cyan}; wireframe: true; opacity: 0.08; transparent: true; shader: flat`} />
      <a-entity light={`type: point; color: ${C.cyan}; intensity: 1.2; distance: 12`} position="0 3 -23" />
      {[
        ["INSTRUCTION", "OPCODE: ADD", -4.5],
        ["CONTROL UNIT", "DECODE", -1.5],
        ["ALU", "EXECUTE", 1.5],
        ["RESULT", "REGISTER R1", 4.5],
      ].map(([n, sub, x], bi) => (
        <a-entity key={n as string} position={`${x} 1 -26`} animation={`property: position; from: ${x} 1 -26; to: ${x} 1.14 -26; dir: alternate; dur: ${3000 + bi * 450}; loop: true; easing: easeInOutSine`}>
          <a-box width="2.2" height="1" depth="0.5" material={`color: ${C.chip}; metalness: 0.4; roughness: 0.4`} />
          <a-box position="0 0.51 0" width="2.2" height="0.015" depth="0.5" material={`color: ${C.cyan}; shader: flat`} />
          <a-text value={n} font="sourcecodepro" color={C.text} width="3.2" align="center" position="0 0.1 0.26" />
          <a-text value={sub} font="sourcecodepro" color={C.muted} width="2" align="center" position="0 -0.2 0.26" />
        </a-entity>
      ))}
      <a-box position="0 1.95 -25.6" width="9" height="0.01" depth="0.01" material={`color: ${C.cyan}; shader: flat; opacity: 0.3; transparent: true`} />
      <a-text id="token" value="5 + 3" font="sourcecodepro" color={C.cyan} width="6" align="center" position="-4.5 1.95 -25.4" />

      {/* ============ 06 LOGIC GATES ============ */}
      <a-plane position="0 -0.6 -38" rotation="-90 0 0" width="24" height="16" geometry="segmentsWidth: 24; segmentsHeight: 16" material={`color: ${C.cyan}; wireframe: true; opacity: 0.08; transparent: true; shader: flat`} />
      <a-entity light="type: point; color: #cfe9ff; intensity: 1.2; distance: 12" position="0 4 -34" />

      {/* OR (left) */}
      <a-entity position="-4.2 1 -38" animation="property: position; from: -4.2 1 -38; to: -4.2 1.16 -38; dir: alternate; dur: 3400; loop: true; easing: easeInOutSine">
        <a-box className="clickable" data-id="or" width="1.2" height="1.2" depth="0.5" material={`color: ${C.chip}; metalness: 0.5; roughness: 0.3`} />
        <a-cone position="0.9 0 0" rotation="0 0 -90" radius-bottom="0.6" radius-top="0" height="0.6" segments-radial="24" scale="1 1 0.42" material={`color: ${C.chip}; metalness: 0.5; roughness: 0.3`} />
        <a-text value="OR" font="sourcecodepro" color={C.text} width="4" align="center" position="0.15 0 0.26" />
        <a-box position="-1.15 0.3 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!gates.or[0])}; shader: flat`} />
        <a-box position="-1.15 -0.3 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!gates.or[1])}; shader: flat`} />
        <a-box position="1.75 0 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!orOut)}; shader: flat`} />
        <a-sphere className="clickable" data-toggle="or-a" position="-1.75 0.3 0" radius="0.11" material={`color: ${wire(!!gates.or[0])}`} />
        <a-sphere className="clickable" data-toggle="or-b" position="-1.75 -0.3 0" radius="0.11" material={`color: ${wire(!!gates.or[1])}`} />
        <a-text value={`A ${gates.or[0]}`} font="sourcecodepro" color={C.muted} width="2" position="-2.25 0.42 0" />
        <a-text value={`B ${gates.or[1]}`} font="sourcecodepro" color={C.muted} width="2" position="-2.25 -0.18 0" />
        <a-text value={`OUT ${orOut}`} font="sourcecodepro" color={orOut ? C.cyan : C.muted} width="2" position="1.5 0.15 0" />
        {gates.or[0] || gates.or[1] ? <Pulse from="-1.7 0 0" to="2.3 0 0" dur={1100} r={0.05} /> : null}
      </a-entity>

      {/* AND (center) */}
      <a-entity position="0 1 -38" animation="property: position; from: 0 1 -38; to: 0 1.16 -38; dir: alternate; dur: 4100; loop: true; easing: easeInOutSine">
        <a-box className="clickable" data-id="and" width="1.2" height="1.2" depth="0.5" material={`color: ${C.chip}; metalness: 0.5; roughness: 0.3`} />
        <a-cylinder position="0.6 0 0" rotation="90 0 0" radius="0.6" height="0.5" theta-start="0" theta-length="180" material={`color: ${C.chip}; metalness: 0.5; roughness: 0.3`} />
        <a-text value="AND" font="sourcecodepro" color={C.text} width="4" align="center" position="0.15 0 0.26" />
        <a-box position="-1.15 0.3 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!gates.and[0])}; shader: flat`} />
        <a-box position="-1.15 -0.3 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!gates.and[1])}; shader: flat`} />
        <a-box position="1.75 0 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!andOut)}; shader: flat`} />
        <a-sphere className="clickable" data-toggle="and-a" position="-1.75 0.3 0" radius="0.11" material={`color: ${wire(!!gates.and[0])}`} />
        <a-sphere className="clickable" data-toggle="and-b" position="-1.75 -0.3 0" radius="0.11" material={`color: ${wire(!!gates.and[1])}`} />
        <a-text value={`A ${gates.and[0]}`} font="sourcecodepro" color={C.muted} width="2" position="-2.25 0.42 0" />
        <a-text value={`B ${gates.and[1]}`} font="sourcecodepro" color={C.muted} width="2" position="-2.25 -0.18 0" />
        <a-text value={`OUT ${andOut}`} font="sourcecodepro" color={andOut ? C.cyan : C.muted} width="2" position="1.5 0.15 0" />
        {andOut ? <Pulse from="-1.7 0 0" to="2.3 0 0" dur={1100} r={0.05} /> : null}
      </a-entity>

      {/* NOT (right) */}
      <a-entity position="4.2 1 -38" animation="property: position; from: 4.2 1 -38; to: 4.2 1.16 -38; dir: alternate; dur: 2900; loop: true; easing: easeInOutSine">
        <a-cone className="clickable" data-id="not" rotation="0 0 -90" radius-bottom="0.65" radius-top="0" height="1.2" segments-radial="3" scale="1 1 0.5" material={`color: ${C.chip}; metalness: 0.5; roughness: 0.3`} />
        <a-torus position="0.72 0 0" radius="0.1" radius-tubular="0.03" material={`color: ${wire(!!notOut)}`} />
        <a-text value="NOT" font="sourcecodepro" color={C.text} width="3.4" align="center" position="-0.12 0 0.3" />
        <a-box position="-1.0 0 0" width="0.9" height="0.05" depth="0.05" material={`color: ${wire(!!gates.not[0])}; shader: flat`} />
        <a-box position="1.35 0 0" width="1.1" height="0.05" depth="0.05" material={`color: ${wire(!!notOut)}; shader: flat`} />
        <a-sphere className="clickable" data-toggle="not-a" position="-1.5 0 0" radius="0.11" material={`color: ${wire(!!gates.not[0])}`} />
        <a-text value={`IN ${gates.not[0]}`} font="sourcecodepro" color={C.muted} width="2" position="-2.05 0.15 0" />
        <a-text value={`OUT ${notOut}`} font="sourcecodepro" color={notOut ? C.cyan : C.muted} width="2" position="1.1 0.15 0" />
      </a-entity>
      <Label id="or" pos="-4.8 2 -37.6" show={is("or")} />
      <Label id="and" pos="-0.6 2 -37.6" show={is("and")} />
      <Label id="not" pos="3.6 2 -37.6" show={is("not")} />

      {/* ============ 07 TRANSISTOR ============ */}
      <a-plane position="0 -0.4 -50" rotation="-90 0 0" width="30" height="20" geometry="segmentsWidth: 40; segmentsHeight: 26" material={`color: ${C.violet}; wireframe: true; opacity: 0.14; transparent: true; shader: flat`} />
      <a-entity light={`type: point; color: ${transistorOn ? C.cyan : C.violet}; intensity: 1.6; distance: 12`} position="0 4 -47" />
      <a-box className="clickable" data-id="transistor" position="0 0 -50" width="6" height="0.6" depth="2.2" material="color: #1a1430; metalness: 0.2; roughness: 0.7" />
      <a-box position="-2 0.55 -50" width="1.3" height="0.5" depth="1.7" material="color: #2b3a4a; metalness: 0.6; roughness: 0.3" />
      <a-box position="2 0.55 -50" width="1.3" height="0.5" depth="1.7" material="color: #2b3a4a; metalness: 0.6; roughness: 0.3" />
      <a-box position="0 0.36 -50" width="2.7" height="0.12" depth="1.3" material={`color: ${transistorOn ? C.cyan : "#241a3d"}; emissive: ${transistorOn ? C.cyan : "#000"}; emissiveIntensity: ${transistorOn ? 0.6 : 0}; opacity: 0.85; transparent: true`} />
      <a-box position="0 0.5 -50" width="1.6" height="0.06" depth="1.6" material="color: #c9d3dd; opacity: 0.4; transparent: true" />
      <a-box position="0 0.72 -50" width="1.6" height="0.36" depth="1.6" material={`color: ${transistorOn ? "#0f3a44" : "#1e1830"}; emissive: ${transistorOn ? C.cyan : "#000"}; emissiveIntensity: ${transistorOn ? 0.35 : 0}; metalness: 0.5`} />
      <a-box position="0 1.6 -50" width="0.06" height="1.4" depth="0.06" material={`color: ${transistorOn ? C.cyan : C.dim}; shader: flat`} />
      <a-box position="-2 1.3 -50" width="0.06" height="1" depth="0.06" material={`color: ${C.dim}; shader: flat`} />
      <a-box position="2 1.3 -50" width="0.06" height="1" depth="0.06" material={`color: ${transistorOn ? C.cyan : C.dim}; shader: flat`} />
      <a-text value="SOURCE" font="sourcecodepro" color={C.muted} width="3" align="center" position="-2 1.95 -50" />
      <a-text value="GATE" font="sourcecodepro" color={transistorOn ? C.cyan : C.muted} width="3" align="center" position="0 2.45 -50" />
      <a-text value="DRAIN" font="sourcecodepro" color={C.muted} width="3" align="center" position="2 1.95 -50" />
      <a-text value={transistorOn ? "1" : "0"} font="sourcecodepro" color={transistorOn ? C.cyan : C.muted} width="16" align="center" position="0 3.4 -50.5" animation="property: scale; from: 1 1 1; to: 1.07 1.07 1.07; dir: alternate; dur: 2200; loop: true; easing: easeInOutSine" />
      <a-text value={transistorOn ? "SIGNAL ACTIVE" : "SIGNAL BLOCKED"} font="sourcecodepro" color={C.muted} width="2.4" align="center" position="0 2.85 -50.5" />
      {/* slow halo ring around the transistor, ignites when ON */}
      <a-torus position="0 0.9 -50" radius="3.6" radius-tubular="0.025" rotation="90 0 0"
        material={`color: ${transistorOn ? C.cyan : C.violet}; shader: flat; opacity: ${transistorOn ? 0.8 : 0.25}; transparent: true`}
        animation="property: rotation; to: 90 360 0; dur: 18000; loop: true; easing: linear" />
      {transistorOn
        ? [0, 280, 560, 840, 1120].map((d, i) => (
            <Pulse key={d} from={`-2.1 0.45 ${-49.6 - (i % 3) * 0.3}`} to={`2.1 0.45 ${-49.6 - (i % 3) * 0.3}`} dur={1400} delay={d} r={0.06} />
          ))
        : null}
      <Label id="transistor" pos="2.9 1.3 -49.5" show={is("transistor")} />
    </a-scene>
  );
}

const SceneMemo = memo(SceneInner);

export function MachineScene(props: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    import("aframe").then(() => {
      registerComponents();
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <div className="machine-canvas">{ready ? <SceneMemo {...props} /> : null}</div>;
}
