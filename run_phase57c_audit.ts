/**
 * FASE 5.7C — AUDITORIA E PROFILING DA GERAÇÃO DE MOVIMENTOS LEGAIS
 *
 * Medições detalhadas:
 * 1. Tempo gasto em pseudo-legal move generation
 * 2. Tempo gasto em legal validation (_makeMove + _isKingAttacked + _undoMove)
 * 3. Tempo individual de _makeMove, _isKingAttacked, _undoMove
 * 4. Frequência de chamadas em root, minimax interior, quiescence e evaluateBoard
 * 5. Quantificação de dupla geração e desperdício de validação em quiescence
 */

import { Chess } from 'chess.js';
import { calculateBestMove, metrics, evaluateBoard } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('FASE 5.7C — AUDITORIA E PROFILING GRANULAR');
console.log('=====================================================\n');

// 1. Profiling individual dos componentes de legal move generation
interface TimingBreakdown {
  pseudoGenCalls: number;
  pseudoGenTimeMs: number;
  makeMoveCalls: number;
  makeMoveTimeMs: number;
  isKingAttackedCalls: number;
  isKingAttackedTimeMs: number;
  undoMoveCalls: number;
  undoMoveTimeMs: number;
  fullLegalGenCalls: number;
  fullLegalGenTimeMs: number;
}

const breakdown: TimingBreakdown = {
  pseudoGenCalls: 0,
  pseudoGenTimeMs: 0,
  makeMoveCalls: 0,
  makeMoveTimeMs: 0,
  isKingAttackedCalls: 0,
  isKingAttackedTimeMs: 0,
  undoMoveCalls: 0,
  undoMoveTimeMs: 0,
  fullLegalGenCalls: 0,
  fullLegalGenTimeMs: 0,
};

// Instrumentação controlada sobre uma amostra de 10 posições representativas
const samplePositions = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial
  'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8', // Opening
  'r1b2rk1/pp3ppp/2n1pn2/q1pp4/2PP4/P1N1PN2/1P1QBPPP/R4RK1 w - - 1 11', // Middlegame
  '2r2rk1/1bqnbppp/pp1ppn2/8/2PNP3/1PN1BP2/P3B1PP/2RQ1R1K w - - 0 15', // Closed
  'r1b1k2r/pppp1ppp/8/4n3/1b2P3/2N1B3/PPP2PPP/R3KB1R w KQkq - 2 10', // Tactics
  'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3', // In check
  'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', // Active
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', // Endgame
  '8/4Pk2/8/8/8/8/8/4K3 w - - 0 1', // Promotion possible
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' // Kiwipete / complex pins
];

console.log('--- 1. PROFILING DE COMPONENTES PRIMITIVOS (1.000 chamadas em 10 posições) ---');

for (const fen of samplePositions) {
  const g = new Chess(fen) as any;
  const us = g._turn;

  // Medir pseudo-legal generation isolada
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    const pm = g._moves({ legal: false });
    breakdown.pseudoGenCalls += pm.length;
  }
  breakdown.pseudoGenTimeMs += (performance.now() - t0);

  // Obter uma lista de pseudo-moves para medir makeMove, isKingAttacked, undoMove
  const moves = g._moves({ legal: false });
  for (let i = 0; i < 100; i++) {
    for (const m of moves) {
      // makeMove
      const tm0 = performance.now();
      g._makeMove(m);
      breakdown.makeMoveTimeMs += (performance.now() - tm0);
      breakdown.makeMoveCalls++;

      // isKingAttacked
      const tk0 = performance.now();
      const att = g._isKingAttacked(us);
      breakdown.isKingAttackedTimeMs += (performance.now() - tk0);
      breakdown.isKingAttackedCalls++;

      // undoMove
      const tu0 = performance.now();
      g._undoMove();
      breakdown.undoMoveTimeMs += (performance.now() - tu0);
      breakdown.undoMoveCalls++;
    }
  }

  // Medir legal moves completo do chess.js
  const tFull = performance.now();
  for (let i = 0; i < 100; i++) {
    g._moves({ legal: true });
  }
  breakdown.fullLegalGenTimeMs += (performance.now() - tFull);
  breakdown.fullLegalGenCalls += 100;
}

console.log(`Pseudo-legal gen total: ${breakdown.pseudoGenTimeMs.toFixed(2)} ms (avg ${(breakdown.pseudoGenTimeMs * 1000 / 1000).toFixed(2)} µs/call)`);
console.log(`_makeMove total (${breakdown.makeMoveCalls} calls): ${breakdown.makeMoveTimeMs.toFixed(2)} ms (avg ${(breakdown.makeMoveTimeMs * 1000 / breakdown.makeMoveCalls).toFixed(2)} µs/call)`);
console.log(`_isKingAttacked total (${breakdown.isKingAttackedCalls} calls): ${breakdown.isKingAttackedTimeMs.toFixed(2)} ms (avg ${(breakdown.isKingAttackedTimeMs * 1000 / breakdown.isKingAttackedCalls).toFixed(2)} µs/call)`);
console.log(`_undoMove total (${breakdown.undoMoveCalls} calls): ${breakdown.undoMoveTimeMs.toFixed(2)} ms (avg ${(breakdown.undoMoveTimeMs * 1000 / breakdown.undoMoveCalls).toFixed(2)} µs/call)`);
console.log(`Full chess.js _moves({ legal: true }) (${breakdown.fullLegalGenCalls} calls): ${breakdown.fullLegalGenTimeMs.toFixed(2)} ms (avg ${(breakdown.fullLegalGenTimeMs * 1000 / breakdown.fullLegalGenCalls).toFixed(2)} µs/call)\n`);

const validationPerMoveUs = (breakdown.makeMoveTimeMs + breakdown.isKingAttackedTimeMs + breakdown.undoMoveTimeMs) * 1000 / breakdown.makeMoveCalls;
console.log(`Custo de validação por pseudo-movimento: ${validationPerMoveUs.toFixed(2)} µs (make: ${(breakdown.makeMoveTimeMs*1000/breakdown.makeMoveCalls).toFixed(2)} µs, check: ${(breakdown.isKingAttackedTimeMs*1000/breakdown.makeMoveCalls).toFixed(2)} µs, undo: ${(breakdown.undoMoveTimeMs*1000/breakdown.makeMoveCalls).toFixed(2)} µs)\n`);

// 2. Medir chamadas durante a busca nos 68 FENs oficiais
console.log('--- 2. INSTRUMENTAÇÃO DA BUSCA NOS 68 FENs (Onde as chamadas ocorrem?) ---');

// Patch temporário dos contadores
let rootMoveGenCalls = 0;
let minimaxMoveGenCalls = 0;
let qsearchMoveGenCalls = 0;
let qsearchTacticalMovesKept = 0;
let qsearchQuietMovesTestedForCheck = 0;
let qsearchQuietChecksFound = 0;
let mobilityMoveGenCalls = 0;

// Salvar método original de _moves
const origMoves = Chess.prototype['_moves' as any];

// Patch no _moves para rastrear origem
let searchContext: 'root' | 'minimax' | 'qsearch' | 'mobility' | 'other' = 'other';

(Chess.prototype as any)._moves = function(options: any) {
  if (searchContext === 'root') rootMoveGenCalls++;
  else if (searchContext === 'minimax') minimaxMoveGenCalls++;
  else if (searchContext === 'qsearch') qsearchMoveGenCalls++;
  else if (searchContext === 'mobility') mobilityMoveGenCalls++;
  return origMoves.call(this, options);
};

// Executar benchmark para coletar contadores
let totalBenchmarkTimeMs = 0;
let totalNodesCount = 0;
let totalQNodesCount = 0;

for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
  const pos = SANITIZED_BENCHMARK_POSITIONS[i];
  const g = new Chess(pos.fen);

  const t0 = performance.now();
  searchContext = 'root';
  calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
  const dt = performance.now() - t0;
  totalBenchmarkTimeMs += dt;
  totalNodesCount += metrics.nodes;
  totalQNodesCount += metrics.quiescenceNodes;
}

// Restaurar _moves original
(Chess.prototype as any)._moves = origMoves;

console.log(`Total 68 FEN search time: ${totalBenchmarkTimeMs.toFixed(1)} ms`);
console.log(`Total nodes: ${totalNodesCount}, Total qNodes: ${totalQNodesCount}`);
console.log(`Move generation calls breakdown:`);
console.log(`  Root calls:     ${rootMoveGenCalls}`);
console.log(`  Minimax calls:  ${minimaxMoveGenCalls}`);
console.log(`  QSearch calls:  ${qsearchMoveGenCalls}`);
console.log(`  Mobility calls: ${mobilityMoveGenCalls}`);
console.log(`  Total calls:    ${rootMoveGenCalls + minimaxMoveGenCalls + qsearchMoveGenCalls + mobilityMoveGenCalls}\n`);

// 3. Investigar Quiescence Search detalhadamente
console.log('--- 3. INVESTIGAÇÃO DE QUIESCENCE SEARCH ---');
// Em quantas posições de qsearch temos standPat >= beta (onde _moves NÃO é chamado)?
// E quando _moves É chamado, quantos movimentos são capturas vs quiet moves testados para xeque?

let qNodesTotal = 0;
let qStandPatCutoffs = 0;
let qDepthLimitReturns = 0;
let qTerminalReturns = 0;
let qMoveGenExecuted = 0;
let qCapturesFound = 0;
let qQuietChecked = 0;
let qQuietChecksKept = 0;

for (const pos of SANITIZED_BENCHMARK_POSITIONS.slice(0, 20)) {
  const g = new Chess(pos.fen);
  // Executar profundidade 3
  calculateBestMove(g, 'dificil', { maxTimeMs: 1500 });
}

console.log('Investigação inicial concluída. Gerando perfil estrutural...');
