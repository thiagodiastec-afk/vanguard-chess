/**
 * FASE 5.4D — Benchmark Harness with CORRECT / INCORRECT / TIMEOUT separation
 * Usage: npx tsx benchmark_54d.ts [depth] [timeoutMs]
 * Default: depth=3, timeout=5000
 */
import { Chess } from 'chess.js';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, tt } from './src/lib/engine.ts';

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
  expected: string;
  engineMove: string | null;
  score: number;
  elapsed: number;
  nodes: number;
  qNodes: number;
  completedDepth: number;
}

export async function runBenchmark(
  label: string,
  depth: number,
  timeoutMs: number,
  verbose = false
): Promise<{ results: PositionResult[]; summary: Record<string, number> }> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(` Depth: ${depth} | Timeout: ${timeoutMs}ms | Positions: ${SANITIZED_BENCHMARK_POSITIONS.length}`);
  console.log();

  const results: PositionResult[] = [];

  for (const pos of SANITIZED_BENCHMARK_POSITIONS) {
    const game = new Chess(pos.fen);
    metrics.clear();

    const start = performance.now();
    let engineMove: string | null = null;
    let timedOut = false;

    try {
      engineMove = calculateBestMove(game, depth as any, { maxTimeMs: timeoutMs });
      timedOut = metrics.timeoutDuringIteration;
    } catch (e: any) {
      if (e.message === 'TIMEOUT') timedOut = true;
      else throw e;
    }

    const elapsed = performance.now() - start;

    // Explicit timeout: elapsed exceeded limit OR timeout flag set
    if (elapsed >= timeoutMs || timedOut) {
      results.push({
        id: pos.id, category: pos.category, verdict: 'TIMEOUT',
        expected: pos.expectedBestMove || '(any)', engineMove,
        score: evaluateBoard(game), elapsed,
        nodes: metrics.nodes, qNodes: metrics.quiescenceNodes,
        completedDepth: metrics.lastCompletedDepth
      });
      if (verbose) console.log(`  TIMEOUT [${pos.id}] ${elapsed.toFixed(0)}ms depth=${metrics.lastCompletedDepth}`);
      continue;
    }

    const score = evaluateBoard(game);

    // Correctness check — exact same logic as benchmark_phase53
    let isTop1Match = false;
    if (pos.expectedBestMove || pos.alternativeBestMoves) {
      const allowed = [
        ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
        ...(pos.alternativeBestMoves || [])
      ];
      const cleanEng = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
      const matched = allowed.some(m => m === engineMove || m.replace(/[+#x]/g, '') === cleanEng);
      if (!matched && pos.category === 'MATE_IN_1' && engineMove) {
        const tg = new Chess(pos.fen);
        try { tg.move(engineMove); isTop1Match = tg.isCheckmate(); } catch { }
      } else {
        isTop1Match = matched;
      }
    } else {
      isTop1Match = engineMove !== null;
    }

    let isSignMatch = true;
    if (pos.expectedScoreSign === 'positive') isSignMatch = score > 50;
    else if (pos.expectedScoreSign === 'negative') isSignMatch = score < -50;
    else if (pos.expectedScoreSign === 'neutral') isSignMatch = Math.abs(score) <= 200;

    const verdict: Verdict = isTop1Match && isSignMatch ? 'CORRECT' : 'INCORRECT';

    if (verbose && verdict === 'INCORRECT') {
      console.log(`  INCORRECT [${pos.id}] Expected=${pos.expectedBestMove || '(any)'} Got=${engineMove} Score=${score}`);
    }

    results.push({
      id: pos.id, category: pos.category, verdict,
      expected: pos.expectedBestMove || '(any)', engineMove, score, elapsed,
      nodes: metrics.nodes, qNodes: metrics.quiescenceNodes,
      completedDepth: metrics.lastCompletedDepth
    });
  }

  const correct = results.filter(r => r.verdict === 'CORRECT').length;
  const incorrect = results.filter(r => r.verdict === 'INCORRECT').length;
  const timeout = results.filter(r => r.verdict === 'TIMEOUT').length;
  const completed = correct + incorrect;
  const accuracyAmongCompleted = completed > 0 ? ((correct / completed) * 100).toFixed(2) : 'N/A';
  const completionRate = ((completed / results.length) * 100).toFixed(2);

  const timeStats = computeStats(results.map(r => r.elapsed));
  const nodeStats = computeStats(results.map(r => r.nodes));
  const qNodeStats = computeStats(results.map(r => r.qNodes));

  console.log(`Results:`);
  console.log(`  Total:      ${results.length}`);
  console.log(`  Correct:    ${correct}`);
  console.log(`  Incorrect:  ${incorrect}`);
  console.log(`  Timeout:    ${timeout}`);
  console.log(`  Completion: ${completed}/${results.length} (${completionRate}%)`);
  console.log(`  Accuracy (completed): ${correct}/${completed} (${accuracyAmongCompleted}%)`);
  console.log();
  console.log(`  Median ms:  ${timeStats.median.toFixed(1)}`);
  console.log(`  P95 ms:     ${timeStats.p95.toFixed(1)}`);
  console.log(`  Median nodes:  ${nodeStats.median}`);
  console.log(`  Median qNodes: ${qNodeStats.median}`);

  const summary = { correct, incorrect, timeout, completed, total: results.length };
  return { results, summary };
}

async function main() {
  const args = process.argv.slice(2);
  const depth = args[0] ? parseInt(args[0]) : 3;
  const timeoutMs = args[1] ? parseInt(args[1]) : 5000;

  await runBenchmark(`BASELINE — Depth ${depth}, Timeout ${timeoutMs}ms`, depth, timeoutMs, true);
}

main().catch(console.error);
