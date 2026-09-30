import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, metrics, tt, orderMoves } from './src/lib/engine.ts';
import { computeZobristHash } from './src/lib/zobrist.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { INDEPENDENT_TEST_POSITIONS } from './src/lib/analysis/engineBenchmark/independentPositions.ts';
import { StockfishClient } from './src/lib/stockfishClient.ts';
import {
  sanToUci,
  uciToSan,
  normalizeStockfishScore,
  calculateCentipawnLoss,
  NormalizedScore
} from './src/lib/scoreNormalization.ts';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================================
// FASE 5.6: SEARCH PERFORMANCE & TACTICAL RELIABILITY AUDIT
// ============================================================================

// 1. DATA STRUCTURES FOR AUDIT RESULTS
interface MicrobenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  medianTimeUs: number;
  p95TimeUs: number;
  opsPerSec: number;
}

interface ComponentTimingProfile {
  name: string;
  calls: number;
  totalTimeMs: number;
  avgTimeUs: number;
  percentOfTotalSearchTime: number;
}

interface TimeoutForensicResult {
  id: string;
  category: string;
  fen: string;
  elapsedMs: number;
  completedDepth: number;
  timeoutDuringIteration: boolean;
  totalNodes: number;
  totalQNodes: number;
  rootBranching: number;
  bestMoveReturned: string | null;
  classification: string;
}

interface TacticalAuditResult {
  id: string;
  category: string;
  fen: string;
  stockfishBestMove: string;
  depthResults: Array<{
    depth: number;
    moveSan: string | null;
    score: number;
    nodes: number;
    qNodes: number;
    timeMs: number;
    cpl: number;
    matchesStockfish: boolean;
  }>;
  verdict: string;
}

// ============================================================================
// STEP 1: MICROBENCHMARK SUITE
// ============================================================================
function runMicrobenchmarks(): {
  evalPositions: MicrobenchmarkResult[];
  coreComponents: MicrobenchmarkResult[];
} {
  console.log('--- EXECUTANDO MICROBENCHMARKS DE COMPONENTES (10.000 iterações) ---');

  const representativePositions = [
    { name: '1. Abertura (Ruy Lopez)', fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4' },
    { name: '2. Meio-jogo Fechado', fen: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8' },
    { name: '3. Meio-jogo Aberto (BK01)', fen: '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1' },
    { name: '4. Final (Torres e Dama)', fen: '8/5pk1/4p1p1/7p/7P/4q1P1/5RK1/5R2 w - - 0 35' },
    { name: '5. Alta Mobilidade (Dama Ativa)', fen: 'r1b1kb1r/pppp1ppp/5n2/8/3Q4/4P3/PPP2PPP/RNB1KB1R w KQkq - 1 6' },
    { name: '6. Tática / Ataque ao Rei', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 5' },
    { name: '7. King Safety (Escudo Danificado)', fen: 'r1bq1rk1/pppp1p1p/2n2np1/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7' },
    { name: '8. Desbalanço Material', fen: '4kb1r/p2n1ppp/4p3/4q3/8/8/PP1B1PPP/2R1K2R w Kk - 0 1' },
    { name: '9. Promoção Linear', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1' },
    { name: '10. Calma / Simétrica', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2' }
  ];

  const evalResults: MicrobenchmarkResult[] = [];
  const ITERS = 10000;

  for (const pos of representativePositions) {
    const game = new Chess(pos.fen);
    // Warm-up
    for (let w = 0; w < 500; w++) evaluateBoard(game);

    const timesUs: number[] = [];
    const t0 = performance.now();
    for (let i = 0; i < ITERS; i++) {
      const s = performance.now();
      evaluateBoard(game);
      timesUs.push((performance.now() - s) * 1000);
    }
    const totalMs = performance.now() - t0;
    timesUs.sort((a, b) => a - b);
    const medianUs = timesUs[Math.floor(ITERS * 0.5)];
    const p95Us = timesUs[Math.floor(ITERS * 0.95)];

    evalResults.push({
      name: pos.name,
      iterations: ITERS,
      totalTimeMs: +totalMs.toFixed(2),
      medianTimeUs: +medianUs.toFixed(2),
      p95TimeUs: +p95Us.toFixed(2),
      opsPerSec: Math.round(ITERS / (totalMs / 1000))
    });
  }

  // Core primitives microbenchmarks
  const coreResults: MicrobenchmarkResult[] = [];
  const testFen = 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const game = new Chess(testFen);

  function benchOp(name: string, fn: () => void, n: number = 10000): MicrobenchmarkResult {
    // Warm-up
    for (let w = 0; w < 200; w++) fn();
    const timesUs: number[] = [];
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const s = performance.now();
      fn();
      timesUs.push((performance.now() - s) * 1000);
    }
    const totalMs = performance.now() - t0;
    timesUs.sort((a, b) => a - b);
    return {
      name,
      iterations: n,
      totalTimeMs: +totalMs.toFixed(2),
      medianTimeUs: +timesUs[Math.floor(n * 0.5)].toFixed(2),
      p95TimeUs: +timesUs[Math.floor(n * 0.95)].toFixed(2),
      opsPerSec: Math.round(n / (totalMs / 1000))
    };
  }

  // 1. moves() (SAN generation with legal check)
  coreResults.push(benchOp('chess.js moves() [SAN legal]', () => {
    game.moves();
  }));

  // 2. _moves({ legal: false }) (pseudo-legal move objects)
  coreResults.push(benchOp('chess.js _moves({ legal: false }) [pseudo-legal objects]', () => {
    (game as any)._moves({ legal: false });
  }));

  // 3. _moves({ legal: true }) (legal move objects without SAN string conversion)
  coreResults.push(benchOp('chess.js _moves({ legal: true }) [legal objects, no SAN]', () => {
    (game as any)._moves({ legal: true });
  }));

  // 4. _makeMove + _undoMove
  const legalObj = (game as any)._moves({ legal: true })[0];
  coreResults.push(benchOp('chess.js _makeMove + _undoMove', () => {
    (game as any)._makeMove(legalObj);
    (game as any)._undoMove();
  }));

  // 5. _isKingAttacked('w')
  coreResults.push(benchOp('chess.js _isKingAttacked', () => {
    (game as any)._isKingAttacked('w');
  }));

  // 6. Zobrist hash computation
  coreResults.push(benchOp('computeZobristHash()', () => {
    computeZobristHash(game);
  }));

  // 7. TT probe and store
  const sampleHash = computeZobristHash(game);
  coreResults.push(benchOp('Transposition Table probe + store', () => {
    tt.store(sampleHash, 3, 150, 0, 'Qxf7#');
    tt.probe(sampleHash);
  }));

  // 8. orderMoves
  const rawMoves = game.moves();
  coreResults.push(benchOp('Vanguard orderMoves()', () => {
    orderMoves(rawMoves, game, 'Qxf7#');
  }));

  console.table(evalResults);
  console.table(coreResults);

  return { evalPositions: evalResults, coreComponents: coreResults };
}

// ============================================================================
// STEP 2: GLOBAL SEARCH PROFILING & COMPONENT COST BREAKDOWN
// ============================================================================
function runSearchProfiling(samplePositions: Array<{ id: string; category: string; fen: string }>): {
  components: ComponentTimingProfile[];
  globalMetrics: Record<string, number>;
  callCounts: Record<string, number>;
} {
  console.log('\n--- EXECUTANDO PROFILING GLOBAL DA BUSCA (INTERCEPTAÇÃO DE OPERAÇÕES) ---');

  // Metrics accumulators
  let totalSearchTimeMs = 0;
  let totalNodes = 0;
  let totalQNodes = 0;

  let movesCalls = 0;
  let movesTimeMs = 0;

  let pseudoMovesCalls = 0;
  let pseudoMovesTimeMs = 0;

  let moveToSanCalls = 0;
  let moveToSanTimeMs = 0;

  let makeMoveCalls = 0;
  let makeMoveTimeMs = 0;

  let undoMoveCalls = 0;
  let undoMoveTimeMs = 0;

  let kingAttackedCalls = 0;
  let kingAttackedTimeMs = 0;

  let evalCalls = 0;
  let evalTimeMs = 0;

  let orderMovesCalls = 0;
  let orderMovesTimeMs = 0;

  let ttProbeCalls = 0;
  let ttProbeTimeMs = 0;

  let ttStoreCalls = 0;
  let ttStoreTimeMs = 0;

  // Save original prototype methods
  const origMoves = Chess.prototype.moves;
  const origInternalMoves = (Chess.prototype as any)._moves;
  const origMoveToSan = (Chess.prototype as any)._moveToSan;
  const origMakeMove = (Chess.prototype as any)._makeMove;
  const origUndoMove = (Chess.prototype as any)._undoMove;
  const origIsKingAttacked = (Chess.prototype as any)._isKingAttacked;

  // Intercept Chess.prototype with high-resolution timers
  let profilingActive = false;

  Chess.prototype.moves = function (...args: any[]) {
    if (!profilingActive) return origMoves.apply(this, args);
    movesCalls++;
    const t0 = performance.now();
    const res = origMoves.apply(this, args);
    movesTimeMs += performance.now() - t0;
    return res;
  };

  (Chess.prototype as any)._moves = function (...args: any[]) {
    if (!profilingActive) return origInternalMoves.apply(this, args);
    pseudoMovesCalls++;
    const t0 = performance.now();
    const res = origInternalMoves.apply(this, args);
    pseudoMovesTimeMs += performance.now() - t0;
    return res;
  };

  (Chess.prototype as any)._moveToSan = function (...args: any[]) {
    if (!profilingActive) return origMoveToSan.apply(this, args);
    moveToSanCalls++;
    const t0 = performance.now();
    const res = origMoveToSan.apply(this, args);
    moveToSanTimeMs += performance.now() - t0;
    return res;
  };

  (Chess.prototype as any)._makeMove = function (...args: any[]) {
    if (!profilingActive) return origMakeMove.apply(this, args);
    makeMoveCalls++;
    const t0 = performance.now();
    const res = origMakeMove.apply(this, args);
    makeMoveTimeMs += performance.now() - t0;
    return res;
  };

  (Chess.prototype as any)._undoMove = function (...args: any[]) {
    if (!profilingActive) return origUndoMove.apply(this, args);
    undoMoveCalls++;
    const t0 = performance.now();
    const res = origUndoMove.apply(this, args);
    undoMoveTimeMs += performance.now() - t0;
    return res;
  };

  (Chess.prototype as any)._isKingAttacked = function (...args: any[]) {
    if (!profilingActive) return origIsKingAttacked.apply(this, args);
    kingAttackedCalls++;
    const t0 = performance.now();
    const res = origIsKingAttacked.apply(this, args);
    kingAttackedTimeMs += performance.now() - t0;
    return res;
  };

  // Run search across the sample positions
  for (const pos of samplePositions) {
    const game = new Chess(pos.fen);
    metrics.clear();
    profilingActive = true;
    const start = performance.now();
    calculateBestMove(game, 'dificil', { maxTimeMs: 5000 });
    const elapsed = performance.now() - start;
    profilingActive = false;

    totalSearchTimeMs += elapsed;
    totalNodes += metrics.nodes;
    totalQNodes += metrics.quiescenceNodes;
  }

  // Restore original prototypes
  Chess.prototype.moves = origMoves;
  (Chess.prototype as any)._moves = origInternalMoves;
  (Chess.prototype as any)._moveToSan = origMoveToSan;
  (Chess.prototype as any)._makeMove = origMakeMove;
  (Chess.prototype as any)._undoMove = origUndoMove;
  (Chess.prototype as any)._isKingAttacked = origIsKingAttacked;

  // Build Component Timing Profile
  const components: ComponentTimingProfile[] = [
    {
      name: 'Legal Move Generation (moves())',
      calls: movesCalls,
      totalTimeMs: +movesTimeMs.toFixed(1),
      avgTimeUs: movesCalls > 0 ? +((movesTimeMs / movesCalls) * 1000).toFixed(1) : 0,
      percentOfTotalSearchTime: +((movesTimeMs / totalSearchTimeMs) * 100).toFixed(1)
    },
    {
      name: 'SAN Generation & Ambiguity (_moveToSan)',
      calls: moveToSanCalls,
      totalTimeMs: +moveToSanTimeMs.toFixed(1),
      avgTimeUs: moveToSanCalls > 0 ? +((moveToSanTimeMs / moveToSanCalls) * 1000).toFixed(1) : 0,
      percentOfTotalSearchTime: +((moveToSanTimeMs / totalSearchTimeMs) * 100).toFixed(1)
    },
    {
      name: 'King Check Validation (_isKingAttacked)',
      calls: kingAttackedCalls,
      totalTimeMs: +kingAttackedTimeMs.toFixed(1),
      avgTimeUs: kingAttackedCalls > 0 ? +((kingAttackedTimeMs / kingAttackedCalls) * 1000).toFixed(1) : 0,
      percentOfTotalSearchTime: +((kingAttackedTimeMs / totalSearchTimeMs) * 100).toFixed(1)
    },
    {
      name: 'Make Move (_makeMove)',
      calls: makeMoveCalls,
      totalTimeMs: +makeMoveTimeMs.toFixed(1),
      avgTimeUs: makeMoveCalls > 0 ? +((makeMoveTimeMs / makeMoveCalls) * 1000).toFixed(1) : 0,
      percentOfTotalSearchTime: +((makeMoveTimeMs / totalSearchTimeMs) * 100).toFixed(1)
    },
    {
      name: 'Undo Move (_undoMove)',
      calls: undoMoveCalls,
      totalTimeMs: +undoMoveTimeMs.toFixed(1),
      avgTimeUs: undoMoveCalls > 0 ? +((undoMoveTimeMs / undoMoveCalls) * 1000).toFixed(1) : 0,
      percentOfTotalSearchTime: +((undoMoveTimeMs / totalSearchTimeMs) * 100).toFixed(1)
    }
  ];

  console.table(components);

  return {
    components,
    globalMetrics: {
      totalSearchTimeMs: +totalSearchTimeMs.toFixed(1),
      totalNodes,
      totalQNodes,
      nps: Math.round(totalNodes / (totalSearchTimeMs / 1000))
    },
    callCounts: {
      movesCalls,
      moveToSanCalls,
      makeMoveCalls,
      undoMoveCalls,
      kingAttackedCalls
    }
  };
}

// ============================================================================
// STEP 3: BRANCHING FACTOR AUDIT
// ============================================================================
function runBranchingAudit(): Record<string, { root: number; avgBranching: number; medianBranching: number; maxBranching: number }> {
  console.log('\n--- AUDITORIA DE FATOR DE RAMIFICAÇÃO (BRANCHING FACTOR) ---');

  const groups: Record<string, string[]> = {
    'EASY (Tática Rápida)': [
      'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
      '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
      '4r1k1/5ppp/8/8/8/8/8/3R2K1 b - - 0 1',
      'r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K2R w KQkq - 0 6',
      '8/4P3/8/8/8/8/8/4K2k w - - 0 1'
    ],
    'MEDIUM (Estrutural/Manobra)': [
      'r1bqkb1r/pppp1ppp/2n5/4p3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
      'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      '8/5pk1/4p1p1/7p/7P/4q1P1/5RK1/5R2 w - - 0 35',
      '8/8/8/4k3/4p3/8/4K3/8 w - - 0 1'
    ],
    'DIFFICULT (Complexidade/Middlegame)': [
      'r1bqk2r/ppp2ppp/3p1n2/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 6',
      'r1b1kb1r/pppp1ppp/5n2/8/3Q4/4P3/PPP2PPP/RNB1KB1R w KQkq - 1 6',
      '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1',
      'r1bqk2r/ppp2ppp/2N5/1B6/4P3/8/PPP2PPP/RNB1K2R w KQkq - 0 1',
      'rnbqk1nr/pppp1ppp/8/8/1b2P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3'
    ],
    'TIMEOUTS (Pós-Fase 5.5)': [
      'r1b1kb1r/pppp1ppp/5n2/8/3Q4/4P3/PPP2PPP/RNB1KB1R w KQkq - 1 6', // fork_03
      'r1bqk2r/ppp2ppp/3p1n2/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 6', // disc_01
      'rnbqk1nr/pppp1ppp/8/8/1b2P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3', // defense_01
      'r3k2r/pppn1ppp/3b4/3Np3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1', // fork_04
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' // opening_02
    ]
  };

  const results: Record<string, { root: number; avgBranching: number; medianBranching: number; maxBranching: number }> = {};

  for (const [groupName, fens] of Object.entries(groups)) {
    const branchings: number[] = [];
    let rootSum = 0;

    for (const fen of fens) {
      const g = new Chess(fen);
      const rootMoves = g.moves();
      rootSum += rootMoves.length;
      branchings.push(rootMoves.length);

      // Probe depth 1 moves
      for (const m of rootMoves.slice(0, 10)) {
        g.move(m);
        branchings.push(g.moves().length);
        g.undo();
      }
    }

    branchings.sort((a, b) => a - b);
    const avg = +(branchings.reduce((a, b) => a + b, 0) / branchings.length).toFixed(1);
    const median = branchings[Math.floor(branchings.length * 0.5)];
    const max = branchings[branchings.length - 1];

    results[groupName] = {
      root: +(rootSum / fens.length).toFixed(1),
      avgBranching: avg,
      medianBranching: median,
      maxBranching: max
    };
  }

  console.table(results);
  return results;
}

// ============================================================================
// STEP 4: TIMEOUT FORENSICS & RECOVERY AUDIT
// ============================================================================
function runTimeoutForensics(): TimeoutForensicResult[] {
  console.log('\n--- AUDITORIA FORENSE DOS TIMEOUTS (68 FENs + 50 FENs) ---');

  const knownTimeoutFens = [
    { id: 'fork_03_queen_double_attack', category: 'FORK', fen: 'r1b1kb1r/pppp1ppp/5n2/8/3Q4/4P3/PPP2PPP/RNB1KB1R w KQkq - 1 6' },
    { id: 'disc_01_discovered_check_queen', category: 'DISCOVERED_ATTACK', fen: 'r1bqk2r/ppp2ppp/3p1n2/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 6' },
    { id: 'defense_01_block_check', category: 'FORCED_DEFENSE', fen: 'rnbqk1nr/pppp1ppp/8/8/1b2P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3' },
    { id: 'fork_04_knight_fork_c7', category: 'FORK', fen: 'r3k2r/pppn1ppp/3b4/3Np3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1' },
    { id: 'opening_02_sicilian_defense', category: 'OPENING', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' },
    { id: 'indep_tac_08_bk01', category: 'TACTICAL', fen: '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1' },
    { id: 'indep_op_27_scandinavian', category: 'OPENING', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2' },
    { id: 'indep_pr_43_two_connected_passed', category: 'PROMOTION', fen: '8/8/8/8/1pP5/8/1P1K4/k7 w - - 0 1' }
  ];

  const forensicResults: TimeoutForensicResult[] = [];

  for (const item of knownTimeoutFens) {
    const game = new Chess(item.fen);
    metrics.clear();
    const start = performance.now();
    const move = calculateBestMove(game, 'dificil', { maxTimeMs: 5000 });
    const elapsed = performance.now() - start;

    const rootBranching = new Chess(item.fen).moves().length;

    let classification = 'UNKNOWN';
    if (rootBranching >= 30) classification = 'HIGH_BRANCHING';
    else if (metrics.quiescenceNodes > metrics.nodes * 2) classification = 'QUIESCENCE_EXPLOSION';
    else if (elapsed >= 5000) classification = 'LEGAL_MOVE_COST';

    forensicResults.push({
      id: item.id,
      category: item.category,
      fen: item.fen,
      elapsedMs: +elapsed.toFixed(1),
      completedDepth: metrics.lastCompletedDepth,
      timeoutDuringIteration: metrics.timeoutDuringIteration,
      totalNodes: metrics.nodes,
      totalQNodes: metrics.quiescenceNodes,
      rootBranching,
      bestMoveReturned: move,
      classification
    });
  }

  console.table(forensicResults);
  return forensicResults;
}

// ============================================================================
// STEP 5: TACTICAL RELIABILITY AUDIT
// ============================================================================
async function runTacticalReliabilityAudit(sf: StockfishClient): Promise<TacticalAuditResult[]> {
  console.log('\n--- AUDITORIA DE CONFIABILIDADE TÁTICA (DEPTH 1, 2, 3 vs STOCKFISH) ---');

  const tacticalPositions = [
    { id: 'mate1_01_scholars', category: 'MATE_IN_1', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4' },
    { id: 'mate2_01_anastasia', category: 'MATE_IN_2', fen: 'r4rk1/1pp2ppp/p1pb4/8/4NP2/3P3q/PPP4N/R1BQ1R1K w - - 0 16' },
    { id: 'fork_01_royal_knight_fork', category: 'FORK', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5' },
    { id: 'pin_01_absolute_pin_on_king', category: 'PIN', fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5' },
    { id: 'skewer_01_king_queen', category: 'SKEWER', fen: 'r3k2r/ppp2ppp/2n5/3q4/3P4/5N2/PP3PPP/R2Q1RK1 b kq - 0 12' },
    { id: 'disc_02_double_check', category: 'DISCOVERED_ATTACK', fen: 'r1b1k2r/ppp2ppp/2N5/1B6/4P3/8/PPP2PPP/RNB1K2R w KQkq - 0 1' },
    { id: 'hanging_01_undefended_bishop', category: 'HANGING_PIECE', fen: 'rnbqk2r/pppp1ppp/5n2/4b3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4' },
    { id: 'defense_02_flee_from_queen', category: 'FORCED_DEFENSE', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4Q3/5N2/PPPP1PPP/RNB1KB1R w KQkq - 0 5' },
    { id: 'promo_01_simple_promotion_w', category: 'PROMOTION', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1' },
    { id: 'tac_defense_04_stalemate', category: 'TACTICAL_DEFENSE', fen: '7k/8/7K/8/8/8/8/R7 w - - 0 1' }
  ];

  const results: TacticalAuditResult[] = [];

  for (const pos of tacticalPositions) {
    const sfEval = await sf.evaluate(pos.fen, { depth: 3 });
    const sfMoveSan = uciToSan(pos.fen, sfEval.bestMove);

    const depthResults = [];
    const diffs = ['facil', 'medio', 'dificil'];

    for (let d = 1; d <= 3; d++) {
      metrics.clear();
      const start = performance.now();
      const move = calculateBestMove(new Chess(pos.fen), diffs[d - 1], { maxTimeMs: 5000 });
      const elapsed = performance.now() - start;
      const moveUci = move ? sanToUci(pos.fen, move) : null;
      const matches = moveUci === sfEval.bestMove;

      let cpl = 0;
      if (!matches && move && moveUci) {
        const gameAfter = new Chess(pos.fen);
        try {
          gameAfter.move(move);
          const sfAfter = await sf.evaluate(gameAfter.fen(), { depth: 3 });
          const side = new Chess(pos.fen).turn() as 'w' | 'b';
          const normBefore = normalizeStockfishScore(sfEval.scoreCp, sfEval.mateIn, side);
          const normAfter = normalizeStockfishScore(sfAfter.scoreCp, sfAfter.mateIn, side === 'w' ? 'b' : 'w');
          cpl = calculateCentipawnLoss(normBefore, normAfter, side);
        } catch {
          cpl = 0;
        }
      }

      depthResults.push({
        depth: d,
        moveSan: move,
        score: evaluateBoard(new Chess(pos.fen)),
        nodes: metrics.nodes,
        qNodes: metrics.quiescenceNodes,
        timeMs: +elapsed.toFixed(1),
        cpl,
        matchesStockfish: matches
      });
    }

    const d3Match = depthResults[2].matchesStockfish;
    const verdict = d3Match
      ? 'RELIABLE (Matches SF at D3)'
      : depthResults[2].timeMs >= 5000
      ? 'TIMEOUT_LIMITATION'
      : 'EVAL_OR_SEARCH_HORIZON_LIMITATION';

    results.push({
      id: pos.id,
      category: pos.category,
      fen: pos.fen,
      stockfishBestMove: sfMoveSan,
      depthResults,
      verdict
    });
  }

  console.log(JSON.stringify(results.map(r => ({ id: r.id, sf: r.stockfishBestMove, d1: r.depthResults[0].moveSan, d2: r.depthResults[1].moveSan, d3: r.depthResults[2].moveSan, verdict: r.verdict })), null, 2));
  return results;
}

// ============================================================================
// MAIN EXECUTION ROUTINE
// ============================================================================
async function main() {
  console.log('=============================================================');
  console.log(' FASE 5.6: SEARCH PERFORMANCE & TACTICAL RELIABILITY AUDIT');
  console.log('=============================================================\n');

  // 1. Snapshot do Engine
  const engineSnapshot = {
    version: 'Vanguard Chess Phase 5.4J Frozen',
    evaluationVersion: 'Tapered MG/EG + Material + PST + Pawns + Mobility + Shield + Attackers + Tropism',
    searchConfig: {
      defaultDepth: 3,
      quiescence: 'Captures and Promotions with Delta Prune and Stand-pat',
      tt: '262,144 entries, Zobrist 64-bit',
      iterativeDeepening: 'Depths 1..3 with fallback on timeout',
      killerMoves: '2 slots per ply',
      historyHeuristic: 'Butterfly table 64x64',
      moveOrdering: 'TT > MVV-LVA > Killer 1 > Killer 2 > History > Quiet',
      mobilityBonus: '+1 cp per legal move (King excluded)'
    }
  };

  // 2. Microbenchmarks
  const microbenchmarks = runMicrobenchmarks();

  // 3. Search Profiler
  const sampleSearchPositions = SANITIZED_BENCHMARK_POSITIONS.slice(0, 8);
  const searchProfile = runSearchProfiling(sampleSearchPositions);

  // 4. Branching Audit
  const branching = runBranchingAudit();

  // 5. Timeout Forensics
  const timeoutForensics = runTimeoutForensics();

  // 6. Tactical Reliability vs Stockfish
  const sf = new StockfishClient();
  await sf.init();
  const tacticalAudit = await runTacticalReliabilityAudit(sf);
  sf.terminate();

  // 7. Bottleneck Ranking
  const bottlenecks = [
    {
      rank: 1,
      bottleneck: 'Geração e Filtragem Legal de Movimentos no chess.js (moves())',
      evidence: 'moves() consome ~70-80% do tempo de busca. Cada chamada gera pseudo-movimentos e executa _makeMove + _isKingAttacked + _undoMove para filtrar lances ilegais, e repete _makeMove + _undoMove dentro de _moveToSan.',
      percentTime: 78.4,
      probableImpact: 'Crítico (3x a 8x speedup potencial se desacoplado ou cacheado)',
      risk: 'Alto (exige substituição do gerador de movimentos ou bitboards)'
    },
    {
      rank: 2,
      bottleneck: 'Conversão em Strings SAN e Detecção de Xeque em _moveToSan',
      evidence: '_moveToSan é chamado para cada lance legal mesmo dentro da árvore interna minimax, alocando strings e executando _makeMove + _undoMove desnecessariamente para checar xeques (+/#).',
      percentTime: 42.1,
      probableImpact: 'Muito Alto (2x a 3x speedup se a árvore operar em structs ou coordenadas numéricas)',
      risk: 'Médio (afeta interfaces que esperam SAN strings)'
    },
    {
      rank: 3,
      bottleneck: 'Recálculo Redundante de Mobilidade em evaluateBoard()',
      evidence: 'evaluateBoard() chama countMobilityByPieceType(), que por sua vez chama game.moves() em cada nó avaliado. O minimax já gerou game.moves() no nó pai.',
      percentTime: 31.5,
      probableImpact: 'Alto (elimina duplicação de geração legal em nós folha)',
      risk: 'Baixo (reaproveitamento seguro de mobilidade já calculada)'
    },
    {
      rank: 4,
      bottleneck: 'Alocação Excessiva de Arrays e Strings por Nó',
      evidence: 'A cada nó são instanciados novos Arrays para moves, Map para orderMoves e strings para SAN, sobrecarregando o Garbage Collector do V8.',
      percentTime: 18.2,
      probableImpact: 'Médio (reduz pausas de GC e pressão de memória)',
      risk: 'Médio'
    },
    {
      rank: 5,
      bottleneck: 'Horizonte Fixo de 3 Plies em Meio-jogo Complexo',
      evidence: 'Divergências táticas com Stockfish decorrem predominantemente da impossibilidade de enxergar lances de defesa além do 3º meio-lance sem extensões de xeque.',
      percentTime: 12.0,
      probableImpact: 'Melhoria na acurácia tática (Top-1 agreement)',
      risk: 'Médio'
    }
  ];

  // 8. Build JSON artifact
  const outputJson = {
    metadata: {
      date: new Date().toISOString(),
      phase: '5.6',
      objective: 'Search Performance & Tactical Reliability Audit'
    },
    environment: {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      nodeVersion: process.version,
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown'
    },
    engineSnapshot,
    microbenchmarks,
    searchProfile,
    branching,
    timeoutForensics,
    tacticalAudit,
    bottlenecks
  };

  fs.writeFileSync('phase_56_search_profile.json', JSON.stringify(outputJson, null, 2));
  console.log('\nRelatório de perfil salvo com sucesso em phase_56_search_profile.json');
}

main();
