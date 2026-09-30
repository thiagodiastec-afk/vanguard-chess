/**
 * FASE 5.4E — Complete Benchmark Suite:
 * Configuration A: Baseline 5.4D (doubled=0, isolated=0)
 * Configuration B: Baseline + Doubled Pawns (doubled=10, isolated=0)
 * Configuration C: Baseline + Doubled + Isolated Pawns (doubled=10, isolated=10)
 *
 * Runs all 68 positions with depth=3 (dificil), maxTimeMs=5000
 * Performs Determinism (10 runs) & State Isolation
 */
import { Chess } from 'chess.js';
import { writeFileSync } from 'fs';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, pawnStructureConfig } from './src/lib/engine.ts';

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
  fen: string;
}

interface RunSummary {
  label: string;
  config: { doubledPawnPenalty: number; isolatedPawnPenalty: number };
  total: number;
  correct: number;
  incorrect: number;
  timeout: number;
  completed: number;
  accuracyAmongCompleted: number;
  completionRate: number;
  timeStats: ReturnType<typeof computeStats>;
  nodeStats: ReturnType<typeof computeStats>;
  qNodeStats: ReturnType<typeof computeStats>;
  results: PositionResult[];
}

function runBenchmark(
  label: string,
  config: { doubledPawnPenalty: number; isolatedPawnPenalty: number }
): RunSummary {
  console.log(`\n========================================================`);
  console.log(` RUNNING: ${label}`);
  console.log(` Config: doubled=${config.doubledPawnPenalty}cp, isolated=${config.isolatedPawnPenalty}cp`);
  console.log(`========================================================`);

  pawnStructureConfig.doubledPawnPenalty = config.doubledPawnPenalty;
  pawnStructureConfig.isolatedPawnPenalty = config.isolatedPawnPenalty;

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
      fen: pos.fen
    });
  }

  const completed = correct + incorrect;
  const timeStats = computeStats(times);
  const nodeStats = computeStats(nodesArr);
  const qNodeStats = computeStats(qNodesArr);

  const accuracyAmongCompleted = completed > 0 ? Number(((correct / completed) * 100).toFixed(2)) : 0;
  const completionRate = Number(((completed / results.length) * 100).toFixed(2));

  console.log(`Results: Correct=${correct} | Incorrect=${incorrect} | Timeout=${timeout}`);
  console.log(`Completed: ${completed}/${results.length} (${completionRate}%) | Accuracy: ${accuracyAmongCompleted}%`);
  console.log(`Time Median: ${timeStats.median.toFixed(1)}ms | P95: ${timeStats.p95.toFixed(1)}ms`);
  console.log(`Nodes Median: ${nodeStats.median} | QNodes Median: ${qNodeStats.median}`);

  return {
    label,
    config,
    total: results.length,
    correct,
    incorrect,
    timeout,
    completed,
    accuracyAmongCompleted,
    completionRate,
    timeStats,
    nodeStats,
    qNodeStats,
    results
  };
}

function compareRuns(baseRun: RunSummary, testRun: RunSummary, label: string) {
  console.log(`\n--------------------------------------------------------`);
  console.log(` DECISION CHANGES: ${baseRun.label} VS ${testRun.label} (${label})`);
  console.log(`--------------------------------------------------------`);

  let changed = 0;
  let improvements = 0;
  let regressions = 0;

  for (let i = 0; i < baseRun.results.length; i++) {
    const base = baseRun.results[i];
    const test = testRun.results[i];
    const pos = SANITIZED_BENCHMARK_POSITIONS.find(p => p.id === base.id)!;

    if (base.engineMove !== test.engineMove || base.verdict !== test.verdict) {
      changed++;
      let classification = 'UNCLEAR';

      if (base.verdict !== 'CORRECT' && test.verdict === 'CORRECT') {
        classification = 'EXPECTED (improvement)';
        improvements++;
      } else if (base.verdict === 'CORRECT' && test.verdict !== 'CORRECT') {
        classification = test.verdict === 'TIMEOUT' ? 'TIMEOUT (not a chess error)' : 'UNEXPECTED (regression)';
        if (test.verdict !== 'TIMEOUT') regressions++;
      } else if (base.verdict === 'CORRECT' && test.verdict === 'CORRECT') {
        classification = 'EXPECTED (alternative correct move)';
      } else if (base.verdict === 'TIMEOUT' && test.verdict === 'TIMEOUT') {
        classification = 'UNCLEAR (both timeout)';
      }

      console.log(`[${base.id}] (${base.category})`);
      console.log(`  Base: ${base.engineMove} (${base.verdict}, ${base.elapsed.toFixed(0)}ms)`);
      console.log(`  Test: ${test.engineMove} (${test.verdict}, ${test.elapsed.toFixed(0)}ms)`);
      console.log(`  Expected: ${pos.expectedBestMove || '(any)'}`);
      console.log(`  Classification: ${classification}\n`);
    }
  }

  console.log(`Summary ${label}: Total Changed=${changed}, Improvements=${improvements}, Chess Regressions=${regressions}`);
  return { changed, improvements, regressions };
}

async function main() {
  // 1. Run Config A: Baseline 5.4D
  const runA = runBenchmark('Config A: Baseline 5.4D', { doubledPawnPenalty: 0, isolatedPawnPenalty: 0 });

  // 2. Run Config B: Baseline + Doubled Pawns
  const runB = runBenchmark('Config B: + Doubled Pawns', { doubledPawnPenalty: 10, isolatedPawnPenalty: 0 });

  // 3. Run Config C: Baseline + Doubled + Isolated Pawns
  const runC = runBenchmark('Config C: + Doubled + Isolated Pawns', { doubledPawnPenalty: 10, isolatedPawnPenalty: 10 });

  // Compare A vs B
  const diffAB = compareRuns(runA, runB, 'A -> B (Adding Doubled Pawns)');

  // Compare A vs C
  const diffAC = compareRuns(runA, runC, 'A -> C (Adding Doubled + Isolated Pawns)');

  // Compare B vs C
  const diffBC = compareRuns(runB, runC, 'B -> C (Adding Isolated Pawns)');

  // 4. Determinism Audit (10 runs with Config C)
  console.log('\n========================================================');
  console.log(' DETERMINISM AUDIT (10 RUNS) — Config C');
  console.log('========================================================');
  pawnStructureConfig.doubledPawnPenalty = 10;
  pawnStructureConfig.isolatedPawnPenalty = 10;

  const detFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const detMoves: string[] = [];
  const detScores: number[] = [];
  for (let i = 0; i < 10; i++) {
    const g = new Chess(detFen);
    const m = calculateBestMove(g, 'dificil') || '';
    detMoves.push(m);
    detScores.push(evaluateBoard(g));
  }
  const allMovesSame = detMoves.every(m => m === detMoves[0]);
  const allScoresSame = detScores.every(s => s === detScores[0]);
  console.log(`Moves: ${detMoves.join(', ')} -> ${allMovesSame ? 'PASS' : 'FAIL'}`);
  console.log(`Scores: ${detScores.join(', ')} -> ${allScoresSame ? 'PASS' : 'FAIL'}`);

  // 5. State Isolation Audit (Cyclic permutations A->B->C, B->C->A, C->A->B)
  console.log('\n========================================================');
  console.log(' STATE ISOLATION AUDIT — Config C');
  console.log('========================================================');
  const posA = SANITIZED_BENCHMARK_POSITIONS[0];
  const posB = SANITIZED_BENCHMARK_POSITIONS[10];
  const posC = SANITIZED_BENCHMARK_POSITIONS[20];

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
  writeFileSync('./benchmark_54e_summary.json', JSON.stringify({
    runA,
    runB,
    runC,
    diffAB,
    diffAC,
    diffBC,
    determinism: { moves: detMoves, scores: detScores, passed: allMovesSame && allScoresSame },
    stateIsolation: { passed: isolatedA && isolatedB && isolatedC }
  }, null, 2));

  console.log('\nConsolidated results written to benchmark_54e_summary.json');
}

main().catch(console.error);
