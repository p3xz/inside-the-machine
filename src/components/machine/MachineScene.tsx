import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { INFO, KEYFRAMES, CUT_OUT } from "@/lib/journey-data";
import { rippleAdd, msb, toNum, type Bits, type GateKey } from "@/lib/adder";

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
  room: "#0b0e12",
  skin: "#3a434e",
  cloth: "#1f262f",
  screen: "#9fc7ff",
};

export type GateInputs = { and: [number, number]; or: [number, number]; not: [number] };

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggle: (key: string) => void;
  gates: GateInputs;
  transistorOn: boolean;
  monitorOn: boolean;
  adderA: Bits;
  adderB: Bits;
  rippleStep: number;
  quizTarget: { bit: number; gate: GateKey } | null;
  monitorOverlayRef: RefObject<HTMLAnchorElement | null>;
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

/** adder gate: neutral clickable body + a lit front plate (so hover styling never clobbers the logic state) */
const GateBox = ({ x, y, label, id, on, pend, hl }: { x: number; y: number; label: string; id: string; on: boolean; pend: boolean; hl: boolean }) => (
  <a-entity position={`${x} ${y} 0`}>
    <a-box className="clickable" data-id={id} width="0.78" height="0.46" depth="0.24" material={`color: ${C.chip}; metalness: 0.4; roughness: 0.35`} />
    <a-plane position="0 0 0.125" width="0.7" height="0.38" material={`color: ${on ? "#0e4450" : pend ? "#10161d" : "#141c25"}; shader: flat`} />
    <a-text value={label} font="sourcecodepro" color={on ? C.cyan : pend ? C.dim : C.muted} width="2.4" align="center" position="0 0.03 0.13" />
    <a-text value={pend ? "·" : on ? "1" : "0"} font="sourcecodepro" color={on ? C.cyan : C.muted} width="1.4" align="center" position="0 -0.12 0.13" />
    {hl ? (
      <a-box width="0.98" height="0.66" depth="0.3" material={`color: ${C.violet}; wireframe: true; shader: flat; transparent: true; opacity: 1`} animation="property: material.opacity; from: 1; to: 0.15; dir: alternate; loop: true; dur: 420" />
    ) : null}
  </a-entity>
);

const mat = (color: string, extra = "") => `color: ${color}; roughness: 0.85; metalness: 0.05${extra ? "; " + extra : ""}`;

/** Dark lab at night: desk, tower, monitor, keyboard and a low-poly person typing. */
const Room = memo(function Room({ monitorOn }: { monitorOn: boolean }) {
  return (
    <a-entity>
      {/* shell */}
      <a-plane position="0 0 42" rotation="-90 0 0" width="10" height="14" material={mat("#0a0d11")} />
      <a-plane position="0 3 42" rotation="90 0 0" width="10" height="14" material={mat("#07090c")} />
      <a-plane position="0 1.5 36" width="10" height="3" material={mat(C.room)} />
      <a-plane position="-5 1.5 42" rotation="0 90 0" width="14" height="3" material={mat(C.room)} />
      <a-plane position="5 1.5 42" rotation="0 -90 0" width="14" height="3" material={mat(C.room)} />
      {/* night window */}
      <a-plane position="-2.4 1.85 36.02" width="1.6" height="1.1" material="color: #142231; shader: flat" />
      <a-box position="-2.4 1.85 36.03" width="0.03" height="1.1" depth="0.02" material={mat("#05070a")} />
      <a-box position="-2.4 1.85 36.03" width="1.6" height="0.03" depth="0.02" material={mat("#05070a")} />
      <a-entity light="type: point; color: #4d6a8c; intensity: 0.35; distance: 6" position="-2.4 1.8 37" />
      {/* shelf + books */}
      <a-box position="2.6 1.9 36.15" width="1.6" height="0.04" depth="0.3" material={mat("#151a20")} />
      {[0, 1, 2, 3, 4].map((i) => (
        <a-box key={i} position={`${2.05 + i * 0.12} 2.04 36.15`} width="0.08" height={`${0.22 + (i % 3) * 0.03}`} depth="0.22" material={mat(["#1b2530", "#22201c", "#1a1f2a"][i % 3]!)} />
      ))}

      {/* desk */}
      <a-box position="0.1 0.75 40" width="1.9" height="0.05" depth="0.8" material={mat("#161b21", "metalness: 0.2")} />
      {[
        [-0.8, 39.65],
        [1.0, 39.65],
        [-0.8, 40.35],
        [1.0, 40.35],
      ].map(([x, z], i) => (
        <a-box key={i} position={`${x} 0.36 ${z}`} width="0.05" height="0.72" depth="0.05" material={mat("#0e1216")} />
      ))}

      {/* PC tower — the visual focus */}
      <a-box position="0.95 1.03 40" width="0.26" height="0.5" depth="0.5" material={`color: #121820; metalness: 0.65; roughness: 0.35`} />
      <a-plane position="0.95 0.98 40.252" width="0.2" height="0.3" material={`color: ${C.cyan}; shader: flat; transparent: true; opacity: 0.12`} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <a-box key={i} position={`0.95 ${0.85 + i * 0.043} 40.255`} width="0.2" height="0.018" depth="0.008" material="color: #05070a" />
      ))}
      <a-sphere position="0.95 1.23 40.255" radius="0.009" material={`color: ${C.cyan}; shader: flat`} animation="property: material.opacity; from: 1; to: 0.3; dir: alternate; loop: true; dur: 1400" />
      <a-entity light={`type: point; color: ${C.cyan}; intensity: 0.25; distance: 1.2`} position="0.95 0.98 40.45" />

      {/* monitor */}
      <a-box position="-0.1 0.8 39.78" width="0.22" height="0.02" depth="0.16" material={mat("#151a20")} />
      <a-box position="-0.1 0.92 39.76" width="0.04" height="0.24" depth="0.03" material={mat("#151a20")} />
      <a-box position="-0.1 1.18 39.75" width="0.8" height="0.48" depth="0.03" material={`color: #0c1015; metalness: 0.4; roughness: 0.5`} />
      {monitorOn ? (
        <a-plane
          position="-0.1 1.18 39.767"
          width="0.75"
          height="0.43"
          material="color: #0a1420; shader: flat"
        />
      ) : (
        <a-plane
          position="-0.1 1.18 39.767"
          width="0.75"
          height="0.43"
          material="color: #020304; shader: flat"
        />
      )}
      <a-entity light={`type: point; color: ${C.screen}; intensity: ${monitorOn ? 1.1 : 0}; distance: 3.2`} position="-0.1 1.2 40.15" />

      {/* keyboard, mouse, mug */}
      <a-box position="-0.1 0.785 40.22" width="0.5" height="0.02" depth="0.15" material={mat("#1a2028")} />
      <a-box position="-0.1 0.797 40.22" width="0.46" height="0.006" depth="0.12" material={`color: #2a3440; shader: flat; transparent: true; opacity: 0.8`} />
      <a-box position="0.33 0.785 40.23" width="0.06" height="0.025" depth="0.1" material={mat("#1a2028")} />
      <a-cylinder position="-0.75 0.82 39.9" radius="0.04" height="0.1" segments-radial="10" material={mat("#262d36")} />

      {/* chair */}
      <a-box position="-0.1 0.45 41.05" width="0.48" height="0.06" depth="0.45" material={mat("#101418")} />
      <a-box position="-0.1 0.82 41.3" width="0.46" height="0.6" depth="0.05" rotation="8 0 0" material={mat("#101418")} />
      <a-cylinder position="-0.1 0.22 41.05" radius="0.03" height="0.42" material={mat("#0b0e11")} />

      {/* person: legs */}
      {[-0.2, 0.0].map((x) => (
        <a-entity key={x}>
          <a-box position={`${x} 0.53 40.82`} width="0.15" height="0.14" depth="0.45" material={mat(C.cloth)} />
          <a-box position={`${x} 0.27 40.6`} width="0.12" height="0.48" depth="0.13" material={mat(C.cloth)} />
        </a-entity>
      ))}
      {/* upper body pivots at the hips: slow breathing sway */}
      <a-entity position="-0.1 0.55 41.0" rotation="-7 0 0" animation="property: rotation; from: -7 0 0; to: -4 0 1; dir: alternate; loop: true; dur: 2600; easing: easeInOutSine">
        <a-box position="0 0.3 0" width="0.4" height="0.56" depth="0.22" material={mat(C.cloth)} />
        <a-cylinder position="0 0.6 -0.02" radius="0.05" height="0.08" segments-radial="6" material={mat(C.skin)} />
        <a-entity position="0 0.74 -0.03" animation="property: rotation; from: 4 -7 0; to: 8 6 0; dir: alternate; loop: true; dur: 6800; easing: easeInOutSine">
          <a-sphere radius="0.12" segments-width="7" segments-height="5" material={mat(C.skin, "flatShading: true")} />
          <a-sphere position="0 0.03 0.02" radius="0.125" segments-width="7" segments-height="5" theta-length="70" material={mat("#151a20", "flatShading: true")} />
        </a-entity>
        {[-1, 1].map((s) => (
          <a-entity key={s}>
            <a-box position={`${s * 0.24} 0.37 -0.11`} rotation="49 0 0" width="0.1" height="0.32" depth="0.1" material={mat(C.cloth)} />
            <a-entity position={`${s * 0.22} 0.25 -0.22`} animation={`property: rotation; from: -5 0 0; to: 5 ${s * 3} 0; dir: alternate; loop: true; dur: ${s > 0 ? 150 : 190}; easing: easeInOutSine`}>
              <a-box position="0 0 -0.2" width="0.08" height="0.08" depth="0.4" material={mat(C.cloth)} />
              <a-box position={`${-s * 0.02} -0.01 -0.43`} width="0.08" height="0.04" depth="0.08" material={mat(C.skin)} />
            </a-entity>
          </a-entity>
        ))}
      </a-entity>
    </a-entity>
  );
});

function SceneInner({ selectedId, onSelect, onToggle, gates, transistorOn, monitorOn, adderA, adderB, rippleStep, quizTarget, monitorOverlayRef }: Props) {
  const sceneRef = useRef<Any>(null);
  const camRef = useRef<Any>(null);
  const cb = useRef({ onSelect, onToggle });
  cb.current = { onSelect, onToggle };
  const sel = useRef(selectedId);
  sel.current = selectedId;
  const monRef = useRef(monitorOn);
  monRef.current = monitorOn;

  // camera choreography + instruction token
  useEffect(() => {
    const A = (window as Any).AFRAME;
    const THREE = A.THREE;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pos = new THREE.Vector3(...KEYFRAMES[0]!.pos);
    const look = new THREE.Vector3(...KEYFRAMES[0]!.look);
    const tp = new THREE.Vector3();
    const tl = new THREE.Vector3();
    const pv = new THREE.Vector3();
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
      // camera cuts (room <-> inside) happen under a black screen: snap instead of flying through walls
      if (pos.distanceTo(tp) > 6) {
        pos.copy(tp);
        look.copy(tl);
      } else {
        pos.lerp(tp, k);
        look.lerp(tl, k);
      }
      const cam = camRef.current?.object3D;
      if (cam) {
        cam.position.copy(pos);
        m.lookAt(pos, look, up);
        cam.quaternion.setFromRotationMatrix(m);
      }
      // project the monitor screen onto the HTML overlay (reliable image, no WebGL texture)
      const ov = monitorOverlayRef.current;
      if (ov) {
        const showOverlay = monRef.current && p < 0.14 && !!cam;
        if (!showOverlay) {
          if (ov.dataset.on === "1") {
            ov.dataset.on = "";
            ov.style.opacity = "0";
            ov.style.visibility = "hidden";
          }
        } else {
          try {
            // object3D is a group; the real camera is the named child
            const realCam = (camRef.current?.getObject3D?.("camera") || cam) as Any;
            pv.set(-0.475, 1.18, 39.767).project(realCam);
            const x1 = (pv.x * 0.5 + 0.5) * window.innerWidth;
            pv.set(0.275, 1.18, 39.767).project(realCam);
            const x2 = (pv.x * 0.5 + 0.5) * window.innerWidth;
            pv.set(-0.1, 1.395, 39.767).project(realCam);
            const yTop = (-pv.y * 0.5 + 0.5) * window.innerHeight;
            const w = Math.abs(x2 - x1);
            if (pv.z < 1 && w > 4) {
              const h = w * (0.43 / 0.75);
              ov.dataset.on = "1";
              ov.style.opacity = "1";
              ov.style.visibility = "visible";
              ov.style.transform = `translate(${Math.min(x1, x2)}px, ${yTop}px)`;
              ov.style.width = `${w}px`;
              ov.style.height = `${h}px`;
            } else if (ov.dataset.on === "1") {
              ov.dataset.on = "";
              ov.style.opacity = "0";
              ov.style.visibility = "hidden";
            }
          } catch {
            // overlay positioning must never break the camera loop
          }
        }
      }
      const fog = sceneRef.current?.object3D?.fog;
      if (fog) {
        const f = p > 0.86 && p < CUT_OUT.clear ? Math.min(1, (p - 0.86) / 0.06) : 0;
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
  const add = rippleAdd(adderA, adderB);
  const allDone = rippleStep >= 4;

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
      <a-entity ref={camRef} camera="fov: 55; near: 0.02; far: 200" look-controls="enabled: false" wasd-controls="enabled: false" />

      <a-entity light="type: ambient; color: #6b7c8f; intensity: 0.45" />
      <a-entity light="type: directional; color: #cfe9ff; intensity: 0.8" position="4 8 -10" />
      <a-entity light={`type: point; color: ${C.cyan}; intensity: 1.4; distance: 9`} position="0 2 2" />
      <a-entity starfield />

      {/* ============ 00 THE ROOM (z ≈ 40) ============ */}
      <Room monitorOn={monitorOn} />

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
      ].map(([n, sub, x]) => (
        <a-entity key={n as string} position={`${x} 1 -26`}>
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
      <a-entity position="-4.2 1 -38">
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
      <a-entity position="0 1 -38">
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
      <a-entity position="4.2 1 -38">
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
      <a-text value={transistorOn ? "1" : "0"} font="sourcecodepro" color={transistorOn ? C.cyan : C.muted} width="16" align="center" position="0 3.4 -50.5" />
      <a-text value={transistorOn ? "SIGNAL ACTIVE" : "SIGNAL BLOCKED"} font="sourcecodepro" color={C.muted} width="2.4" align="center" position="0 2.85 -50.5" />
      {transistorOn
        ? [0, 280, 560, 840, 1120].map((d, i) => (
            <Pulse key={d} from={`-2.1 0.45 ${-49.6 - (i % 3) * 0.3}`} to={`2.1 0.45 ${-49.6 - (i % 3) * 0.3}`} dur={1400} delay={d} r={0.06} />
          ))
        : null}
      <Label id="transistor" pos="2.9 1.3 -49.5" show={is("transistor")} />

      {/* ============ 09 4-BIT ADDER ============ */}
      <a-plane position="0 -0.7 -64" rotation="-90 0 0" width="26" height="14" geometry="segmentsWidth: 26; segmentsHeight: 14" material={`color: ${C.cyan}; wireframe: true; opacity: 0.07; transparent: true; shader: flat`} />
      <a-entity light="type: point; color: #cfe9ff; intensity: 1.3; distance: 14" position="0 4 -59" />
      <a-text value="4-BIT RIPPLE-CARRY ADDER" font="sourcecodepro" color={C.muted} width="3" position="-5.4 3.75 -64" />
      <a-text
        value={allDone ? `${msb(adderA)} + ${msb(adderB)} = ${add.carry}${msb(add.sum)}   (${toNum(adderA)} + ${toNum(adderB)} = ${toNum(add.sum) + add.carry * 16})` : "COMPUTING..."}
        font="sourcecodepro"
        color={C.cyan}
        width="5"
        align="right"
        position="5.4 3.75 -64"
      />
      {add.cols.map((c, i) => {
        const x = 3.9 - i * 2.6;
        const pend = i >= rippleStep;
        const lit = (v: number) => !pend && !!v;
        const hl = (g: GateKey) => !!quizTarget && quizTarget.bit === i && quizTarget.gate === g;
        return (
          <a-entity key={i} position={`${x} 0 -64`}>
            <a-text value={`BIT ${i}`} font="sourcecodepro" color={pend ? C.muted : C.text} width="2.4" align="center" position="0 3.35 0" />
            {/* inputs */}
            {(["a", "b"] as const).map((k, j) => {
              const v = k === "a" ? c.a : c.b;
              const px = j ? 0.42 : -0.42;
              return (
                <a-entity key={k}>
                  <a-sphere className="clickable" data-toggle={`add-${k}-${i}`} position={`${px} 2.8 0`} radius="0.17" segments-width="12" segments-height="8" material={`color: ${wire(!!v)}`} />
                  <a-text value={`${k.toUpperCase()}${i}=${v}`} font="sourcecodepro" color={v ? C.cyan : C.muted} width="1.6" align="center" position={`${px} 3.08 0.05`} />
                  <a-box position={`${px} 2.4 0`} width="0.03" height="0.6" depth="0.03" material={`color: ${wire(!!v)}; shader: flat`} />
                </a-entity>
              );
            })}
            <GateBox x={-0.45} y={2.0} label="XOR" id="xor" on={lit(c.xor1)} pend={pend} hl={hl("xor1")} />
            <GateBox x={0.55} y={2.0} label="AND" id="and" on={lit(c.and1)} pend={pend} hl={hl("and1")} />
            <GateBox x={-0.45} y={1.2} label="XOR" id="xor" on={lit(c.xor2)} pend={pend} hl={hl("xor2")} />
            <GateBox x={0.55} y={1.2} label="AND" id="and" on={lit(c.and2)} pend={pend} hl={hl("and2")} />
            <GateBox x={0.55} y={0.45} label="OR" id="or" on={lit(c.or)} pend={pend} hl={hl("or")} />
            <a-box position="-0.45 1.6 0" width="0.03" height="0.38" depth="0.03" material={`color: ${wire(lit(c.xor1))}; shader: flat`} />
            <a-box position="0.55 0.82 0" width="0.03" height="0.38" depth="0.03" material={`color: ${wire(lit(c.and2))}; shader: flat`} />
            <a-box position="-0.45 0.75 0" width="0.03" height="0.5" depth="0.03" material={`color: ${wire(lit(c.xor2))}; shader: flat`} />
            {/* sum */}
            <a-sphere position="-0.45 0.25 0" radius="0.2" segments-width="12" segments-height="8" material={`color: ${lit(c.sum) ? C.cyan : C.dim}; shader: flat`} />
            <a-text value={pend ? `S${i}=?` : `S${i}=${c.sum}`} font="sourcecodepro" color={lit(c.sum) ? C.cyan : C.muted} width="1.8" align="center" position="-0.45 -0.15 0.05" />
            {/* carry out: drop, run left, rise into the next column */}
            <a-box position="0.55 0.0 0" width="0.04" height="0.5" depth="0.04" material={`color: ${wire(lit(c.or))}; shader: flat`} />
            <a-box position="-0.5 -0.25 0" width="2.1" height="0.04" depth="0.04" material={`color: ${wire(lit(c.or))}; shader: flat`} />
            {lit(c.or) ? <Pulse from="0.55 -0.25 0.03" to="-1.55 -0.25 0.03" dur={700} r={0.05} /> : null}
            {i === 0 ? <a-text value="C IN 0" font="sourcecodepro" color={C.muted} width="1.6" position="1.0 1.45 0" /> : null}
            {i > 0 ? (
              <>
                <a-box position="1.05 0.475 0" width="0.04" height="1.45" depth="0.04" material={`color: ${wire(!pend && !!c.cin)}; shader: flat`} />
                <a-box position="0.97 1.2 0" width="0.17" height="0.04" depth="0.04" material={`color: ${wire(!pend && !!c.cin)}; shader: flat`} />
              </>
            ) : null}
            {i === 3 ? (
              <>
                <a-sphere position="-1.75 -0.25 0" radius="0.2" segments-width="12" segments-height="8" material={`color: ${allDone && add.carry ? C.violet : C.dim}; shader: flat`} />
                <a-text value={`C OUT ${allDone ? add.carry : "?"}`} font="sourcecodepro" color={C.muted} width="1.8" align="center" position="-1.75 -0.65 0" />
              </>
            ) : null}
          </a-entity>
        );
      })}
      <Label id="xor" pos="-5.6 4.4 -63.6" show={is("xor")} />
      <Label id="adder" pos="-5.6 4.4 -63.6" show={is("adder")} />
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
