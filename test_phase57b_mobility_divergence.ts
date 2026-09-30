/**
 * FASE 5.7B — MOBILITY DIVERGENCE DIAGNOSTIC
 *
 * Pinpoints the exact position, piece, origin square, and move where
 * referenceLegalMobility and optimizedLegalMobility (or countMobility) diverge.
 */

import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  evaluateMobility,
  countMobility,
  referenceLegalMobility,
  optimizedLegalMobility,
  MobilityBreakdown,
  metrics
} from './src/lib/engine';

console.log('=====================================================');
console.log('[5.7B DIAGNOSTIC] MOBILITY DIVERGENCE INVESTIGATION');
console.log('=====================================================\n');

// 0x88 square name lookup
const SQUARES_0x88 = [
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', '', '', '', '', '', '', '', '',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', '', '', '', '', '', '', '', '',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', '', '', '', '', '', '', '', '',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', '', '', '', '', '', '', '', '',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', '', '', '', '', '', '', '', '',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', '', '', '', '', '', '', '', '',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', '', '', '', '', '', '', '', '',
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
];

function sqName(sq: number): string {
  return SQUARES_0x88[sq] || String(sq);
}

const targetFen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
const randomIndex = 477;
const sideTested: 'b' = 'b';

const gTarget = new Chess(targetFen);

const refB = referenceLegalMobility(gTarget, 'b');
const optB = optimizedLegalMobility(gTarget, 'b');
const cntB = countMobility(gTarget, 'b');

console.log('=== MOBILITY DIVERGENCE ===\n');
console.log(`randomIndex: ${randomIndex}`);
console.log(`seed / origin: Reachable position after 1. e4 c5`);
console.log(`FEN: ${targetFen}`);
console.log(`sideTested: ${sideTested}\n`);

console.log('REFERENCE:');
console.log(`  pawns: ${refB.pawns}`);
console.log(`  knights: ${refB.knights}`);
console.log(`  bishops: ${refB.bishops}`);
console.log(`  rooks: ${refB.rooks}`);
console.log(`  queens: ${refB.queens}`);
console.log(`  king: ${refB.king}`);
console.log(`  totalNonKing: ${refB.totalNonKing}`);
console.log(`  total: ${refB.total}\n`);

console.log('OPTIMIZED:');
console.log(`  pawns: ${optB.pawns}`);
console.log(`  knights: ${optB.knights}`);
console.log(`  bishops: ${optB.bishops}`);
console.log(`  rooks: ${optB.rooks}`);
console.log(`  queens: ${optB.queens}`);
console.log(`  king: ${optB.king}`);
console.log(`  totalNonKing: ${optB.totalNonKing}`);
console.log(`  total: ${optB.total}`);
console.log(`  countMobility: ${cntB}\n`);

console.log('DELTA (OPTIMIZED - REFERENCE):');
console.log(`  pawns: ${optB.pawns - refB.pawns}`);
console.log(`  knights: ${optB.knights - refB.knights}`);
console.log(`  bishops: ${optB.bishops - refB.bishops}`);
console.log(`  rooks: ${optB.rooks - refB.rooks}`);
console.log(`  queens: ${optB.queens - refB.queens}`);
console.log(`  king: ${optB.king - refB.king}`);
console.log(`  totalNonKing: ${optB.totalNonKing - refB.totalNonKing}`);
console.log(`  total: ${optB.total - refB.total}\n`);

// ============================================================
// 3. IDENTIFIQUE OS MOVIMENTOS
// ============================================================
console.log('--- 3. IDENTIFICAÇÃO DOS MOVIMENTOS ---');

const gRef = new Chess(targetFen) as any;
gRef._turn = sideTested;
const refMoves = gRef._moves({ legal: true });

const gOpt = new Chess(targetFen) as any;
gOpt._turn = sideTested;
const optMoves = gOpt._moves({ legal: false }).filter((m: any) => {
  gOpt._makeMove(m);
  const legal = !gOpt._isKingAttacked(sideTested);
  gOpt._undoMove();
  return legal;
});

function groupMovesByPiece(moves: any[]) {
  const groups: Record<string, string[]> = {
    Pawn: [],
    Knight: [],
    Bishop: [],
    Rook: [],
    Queen: [],
    King: []
  };

  for (const m of moves) {
    const fromStr = sqName(m.from);
    const toStr = sqName(m.to);
    const epStr = m.flags & 8 ? ' (ep)' : '';
    const desc = `${fromStr}-${toStr}${epStr}`;
    const p = m.piece.toLowerCase();
    if (p === 'p') groups.Pawn.push(desc);
    else if (p === 'n') groups.Knight.push(desc);
    else if (p === 'b') groups.Bishop.push(desc);
    else if (p === 'r') groups.Rook.push(desc);
    else if (p === 'q') groups.Queen.push(desc);
    else if (p === 'k') groups.King.push(desc);
  }
  return groups;
}

const refGroups = groupMovesByPiece(refMoves);
const optGroups = groupMovesByPiece(optMoves);

console.log('REFERENCE LEGAL MOVES:');
for (const [p, list] of Object.entries(refGroups)) {
  console.log(`  ${p} (${list.length}): ${list.join(', ') || 'none'}`);
}

console.log('\nOPTIMIZED LEGAL MOVES:');
for (const [p, list] of Object.entries(optGroups)) {
  console.log(`  ${p} (${list.length}): ${list.join(', ') || 'none'}`);
}

// ============================================================
// 4. COMPARE POR ORIGEM
// ============================================================
console.log('\n--- 4. COMPARAÇÃO POR ORIGEM ---');

const originMapRef: Record<string, number> = {};
for (const m of refMoves) {
  const key = `${m.piece.toUpperCase()} on ${sqName(m.from)}`;
  originMapRef[key] = (originMapRef[key] || 0) + 1;
}

const originMapOpt: Record<string, number> = {};
for (const m of optMoves) {
  const key = `${m.piece.toUpperCase()} on ${sqName(m.from)}`;
  originMapOpt[key] = (originMapOpt[key] || 0) + 1;
}

const allKeys = Array.from(new Set([...Object.keys(originMapRef), ...Object.keys(originMapOpt)])).sort();
for (const k of allKeys) {
  const r = originMapRef[k] || 0;
  const o = originMapOpt[k] || 0;
  const match = r === o ? 'OK' : 'MISMATCH';
  console.log(`  ${k}: reference = ${r}, optimized = ${o} -> ${match}`);
}

// ============================================================
// 5. TESTE DO MOVIMENTO DIVERGENTE
// ============================================================
console.log('\n--- 5. TESTE DO MOVIMENTO DIVERGENTE ---');

console.log('Moves present in REFERENCE but absent in OPTIMIZED:');
const optSet = new Set(optMoves.map((m: any) => `${m.piece}:${m.from}->${m.to}:${m.flags}`));
for (const m of refMoves) {
  const key = `${m.piece}:${m.from}->${m.to}:${m.flags}`;
  if (!optSet.has(key)) {
    console.log(`  Reference Extra: ${m.piece.toUpperCase()} from ${sqName(m.from)} to ${sqName(m.to)} (flags=${m.flags})`);
  }
}

console.log('\nMoves present in OPTIMIZED but absent in REFERENCE:');
const refSet = new Set(refMoves.map((m: any) => `${m.piece}:${m.from}->${m.to}:${m.flags}`));
for (const m of optMoves) {
  const key = `${m.piece}:${m.from}->${m.to}:${m.flags}`;
  if (!refSet.has(key)) {
    console.log(`  Optimized Extra: ${m.piece.toUpperCase()} from ${sqName(m.from)} to ${sqName(m.to)} (flags=${m.flags})`);
  }
}

// Test legality of b7xc6(ep) and d7xc6(ep)
console.log('\nAudit of illegal EP moves:');
console.log('Does chess.js allow b7xc6(ep) when White was the side to move?');
console.log('In reality: Black just moved c7-c5! It is White to move! Black cannot capture its own pawn push en passant.');

// ============================================================
// 6. VERIFICAÇÃO DE ESTADO ESPECIAL
// ============================================================
console.log('\n--- 6. VERIFICAÇÃO DE ESTADO ESPECIAL ---');
const parts = targetFen.split(' ');
console.log(`FEN completo: ${targetFen}`);
console.log(`turn: ${parts[1]}`);
console.log(`castling rights: ${parts[2]}`);
console.log(`en passant square: ${parts[3]}`);
console.log(`halfmove clock: ${parts[4]}`);
console.log(`fullmove number: ${parts[5]}`);

// ============================================================
// 7. TESTE DA POSIÇÃO MANUALMENTE & IMPACTO NO SEARCH
// ============================================================
console.log('\n--- 7. TESTE MANUAL E IMPACTO NO SEARCH ---');
const gSearch = new Chess(targetFen);
const bestMove = calculateBestMove(gSearch, 'dificil', { maxTimeMs: 2000 });
console.log(`calculateBestMove("${targetFen}"):`);
console.log(`  bestMove: ${bestMove}`);
console.log(`  completedDepth: ${metrics.lastCompletedDepth}`);
console.log(`  nodes: ${metrics.nodes}`);
console.log(`  qNodes: ${metrics.quiescenceNodes}`);

// ============================================================
// 8. VERIFICAÇÃO DO ORÁCULO VS CHESS.JS OFICIAL
// ============================================================
console.log('\n--- 8. VERIFICAÇÃO ORACLE VS CHESS.JS OFICIAL ---');
const freshG = new Chess(targetFen);
console.log(`chess.js legal moves for White (turn in FEN): ${freshG.moves().length}`);

// If FEN is set with Black to move but ep square c6 preserved:
// Notice: FEN string with Black to move and c6 en-passant square:
const blackWithEpFen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR b KQkq c6 0 2';
try {
  const gBlackEp = new Chess(blackWithEpFen);
  console.log(`chess.js legal moves for Black with FEN turn 'b' and ep 'c6': ${gBlackEp.moves().length}`);
} catch (e: any) {
  console.log(`chess.js VALIDATION RESULT: "${e.message}"!`);
  console.log(`CONFIRMED: Having turn 'b' with ep 'c6' is an INVALID CHESS STATE in chess.js!`);
}

// If FEN has no ep square for Black:
const blackCleanFen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
const gBlackClean = new Chess(blackCleanFen);
console.log(`chess.js legal moves for Black with clean FEN (no ep): ${gBlackClean.moves().length}`);

console.log('\n=== DIAGNOSTIC COMPLETE ===');
process.exit(0);
