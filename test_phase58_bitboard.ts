/**
 * FASE 5.8 — TESTE DO MÓDULO BITBOARD BÁSICO
 *
 * Valida:
 * 1. Mapeamento de casas (a1=0 .. h8=63, conversão bidirecional)
 * 2. Operações de bits (popcount, lsb, clearLsb, shifts)
 * 3. FEN Parser & Serializer Round-trip
 * 4. Consistência e reconstrução exata da ocupação
 */

import {
  Bitboard,
  bitToSquareName,
  cloneBoard,
  createEmptyBoard,
  parseFen,
  bitboardBoardToFen,
  popcount,
  lsb,
  clearLsb,
  shiftNorth,
  shiftSouth,
  shiftEast,
  shiftWest,
  squareNameToIndex,
  squareToBit,
  updateOccupancy,
  SQUARE_NAMES,
  SQ_A1,
  SQ_H1,
  SQ_A8,
  SQ_H8,
  SQ_E4,
  SQ_E5,
  BB_EMPTY
} from './src/lib/bitboard';

console.log('=====================================================');
console.log('FASE 5.8 — TESTE DE TABULEIRO E OPERAÇÕES BITBOARD');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

// 1. Mapeamento de casas
console.log('--- 1. MAPEAMENTO DE CASAS ---');
assert(squareNameToIndex('a1') === 0, 'a1 === 0');
assert(squareNameToIndex('h1') === 7, 'h1 === 7');
assert(squareNameToIndex('a2') === 8, 'a2 === 8');
assert(squareNameToIndex('h2') === 15, 'h2 === 15');
assert(squareNameToIndex('a8') === 56, 'a8 === 56');
assert(squareNameToIndex('h8') === 63, 'h8 === 63');
assert(squareNameToIndex('e4') === 28, 'e4 === 28');
assert(squareNameToIndex('e5') === 36, 'e5 === 36');

assert(bitToSquareName(0) === 'a1', 'bit 0 === a1');
assert(bitToSquareName(7) === 'h1', 'bit 7 === h1');
assert(bitToSquareName(56) === 'a8', 'bit 56 === a8');
assert(bitToSquareName(63) === 'h8', 'bit 63 === h8');
assert(bitToSquareName(28) === 'e4', 'bit 28 === e4');
assert(bitToSquareName(36) === 'e5', 'bit 36 === e5');

// Reversibilidade estrita para todas as 64 casas
let reversibleAll = true;
for (let sq = 0; sq < 64; sq++) {
  const name = bitToSquareName(sq);
  const idx = squareNameToIndex(name);
  if (idx !== sq) {
    reversibleAll = false;
    break;
  }
}
assert(reversibleAll, 'Reversibilidade estrita 64/64 casas');

// 2. Operações de bits
console.log('\n--- 2. OPERAÇÕES DE BITS ---');
assert(popcount(0n) === 0, 'popcount(0n) === 0');
assert(popcount(1n) === 1, 'popcount(1n) === 1');
assert(popcount(0xFFn) === 8, 'popcount(0xFFn) === 8');
assert(popcount(0xFFFFFFFFFFFFFFFFn) === 64, 'popcount(64 bits 1) === 64');
assert(popcount(squareToBit(28) | squareToBit(36)) === 2, 'popcount 2 casas === 2');

assert(lsb(0n) === -1, 'lsb(0n) === -1');
assert(lsb(1n) === 0, 'lsb(1n) === 0 (a1)');
assert(lsb(squareToBit(28)) === 28, 'lsb(e4) === 28');
assert(lsb(squareToBit(63)) === 63, 'lsb(h8) === 63');

const twoBits = squareToBit(10) | squareToBit(20);
assert(lsb(twoBits) === 10, 'lsb com múltiplos bits retorna o menor');
assert(lsb(clearLsb(twoBits)) === 20, 'clearLsb remove o primeiro e expõe o próximo');

// Shifts direcionais
console.log('\n--- 3. SHIFTS DIRECIONAIS ---');
const e4Bit = squareToBit(28); // e4
assert(lsb(shiftNorth(e4Bit)) === 36, 'e4 North -> e5 (36)');
assert(lsb(shiftSouth(e4Bit)) === 20, 'e4 South -> e3 (20)');
assert(lsb(shiftEast(e4Bit)) === 29, 'e4 East -> f4 (29)');
assert(lsb(shiftWest(e4Bit)) === 27, 'e4 West -> d4 (27)');

// Borda a & h (não transborda)
const a4Bit = squareToBit(24);
assert(shiftWest(a4Bit) === 0n, 'a4 West não transborda para h-file');
const h4Bit = squareToBit(31);
assert(shiftEast(h4Bit) === 0n, 'h4 East não transborda para a-file');

// 4. FEN Parser & Serializer Round-trip
console.log('\n--- 4. FEN PARSER & SERIALIZER ROUND-TRIP ---');
const testFens = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'
];

for (const fen of testFens) {
  const b = parseFen(fen);
  const outFen = bitboardBoardToFen(b);
  assert(outFen === fen, `Round-trip FEN: ${fen}`);
}

// 5. Consistência da ocupação
console.log('\n--- 5. CONSISTÊNCIA DA OCUPAÇÃO ---');
const startBoard = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
assert(popcount(startBoard.whiteOccupancy) === 16, 'Brancas ocupam 16 casas');
assert(popcount(startBoard.blackOccupancy) === 16, 'Pretas ocupam 16 casas');
assert(popcount(startBoard.allOccupancy) === 32, 'Total de peças === 32');
assert((startBoard.whiteOccupancy & startBoard.blackOccupancy) === 0n, 'Interseção W e B é vazia');

console.log(`\n============================================`);
console.log(`Total de testes: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('TODOS OS TESTES BÁSICOS PASSARAM COM SUCESSO!');
}
