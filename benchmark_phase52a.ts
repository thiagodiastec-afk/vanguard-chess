/**
 * FASE 5.2A — VANGUARD ENGINE BENCHMARK RUNNER
 *
 * Standalone benchmark that:
 * 1. Runs all 68 FEN positions with timing via performance.now()
 * 2. Reports per-category pass rates
 * 3. Reports timing statistics (median, P95, max, total)
 * 4. Runs determinism test (10 runs)
 * 5. Runs perspective test
 * 6. Runs material monotonicity test
 * 7. Outputs JSON for comparison across phases
 */

import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, minimax, orderMoves } from './src/lib/engine.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import * as fs from 'fs';

// ============================================================
// TYPES
// ============================================================

interface PositionResult {
  id: string;
  category: string;
  fen: string;
  sideToMove: string;
  engineMove: string | null;
  expectedMove?: string;
  alternativeMoves?: string[];
  isTop1Match: boolean;
  isCriticalDisagreement: boolean;
  divergenceReason?: string;
  score: number;
  expectedScoreSign?: string;
  isSignMatch: boolean;
  timeMs: number;
}

interface CategorySummary {
  category: string;
  total: number;
  passed: number;
  failed: number;
  passRate: string;
}

interface TimingStats {
  medianMs: number;
  p95Ms: number;
  maxMs: number;
  minMs: number;
  totalMs: number;
  count: number;
}

interface BenchmarkOutput {
  label: string;
  timestamp: string;
  timeUnit: string;
  totalPositions: number;
  passed: number;
  failed: number;
  passRate: string;
  top1Matches: number;
  top1Agreement: string;
  criticalDisagreements: number;
  criticalDisagreementDetails: string[];
  timing: TimingStats;
  categories: CategorySummary[];
  positionResults: PositionResult[];
  determinism: {
    runs: number;
    allSameMove: boolean;
    allSameScore: boolean;
    moves: string[];
    scores: number[];
  };
  perspective: {
    tests: { name: string; whiteEval: number; blackEval: number; consistent: boolean }[];
    allConsistent: boolean;
  };
  materialMonotonicity: {
    tests: { description: string; score: number }[];
    isMonotonic: boolean;
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function computeTimingStats(times: number[]): TimingStats {
  const sorted = [...times].sort((a, b) => a - b);
  const count = sorted.length;
  const totalMs = Number(sorted.reduce((s, v) => s + v, 0).toFixed(2));
  const mid = Math.floor(count / 2);
  const medianMs = count % 2 !== 0
    ? Number(sorted[mid].toFixed(2))
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
  const p95Ms = Number(sorted[p95Index].toFixed(2));
  const maxMs = Number(sorted[count - 1].toFixed(2));
  const minMs = Number(sorted[0].toFixed(2));
  return { medianMs, p95Ms, maxMs, minMs, totalMs, count };
}

function evaluatePosition(pos: typeof SANITIZED_BENCHMARK_POSITIONS[0]): PositionResult {
  const game = new Chess(pos.fen);

  const start = performance.now();
  const engineMove = calculateBestMove(game, 'dificil');
  const elapsed = performance.now() - start;

  // Score is the static eval of the ORIGINAL position (not after the move)
  const score = evaluateBoard(game);

  let isTop1Match = false;
  let isCriticalDisagreement = false;
  let divergenceReason: string | undefined;

  if (pos.expectedBestMove || pos.alternativeBestMoves) {
    const allowedMoves = [
      ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
      ...(pos.alternativeBestMoves || [])
    ];

    const cleanEngine = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
    const matched = allowedMoves.some(m => {
      const cleanAllowed = m.replace(/[+#x]/g, '');
      return m === engineMove || cleanAllowed === cleanEngine;
    });

    // Special check for MATE_IN_1: does the engine move actually deliver checkmate?
    if (!matched && pos.category === 'MATE_IN_1' && engineMove) {
      const testGame = new Chess(pos.fen);
      try {
        testGame.move(engineMove);
        if (testGame.isCheckmate()) {
          isTop1Match = true;
        } else {
          isCriticalDisagreement = true;
          divergenceReason = `Expected mate move (${pos.expectedBestMove}), engine played ${engineMove} (not checkmate)`;
        }
      } catch {
        isCriticalDisagreement = true;
        divergenceReason = `Engine suggested invalid move ${engineMove}`;
      }
    } else {
      isTop1Match = matched;
      if (!matched && (pos.category === 'MATE_IN_1' || pos.category === 'MATE_IN_2')) {
        isCriticalDisagreement = true;
        divergenceReason = `Missed forced mate. Expected ${pos.expectedBestMove || allowedMoves.join('/')}, got ${engineMove}`;
      }
    }
  } else {
    // No fixed expected move: pass if a legal move was produced
    isTop1Match = engineMove !== null;
  }

  // Sign match
  let isSignMatch = true;
  if (pos.expectedScoreSign === 'positive') {
    isSignMatch = score > 50;
  } else if (pos.expectedScoreSign === 'negative') {
    isSignMatch = score < -50;
  } else if (pos.expectedScoreSign === 'neutral') {
    isSignMatch = Math.abs(score) <= 200;
  }

  return {
    id: pos.id,
    category: pos.category,
    fen: pos.fen,
    sideToMove: pos.sideToMove,
    engineMove,
    expectedMove: pos.expectedBestMove,
    alternativeMoves: pos.alternativeBestMoves,
    isTop1Match,
    isCriticalDisagreement,
    divergenceReason,
    score,
    expectedScoreSign: pos.expectedScoreSign,
    isSignMatch,
    timeMs: Number(elapsed.toFixed(2))
  };
}

// ============================================================
// MAIN BENCHMARK
// ============================================================

function runBenchmark(label: string): BenchmarkOutput {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` BENCHMARK: ${label}`);
  console.log(`${'='.repeat(60)}\n`);

  // --- TIME UNIT VALIDATION ---
  console.log('--- TIME UNIT VALIDATION ---');
  const validationFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const timingRuns: number[] = [];
  for (let i = 0; i < 5; i++) {
    const g = new Chess(validationFen);
    const s = performance.now();
    calculateBestMove(g, 'dificil');
    const e = performance.now();
    timingRuns.push(e - s);
  }
  console.log('TIME UNIT: milliseconds (performance.now())');
  console.log(`Validation runs (5x Scholar's Mate at depth 3):`);
  timingRuns.forEach((t, i) => console.log(`  Run ${i + 1}: ${t.toFixed(2)} ms`));
  console.log(`  Mean: ${(timingRuns.reduce((s, v) => s + v, 0) / timingRuns.length).toFixed(2)} ms`);
  console.log('');

  // --- 68 FEN BENCHMARK ---
  const positions = SANITIZED_BENCHMARK_POSITIONS;
  console.log(`Running ${positions.length} positions...`);

  const results: PositionResult[] = [];
  for (const pos of positions) {
    const r = evaluatePosition(pos);
    results.push(r);
  }

  // Category summaries
  const catMap = new Map<string, PositionResult[]>();
  for (const r of results) {
    if (!catMap.has(r.category)) catMap.set(r.category, []);
    catMap.get(r.category)!.push(r);
  }

  const categories: CategorySummary[] = [];
  const categoryOrder = [
    'MATE_IN_1', 'MATE_IN_2', 'TACTICAL_CAPTURE', 'FORK', 'PIN', 'SKEWER',
    'DISCOVERED_ATTACK', 'HANGING_PIECE', 'FORCED_DEFENSE', 'PROMOTION',
    'MATERIAL_ADVANTAGE', 'MATERIAL_DISADVANTAGE', 'QUIET_POSITION',
    'ENDGAME', 'OPENING', 'TACTICAL_DEFENSE'
  ];

  for (const cat of categoryOrder) {
    const list = catMap.get(cat) || [];
    const passed = list.filter(r => r.isTop1Match && r.isSignMatch).length;
    categories.push({
      category: cat,
      total: list.length,
      passed,
      failed: list.length - passed,
      passRate: list.length > 0 ? ((passed / list.length) * 100).toFixed(1) + '%' : 'N/A'
    });
  }

  // Overall stats
  const totalPassed = results.filter(r => r.isTop1Match && r.isSignMatch).length;
  const top1Matches = results.filter(r => r.isTop1Match).length;
  const critDisagreements = results.filter(r => r.isCriticalDisagreement);
  const times = results.map(r => r.timeMs);
  const timing = computeTimingStats(times);

  // Print category table
  console.log('\n--- CATEGORY RESULTS ---');
  console.log(`${'Category'.padEnd(25)} ${'Total'.padStart(6)} ${'Pass'.padStart(6)} ${'Fail'.padStart(6)} ${'Rate'.padStart(8)}`);
  for (const c of categories) {
    console.log(`${c.category.padEnd(25)} ${String(c.total).padStart(6)} ${String(c.passed).padStart(6)} ${String(c.failed).padStart(6)} ${c.passRate.padStart(8)}`);
  }

  console.log(`\nOverall: ${totalPassed}/${results.length} (${((totalPassed / results.length) * 100).toFixed(2)}%)`);
  console.log(`Top-1 Agreement: ${top1Matches}/${results.length} (${((top1Matches / results.length) * 100).toFixed(2)}%)`);
  console.log(`Critical Disagreements: ${critDisagreements.length}`);
  if (critDisagreements.length > 0) {
    for (const cd of critDisagreements) {
      console.log(`  - [${cd.id}] ${cd.divergenceReason}`);
    }
  }

  console.log(`\n--- TIMING (ms) ---`);
  console.log(`Median: ${timing.medianMs} ms`);
  console.log(`P95: ${timing.p95Ms} ms`);
  console.log(`Max: ${timing.maxMs} ms`);
  console.log(`Min: ${timing.minMs} ms`);
  console.log(`Total: ${timing.totalMs} ms`);

  // --- DETERMINISM TEST ---
  console.log('\n--- DETERMINISM TEST (10 runs) ---');
  const detFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const detMoves: string[] = [];
  const detScores: number[] = [];
  for (let i = 0; i < 10; i++) {
    const g = new Chess(detFen);
    const m = calculateBestMove(g, 'dificil') || '';
    const s = evaluateBoard(new Chess(detFen));
    detMoves.push(m);
    detScores.push(s);
  }
  const allSameMove = detMoves.every(m => m === detMoves[0]);
  const allSameScore = detScores.every(s => s === detScores[0]);
  console.log(`Moves: [${[...new Set(detMoves)].join(', ')}] — ${allSameMove ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'}`);
  console.log(`Scores: [${[...new Set(detScores)].join(', ')}] — ${allSameScore ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'}`);

  // --- PERSPECTIVE TEST ---
  console.log('\n--- PERSPECTIVE TEST ---');
  const perspectivePairs = [
    {
      name: 'Queen advantage (White vs Black mirror)',
      whiteFen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      blackFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1'
    },
    {
      name: 'Rook advantage (White vs Black mirror)',
      whiteFen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      blackFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR b KQkq - 0 1'
    },
    {
      name: 'Pawn on 7th (White vs Black mirror)',
      whiteFen: '8/4P3/8/8/8/8/8/k3K3 w - - 0 1',
      blackFen: 'k3K3/8/8/8/8/8/4p3/8 b - - 0 1'
    }
  ];
  const perspectiveTests: { name: string; whiteEval: number; blackEval: number; consistent: boolean }[] = [];
  for (const pair of perspectivePairs) {
    const evalW = evaluateBoard(new Chess(pair.whiteFen));
    const evalB = evaluateBoard(new Chess(pair.blackFen));
    const consistent = (evalW > 0 && evalB < 0) || (evalW === 0 && evalB === 0);
    perspectiveTests.push({ name: pair.name, whiteEval: evalW, blackEval: evalB, consistent });
    console.log(`  ${pair.name}: W=${evalW}, B=${evalB} → ${consistent ? 'CONSISTENT' : 'INCONSISTENT'}`);
  }

  // --- MATERIAL MONOTONICITY TEST ---
  console.log('\n--- MATERIAL MONOTONICITY TEST ---');
  const materialFens = [
    { description: '+Queen (+900)', fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { description: '+Rook (+500)', fen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { description: '+Bishop (+330)', fen: 'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { description: 'Equal (0)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { description: '-Knight (-320)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1' },
    { description: '-Rook (-500)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w KQkq - 0 1' },
    { description: '-Queen (-900)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1' },
  ];
  const materialTests: { description: string; score: number }[] = [];
  for (const m of materialFens) {
    const s = evaluateBoard(new Chess(m.fen));
    materialTests.push({ description: m.description, score: s });
    console.log(`  ${m.description}: ${s}`);
  }
  // Check monotonicity: scores should be strictly decreasing
  let isMonotonic = true;
  for (let i = 1; i < materialTests.length; i++) {
    if (materialTests[i].score >= materialTests[i - 1].score) {
      isMonotonic = false;
      break;
    }
  }
  console.log(`  Monotonicity: ${isMonotonic ? 'PASS' : 'FAIL'}`);

  // --- FAILED POSITIONS DETAIL ---
  const failed = results.filter(r => !r.isTop1Match || !r.isSignMatch);
  if (failed.length > 0) {
    console.log(`\n--- FAILED POSITIONS (${failed.length}) ---`);
    for (const f of failed) {
      const reasons = [];
      if (!f.isTop1Match) reasons.push(`move mismatch: expected=${f.expectedMove || f.alternativeMoves?.join('/')}, got=${f.engineMove}`);
      if (!f.isSignMatch) reasons.push(`sign mismatch: expected=${f.expectedScoreSign}, score=${f.score}`);
      console.log(`  [${f.id}] ${reasons.join('; ')}`);
    }
  }

  const output: BenchmarkOutput = {
    label,
    timestamp: new Date().toISOString(),
    timeUnit: 'milliseconds',
    totalPositions: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    passRate: ((totalPassed / results.length) * 100).toFixed(2) + '%',
    top1Matches,
    top1Agreement: ((top1Matches / results.length) * 100).toFixed(2) + '%',
    criticalDisagreements: critDisagreements.length,
    criticalDisagreementDetails: critDisagreements.map(cd => `[${cd.id}] ${cd.divergenceReason}`),
    timing,
    categories,
    positionResults: results,
    determinism: {
      runs: 10,
      allSameMove,
      allSameScore,
      moves: detMoves,
      scores: detScores
    },
    perspective: {
      tests: perspectiveTests,
      allConsistent: perspectiveTests.every(t => t.consistent)
    },
    materialMonotonicity: {
      tests: materialTests,
      isMonotonic
    }
  };

  return output;
}

// ============================================================
// EXECUTION
// ============================================================

const label = process.argv[2] || 'BASELINE';
const outputFile = process.argv[3] || `benchmark_${label.toLowerCase()}.json`;

const result = runBenchmark(label);

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
console.log(`\nResults saved to: ${outputFile}`);
