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
  { id: "room", num: "00", name: "ROOM", start: 0, end: 0.10, title: "The room", sub: "Someone is using a computer. Scroll to go inside." },
  { id: "computer", num: "01", name: "COMPUTER", start: 0.10, end: 0.196, title: "The machine", sub: "Billions of operations every second, hidden behind a quiet shell." },
  { id: "motherboard", num: "02", name: "MOTHERBOARD", start: 0.196, end: 0.324, title: "The motherboard", sub: "Every component lives here, wired together by copper. Click any part." },
  { id: "cpu", num: "03", name: "CPU", start: 0.324, end: 0.46, title: "Entering CPU", sub: "The processor executes instructions." },
  { id: "internals", num: "04", name: "CPU INTERNALS", start: 0.46, end: 0.58, title: "Inside the processor", sub: "Control, arithmetic and memory, exchanging signals every clock tick." },
  { id: "instruction", num: "05", name: "INSTRUCTION", start: 0.58, end: 0.676, title: "Complex computation is built from simpler operations.", sub: "An instruction is decoded, executed, and returned as a result." },
  { id: "logic", num: "06", name: "LOGIC", start: 0.676, end: 0.804, title: "Logic gates", sub: "Every operation reduces to AND, OR and NOT. Toggle the inputs." },
  { id: "transistor", num: "07", name: "TRANSISTOR", start: 0.804, end: 0.9001, title: "The transistor", sub: "A transistor acts as a tiny electronic switch." },
  { id: "return", num: "08", name: "RETURN", start: 0.90, end: 1.0001, title: "The return", sub: "Back where you started. The person is still typing." },
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
  // room: person at desk, tower ahead
  { p: 0, pos: [1.5, 2.3, 21], look: [-1, 1.2, 9] },
  { p: 0.03, pos: [0.8, 2.0, 18.5], look: [-0.5, 1.2, 4] },
  { p: 0.06, pos: [0.3, 1.7, 16.2], look: [0, 1.2, -0.6] },
  // dive continues into the existing journey
  { p: 0.1, pos: [0, 1.4, 15], look: [0, 1.1, 0] },
  { p: 0.18, pos: [0.4, 1.3, 6.5], look: [0, 1.1, -1] },
  { p: 0.26, pos: [0, 1.2, 2.7], look: [0, 1.15, -1.7] },
  { p: 0.316, pos: [0, 1.3, 1.6], look: [0, 1.25, -1.7] },
  { p: 0.364, pos: [0, 1.4, -0.6], look: [0, 1.4, -1.6] },
  { p: 0.42, pos: [0, 1.4, -3.5], look: [0, 1.2, -14] },
  { p: 0.476, pos: [0, 1.8, -6.5], look: [0, 0.9, -14] },
  { p: 0.556, pos: [1.2, 1.4, -8.5], look: [0, 0.9, -14] },
  { p: 0.604, pos: [0, 1.6, -19], look: [0, 1.1, -26] },
  { p: 0.66, pos: [0, 1.5, -20], look: [0, 1.1, -26] },
  { p: 0.708, pos: [0, 1.8, -30], look: [0, 1, -38] },
  { p: 0.78, pos: [0, 1.6, -30.5], look: [0, 1, -38] },
  { p: 0.812, pos: [0, 1, -38], look: [0, 0.8, -50] },
  { p: 0.836, pos: [0, 2.6, -43.5], look: [0, 0.7, -50] },
  { p: 0.864, pos: [0.6, 2.4, -44], look: [0, 0.7, -50] },
  { p: 0.9, pos: [20, 15, 10], look: [0, 0, -24] },
  // return: pull out of the machine, back to the room
  { p: 0.93, pos: [12, 8, 4], look: [-1, 1.5, 8] },
  { p: 0.96, pos: [5, 4, 14], look: [-2, 1.4, 12] },
  { p: 1, pos: [1.5, 2.3, 21], look: [-1, 1.2, 9] },
];
