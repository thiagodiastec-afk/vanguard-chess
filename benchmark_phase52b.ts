import { Chess } from 'chess.js';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, tt } from './src/lib/engine.ts';

// Add timeout support using Promise.race
function runWithTimeout<T>(fn: () => T, timeoutMs: number): Promise<T | 'TIMEOUT'> {
  return new Promise((resolve) => {
    let done = false;

    // We cannot easily interrupt a synchronous engine calculation in JS without Web Workers,
    // so we'll just run it synchronously and check if it took longer than the timeout.
    // However, if it actually hangs, the whole thread hangs.
    // Since we are running in Node, we could use Worker, but to keep it simple,
    // we will just run it and manually measure the time. If it exceeds a huge amount,
    // we just mark it as taking a long time.
    // Actually, true timeout requires workers. We will just execute it. If depth 4/5 takes too long,
    // the user said "Defina um timeout razoável e documente."
    // Let's implement a hacky timeout check INSIDE minimax? No, "NÃO REESCREVA O ENGINE."
    // We'll just run it, and if it exceeds say 30 seconds, we'll log it.

    setTimeout(() => {
      if (!done) resolve('TIMEOUT');
    }, timeoutMs);

    // JS is single threaded so the timeout won't fire until `fn()` finishes anyway.
    // To properly simulate timeout without workers, we would need to check `performance.now()`
    // inside the engine. We can't do that. So we'll just let it run.
    const result = fn();
    done = true;
    resolve(result);
  });
}

function computeStats(arr: number[]) {
  if (arr.length === 0) return { median: 0, p95: 0, max: 0, total: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const count = sorted.length;
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
  const p95 = sorted[p95Index];
  const max = sorted[count - 1];
  const total = sorted.reduce((sum, val) => sum + val, 0);
  return { median, p95, max, total };
}

async function runDepthBenchmark(depthLevel: string, depthVal: number) {
  console.log(`\n========================================================`);
  console.log(` DEPTH ${depthVal} (${depthLevel})`);
  console.log(`========================================================\n`);

  const results = [];
  let totalPassed = 0;
  let top1Matches = 0;
  let critDisagreements = 0;
  let timeouts = 0;

  const timeArr: number[] = [];
  const nodeArr: number[] = [];
  let totalTtProbes = 0;
  let totalTtHits = 0;
  let totalTtCutoffs = 0;
  let totalStores = 0;
  let totalReplacements = 0;

  const MAX_TIME_MS = 60000; // 60 seconds soft limit warning

  for (const pos of SANITIZED_BENCHMARK_POSITIONS) {
    const game = new Chess(pos.fen);

    const start = performance.now();
    let engineMove = null;
    try {
      engineMove = calculateBestMove(game, depthLevel, { maxTimeMs: MAX_TIME_MS });
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        engineMove = null;
      }
    }
    const elapsed = performance.now() - start;

    if (elapsed > MAX_TIME_MS) {
      timeouts++;
    }

    const score = evaluateBoard(game); // static eval

    // Evaluate correctness
    let isTop1Match = false;
    let isCriticalDisagreement = false;
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
      if (!matched && (pos.category === 'MATE_IN_1' || pos.category === 'MATE_IN_2')) {
        isCriticalDisagreement = true;
      }
      if (!matched && pos.category === 'MATE_IN_1' && engineMove) {
        const testGame = new Chess(pos.fen);
        try {
          testGame.move(engineMove);
          if (testGame.isCheckmate()) isTop1Match = true;
          else isCriticalDisagreement = true;
        } catch {
          isCriticalDisagreement = true;
        }
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

    const passed = isTop1Match && isSignMatch;
    if (passed) totalPassed++;
    if (isTop1Match) top1Matches++;
    if (isCriticalDisagreement) critDisagreements++;

    timeArr.push(elapsed);
    nodeArr.push(metrics.nodes);

    totalTtProbes += tt.probes;
    totalTtHits += tt.hits;
    totalTtCutoffs += tt.cutoffs;
    totalStores += tt.stores;
    totalReplacements += tt.replacements;
  }

  const timeStats = computeStats(timeArr);
  const nodeStats = computeStats(nodeArr);

  const hitRate = totalTtProbes > 0 ? ((totalTtHits / totalTtProbes) * 100).toFixed(2) + '%' : 'N/A';

  console.log(`Positions: ${SANITIZED_BENCHMARK_POSITIONS.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${SANITIZED_BENCHMARK_POSITIONS.length - totalPassed}`);
  console.log(`Pass Rate: ${((totalPassed / SANITIZED_BENCHMARK_POSITIONS.length) * 100).toFixed(2)}%`);
  console.log(`Top-1 Agreement: ${((top1Matches / SANITIZED_BENCHMARK_POSITIONS.length) * 100).toFixed(2)}%`);
  console.log(`Critical Disagreements: ${critDisagreements}`);
  console.log(`Timeouts (>60s): ${timeouts}`);
  console.log();
  console.log(`Median Time: ${timeStats.median.toFixed(2)} ms`);
  console.log(`P95 Time: ${timeStats.p95.toFixed(2)} ms`);
  console.log(`Maximum Time: ${timeStats.max.toFixed(2)} ms`);
  console.log(`Total Time: ${timeStats.total.toFixed(2)} ms`);
  console.log();
  console.log(`Median Nodes: ${nodeStats.median}`);
  console.log(`P95 Nodes: ${nodeStats.p95}`);
  console.log(`Maximum Nodes: ${nodeStats.max}`);
  console.log();
  console.log(`TT Probes: ${totalTtProbes}`);
  console.log(`TT Hits: ${totalTtHits}`);
  console.log(`TT Hit Rate: ${hitRate}`);
  console.log(`TT Cutoffs: ${totalTtCutoffs}`);

  return {
    depth: depthVal,
    passed: totalPassed,
    passRate: ((totalPassed / SANITIZED_BENCHMARK_POSITIONS.length) * 100).toFixed(2) + '%',
    timeMedian: timeStats.median.toFixed(2),
    timeP95: timeStats.p95.toFixed(2),
    timeMax: timeStats.max.toFixed(2),
    nodeMedian: nodeStats.median,
    ttHitRate: hitRate
  };
}

async function main() {
  console.log('Starting Depth Benchmark...');

  const results = [];
  // For standard difficulties
  // Depth 1 -> facil
  // Depth 2 -> medio
  // Depth 3 -> dificil
  // But wait, the engine supports mapping. Let's just temporarily patch it if we need depth 4 and 5.
  // Wait, I can't pass 'depth 4' to `calculateBestMove`.
  // I will just modify `calculateBestMove` to accept `depth4` and `depth5`.

  results.push(await runDepthBenchmark('facil', 1));
  results.push(await runDepthBenchmark('medio', 2));
  results.push(await runDepthBenchmark('dificil', 3));
  results.push(await runDepthBenchmark('depth4', 4));
  results.push(await runDepthBenchmark('depth5', 5));

  console.log(`\n========================================================`);
  console.log(` DEPTH SUMMARY`);
  console.log(`========================================================\n`);
  console.log(`Depth | Pass | Rate | Median | P95 | Max | Nodes | TT Hit`);
  for (const r of results) {
    console.log(`${r.depth} | ${r.passed} | ${r.passRate} | ${r.timeMedian} | ${r.timeP95} | ${r.timeMax} | ${r.nodeMedian} | ${r.ttHitRate}`);
  }
}

main().catch(console.error);
