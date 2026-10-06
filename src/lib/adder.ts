/** Bits are stored least-significant first: index 0 = bit 0. */
export type Bits = [number, number, number, number];
export type GateKey = "xor1" | "xor2" | "and1" | "and2" | "or";
export const GATE_KEYS: GateKey[] = ["xor1", "and1", "xor2", "and2", "or"];
export const GATE_TYPE: Record<GateKey, "XOR" | "AND" | "OR"> = { xor1: "XOR", xor2: "XOR", and1: "AND", and2: "AND", or: "OR" };

export type Column = { a: number; b: number; cin: number; xor1: number; and1: number; xor2: number; and2: number; or: number; sum: number };

/** A real ripple-carry adder: each column is a full adder built from XOR, AND and OR. */
export function rippleAdd(a: Bits, b: Bits) {
  let c = 0;
  const cols: Column[] = [];
  for (let i = 0; i < 4; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    const xor1 = ai ^ bi;
    const and1 = ai & bi;
    const xor2 = xor1 ^ c;
    const and2 = xor1 & c;
    const or = and1 | and2;
    cols.push({ a: ai, b: bi, cin: c, xor1, and1, xor2, and2, or, sum: xor2 });
    c = or;
  }
  return { cols, carry: c, sum: cols.map((k) => k.sum) };
}

export const toNum = (bits: number[]) => bits.reduce((n, v, i) => n + (v << i), 0);
/** MSB-first string, e.g. [1,0,1,0] -> "0101" */
export const msb = (bits: number[]) => [...bits].reverse().join("");
