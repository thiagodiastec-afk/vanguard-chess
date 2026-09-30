/**
 * FASE 5.7A — COMPREHENSIVE SAN ELIMINATION VALIDATION & BENCHMARK
 */

import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  minimax,
  orderMoves,
  getMoveKey,
  metrics,
  InternalMove,
  SQUARES
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { StockfishClient } from './src/lib/stockfishClient';
import * as fs from 'fs';

// ============================================================
// 1. INSTRUMENTATION: ZERO SAN IN SEARCH TREE
// ============================================================

let totalSanCalls = 0;
let sanCallsInsideSearch = 0;
let sanCallsAtRoot = 0;
let isInsideSearch = false;

const originalMoveToSan = (Chess.prototype as any)._moveToSan;
(Chess.prototype as any)._moveToSan = function (move: any, moves: any[]) {
  totalSanCalls++;
  // If the game has non-zero history, or isInsideSearch flag is set, it's inside search
  if (isInsideSearch || this._history.length > 0) {
    sanCallsInsideSearch++;
  } else {
    sanCallsAtRoot++;
  }
  return originalMoveToSan.call(this, move, moves);
};

// Also monitor any game.moves({ verbose: true }) which would generate SAN
const originalMoves = Chess.prototype.moves;
let verboseMovesCalls = 0;
Chess.prototype.moves = function (...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0].verbose) {
    verboseMovesCalls++;
  }
  return (originalMoves as any).apply(this, args);
};

console.log('=====================================================');
console.log(' FASE 5.7A — SAN ELIMINATION VALIDATION');
console.log('=====================================================\n');

async function runAll() {
  // ============================================================
  // 2. ROOT SAN NOTATION ACCURACY TESTS (Requirement 17)
  // ============================================================

  console.log('--- 1. MANDATORY ROOT SAN ACCURACY TESTS ---');

  interface SanTestCase {
    name: string;
    fen: string;
    expectedSan: string;
    checkType: 'exact' | 'pattern';
  }

  const sanCases: SanTestCase[] = [
    // 1. Basic Moves
    { name: 'Basic Pawn Push (e4)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expectedSan: 'e4', checkType: 'pattern' },
    { name: 'Basic Knight Move (Nf3)', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', expectedSan: 'Nf3', checkType: 'pattern' },
    { name: 'Basic Bishop Move (Bb5)', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', expectedSan: 'Bb5', checkType: 'exact' },

    // 2. Captures
    { name: 'Knight Capture (Nxe5)', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4', expectedSan: 'Nxe5', checkType: 'exact' },
    { name: 'Queen Capture (Qxd5)', fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/3Q4/PPPP1PPP/RNB1KBNR w KQkq - 0 4', expectedSan: 'Qxd5', checkType: 'exact' },

    // 3. Checks
    { name: 'Queen Check (Qa4+)', fen: 'rnbqkbnr/ppp1pppp/8/3p4/2P5/8/PP1PPPPP/RNBQKBNR w KQkq d6 0 2', expectedSan: 'Qa4+', checkType: 'exact' },

    // 4. Mate
    { name: 'Checkmate (Qxf7#)', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4', expectedSan: 'Qxf7#', checkType: 'exact' },

    // 5. Promotions
    { name: 'Pawn Promotion with Check (e8=Q+)', fen: '3k4/4P3/8/8/8/8/8/4K3 w - - 0 1', expectedSan: 'e8=Q+', checkType: 'exact' },
    { name: 'Pawn Promotion Quiet (b8=Q)', fen: '8/1P6/8/8/8/8/k7/4K3 w - - 0 1', expectedSan: 'b8=Q', checkType: 'exact' },

    // 6. Castling
    { name: 'Kingside Castle (O-O)', fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', expectedSan: 'O-O', checkType: 'exact' },
    { name: 'Queenside Castle (O-O-O)', fen: 'r3kbnr/ppp1pppp/2nq4/3p1b2/3P1B2/2NQ4/PPP1PPPP/R3KBNR w KQkq - 4 5', expectedSan: 'O-O-O', checkType: 'exact' },

    // 7. Disambiguation
    { name: 'Knight Disambiguation File (Nbd2 or Nfd2)', fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/3P4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4', expectedSan: 'N(bd2|fd2)', checkType: 'pattern' },
    { name: 'Rook Disambiguation (Rad1 or Rfd1)', fen: 'r4rk1/ppp2ppp/2n5/3q4/3P4/5N2/PP3PPP/R4RK1 w - - 0 14', expectedSan: 'R(ad1|fd1)', checkType: 'pattern' },

    // 8. Capture with Promotion
    { name: 'Capture with Promotion (exd8=Q+)', fen: '3r1k2/4P3/8/8/8/8/8/4K3 w - - 0 1', expectedSan: 'exd8=Q+', checkType: 'exact' },

    // 9. En Passant
    { name: 'En Passant (exf6)', fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', expectedSan: 'exf6', checkType: 'exact' }
  ];

  let sanTestsPassed = 0;
  for (const tc of sanCases) {
    const g = new Chess(tc.fen);
    const rawMoves = (g as any)._moves({ legal: true }) as InternalMove[];

    let matched = false;
    for (const m of rawMoves) {
      const san = (g as any)._moveToSan(m, rawMoves);
      if (tc.checkType === 'exact') {
        if (san === tc.expectedSan) {
          matched = true;
          break;
        }
      } else {
        const reg = new RegExp(tc.expectedSan);
        if (reg.test(san)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      sanTestsPassed++;
      console.log(`  ✓ [PASS] ${tc.name}: valid SAN matches "${tc.expectedSan}"`);
    } else {
      console.log(`  ✗ [FAIL] ${tc.name}: no move matched "${tc.expectedSan}"`);
    }
  }
  console.log(`SAN Tests Result: ${sanTestsPassed}/${sanCases.length} PASS\n`);

  // ============================================================
  // 3. ZERO SAN IN SEARCH VERIFICATION (Requirement 18)
  // ============================================================

  console.log('--- 2. STRICT ZERO-SAN IN SEARCH AUDIT ---');

  const auditPositions = [
    'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4', // Scholar's mate
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Start
    'r1b1k2r/pppp1ppp/2n2q1n/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 6', // Tactics
    '8/8/4k3/8/8/8/4P3/4K3 w - - 0 1', // Endgame
    '2r3k1/1p3ppp/p3p3/3p4/P7/1P3P2/2r3PP/R4RK1 w - - 0 25' // Rook endgame
  ];

  let zeroSanPassed = true;

  for (let i = 0; i < auditPositions.length; i++) {
    const fen = auditPositions[i];
    const g = new Chess(fen);

    const rootSanBefore = sanCallsAtRoot;
    const insideSanBefore = sanCallsInsideSearch;
    const totalBefore = totalSanCalls;

    const best = calculateBestMove(g, 'dificil', { maxTimeMs: 1500 });

    const rootSanDelta = sanCallsAtRoot - rootSanBefore;
    const insideSanDelta = sanCallsInsideSearch - insideSanBefore;
    const totalDelta = totalSanCalls - totalBefore;

    console.log(`  Position ${i + 1} (${best}): Total SAN calls = ${totalDelta} (Root: ${rootSanDelta}, Inside Search: ${insideSanDelta})`);
    if (insideSanDelta > 0 || totalDelta > 1) {
      zeroSanPassed = false;
    }
  }

  console.log(`Strict Zero-SAN Inside Search: ${zeroSanPassed ? 'PASS (0 calls inside search, 1 at root)' : 'FAIL'}`);
  console.log(`Verbose moves() calls in search: ${verboseMovesCalls} (Expected: 0) -> ${verboseMovesCalls === 0 ? 'PASS' : 'FAIL'}\n`);

  // ============================================================
  // 4. DETERMINISM TESTS (Requirement 23)
  // ============================================================

  console.log('--- 3. DETERMINISM (10 Consecutive Runs) ---');

  const detFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const detRuns: Array<{ move: string | null; nodes: number; qNodes: number }> = [];

  for (let i = 0; i < 10; i++) {
    const g = new Chess(detFen);
    const m = calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
    detRuns.push({ move: m, nodes: metrics.nodes, qNodes: metrics.quiescenceNodes });
  }

  const firstMove = detRuns[0].move;
  const firstNodes = detRuns[0].nodes;
  const firstQNodes = detRuns[0].qNodes;

  const detMoveOk = detRuns.every(r => r.move === firstMove);
  const detNodesOk = detRuns.every(r => r.nodes === firstNodes);
  const detQNodesOk = detRuns.every(r => r.qNodes === firstQNodes);

  console.log(`  Moves: ${detRuns.map(r => r.move).join(', ')}`);
  console.log(`  Nodes: ${firstNodes}, QNodes: ${firstQNodes}`);
  console.log(`  Move Determinism: ${detMoveOk ? 'PASS (10/10)' : 'FAIL'}`);
  console.log(`  Nodes Determinism: ${detNodesOk ? 'PASS (10/10)' : 'FAIL'}`);
  console.log(`  QNodes Determinism: ${detQNodesOk ? 'PASS (10/10)' : 'FAIL'}\n`);

  // ============================================================
  // 5. STATE ISOLATION TESTS (Requirement 24)
  // ============================================================

  console.log('--- 4. STATE ISOLATION (A -> B -> C vs B -> C -> A vs C -> A -> B) ---');

  const posA = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const posB = '7k/R7/5N2/8/8/8/8/4K3 w - - 0 1';
  const posC = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

  function runSequence(positions: string[]) {
    return positions.map(fen => {
      const g = new Chess(fen);
      const m = calculateBestMove(g, 'dificil', { maxTimeMs: 4000 });
      return {
        fen,
        move: m,
        nodes: metrics.nodes,
        qNodes: metrics.quiescenceNodes
      };
    });
  }

  const seq1 = runSequence([posA, posB, posC]);
  const seq2 = runSequence([posB, posC, posA]);
  const seq3 = runSequence([posC, posA, posB]);

  const resA1 = seq1[0];
  const resA2 = seq2[2];
  const resA3 = seq3[1];

  const isoA_move = (resA1.move === resA2.move && resA2.move === resA3.move);
  const isoA_nodes = (resA1.nodes === resA2.nodes && resA2.nodes === resA3.nodes);
  const isoA_qnodes = (resA1.qNodes === resA2.qNodes && resA2.qNodes === resA3.qNodes);

  console.log(`  Pos A (Scholar's Mate):`);
  console.log(`    Moves: [${resA1.move}, ${resA2.move}, ${resA3.move}] -> ${isoA_move ? 'PASS' : 'FAIL'}`);
  console.log(`    Nodes: [${resA1.nodes}, ${resA2.nodes}, ${resA3.nodes}] -> ${isoA_nodes ? 'PASS' : 'FAIL'}`);
  console.log(`    QNodes: [${resA1.qNodes}, ${resA2.qNodes}, ${resA3.qNodes}] -> ${isoA_qnodes ? 'PASS' : 'FAIL'}`);

  const resB1 = seq1[1];
  const resB2 = seq2[0];
  const resB3 = seq3[2];

  const isoB_move = (resB1.move === resB2.move && resB2.move === resB3.move);
  const isoB_nodes = (resB1.nodes === resB2.nodes && resB2.nodes === resB3.nodes);
  const isoB_qnodes = (resB1.qNodes === resB2.qNodes && resB2.qNodes === resB3.qNodes);

  console.log(`  Pos B (Tactics):`);
  console.log(`    Moves: [${resB1.move}, ${resB2.move}, ${resB3.move}] -> ${isoB_move ? 'PASS' : 'FAIL'}`);
  console.log(`    Nodes: [${resB1.nodes}, ${resB2.nodes}, ${resB3.nodes}] -> ${isoB_nodes ? 'PASS' : 'FAIL'}`);
  console.log(`    QNodes: [${resB1.qNodes}, ${resB2.qNodes}, ${resB3.qNodes}] -> ${isoB_qnodes ? 'PASS' : 'FAIL'}`);

  const stateIsoPass = isoA_move && isoA_nodes && isoA_qnodes && isoB_move && isoB_nodes && isoB_qnodes;
  console.log(`State Isolation Overall: ${stateIsoPass ? 'PASS' : 'FAIL'}\n`);

  // ============================================================
  // 6. MICROBENCHMARK (Requirement 19)
  // ============================================================

  console.log('--- 5. MICROBENCHMARK (10 Representative, 5 High Branching, 5 Tactical) ---');

  const microPositions = [
    // 10 Representative
    { cat: 'Representative', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { cat: 'Representative', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4' },
    { cat: 'Representative', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5' },
    { cat: 'Representative', fen: 'rnbqkb1r/pp2pppp/3p1n2/2p5/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4' },
    { cat: 'Representative', fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5' },
    { cat: 'Representative', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1' },
    { cat: 'Representative', fen: '8/8/4k3/8/8/8/4P3/4K3 w - - 0 1' },
    { cat: 'Representative', fen: '2r3k1/1p3ppp/p3p3/3p4/P7/1P3P2/2r3PP/R4RK1 w - - 0 25' },
    { cat: 'Representative', fen: 'r1b1k2r/pppp1ppp/2n2q1n/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 6' },
    { cat: 'Representative', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' },

    // 5 High Branching
    { cat: 'High Branching', fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7' },
    { cat: 'High Branching', fen: 'r2q1rk1/1b2bppp/p1np1n2/1p2p3/4P3/1BN1BN2/PPP2PPP/R2Q1RK1 w - - 0 11' },
    { cat: 'High Branching', fen: 'r1bqr1k1/pp3ppp/2n1pn2/2pp4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9' },
    { cat: 'High Branching', fen: 'r2q1rk1/p1p2ppp/bpn1pn2/3p4/2PP4/1PN1PN2/P2Q1PPP/R3KB1R w KQ - 1 9' },
    { cat: 'High Branching', fen: 'r1bqkb1r/1p3ppp/p1np1n2/4p3/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 8' },

    // 5 Tactical
    { cat: 'Tactical', fen: 'r1b2rk1/pp1p1ppp/2n1pn2/q1b5/2B1P3/2N2N2/PPP2PPP/R1BQR1K1 w - - 4 9' },
    { cat: 'Tactical', fen: 'r1b1kb1r/pppp1ppp/2n5/4p3/2B1P2q/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5' },
    { cat: 'Tactical', fen: 'r1bqkb1r/2pp1ppp/p1n5/1p2p3/3Pn3/1B3N2/PPP2PPP/RNBQK2R w KQkq - 0 7' },
    { cat: 'Tactical', fen: 'r2q1rk1/pb1nbppp/1p2pn2/2pp4/2PP4/1PN1PN2/PB2BPPP/R2Q1RK1 w - - 0 10' },
    { cat: 'Tactical', fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPP3PP/2KR1B1R w - - 1 9' }
  ];

  interface MicroResult {
    cat: string;
    fen: string;
    bestMove: string | null;
    timeMs: number;
    nodes: number;
    qNodes: number;
    nps: number;
    sanCalls: number;
  }

  const microResults: MicroResult[] = [];

  for (const mp of microPositions) {
    const g = new Chess(mp.fen);
    sanCallsInsideSearch = 0;
    sanCallsAtRoot = 0;

    const start = performance.now();
    const move = calculateBestMove(g, 'dificil', { maxTimeMs: 2000 });
    const timeMs = performance.now() - start;

    const totalNodes = metrics.nodes + metrics.quiescenceNodes;
    const nps = timeMs > 0 ? (totalNodes / (timeMs / 1000)) : 0;

    microResults.push({
      cat: mp.cat,
      fen: mp.fen,
      bestMove: move,
      timeMs,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes,
      nps: Math.round(nps),
      sanCalls: sanCallsInsideSearch
    });
  }

  const avgTime = microResults.reduce((s, r) => s + r.timeMs, 0) / microResults.length;
  const totalNodesAll = microResults.reduce((s, r) => s + r.nodes + r.qNodes, 0);
  const avgNps = microResults.reduce((s, r) => s + r.nps, 0) / microResults.length;
  const totalSanCallsSearch = microResults.reduce((s, r) => s + r.sanCalls, 0);

  console.log(`  Tested ${microResults.length} positions:`);
  console.log(`  Average Time: ${avgTime.toFixed(1)} ms`);
  console.log(`  Total Nodes (Minimax + QSearch): ${totalNodesAll}`);
  console.log(`  Average NPS: ${Math.round(avgNps)} nodes/sec`);
  console.log(`  Total SAN Calls Inside Search: ${totalSanCallsSearch} (STRICT REQUIREMENT: 0) -> ${totalSanCallsSearch === 0 ? 'PASS' : 'FAIL'}\n`);

  // ============================================================
  // 7. OFFICIAL 68-FEN BENCHMARK (Requirement 20)
  // ============================================================

  console.log('--- 6. OFFICIAL 68-FEN BENCHMARK ---');

  interface BenchmarkPosSummary {
    id: string;
    category: string;
    bestMove: string | null;
    expected: string | undefined;
    isCorrect: boolean;
    isTimeout: boolean;
    timeMs: number;
    nodes: number;
    qNodes: number;
  }

  const benchSummaries: BenchmarkPosSummary[] = [];

  for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
    const pos = SANITIZED_BENCHMARK_POSITIONS[i];
    const g = new Chess(pos.fen);

    const start = performance.now();
    const engineMove = calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
    const timeMs = performance.now() - start;

    let isCorrect = false;
    if (pos.expectedBestMove || pos.alternativeBestMoves) {
      const allowed = [
        ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
        ...(pos.alternativeBestMoves || [])
      ];
      const cleanEngine = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
      isCorrect = allowed.some(m => {
        const cleanAllowed = m.replace(/[+#x]/g, '');
        return m === engineMove || cleanAllowed === cleanEngine;
      });

      if (!isCorrect && pos.category === 'MATE_IN_1' && engineMove) {
        const tg = new Chess(pos.fen);
        try {
          tg.move(engineMove);
          if (tg.isCheckmate()) isCorrect = true;
        } catch {}
      }
    } else {
      isCorrect = engineMove !== null;
    }

    const isTimeout = timeMs >= 2950 || metrics.timeoutDuringIteration;

    benchSummaries.push({
      id: pos.id,
      category: pos.category,
      bestMove: engineMove,
      expected: pos.expectedBestMove,
      isCorrect,
      isTimeout,
      timeMs,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes
    });
  }

  const totalBench = benchSummaries.length;
  const correctBench = benchSummaries.filter(b => b.isCorrect).length;
  const timeoutBench = benchSummaries.filter(b => b.isTimeout).length;
  const incorrectBench = benchSummaries.filter(b => !b.isCorrect && !b.isTimeout).length;
  const completedBench = totalBench - timeoutBench;
  const accuracyCompleted = completedBench > 0 ? (correctBench / completedBench) * 100 : 0;
  const completionRate = (completedBench / totalBench) * 100;

  // Timing stats
  const times = benchSummaries.map(b => b.timeMs).sort((a, b) => a - b);
  const medianTime = times[Math.floor(times.length / 2)];
  const p95Time = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];

  // Node stats
  const nodesList = benchSummaries.map(b => b.nodes).sort((a, b) => a - b);
  const medianNodes = nodesList[Math.floor(nodesList.length / 2)];

  const qNodesList = benchSummaries.map(b => b.qNodes).sort((a, b) => a - b);
  const medianQNodes = qNodesList[Math.floor(qNodesList.length / 2)];

  console.log(`  Total Positions: ${totalBench}`);
  console.log(`  Correct: ${correctBench} (${((correctBench / totalBench) * 100).toFixed(1)}%)`);
  console.log(`  Incorrect: ${incorrectBench}`);
  console.log(`  Timeout: ${timeoutBench} (${((timeoutBench / totalBench) * 100).toFixed(1)}%)`);
  console.log(`  Completed: ${completedBench}/${totalBench} (${completionRate.toFixed(1)}%)`);
  console.log(`  Accuracy among completed: ${accuracyCompleted.toFixed(2)}%`);
  console.log(`  Median time: ${medianTime.toFixed(1)} ms`);
  console.log(`  P95 time: ${p95Time.toFixed(1)} ms`);
  console.log(`  Median nodes: ${medianNodes}`);
  console.log(`  Median qNodes: ${medianQNodes}\n`);

  // ============================================================
  // 8. STOCKFISH SANITY CHECK (Requirement 22)
  // ============================================================

  console.log('--- 7. STOCKFISH SANITY CHECK (10 Sample Positions) ---');
  let sfMatches = 0;
  const sfSample = SANITIZED_BENCHMARK_POSITIONS.slice(0, 10);
  const sfResults: any[] = [];

  try {
    const sf = new StockfishClient();
    await sf.init();

    for (let i = 0; i < sfSample.length; i++) {
      const p = sfSample[i];
      const g = new Chess(p.fen);
      const vanguardMove = calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
      const sfEval = await sf.evaluate(p.fen, { depth: 10 });

      // Stockfish returns UCI move (e.g. 'e2e4' or 'c4f7')
      // Convert Stockfish UCI move to SAN for clean comparison
      let sfSan = sfEval.bestMove;
      try {
        const tempG = new Chess(p.fen);
        const from = sfEval.bestMove.substring(0, 2);
        const to = sfEval.bestMove.substring(2, 4);
        const promotion = sfEval.bestMove.length > 4 ? sfEval.bestMove[4] : undefined;
        const res = tempG.move({ from, to, promotion });
        if (res) sfSan = res.san;
      } catch {}

      const cleanV = vanguardMove ? vanguardMove.replace(/[+#x]/g, '') : '';
      const cleanS = sfSan.replace(/[+#x]/g, '');
      const match = cleanV === cleanS;
      if (match) sfMatches++;

      console.log(`  [${p.id}] Vanguard: ${vanguardMove} | SF: ${sfSan} -> ${match ? 'MATCH' : 'DIFF'}`);
      sfResults.push({
        id: p.id,
        fen: p.fen,
        vanguardMove,
        sfBestMove: sfSan,
        sfUci: sfEval.bestMove,
        match
      });
    }
    console.log(`Stockfish Agreement on Sample: ${sfMatches}/10 (${((sfMatches / 10) * 100).toFixed(0)}%)\n`);
  } catch (err: any) {
    console.log(`  Stockfish client note: ${err.message || err}. Continuing.\n`);
  }

  // Save results to json for report
  const outputReportData = {
    timestamp: new Date().toISOString(),
    sanCallsInsideSearch,
    sanCallsAtRoot,
    sanTestsPassed,
    sanTotalTests: sanCases.length,
    zeroSanPassed,
    verboseMovesCalls,
    determinism: { detMoveOk, detNodesOk, detQNodesOk, moves: detRuns.map(r => r.move), nodes: firstNodes, qNodes: firstQNodes },
    stateIsolation: { stateIsoPass },
    microbenchmark: {
      avgTimeMs: avgTime,
      avgNps: Math.round(avgNps),
      totalNodes: totalNodesAll,
      positions: microResults
    },
    benchmark68: {
      total: totalBench,
      correct: correctBench,
      incorrect: incorrectBench,
      timeout: timeoutBench,
      completed: completedBench,
      accuracyCompleted,
      completionRate,
      medianTime,
      p95Time,
      medianNodes,
      medianQNodes,
      summaries: benchSummaries
    },
    stockfishSample: {
      total: sfSample.length,
      matches: sfMatches,
      agreement: ((sfMatches / sfSample.length) * 100).toFixed(1) + '%',
      results: sfResults
    }
  };

  fs.writeFileSync('phase_57a_san_optimization.json', JSON.stringify(outputReportData, null, 2));
  console.log('Saved phase_57a_san_optimization.json successfully.');
  process.exit(0);
}

runAll().catch(err => {
  console.error('Fatal error during validation:', err);
  process.exit(1);
});
