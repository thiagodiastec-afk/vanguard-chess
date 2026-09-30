/**
 * FASE 5.8 — MICROBENCHMARK DE ESCOLHA DA REPRESENTAÇÃO BITBOARD
 *
 * Compara:
 * 1. BigInt nativo 64-bit
 * 2. Split Uint32Array(2)
 * 3. Split Object { lo, hi }
 */

const ITERATIONS = 10_000_000;

console.log('=====================================================');
console.log('FASE 5.8 — MICROBENCHMARK DE REPRESENTAÇÕES 64-BIT');
console.log(`Iterações por teste: ${ITERATIONS.toLocaleString()}`);
console.log('=====================================================\n');

// 1. BigInt
function benchBigInt() {
  let a = 0x1234567890abcdefn;
  let b = 0xfedcba0987654321n;
  let res = 0n;

  // AND, OR, XOR, SHIFT
  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const c = (a & b) | ((a ^ b) << 1n);
    res ^= c;
  }
  const dtOps = performance.now() - t0;

  // Popcount & LSB
  let pcTotal = 0;
  const t1 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // Popcount via Brian Kernighan or bit test
    let v = a ^ BigInt(i);
    // Fast popcount 64-bit BigInt
    let count = 0;
    while (v > 0n) {
      v &= v - 1n;
      count++;
    }
    pcTotal += count;
  }
  const dtPop = performance.now() - t1;

  return { dtOps, dtPop, res, pcTotal };
}

// 2. Split Object { lo: number, hi: number }
interface SplitBB {
  lo: number;
  hi: number;
}

function benchSplitObj() {
  let a: SplitBB = { lo: 0x90abcdef >>> 0, hi: 0x12345678 >>> 0 };
  let b: SplitBB = { lo: 0x87654321 >>> 0, hi: 0xfedcba09 >>> 0 };
  let res: SplitBB = { lo: 0, hi: 0 };

  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // AND, OR, XOR
    const andLo = a.lo & b.lo;
    const andHi = a.hi & b.hi;
    const xorLo = a.lo ^ b.lo;
    const xorHi = a.hi ^ b.hi;

    // Shift left 1 with carry between lo and hi
    const shiftLo = (xorLo << 1) >>> 0;
    const shiftHi = ((xorHi << 1) | (xorLo >>> 31)) >>> 0;

    const cLo = (andLo | shiftLo) >>> 0;
    const cHi = (andHi | shiftHi) >>> 0;

    res.lo = (res.lo ^ cLo) >>> 0;
    res.hi = (res.hi ^ cHi) >>> 0;
  }
  const dtOps = performance.now() - t0;

  let pcTotal = 0;
  const t1 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    let vLo = (a.lo ^ i) >>> 0;
    let vHi = a.hi;
    let count = 0;
    while (vLo > 0) {
      vLo = (vLo & (vLo - 1)) >>> 0;
      count++;
    }
    while (vHi > 0) {
      vHi = (vHi & (vHi - 1)) >>> 0;
      count++;
    }
    pcTotal += count;
  }
  const dtPop = performance.now() - t1;

  return { dtOps, dtPop, res, pcTotal };
}

// 3. Uint32Array(2)
function benchUint32() {
  const a = new Uint32Array([0x90abcdef, 0x12345678]);
  const b = new Uint32Array([0x87654321, 0xfedcba09]);
  const res = new Uint32Array([0, 0]);

  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const andLo = a[0] & b[0];
    const andHi = a[1] & b[1];
    const xorLo = a[0] ^ b[0];
    const xorHi = a[1] ^ b[1];

    const shiftLo = (xorLo << 1) >>> 0;
    const shiftHi = ((xorHi << 1) | (xorLo >>> 31)) >>> 0;

    res[0] = (res[0] ^ (andLo | shiftLo)) >>> 0;
    res[1] = (res[1] ^ (andHi | shiftHi)) >>> 0;
  }
  const dtOps = performance.now() - t0;

  let pcTotal = 0;
  const t1 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    let vLo = (a[0] ^ i) >>> 0;
    let vHi = a[1];
    let count = 0;
    while (vLo > 0) {
      vLo = (vLo & (vLo - 1)) >>> 0;
      count++;
    }
    while (vHi > 0) {
      vHi = (vHi & (vHi - 1)) >>> 0;
      count++;
    }
    pcTotal += count;
  }
  const dtPop = performance.now() - t1;

  return { dtOps, dtPop, res, pcTotal };
}

console.log('Executando benchmark BigInt...');
const rBigInt = benchBigInt();
console.log(`BigInt 64-bit:          Operações: ${rBigInt.dtOps.toFixed(1)} ms | Popcount: ${rBigInt.dtPop.toFixed(1)} ms`);

console.log('Executando benchmark Split Object...');
const rSplit = benchSplitObj();
console.log(`Split Object {lo, hi}:   Operações: ${rSplit.dtOps.toFixed(1)} ms | Popcount: ${rSplit.dtPop.toFixed(1)} ms`);

console.log('Executando benchmark Uint32Array...');
const rU32 = benchUint32();
console.log(`Uint32Array(2):          Operações: ${rU32.dtOps.toFixed(1)} ms | Popcount: ${rU32.dtPop.toFixed(1)} ms`);
