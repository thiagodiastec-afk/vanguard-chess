import { Chess } from 'chess.js';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { calculateBestMove, evaluateBoard, metrics, tt } from './src/lib/engine.ts';
import { appendFileSync } from 'fs';

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

async function runDepthBenchmark(depthLevel: string, depthVal: number, positions: typeof SANITIZED_BENCHMARK_POSITIONS) {
  console.log(`\n========================================================`);
  console.log(` DEPTH ${depthVal} (${depthLevel})`);
  console.log(`========================================================\n`);

  let totalPassed = 0;
  let top1Matches = 0;
  let critDisagreements = 0;
  let timeouts = 0;

  const timeArr: number[] = [];
  const nodeArr: number[] = [];
  const leafNodeArr: number[] = [];
  const terminalNodeArr: number[] = [];
  const quiescenceCallsArr: number[] = [];
  const quiescenceNodesArr: number[] = [];
  const alphaBetaCutoffsArr: number[] = [];
  const moveOrderingCallsArr: number[] = [];
  const movesScoredArr: number[] = [];

  let totalTtProbes = 0;
  let totalTtHits = 0;
  let totalTtCutoffs = 0;
  let totalTtStores = 0;
  let totalTtReplacements = 0;

  let totalKillerCandidates = 0;
  let totalKillerHits = 0;
  let totalHistoryUpdates = 0;
  let totalHistoryHits = 0;

  const MAX_TIME_MS = 60000;

  for (const pos of positions) {
    const game = new Chess(pos.fen);
    metrics.clear();
    const prevTtProbes = tt.probes;
    const prevTtHits = tt.hits;
    const prevTtCutoffs = tt.cutoffs;
    const prevTtStores = tt.stores;
    const prevTtReplacements = tt.replacements;

    const start = performance.now();
    let engineMove = null;
    let timedOut = false;
    try {
      engineMove = calculateBestMove(game, depthLevel as any, { maxTimeMs: MAX_TIME_MS });
      timedOut = metrics.timeoutDuringIteration; // This will be set by our ID implementation
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        engineMove = null;
        timedOut = true;
      }
    }
    const elapsed = performance.now() - start;

    // We treat either an explicit throw or the metric flag as a timeout
    if (elapsed >= MAX_TIME_MS || timedOut || !engineMove) {
      timeouts++;
    }

    const score = evaluateBoard(game);

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
    leafNodeArr.push(metrics.leafNodes);
    terminalNodeArr.push(metrics.terminalNodes);
    quiescenceCallsArr.push(metrics.quiescenceCalls);
    quiescenceNodesArr.push(metrics.quiescenceNodes);
    alphaBetaCutoffsArr.push(metrics.alphaBetaCutoffs);
    moveOrderingCallsArr.push(metrics.moveOrderingCalls);
    movesScoredArr.push(metrics.movesScored);

    totalTtProbes += (tt.probes - prevTtProbes);
    totalTtHits += (tt.hits - prevTtHits);
    totalTtCutoffs += (tt.cutoffs - prevTtCutoffs);
    totalTtStores += (tt.stores - prevTtStores);
    totalTtReplacements += (tt.replacements - prevTtReplacements);

    totalKillerCandidates += metrics.killerCandidates;
    totalKillerHits += metrics.killerHits;
    totalHistoryUpdates += metrics.historyUpdates;
    totalHistoryHits += metrics.historyHits;
  }

  const timeStats = computeStats(timeArr);
  const nodeStats = computeStats(nodeArr);
  const qNodeStats = computeStats(quiescenceNodesArr);
  const abCutoffStats = computeStats(alphaBetaCutoffsArr);

  const hitRate = totalTtProbes > 0 ? ((totalTtHits / totalTtProbes) * 100).toFixed(2) + '%' : 'N/A';

  console.log(`Positions: ${positions.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${positions.length - totalPassed}`);
  console.log(`Pass Rate: ${((totalPassed / positions.length) * 100).toFixed(2)}%`);
  console.log(`Timeouts: ${timeouts}`);

  console.log();
  console.log(`Median Time: ${timeStats.median.toFixed(2)} ms`);
  console.log(`P95 Time: ${timeStats.p95.toFixed(2)} ms`);
  console.log(`Max Time: ${timeStats.max.toFixed(2)} ms`);
  console.log(`Total Time: ${timeStats.total.toFixed(2)} ms`);
  console.log();
  console.log(`Median Nodes: ${nodeStats.median}`);
  console.log(`Median QNodes: ${qNodeStats.median}`);
  console.log(`Median AB Cutoffs: ${abCutoffStats.median}`);
  console.log();
  console.log(`TT Probes: ${totalTtProbes}`);
  console.log(`TT Hits: ${totalTtHits}`);
  console.log(`TT Hit Rate: ${hitRate}`);
  console.log(`TT Cutoffs: ${totalTtCutoffs}`);
  console.log(`TT Stores: ${totalTtStores}`);

  return {
    depth: depthVal,
    total: positions.length,
    passed: totalPassed,
    passRate: ((totalPassed / positions.length) * 100).toFixed(2) + '%',
    timeouts,
    timeMedian: timeStats.median.toFixed(2),
    timeP95: timeStats.p95.toFixed(2),
    timeMax: timeStats.max.toFixed(2),
    timeTotal: timeStats.total.toFixed(2),
    nodeMedian: nodeStats.median,
    qNodeMedian: qNodeStats.median,
    abCutoffMedian: abCutoffStats.median,
    ttProbes: totalTtProbes,
    ttHits: totalTtHits,
    ttHitRate: hitRate,
    ttCutoffs: totalTtCutoffs,
    ttStores: totalTtStores,
    killerHits: totalKillerHits,
    historyUpdates: totalHistoryUpdates,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const targetDepth = args.length > 0 ? parseInt(args[0], 10) : 3;
  const label = args.length > 1 ? args[1] : 'dificil';

  console.log(`Starting Baseline Benchmark... targeting depth ${targetDepth} (${label})`);

  // Use a stable, representative subset for Depth 4 and 5 if needed, to avoid 68-minute benchmarks
  const positions = targetDepth >= 4
      ? SANITIZED_BENCHMARK_POSITIONS.filter(p => [
          'MATE_IN_1', 'MATE_IN_2', 'TACTICAL_CAPTURE', 'FORK', 'PIN', 'SKEWER'
        ].includes(p.category)).slice(0, 20)
      : SANITIZED_BENCHMARK_POSITIONS;

  const result = await runDepthBenchmark(label, targetDepth, positions);

  appendFileSync('benchmark_53_results.json', JSON.stringify({ phase: '5.2B', depth: targetDepth, result }, null, 2) + '\\n');
}

main().catch(console.error);
