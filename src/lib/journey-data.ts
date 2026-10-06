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
  { id: "room", num: "01", name: "ROOM", start: 0, end: 0.085, title: "A quiet lab, late at night", sub: "Someone is typing. Each keystroke starts a chain of events inside the tower on their desk." },
  { id: "computer", num: "02", name: "COMPUTER", start: 0.085, end: 0.13, title: "Through the vent", sub: "We slip between the fan slats, into the box that actually does the work." },
  { id: "motherboard", num: "03", name: "MOTHERBOARD", start: 0.13, end: 0.25, title: "The motherboard", sub: "Copper streets connect every part of the machine. Tap a component to see what it does." },
  { id: "cpu", num: "04", name: "CPU", start: 0.25, end: 0.31, title: "Into the processor", sub: "A square of silicon smaller than a stamp reads the program one step at a time, billions of times a second." },
  { id: "internals", num: "05", name: "CPU INTERNALS", start: 0.31, end: 0.45, title: "Inside one core", sub: "A control unit directs traffic, the ALU does the maths, and registers and cache keep data within reach." },
  { id: "instruction", num: "06", name: "INSTRUCTION", start: 0.45, end: 0.55, title: "One instruction: ADD", sub: "Fetch it, decode it, execute it, write the answer back. Everything a computer does is a long queue of steps this small." },
  { id: "logic", num: "07", name: "LOGIC", start: 0.55, end: 0.65, title: "Logic gates", sub: "Below the instructions, gates weigh nothing but 1s and 0s. Flip the inputs and watch each output answer." },
  { id: "transistor", num: "08", name: "TRANSISTOR", start: 0.65, end: 0.76, title: "The transistor", sub: "Each gate is built from a handful of these: switches flipped by voltage instead of fingers." },
  { id: "compute", num: "09", name: "COMPUTE", start: 0.76, end: 0.87, title: "Make it compute", sub: "Two 4-bit numbers, eight switches. Flip the bits and watch the carry ripple from right to left." },
  { id: "return", num: "10", name: "RETURN", start: 0.87, end: 1.0001, title: "Back out", sub: "Up through the gates, the core, the board, the vent." },
];

export const stageAt = (p: number) => STAGES.findIndex((s) => p >= s.start && p < s.end);

/** Scroll windows where the screen is fully black and the camera cuts between the room and the inside. */
export const CUT_IN = { rise: 0.094, full: 0.102, clear: 0.112, done: 0.122 };
export const CUT_OUT = { rise: 0.918, full: 0.93, clear: 0.94, done: 0.952 };
/** Camera is "inside the computer" between these progress values (used for audio). */
export const INSIDE = { from: 0.107, to: 0.935 };

export type Info = { name: string; full: string; text: string };

export const INFO: Record<string, Info> = {
  cpu: { name: "CPU", full: "CENTRAL PROCESSING UNIT", text: "The part that follows the program. It pulls in an instruction, works out what it means, carries it out, and moves on to the next one." },
  ram: { name: "RAM", full: "WORKING MEMORY", text: "The desk the CPU works on. Open programs and their data sit here because it is fast, and it is wiped when the power goes." },
  gpu: { name: "GPU", full: "GRAPHICS PROCESSOR", text: "Thousands of small cores doing the same simple job side by side. Ideal for pixels, and for any task that splits into many identical pieces." },
  storage: { name: "STORAGE", full: "SOLID STATE DRIVE", text: "The filing cabinet. Slower than RAM, but it keeps your files when the machine is switched off." },
  power: { name: "POWER", full: "POWER SUPPLY UNIT", text: "Turns wall current into the steady, low voltages every chip on the board needs." },
  bus: { name: "DATA BUS", full: "SYSTEM INTERCONNECT", text: "Shared lanes of copper that carry numbers and instructions between components." },
  control: { name: "CONTROL UNIT", full: "CPU / CORE 01", text: "Reads each decoded instruction and tells the other parts of the core what to do on this tick of the clock." },
  alu: { name: "ALU", full: "ARITHMETIC LOGIC UNIT", text: "The calculator of the core. Adds, subtracts, compares and combines bits, using circuits like the adder further down." },
  registers: { name: "REGISTERS", full: "CPU / CORE 01", text: "A handful of slots inside the core holding the exact numbers being worked on right now." },
  cache: { name: "CACHE", full: "L1 / L2 MEMORY", text: "A small, very fast copy of recently used data, so the core rarely has to wait on RAM." },
  and: { name: "AND", full: "LOGIC GATE", text: "Answers 1 only if every input is 1. In the adder it spots when two 1s produce a carry." },
  or: { name: "OR", full: "LOGIC GATE", text: "Answers 1 if any input is 1. In the adder it merges the two ways a carry can appear." },
  not: { name: "NOT", full: "LOGIC GATE", text: "Flips its single input. Give it 1, get 0. Give it 0, get 1." },
  xor: { name: "XOR", full: "LOGIC GATE", text: "Answers 1 when its inputs differ. That is exactly the sum bit of binary addition, before any carry." },
  transistor: { name: "TRANSISTOR", full: "SOURCE / GATE / DRAIN", text: "Voltage on the gate opens a channel so current can cross from source to drain. No voltage, no current: a switch with no moving parts." },
  adder: { name: "4-BIT ADDER", full: "RIPPLE-CARRY ADDER", text: "Four copies of the same small circuit. Each adds one pair of bits plus the carry from its right-hand neighbour, then passes its own carry left." },
};

type V3 = [number, number, number];
export const VENT: V3 = [0.95, 0.98, 40.3];
export const KEYFRAMES: { p: number; pos: V3; look: V3 }[] = [
  // room
  { p: 0, pos: [2.6, 1.75, 46.5], look: [0.2, 1.0, 40] },
  { p: 0.05, pos: [1.9, 1.45, 43.2], look: [0.8, 1.0, 40] },
  { p: 0.09, pos: [0.98, 1.0, 41.0], look: [0.95, 0.98, 40] },
  { p: CUT_IN.full, pos: VENT, look: [0.95, 0.98, 38] },
  // cut: inside the case
  { p: CUT_IN.clear, pos: [0, 1.3, 6], look: [0, 1.2, -1] },
  { p: 0.13, pos: [0, 1.2, 2.7], look: [0, 1.15, -1.7] },
  { p: 0.2, pos: [0, 1.3, 1.6], look: [0, 1.25, -1.7] },
  { p: 0.25, pos: [0, 1.4, -0.6], look: [0, 1.4, -1.6] },
  { p: 0.31, pos: [0, 1.4, -3.5], look: [0, 1.2, -14] },
  { p: 0.36, pos: [0, 1.8, -6.5], look: [0, 0.9, -14] },
  { p: 0.43, pos: [1.2, 1.4, -8.5], look: [0, 0.9, -14] },
  { p: 0.48, pos: [0, 1.6, -19], look: [0, 1.1, -26] },
  { p: 0.53, pos: [0, 1.5, -20], look: [0, 1.1, -26] },
  { p: 0.57, pos: [0, 1.8, -30], look: [0, 1, -38] },
  { p: 0.63, pos: [0, 1.6, -30.5], look: [0, 1, -38] },
  { p: 0.66, pos: [0, 1, -38], look: [0, 0.8, -50] },
  { p: 0.69, pos: [0, 2.6, -43.5], look: [0, 0.7, -50] },
  { p: 0.74, pos: [0.6, 2.4, -44], look: [0, 0.7, -50] },
  { p: 0.78, pos: [0, 1.7, -54.6], look: [0, 1.25, -64] },
  { p: 0.86, pos: [0, 1.8, -55], look: [0, 1.25, -64] },
  // pull back
  { p: CUT_OUT.full, pos: [14, 11, -22], look: [0, 0, -34] },
  // cut: back out of the vent
  { p: CUT_OUT.clear, pos: VENT, look: [0.95, 0.98, 38] },
  { p: 0.965, pos: [1.6, 1.3, 42.6], look: [0.6, 1.0, 40] },
  { p: 1, pos: [2.7, 1.8, 47], look: [0.2, 1.05, 40] },
];
