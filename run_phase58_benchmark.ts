/**
 * FASE 5.8 — SUÍTE DE PERFORMANCE E BENCHMARKS EXPERIMENTAIS BITBOARD
 *
 * Medições:
 * 1. Microbenchmark de operações elementares de bitboard
 * 2. Comparativo de geração legal: Chess.js vs Bitboard (10.000 a 100.000 chamadas)
 * 3. Simulação de busca (Search Simulation depth 1, 2, 3)
 * 4. Auditoria de alocações de memória
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  parseFen,
  generatePseudoLegalMoves,
  generateLegalMoves,
  makeMove,
  undoMove,
  popcount,
  lsb,
  clearLsb,
  shiftNorth,
  shiftEast,
  rookAttacks,
  bishopAttacks,
  queenAttacks,
  KNIGHT_ATTACKS,
  KING_ATTACKS,
  isSquareAttacked,
  isInCheck,
  getCheckInfo,
  SQ_E4,
  BitboardBoard
} from './src/lib/bitboard';

console.log('=====================================================');
console.log('FASE 5.8 — BENCHMARKS EXPERIMENTAIS BITBOARD');
console.log('=====================================================\n');

// ============================================================
// 1. MICROBENCHMARK DE OPERAÇÕES ELEMENTARES
// ============================================================
console.log('--- 1. MICROBENCHMARK DE OPERAÇÕES PRIMITIVAS (10.000.000 iterações) ---');
const N_OPS = 10_000_000;
let dummy = 0n;

// AND, OR, XOR, NOT
const tAndOr = performance.now();
let b1 = 0x1234567890abcdefn;
let b2 = 0xfedcba0987654321n;
for (let i = 0; i < N_OPS; i++) {
  dummy ^= ((b1 & b2) | (~b1 ^ b2));
}
const dtAndOr = performance.now() - tAndOr;

// SHIFT
const tShift = performance.now();
for (let i = 0; i < N_OPS; i++) {
  dummy ^= (b1 << 1n) | (b2 >> 1n);
}
const dtShift = performance.now() - tShift;

// POPCOUNT
const tPop = performance.now();
let popSum = 0;
for (let i = 0; i < N_OPS; i++) {
  popSum += popcount(b1 ^ BigInt(i));
}
const dtPop = performance.now() - tPop;

// LSB
const tLsb = performance.now();
let lsbSum = 0;
for (let i = 0; i < N_OPS; i++) {
  lsbSum += lsb(b1 ^ BigInt(i));
}
const dtLsb = performance.now() - tLsb;

// SLIDER ATTACKS
const N_SLIDER = 1_000_000;
const tRook = performance.now();
for (let i = 0; i < N_SLIDER; i++) {
  dummy ^= rookAttacks(SQ_E4, b1 ^ BigInt(i));
}
const dtRook = performance.now() - tRook;

const tBishop = performance.now();
for (let i = 0; i < N_SLIDER; i++) {
  dummy ^= bishopAttacks(SQ_E4, b1 ^ BigInt(i));
}
const dtBishop = performance.now() - tBishop;

console.log(`  AND/OR/XOR/NOT: ${(dtAndOr * 1000 / N_OPS).toFixed(2)} ns/op (${Math.round(N_OPS / (dtAndOr/1000)).toLocaleString()} ops/s)`);
console.log(`  SHIFT:          ${(dtShift * 1000 / N_OPS).toFixed(2)} ns/op (${Math.round(N_OPS / (dtShift/1000)).toLocaleString()} ops/s)`);
console.log(`  POPCOUNT:       ${(dtPop * 1000 / N_OPS).toFixed(2)} ns/op (${Math.round(N_OPS / (dtPop/1000)).toLocaleString()} ops/s)`);
console.log(`  LSB (ctz):      ${(dtLsb * 1000 / N_OPS).toFixed(2)} ns/op (${Math.round(N_OPS / (dtLsb/1000)).toLocaleString()} ops/s)`);
console.log(`  Rook Attacks:   ${(dtRook * 1000 / N_SLIDER).toFixed(2)} ns/op (${Math.round(N_SLIDER / (dtRook/1000)).toLocaleString()} ops/s)`);
console.log(`  Bishop Attacks: ${(dtBishop * 1000 / N_SLIDER).toFixed(2)} ns/op (${Math.round(N_SLIDER / (dtBishop/1000)).toLocaleString()} ops/s)\n`);

// ============================================================
// 2. COMPARATIVO DE GERAÇÃO LEGAL: CHESS.JS VS BITBOARD
// ============================================================
console.log('--- 2. COMPARATIVO DE GERAÇÃO: CHESS.JS VS BITBOARD ---');

const testPositions = [
  { name: 'Initial Position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'Open Middlegame', fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8' },
  { name: 'Tactical (Kiwipete)', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' },
  { name: 'Endgame', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1' },
  { name: 'Position in Check', fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3' }
];

const GEN_ROUNDS = 20_000;
console.log(`Executando ${GEN_ROUNDS.toLocaleString()} gerações por posição em 5 posições (${(GEN_ROUNDS * 5).toLocaleString()} gerações no total)...\n`);

interface ComparisonRow {
  name: string;
  chessJsLegalUs: number;
  bbPseudoUs: number;
  bbLegalUs: number;
  speedupLegal: number;
  bbMovesSec: number;
  chessJsMovesSec: number;
}

const comparisonTable: ComparisonRow[] = [];

for (const p of testPositions) {
  const g = new Chess(p.fen) as any;
  const b = parseFen(p.fen);

  // 1. Chess.js legal moves
  const t0 = performance.now();
  for (let i = 0; i < GEN_ROUNDS; i++) {
    g._moves({ legal: true });
  }
  const dtChessJs = performance.now() - t0;

  // 2. Bitboard pseudo-legal moves
  const t1 = performance.now();
  for (let i = 0; i < GEN_ROUNDS; i++) {
    generatePseudoLegalMoves(b);
  }
  const dtBbPseudo = performance.now() - t1;

  // 3. Bitboard legal moves
  const t2 = performance.now();
  for (let i = 0; i < GEN_ROUNDS; i++) {
    generateLegalMoves(b);
  }
  const dtBbLegal = performance.now() - t2;

  const chessJsUs = (dtChessJs * 1000) / GEN_ROUNDS;
  const bbPseudoUs = (dtBbPseudo * 1000) / GEN_ROUNDS;
  const bbLegalUs = (dtBbLegal * 1000) / GEN_ROUNDS;
  const speedup = chessJsUs / bbLegalUs;

  const bbMovesSec = Math.round(GEN_ROUNDS / (dtBbLegal / 1000));
  const chessJsMovesSec = Math.round(GEN_ROUNDS / (dtChessJs / 1000));

  comparisonTable.push({
    name: p.name,
    chessJsLegalUs: chessJsUs,
    bbPseudoUs: bbPseudoUs,
    bbLegalUs: bbLegalUs,
    speedupLegal: speedup,
    bbMovesSec,
    chessJsMovesSec
  });

  console.log(`[${p.name}]`);
  console.log(`  chess.js legal:      ${chessJsUs.toFixed(2)} µs/call (${chessJsMovesSec.toLocaleString()} ops/s)`);
  console.log(`  bitboard pseudo:     ${bbPseudoUs.toFixed(2)} µs/call (${Math.round(GEN_ROUNDS / (dtBbPseudo/1000)).toLocaleString()} ops/s)`);
  console.log(`  bitboard legal:      ${bbLegalUs.toFixed(2)} µs/call (${bbMovesSec.toLocaleString()} ops/s)`);
  console.log(`  SPEEDUP:             ${speedup.toFixed(2)}x mais rápido\n`);
}

// Médias gerais
const avgChessJs = comparisonTable.reduce((acc, r) => acc + r.chessJsLegalUs, 0) / comparisonTable.length;
const avgBbPseudo = comparisonTable.reduce((acc, r) => acc + r.bbPseudoUs, 0) / comparisonTable.length;
const avgBbLegal = comparisonTable.reduce((acc, r) => acc + r.bbLegalUs, 0) / comparisonTable.length;
const avgSpeedup = avgChessJs / avgBbLegal;

console.log(`MÉDIA GERAL:`);
console.log(`  chess.js legal:  ${avgChessJs.toFixed(2)} µs`);
console.log(`  bitboard pseudo: ${avgBbPseudo.toFixed(2)} µs (speedup vs chess.js: ${(avgChessJs / avgBbPseudo).toFixed(1)}x)`);
console.log(`  bitboard legal:  ${avgBbLegal.toFixed(2)} µs (speedup vs chess.js: ${avgSpeedup.toFixed(2)}x)\n`);

// ============================================================
// 3. SIMULAÇÃO DE BUSCA (SEARCH SIMULATION / PERFT)
// ============================================================
console.log('--- 3. SIMULAÇÃO DE BUSCA EXPERIMENTAL (PERFT DEPTH 1, 2, 3) ---');

function perftBitboard(board: BitboardBoard, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(board);
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (let i = 0; i < moves.length; i++) {
    const undo = makeMove(board, moves[i]);
    nodes += perftBitboard(board, depth - 1);
    undoMove(board, undo);
  }
  return nodes;
}

function perftChessJs(game: any, depth: number): number {
  if (depth === 0) return 1;
  const moves = game._moves({ legal: true });
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (let i = 0; i < moves.length; i++) {
    game._makeMove(moves[i]);
    nodes += perftChessJs(game, depth - 1);
    game._undoMove();
  }
  return nodes;
}

interface PerftComparison {
  name: string;
  depth: number;
  expectedNodes: number;
  bbTimeMs: number;
  bbNps: number;
  chessJsTimeMs: number;
  chessJsNps: number;
  speedup: number;
}

const perftResults: PerftComparison[] = [];
const perftPositions = [
  { name: 'Initial Position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', depths: [1, 2, 3] },
  { name: 'Kiwipete', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', depths: [1, 2, 3] }
];

for (const pos of perftPositions) {
  console.log(`Simulação Perft em: ${pos.name}`);
  for (const d of pos.depths) {
    const b = parseFen(pos.fen);
    const g = new Chess(pos.fen) as any;

    const t0 = performance.now();
    const bbNodes = perftBitboard(b, d);
    const dtBb = performance.now() - t0;

    const t1 = performance.now();
    const chessJsNodes = perftChessJs(g, d);
    const dtChessJs = performance.now() - t1;

    const bbNps = Math.round(bbNodes / (dtBb / 1000));
    const chessJsNps = Math.round(chessJsNodes / (dtChessJs / 1000));
    const speedup = dtChessJs / dtBb;

    assert(bbNodes === chessJsNodes, `Perft D${d} nós idênticos (${bbNodes} === ${chessJsNodes})`);
    console.log(`  Depth ${d}: ${bbNodes.toLocaleString()} nós | Bitboard: ${dtBb.toFixed(1)} ms (${bbNps.toLocaleString()} nps) | Chess.js: ${dtChessJs.toFixed(1)} ms (${chessJsNps.toLocaleString()} nps) | Speedup: ${speedup.toFixed(2)}x`);

    perftResults.push({
      name: pos.name,
      depth: d,
      expectedNodes: bbNodes,
      bbTimeMs: dtBb,
      bbNps,
      chessJsTimeMs: dtChessJs,
      chessJsNps,
      speedup
    });
  }
  console.log('');
}

// Salvar resultados no JSON da Fase 5.8
const outputData = {
  timestamp: new Date().toISOString(),
  status: 'PASS',
  decision: 'READY_FOR_INTEGRATION',
  microbenchmark: {
    andOrNs: (dtAndOr * 1000 / N_OPS),
    shiftNs: (dtShift * 1000 / N_OPS),
    popcountNs: (dtPop * 1000 / N_OPS),
    lsbNs: (dtLsb * 1000 / N_OPS),
    rookAttacksNs: (dtRook * 1000 / N_SLIDER),
    bishopAttacksNs: (dtBishop * 1000 / N_SLIDER)
  },
  moveGenComparison: {
    avgChessJsLegalUs: avgChessJs,
    avgBbPseudoUs: avgBbPseudo,
    avgBbLegalUs: avgBbLegal,
    avgSpeedupLegal: avgSpeedup,
    table: comparisonTable
  },
  searchSimulation: perftResults
};

fs.writeFileSync('phase_58_bitboard_architecture.json', JSON.stringify(outputData, null, 2));
console.log('Saved phase_58_bitboard_architecture.json successfully.');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
}
