export type Stage = {
  id: string;
  num: string;
  name: string;
  start: number;
  end: number;
  title: string;
  sub: string;
};

export const STAGES: Stage[] = [
  { id: "computer", num: "01", name: "COMPUTER", start: 0, end: 0.12, title: "The machine", sub: "Billions of operations every second, hidden behind a quiet shell." },
  { id: "motherboard", num: "02", name: "MOTHERBOARD", start: 0.12, end: 0.28, title: "The motherboard", sub: "Every component lives here, wired together by copper. Click any part." },
  { id: "cpu", num: "03", name: "CPU", start: 0.28, end: 0.45, title: "Entering CPU", sub: "The processor executes instructions." },
  { id: "internals", num: "04", name: "CPU INTERNALS", start: 0.45, end: 0.6, title: "Inside the processor", sub: "Control, arithmetic and memory, exchanging signals every clock tick." },
  { id: "instruction", num: "05", name: "INSTRUCTION", start: 0.6, end: 0.72, title: "Complex computation is built from simpler operations.", sub: "An instruction is decoded, executed, and returned as a result." },
  { id: "logic", num: "06", name: "LOGIC", start: 0.72, end: 0.88, title: "Logic gates", sub: "Every operation reduces to AND, OR and NOT. Toggle the inputs." },
  { id: "transistor", num: "07", name: "TRANSISTOR", start: 0.88, end: 1.0001, title: "The transistor", sub: "A transistor acts as a tiny electronic switch." },
];

export const stageAt = (p: number) => STAGES.findIndex((s) => p >= s.start && p < s.end);

export type Info = { name: string; full: string; text: string };

export const INFO: Record<string, Info> = {
  cpu: { name: "CPU", full: "CENTRAL PROCESSING UNIT", text: "Executes instructions and performs calculations." },
  ram: { name: "RAM", full: "RANDOM ACCESS MEMORY", text: "Temporary high-speed memory used by programs while they run." },
  gpu: { name: "GPU", full: "GRAPHICS PROCESSING UNIT", text: "A processor specialized for highly parallel computations." },
  storage: { name: "STORAGE", full: "SOLID STATE DRIVE", text: "Stores data even when the computer is turned off." },
  power: { name: "POWER", full: "POWER SUPPLY UNIT", text: "Provides electrical energy to the system." },
  bus: { name: "DATA BUS", full: "SYSTEM INTERCONNECT", text: "Carries data and instructions between computer components." },
  control: { name: "CONTROL UNIT", full: "CPU / CORE 01", text: "Coordinates the execution of instructions." },
  alu: { name: "ALU", full: "ARITHMETIC LOGIC UNIT", text: "Performs arithmetic and logical operations." },
  registers: { name: "REGISTERS", full: "CPU / CORE 01", text: "Tiny, extremely fast storage locations inside the processor." },
  cache: { name: "CACHE", full: "L1 / L2 MEMORY", text: "Fast memory located close to the CPU that stores frequently accessed data." },
  and: { name: "AND", full: "LOGIC GATE", text: "Outputs 1 only when both inputs are 1." },
  or: { name: "OR", full: "LOGIC GATE", text: "Outputs 1 when at least one input is 1." },
  not: { name: "NOT", full: "LOGIC GATE", text: "Inverts its input. 1 becomes 0, 0 becomes 1." },
  transistor: { name: "TRANSISTOR", full: "SOURCE / GATE / DRAIN", text: "A tiny electronic switch. Voltage on the gate lets current flow from source to drain." },
};

type V3 = [number, number, number];
export const KEYFRAMES: { p: number; pos: V3; look: V3 }[] = [
  { p: 0, pos: [0, 1.4, 15], look: [0, 1.1, 0] },
  { p: 0.1, pos: [0.4, 1.3, 6.5], look: [0, 1.1, -1] },
  { p: 0.2, pos: [0, 1.2, 2.7], look: [0, 1.15, -1.7] },
  { p: 0.27, pos: [0, 1.3, 1.6], look: [0, 1.25, -1.7] },
  { p: 0.33, pos: [0, 1.4, -0.6], look: [0, 1.4, -1.6] },
  { p: 0.4, pos: [0, 1.4, -3.5], look: [0, 1.2, -14] },
  { p: 0.47, pos: [0, 1.8, -6.5], look: [0, 0.9, -14] },
  { p: 0.57, pos: [1.2, 1.4, -8.5], look: [0, 0.9, -14] },
  { p: 0.63, pos: [0, 1.6, -19], look: [0, 1.1, -26] },
  { p: 0.7, pos: [0, 1.5, -20], look: [0, 1.1, -26] },
  { p: 0.76, pos: [0, 1.8, -30], look: [0, 1, -38] },
  { p: 0.85, pos: [0, 1.6, -30.5], look: [0, 1, -38] },
  { p: 0.89, pos: [0, 1, -38], look: [0, 0.8, -50] },
  { p: 0.92, pos: [0, 2.6, -43.5], look: [0, 0.7, -50] },
  { p: 0.955, pos: [0.6, 2.4, -44], look: [0, 0.7, -50] },
  { p: 1, pos: [20, 15, 10], look: [0, 0, -24] },
];
