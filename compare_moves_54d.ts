/**
 * FASE 5.4D — Move Decision Comparison, Benchmark & Correctness
 * Evaluates all 68 positions with 5000ms timeout
 * Compares against benchmark_baseline.json
 * Runs Determinism (10 runs) & State Isolation (cyclic order)
 */
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'fs';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, tt } from './src/lib/engine.ts';

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

// Load baseline
const baselineJson = JSON.parse(readFileSync('./benchmark_baseline.json', 'utf-8'));
const BASELINE_MAP: Record<string, { move: string | null; score: number; passed: boolean }> = {};
for (const p of baselineJson.positionResults) {
  BASELINE_MAP[p.id] = {
    move: p.engineMove,
    score: p.score,
    passed: p.isTop1Match && p.isSignMatch
  };
}

async function main() {
  console.log('========================================================');
  console.log(' FASE 5.4D — BENCHMARK 68 FENs (DEPTH 3, TIMEOUT 5000ms)');
  console.log('========================================================\n');

  const results: any[] = [];
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
        elapsed,
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

    const verdict = passed && signOk ? 'CORRECT' : 'INCORRECT';
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

  console.log('--- BENCHMARK RESULTS ---');
  console.log(`Total:               ${results.length}`);
  console.log(`Correct:             ${correct}`);
  console.log(`Incorrect:           ${incorrect}`);
  console.log(`Timeout:             ${timeout}`);
  console.log(`Completed:           ${completed}/${results.length} (${((completed / results.length) * 100).toFixed(2)}%)`);
  console.log(`Accuracy (completed):${correct}/${completed} (${((correct / completed) * 100).toFixed(2)}%)`);
  console.log(`Overall Resolved:    ${correct}/${results.length} (${((correct / results.length) * 100).toFixed(2)}%)\n`);
  console.log(`Time Median:         ${timeStats.median.toFixed(1)} ms`);
  console.log(`Time P95:            ${timeStats.p95.toFixed(1)} ms`);
  console.log(`Nodes Median:        ${nodeStats.median}`);
  console.log(`QNodes Median:       ${qNodeStats.median}\n`);

  // Compare with baseline
  console.log('--- MOVE DECISION CHANGES VS BASELINE ---');
  let moveChanges = 0;
  let regressions = 0;
  let improvements = 0;

  for (const r of results) {
    const base = BASELINE_MAP[r.id];
    if (!base) continue;

    const pos = SANITIZED_BENCHMARK_POSITIONS.find(p => p.id === r.id)!;
    const isDifferent = base.move !== r.engineMove;

    if (isDifferent) {
      moveChanges++;
      const wasCorrect = base.passed;
      const isNowCorrect = r.verdict === 'CORRECT';

      let classification = 'UNCLEAR';
      if (isNowCorrect && !wasCorrect) {
        classification = 'EXPECTED (improvement)';
        improvements++;
      } else if (!isNowCorrect && wasCorrect) {
        classification = 'UNEXPECTED (regression)';
        regressions++;
      } else if (isNowCorrect && wasCorrect) {
        classification = 'EXPECTED (alternative correct move)';
      } else {
        classification = 'UNCLEAR (both incorrect)';
      }

      console.log(`[${r.id}] (${r.category})`);
      console.log(`  Baseline: ${base.move} (passed: ${wasCorrect})`);
      console.log(`  Current:  ${r.engineMove} (verdict: ${r.verdict})`);
      console.log(`  Expected: ${pos.expectedBestMove || '(any)'}`);
      console.log(`  Classification: ${classification}\n`);
    }
  }

  console.log(`Total move changes: ${moveChanges}`);
  console.log(`Improvements:       ${improvements}`);
  console.log(`Regressions:        ${regressions}\n`);

  // Determinism test (10 runs)
  console.log('--- DETERMINISM AUDIT (10 RUNS) ---');
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
  console.log(`Scores: ${detScores.join(', ')} -> ${allScoresSame ? 'PASS' : 'FAIL'}\n`);

  // State isolation audit (A->B->C vs B->C->A vs C->A->B)
  console.log('--- STATE ISOLATION AUDIT ---');
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
  console.log(`Position C [${posC.id}]: ${moveC1}, ${moveC2}, ${moveC3} -> ${isolatedC ? 'PASS' : 'FAIL'}\n`);

  // Save report data
  writeFileSync('./benchmark_54d_summary.json', JSON.stringify({
    correct,
    incorrect,
    timeout,
    completed,
    total: results.length,
    timeStats,
    nodeStats,
    qNodeStats,
    moveChanges,
    improvements,
    regressions,
    determinism: allMovesSame && allScoresSame,
    stateIsolation: isolatedA && isolatedB && isolatedC,
    results
  }, null, 2));
}

main().catch(console.error);
