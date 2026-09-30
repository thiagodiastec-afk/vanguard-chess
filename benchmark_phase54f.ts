/**
 * FASE 5.4F — Complete Mobility Benchmark & Evaluation Audit Suite:
 * - Microbenchmark: evaluateBoard() throughput and latency with/without Mobility
 * - Full 68 FENs Benchmark: Baseline (bonus=0) vs +Mobility (bonus=2)
 * - Move decision comparison and classification (EXPECTED / UNEXPECTED / UNCLEAR)
 * - Determinism Audit: 10 runs on 4 distinct position types
 * - State Isolation Audit: cyclic orderings A->B->C, B->C->A, C->A->B
 */
import { Chess } from 'chess.js';
import { writeFileSync } from 'fs';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, mobilityConfig } from './src/lib/engine.ts';

const MAX_TIME_MS = 5000;

function computeStats(arr: number[]) {
  if (arr.length === 0) return { median: 0, p95: 0, max: 0, total: 0, mean: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const median = n % 2 !== 0 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
  const max = sorted[n - 1];
  const total = sorted.reduce((s, v) => s + v, 0);
  const mean = total / n;
  return { median, p95, max, total, mean };
}

type Verdict = 'CORRECT' | 'INCORRECT' | 'TIMEOUT';

interface PositionResult {
  id: string;
  category: string;
  verdict: Verdict;
  engineMove: string | null;
  score: number;
  elapsed: number;
  nodes: number;
  qNodes: number;
  completedDepth: number;
  fen: string;
}

interface RunSummary {
  label: string;
  bonusPerMove: number;
  total: number;
  correct: number;
  incorrect: number;
  timeout: number;
  completed: number;
  accuracyAmongCompleted: number;
  completionRate: number;
  overallResolvedRate: number;
  timeStats: ReturnType<typeof computeStats>;
  nodeStats: ReturnType<typeof computeStats>;
  qNodeStats: ReturnType<typeof computeStats>;
  results: PositionResult[];
}

function runBenchmark(label: string, bonusPerMove: number): RunSummary {
  console.log(`\n========================================================`);
  console.log(` RUNNING: ${label} (bonusPerMove = ${bonusPerMove} cp)`);
  console.log(`========================================================`);

  mobilityConfig.bonusPerMove = bonusPerMove;

  const results: PositionResult[] = [];
  const times: number[] = [];
  const nodesArr: number[] = [];
  const qNodesArr: number[] = [];

  let correct = 0;
  let incorrect = 0;
  let timeout = 0;

  for (const pos of SANITIZED_BENCHMARK_POSITIONS) {
    const game = new Chess(pos.fen);
    metrics.clear();

    const start = performance.now();
    let move: string | null = null;
    let timedOut = false;

    try {
      move = calculateBestMove(game, 'dificil', { maxTimeMs: MAX_TIME_MS });
      timedOut = metrics.timeoutDuringIteration;
    } catch (e: any) {
      if (e.message === 'TIMEOUT') timedOut = true;
      else throw e;
    }

    const elapsed = performance.now() - start;
    times.push(elapsed);
    nodesArr.push(metrics.nodes);
    qNodesArr.push(metrics.quiescenceNodes);

    if (elapsed >= MAX_TIME_MS || timedOut) {
      timeout++;
      results.push({
        id: pos.id,
        category: pos.category,
        verdict: 'TIMEOUT',
        engineMove: move,
        score: evaluateBoard(game),
        elapsed,
        nodes: metrics.nodes,
        qNodes: metrics.quiescenceNodes,
        completedDepth: metrics.lastCompletedDepth,
        fen: pos.fen
      });
      continue;
    }

    const score = evaluateBoard(game);

    // Correctness check
    const allowed = [
      ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
      ...(pos.alternativeBestMoves || [])
    ];

    let passed = false;
    if (allowed.length > 0) {
      const cleanEng = move ? move.replace(/[+#x]/g, '') : '';
      const matched = allowed.some(m => m === move || m.replace(/[+#x]/g, '') === cleanEng);
      if (!matched && pos.category === 'MATE_IN_1' && move) {
        const tg = new Chess(pos.fen);
        try { tg.move(move); passed = tg.isCheckmate(); } catch {}
      } else {
        passed = matched;
      }
    } else {
      passed = move !== null;
    }

    let signOk = true;
    if (pos.expectedScoreSign === 'positive') signOk = score > 50;
    else if (pos.expectedScoreSign === 'negative') signOk = score < -50;
    else if (pos.expectedScoreSign === 'neutral') signOk = Math.abs(score) <= 200;

    const verdict: Verdict = passed && signOk ? 'CORRECT' : 'INCORRECT';
    if (verdict === 'CORRECT') correct++;
    else incorrect++;

    results.push({
      id: pos.id,
      category: pos.category,
      verdict,
      engineMove: move,
      score,
      elapsed,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes,
      completedDepth: metrics.lastCompletedDepth,
      fen: pos.fen
    });
  }

  const completed = correct + incorrect;
  const timeStats = computeStats(times);
  const nodeStats = computeStats(nodesArr);
  const qNodeStats = computeStats(qNodesArr);

  const accuracyAmongCompleted = completed > 0 ? Number(((correct / completed) * 100).toFixed(2)) : 0;
  const completionRate = Number(((completed / results.length) * 100).toFixed(2));
  const overallResolvedRate = Number(((correct / results.length) * 100).toFixed(2));

  console.log(`Results: Correct=${correct} | Incorrect=${incorrect} | Timeout=${timeout}`);
  console.log(`Completed: ${completed}/${results.length} (${completionRate}%) | Accuracy: ${accuracyAmongCompleted}%`);
  console.log(`Time Median: ${timeStats.median.toFixed(1)}ms | P95: ${timeStats.p95.toFixed(1)}ms`);
  console.log(`Nodes Median: ${nodeStats.median} | QNodes Median: ${qNodeStats.median}`);

  return {
    label,
    bonusPerMove,
    total: results.length,
    correct,
    incorrect,
    timeout,
    completed,
    accuracyAmongCompleted,
    completionRate,
    overallResolvedRate,
    timeStats,
    nodeStats,
    qNodeStats,
    results
  };
}

async function main() {
  console.log('========================================================');
  console.log(' FASE 5.4F — MOBILITY AUDIT & BENCHMARK SUITE');
  console.log('========================================================\n');

  // 1. Microbenchmark: evaluateBoard() throughput and latency
  console.log('--- 1. MICROBENCHMARK: evaluateBoard() Throughput ---');
  const benchFen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 4 7';
  const benchGame = new Chess(benchFen);
  const ITERATIONS = 5000;

  // Without mobility
  mobilityConfig.bonusPerMove = 0;
  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    evaluateBoard(benchGame);
  }
  const durNoMob = performance.now() - t0;
  const evalsPerSecNoMob = (ITERATIONS / durNoMob) * 1000;
  const avgUsNoMob = (durNoMob / ITERATIONS) * 1000;

  // With mobility
  mobilityConfig.bonusPerMove = 2;
  const t1 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    evaluateBoard(benchGame);
  }
  const durWithMob = performance.now() - t1;
  const evalsPerSecWithMob = (ITERATIONS / durWithMob) * 1000;
  const avgUsWithMob = (durWithMob / ITERATIONS) * 1000;
  const overheadPct = ((durWithMob - durNoMob) / durNoMob) * 100;

  console.log(`Baseline (no mobility):   ${evalsPerSecNoMob.toFixed(0)} evals/sec (${avgUsNoMob.toFixed(2)} µs/eval)`);
  console.log(`With Mobility (+2 cp):     ${evalsPerSecWithMob.toFixed(0)} evals/sec (${avgUsWithMob.toFixed(2)} µs/eval)`);
  console.log(`Overhead:                 +${overheadPct.toFixed(1)}%\n`);

  // 2. Full 68 FENs Benchmark: Run A (Baseline)
  const runBaseline = runBenchmark('Baseline (No Mobility)', 0);

  // 3. Full 68 FENs Benchmark: Run B (+Mobility, +2 cp)
  const runMobility = runBenchmark('Configuration +Mobility (+2 cp)', 2);

  // 4. Decision Changes Investigation
  console.log(`\n========================================================`);
  console.log(` DECISION CHANGES: Baseline VS +Mobility`);
  console.log(`========================================================`);

  const changes: any[] = [];
  let improvements = 0;
  let regressions = 0;

  for (let i = 0; i < runBaseline.results.length; i++) {
    const base = runBaseline.results[i];
    const mob = runMobility.results[i];
    const pos = SANITIZED_BENCHMARK_POSITIONS.find(p => p.id === base.id)!;

    if (base.engineMove !== mob.engineMove || base.verdict !== mob.verdict) {
      let classification = 'UNCLEAR';

      if (base.verdict !== 'CORRECT' && mob.verdict === 'CORRECT') {
        classification = 'EXPECTED (improvement)';
        improvements++;
      } else if (base.verdict === 'CORRECT' && mob.verdict !== 'CORRECT') {
        classification = mob.verdict === 'TIMEOUT' ? 'TIMEOUT (not a chess error)' : 'UNEXPECTED (regression)';
        if (mob.verdict !== 'TIMEOUT') regressions++;
      } else if (base.verdict === 'CORRECT' && mob.verdict === 'CORRECT') {
        classification = 'EXPECTED (alternative correct move)';
      } else if (base.verdict === 'TIMEOUT' && mob.verdict === 'TIMEOUT') {
        classification = 'UNCLEAR (both timeout)';
      }

      console.log(`[${base.id}] (${base.category})`);
      console.log(`  Baseline: ${base.engineMove} (${base.verdict}, ${base.elapsed.toFixed(0)}ms, score ${base.score})`);
      console.log(`  Mobility: ${mob.engineMove} (${mob.verdict}, ${mob.elapsed.toFixed(0)}ms, score ${mob.score})`);
      console.log(`  Expected: ${pos.expectedBestMove || '(any)'}`);
      console.log(`  Classification: ${classification}\n`);

      changes.push({
        id: base.id,
        category: base.category,
        baseMove: base.engineMove,
        baseVerdict: base.verdict,
        baseScore: base.score,
        baseElapsed: base.elapsed,
        mobMove: mob.engineMove,
        mobVerdict: mob.verdict,
        mobScore: mob.score,
        mobElapsed: mob.elapsed,
        classification
      });
    }
  }

  console.log(`Total move changes: ${changes.length}`);
  console.log(`Improvements:       ${improvements}`);
  console.log(`Chess Regressions:  ${regressions}`);

  // 5. Determinism Audit across 4 distinct positions (10 runs each)
  console.log(`\n========================================================`);
  console.log(` DETERMINISM AUDIT (4 Positions x 10 Runs) — +Mobility`);
  console.log(`========================================================`);
  mobilityConfig.bonusPerMove = 2;

  const testPositions = [
    { type: 'Tactical Position', id: 'scholars_mate', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4' },
    { type: 'High Mobility', id: 'high_mobility', fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 4 7' },
    { type: 'Low Mobility / Cramped', id: 'low_mobility', fen: 'r1b1k2r/pppp1ppp/8/8/1b1Q4/2N5/PPP1PPPP/R3KB1R w KQkq - 0 8' },
    { type: 'Endgame Position', id: 'endgame_calm', fen: '8/5k2/8/8/8/8/4K3/8 w - - 0 1' }
  ];

  const determinismResults: any[] = [];
  for (const tp of testPositions) {
    const moves: string[] = [];
    const scores: number[] = [];
    for (let r = 0; r < 10; r++) {
      const g = new Chess(tp.fen);
      const m = calculateBestMove(g, 'dificil', { maxTimeMs: MAX_TIME_MS }) || '';
      moves.push(m);
      scores.push(evaluateBoard(g));
    }
    const allMovesSame = moves.every(m => m === moves[0]);
    const allScoresSame = scores.every(s => s === scores[0]);
    console.log(`[${tp.type}] ${tp.id}: Move=${moves[0]} -> ${allMovesSame ? 'PASS (10/10)' : 'FAIL'}`);
    console.log(`  Scores: ${scores[0]} cp -> ${allScoresSame ? 'PASS (10/10)' : 'FAIL'}`);
    determinismResults.push({
      type: tp.type,
      id: tp.id,
      move: moves[0],
      score: scores[0],
      allMovesSame,
      allScoresSame
    });
  }

  // 6. State Isolation Audit (Cyclic orders A->B->C, B->C->A, C->A->B)
  console.log(`\n========================================================`);
  console.log(` STATE ISOLATION AUDIT — +Mobility`);
  console.log(`========================================================`);
  const posA = SANITIZED_BENCHMARK_POSITIONS[0];  // mate1_01_scholars
  const posB = SANITIZED_BENCHMARK_POSITIONS[10]; // mate2_05_queen_rook_battery
  const posC = SANITIZED_BENCHMARK_POSITIONS[20]; // fork_04_knight_fork_c7

  function runOrder(order: typeof SANITIZED_BENCHMARK_POSITIONS) {
    return order.map(p => {
      const g = new Chess(p.fen);
      const m = calculateBestMove(g, 'dificil', { maxTimeMs: MAX_TIME_MS });
      return { id: p.id, move: m, score: evaluateBoard(g) };
    });
  }

  const res1 = runOrder([posA, posB, posC]);
  const res2 = runOrder([posB, posC, posA]);
  const res3 = runOrder([posC, posA, posB]);

  const moveA1 = res1.find(r => r.id === posA.id)!.move;
  const moveA2 = res2.find(r => r.id === posA.id)!.move;
  const moveA3 = res3.find(r => r.id === posA.id)!.move;

  const moveB1 = res1.find(r => r.id === posB.id)!.move;
  const moveB2 = res2.find(r => r.id === posB.id)!.move;
  const moveB3 = res3.find(r => r.id === posB.id)!.move;

  const moveC1 = res1.find(r => r.id === posC.id)!.move;
  const moveC2 = res2.find(r => r.id === posC.id)!.move;
  const moveC3 = res3.find(r => r.id === posC.id)!.move;

  const isolatedA = moveA1 === moveA2 && moveA2 === moveA3;
  const isolatedB = moveB1 === moveB2 && moveB2 === moveB3;
  const isolatedC = moveC1 === moveC2 && moveC2 === moveC3;

  console.log(`Position A [${posA.id}]: ${moveA1}, ${moveA2}, ${moveA3} -> ${isolatedA ? 'PASS' : 'FAIL'}`);
  console.log(`Position B [${posB.id}]: ${moveB1}, ${moveB2}, ${moveB3} -> ${isolatedB ? 'PASS' : 'FAIL'}`);
  console.log(`Position C [${posC.id}]: ${moveC1}, ${moveC2}, ${moveC3} -> ${isolatedC ? 'PASS' : 'FAIL'}`);

  // Save report data
  writeFileSync('./benchmark_54f_summary.json', JSON.stringify({
    microbenchmark: {
      iterations: ITERATIONS,
      noMobility: { evalsPerSec: evalsPerSecNoMob, avgUs: avgUsNoMob, durMs: durNoMob },
      withMobility: { evalsPerSec: evalsPerSecWithMob, avgUs: avgUsWithMob, durMs: durWithMob },
      overheadPct
    },
    runBaseline,
    runMobility,
    changes,
    determinismResults,
    stateIsolation: { passed: isolatedA && isolatedB && isolatedC }
  }, null, 2));

  console.log('\nConsolidated results written to benchmark_54f_summary.json');
}

main().catch(console.error);
