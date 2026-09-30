import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, metrics } from './src/lib/engine.ts';
import { StockfishClient } from './src/lib/stockfishClient.ts';
import {
  sanToUci,
  uciToSan,
  normalizeVanguardScore,
  normalizeStockfishScore,
  calculateCentipawnLoss,
  NormalizedScore
} from './src/lib/scoreNormalization.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import { INDEPENDENT_TEST_POSITIONS } from './src/lib/analysis/engineBenchmark/independentPositions.ts';
import * as fs from 'fs';

interface BenchmarkComparisonResult {
  id: string;
  category: string;
  fen: string;
  sideToMove: 'w' | 'b';
  vanguard: {
    moveSan: string | null;
    moveUci: string | null;
    scoreRaw: number;
    scoreNormalized: NormalizedScore;
    elapsedMs: number;
    completedDepth: number;
    nodes: number;
    qNodes: number;
    timedOut: boolean;
  };
  reference: {
    bestMoveUci: string;
    bestMoveSan: string;
    scoreNormalized: NormalizedScore;
    elapsedMs: number;
    depth: number;
    nodes: number;
  };
  comparison: {
    top1Match: boolean;
    evalDifferenceCp: number; // |V - R| in centipawns when both CP
    centipawnLoss: number;
    bothMate: boolean;
    mateAgreement: boolean;
  };
}

interface SuiteSummary {
  name: string;
  totalPositions: number;
  completed: number;
  timeouts: number;
  top1AgreementPct: number;
  top1AgreementCount: number;
  meanAbsEvalDiff: number;
  medianAbsEvalDiff: number;
  p95AbsEvalDiff: number;
  meanCentipawnLoss: number;
  medianCentipawnLoss: number;
  p95CentipawnLoss: number;
  vanguardMedianTimeMs: number;
  vanguardMedianNodes: number;
  categoryBreakdown: Record<string, {
    total: number;
    top1Matches: number;
    agreementPct: number;
    meanCpl: number;
  }>;
}

async function runComparisonSuite(
  name: string,
  positions: Array<{ id: string; category: string; fen: string; sideToMove?: 'w' | 'b' }>,
  sf: StockfishClient,
  vanguardMaxTimeMs: number = 5000,
  vanguardDifficulty: string = 'dificil'
): Promise<{ summary: SuiteSummary; results: BenchmarkComparisonResult[] }> {
  console.log(`\n=============================================================`);
  console.log(` Executando Suite: ${name} (${positions.length} posições)`);
  console.log(`=============================================================`);

  const results: BenchmarkComparisonResult[] = [];
  const categoryMap: Record<string, { total: number; top1Matches: number; cplList: number[] }> = {};

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const sideToMove: 'w' | 'b' = pos.sideToMove || (new Chess(pos.fen).turn() as 'w' | 'b');

    // 1. Run Stockfish Reference (Depth 3 for depth parity, contempt 0)
    const sfStart = performance.now();
    const sfEval = await sf.evaluate(pos.fen, { depth: 3 });
    const sfElapsed = performance.now() - sfStart;
    const sfNormScore = normalizeStockfishScore(sfEval.scoreCp, sfEval.mateIn, sideToMove);
    const sfMoveSan = uciToSan(pos.fen, sfEval.bestMove);

    // 2. Run Vanguard Engine (Depth 3, iterative deepening with timeout guard)
    metrics.clear();
    const vgStart = performance.now();
    let vgMoveSan: string | null = null;
    let vgTimedOut = false;

    try {
      vgMoveSan = calculateBestMove(new Chess(pos.fen), vanguardDifficulty, { maxTimeMs: vanguardMaxTimeMs });
      vgTimedOut = metrics.timeoutDuringIteration;
    } catch (e: any) {
      if (e.message === 'TIMEOUT') vgTimedOut = true;
      else throw e;
    }

    const vgElapsed = performance.now() - vgStart;
    if (vgElapsed >= vanguardMaxTimeMs || vgTimedOut) {
      vgTimedOut = true;
    }

    const vgScoreRaw = evaluateBoard(new Chess(pos.fen));
    const vgNormScore = normalizeVanguardScore(vgScoreRaw, sideToMove);
    const vgMoveUci = vgMoveSan ? sanToUci(pos.fen, vgMoveSan) : null;

    // 3. Comparison Metrics
    const top1Match = vgMoveUci !== null && vgMoveUci === sfEval.bestMove;

    let evalDiff = 0;
    if (vgNormScore.type === 'CP' && sfNormScore.type === 'CP') {
      evalDiff = Math.abs(vgNormScore.cp - sfNormScore.cp);
    }

    // Centipawn Loss evaluation via Stockfish
    let cpl = 0;
    if (!top1Match && vgMoveUci && vgNormScore.type === 'CP' && sfNormScore.type === 'CP') {
      // Evaluate position after Vanguard's move using Stockfish
      const gameAfterVg = new Chess(pos.fen);
      try {
        gameAfterVg.move(vgMoveSan!);
        const sfAfterVg = await sf.evaluate(gameAfterVg.fen(), { depth: 3 });
        const nextSide = sideToMove === 'w' ? 'b' : 'w';
        const normAfter = normalizeStockfishScore(sfAfterVg.scoreCp, sfAfterVg.mateIn, nextSide);
        cpl = calculateCentipawnLoss(sfNormScore, normAfter, sideToMove);
      } catch {
        cpl = evalDiff;
      }
    }

    const bothMate = vgNormScore.type === 'MATE' && sfNormScore.type === 'MATE';
    const mateAgreement = bothMate && (vgNormScore as any).mateIn === (sfNormScore as any).mateIn;

    const res: BenchmarkComparisonResult = {
      id: pos.id,
      category: pos.category,
      fen: pos.fen,
      sideToMove,
      vanguard: {
        moveSan: vgMoveSan,
        moveUci: vgMoveUci,
        scoreRaw: vgScoreRaw,
        scoreNormalized: vgNormScore,
        elapsedMs: vgElapsed,
        completedDepth: metrics.lastCompletedDepth,
        nodes: metrics.nodes,
        qNodes: metrics.quiescenceNodes,
        timedOut: vgTimedOut
      },
      reference: {
        bestMoveUci: sfEval.bestMove,
        bestMoveSan: sfMoveSan,
        scoreNormalized: sfNormScore,
        elapsedMs: sfElapsed,
        depth: sfEval.depth,
        nodes: sfEval.nodes
      },
      comparison: {
        top1Match,
        evalDifferenceCp: evalDiff,
        centipawnLoss: cpl,
        bothMate,
        mateAgreement
      }
    };

    results.push(res);

    // Track Category Breakdown
    if (!categoryMap[pos.category]) {
      categoryMap[pos.category] = { total: 0, top1Matches: 0, cplList: [] };
    }
    categoryMap[pos.category].total++;
    if (top1Match) categoryMap[pos.category].top1Matches++;
    categoryMap[pos.category].cplList.push(cpl);

    const matchSymbol = top1Match ? '✓ MATCH' : '✗ DIFF';
    process.stdout.write(`[${i + 1}/${positions.length}] ${pos.id} (${matchSymbol}: V=${vgMoveSan || 'none'} | SF=${sfMoveSan}) | `);
    if ((i + 1) % 2 === 0) process.stdout.write('\n');
  }

  process.stdout.write('\n');

  // Compute Summary Statistics
  const totalPositions = results.length;
  const timeouts = results.filter(r => r.vanguard.timedOut).length;
  const completed = totalPositions - timeouts;
  const top1Matches = results.filter(r => r.comparison.top1Match).length;
  const top1AgreementPct = totalPositions > 0 ? (top1Matches / totalPositions) * 100 : 0;

  const evalDiffs = results.map(r => r.comparison.evalDifferenceCp).sort((a, b) => a - b);
  const cpls = results.map(r => r.comparison.centipawnLoss).sort((a, b) => a - b);
  const vgTimes = results.map(r => r.vanguard.elapsedMs).sort((a, b) => a - b);
  const vgNodes = results.map(r => r.vanguard.nodes).sort((a, b) => a - b);

  const meanAbsEvalDiff = +(evalDiffs.reduce((a, b) => a + b, 0) / totalPositions).toFixed(1);
  const medianAbsEvalDiff = evalDiffs[Math.floor(totalPositions * 0.5)];
  const p95AbsEvalDiff = evalDiffs[Math.floor(totalPositions * 0.95)];

  const meanCentipawnLoss = +(cpls.reduce((a, b) => a + b, 0) / totalPositions).toFixed(1);
  const medianCentipawnLoss = cpls[Math.floor(totalPositions * 0.5)];
  const p95CentipawnLoss = cpls[Math.floor(totalPositions * 0.95)];

  const vanguardMedianTimeMs = vgTimes[Math.floor(totalPositions * 0.5)];
  const vanguardMedianNodes = vgNodes[Math.floor(totalPositions * 0.5)];

  const categoryBreakdown: Record<string, { total: number; top1Matches: number; agreementPct: number; meanCpl: number }> = {};
  for (const [cat, data] of Object.entries(categoryMap)) {
    const avgCpl = +(data.cplList.reduce((a, b) => a + b, 0) / data.total).toFixed(1);
    categoryBreakdown[cat] = {
      total: data.total,
      top1Matches: data.top1Matches,
      agreementPct: +((data.top1Matches / data.total) * 100).toFixed(1),
      meanCpl: avgCpl
    };
  }

  const summary: SuiteSummary = {
    name,
    totalPositions,
    completed,
    timeouts,
    top1AgreementPct: +top1AgreementPct.toFixed(2),
    top1AgreementCount: top1Matches,
    meanAbsEvalDiff,
    medianAbsEvalDiff,
    p95AbsEvalDiff,
    meanCentipawnLoss,
    medianCentipawnLoss,
    p95CentipawnLoss,
    vanguardMedianTimeMs,
    vanguardMedianNodes,
    categoryBreakdown
  };

  return { summary, results };
}

async function runDepthScalingExperiment(
  sf: StockfishClient,
  samplePositions: Array<{ id: string; fen: string; category: string }>
) {
  console.log('\n=============================================================');
  console.log(' ETAPA 16: DEPTH SCALING EXPERIMENT (Depth 1, 2, 3, 4)');
  console.log('=============================================================');

  const depths = [
    { name: 'Depth 1 (facil)', diff: 'facil', target: 1 },
    { name: 'Depth 2 (medio)', diff: 'medio', target: 2 },
    { name: 'Depth 3 (dificil)', diff: 'dificil', target: 3 },
    { name: 'Depth 4 (depth4)', diff: 'depth4', target: 4 }
  ];

  const scalingTable: Array<{
    depthLabel: string;
    targetDepth: number;
    agreementCount: number;
    agreementPct: number;
    medianNodes: number;
    medianTimeMs: number;
  }> = [];

  for (const d of depths) {
    let matches = 0;
    const times: number[] = [];
    const nodesList: number[] = [];

    for (const pos of samplePositions) {
      const sfEval = await sf.evaluate(pos.fen, { depth: d.target });
      metrics.clear();
      const start = performance.now();
      const vgMoveSan = calculateBestMove(new Chess(pos.fen), d.diff, { maxTimeMs: 5000 });
      const elapsed = performance.now() - start;
      const vgMoveUci = vgMoveSan ? sanToUci(pos.fen, vgMoveSan) : null;

      if (vgMoveUci === sfEval.bestMove) matches++;
      times.push(elapsed);
      nodesList.push(metrics.nodes);
    }

    times.sort((a, b) => a - b);
    nodesList.sort((a, b) => a - b);

    scalingTable.push({
      depthLabel: d.name,
      targetDepth: d.target,
      agreementCount: matches,
      agreementPct: +((matches / samplePositions.length) * 100).toFixed(1),
      medianNodes: nodesList[Math.floor(nodesList.length * 0.5)],
      medianTimeMs: +times[Math.floor(times.length * 0.5)].toFixed(1)
    });
  }

  console.table(scalingTable);
  return scalingTable;
}

async function main() {
  console.log('=== FASE 5.5 — INDEPENDENT ENGINE STRENGTH VALIDATION ===\n');

  const sf = new StockfishClient();
  await sf.init();
  console.log('Stockfish 10.0.2 inicializado com sucesso via Node worker.');

  // 1. Suite Oficial 68 FENs
  const suite68 = await runComparisonSuite(
    '68 FEN Benchmark Oficial',
    SANITIZED_BENCHMARK_POSITIONS,
    sf,
    5000,
    'dificil'
  );

  console.log('\n--- RESUMO DA SUITE 68 FENs ---');
  console.log(`Total: ${suite68.summary.totalPositions}`);
  console.log(`Top-1 Agreement: ${suite68.summary.top1AgreementCount}/${suite68.summary.totalPositions} (${suite68.summary.top1AgreementPct}%)`);
  console.log(`Mean Centipawn Loss: ${suite68.summary.meanCentipawnLoss} cp | Median: ${suite68.summary.medianCentipawnLoss} cp | P95: ${suite68.summary.p95CentipawnLoss} cp`);
  console.log(`Mean Abs Eval Diff: ${suite68.summary.meanAbsEvalDiff} cp | Median: ${suite68.summary.medianAbsEvalDiff} cp | P95: ${suite68.summary.p95AbsEvalDiff} cp`);
  console.log(`Timeouts: ${suite68.summary.timeouts}`);

  // 2. Suite Independente de 50 FENs
  const suiteIndep = await runComparisonSuite(
    'Dataset Independente (50 FENs)',
    INDEPENDENT_TEST_POSITIONS,
    sf,
    5000,
    'dificil'
  );

  console.log('\n--- RESUMO DO DATASET INDEPENDENTE (50 FENs) ---');
  console.log(`Total: ${suiteIndep.summary.totalPositions}`);
  console.log(`Top-1 Agreement: ${suiteIndep.summary.top1AgreementCount}/${suiteIndep.summary.totalPositions} (${suiteIndep.summary.top1AgreementPct}%)`);
  console.log(`Mean Centipawn Loss: ${suiteIndep.summary.meanCentipawnLoss} cp | Median: ${suiteIndep.summary.medianCentipawnLoss} cp | P95: ${suiteIndep.summary.p95CentipawnLoss} cp`);
  console.log(`Mean Abs Eval Diff: ${suiteIndep.summary.meanAbsEvalDiff} cp | Median: ${suiteIndep.summary.medianAbsEvalDiff} cp | P95: ${suiteIndep.summary.p95AbsEvalDiff} cp`);

  // 3. Depth Scaling Experiment (10 posições representativas)
  const samplePositions = SANITIZED_BENCHMARK_POSITIONS.slice(0, 10).map(p => ({
    id: p.id,
    fen: p.fen,
    category: p.category
  }));
  const depthScaling = await runDepthScalingExperiment(sf, samplePositions);

  // 4. Divergence Analysis (Top 10 divergências ordenadas por CPL / Eval Diff)
  const allDivergences = [...suite68.results, ...suiteIndep.results]
    .filter(r => !r.comparison.top1Match)
    .sort((a, b) => b.comparison.centipawnLoss - a.comparison.centipawnLoss || b.comparison.evalDifferenceCp - a.comparison.evalDifferenceCp);

  const top10Divergences = allDivergences.slice(0, 10).map(d => ({
    id: d.id,
    category: d.category,
    fen: d.fen,
    vanguardMove: d.vanguard.moveSan,
    stockfishMove: d.reference.bestMoveSan,
    centipawnLoss: d.comparison.centipawnLoss,
    evalDifference: d.comparison.evalDifferenceCp,
    vanguardTime: +d.vanguard.elapsedMs.toFixed(0),
    stockfishTime: +d.reference.elapsedMs.toFixed(0)
  }));

  console.log('\n--- TOP 10 DIVERGÊNCIAS (POR CENTIPAWN LOSS) ---');
  console.table(top10Divergences);

  // 5. Determinismo 10x
  console.log('\n--- TESTE DE DETERMINISMO 10x ---');
  const detFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
  const detMoves: string[] = [];
  for (let r = 0; r < 10; r++) {
    metrics.clear();
    detMoves.push(calculateBestMove(new Chess(detFen), 'dificil', { maxTimeMs: 5000 }) || '');
  }
  const detPass = detMoves.every(m => m === detMoves[0]);
  console.log(`Determinismo: ${detPass ? 'PASS (10/10 lances idênticos: ' + detMoves[0] + ')' : 'FAIL'}`);

  // 6. State Isolation (A->B->C, B->C->A, C->A->B)
  console.log('\n--- TESTE DE STATE ISOLATION ---');
  const pA = SANITIZED_BENCHMARK_POSITIONS[1];
  const pB = SANITIZED_BENCHMARK_POSITIONS[2];
  const pC = SANITIZED_BENCHMARK_POSITIONS[3];

  function runOrder(order: any[]) {
    return order.map(p => calculateBestMove(new Chess(p.fen), 'dificil', { maxTimeMs: 5000 }));
  }
  const o1 = runOrder([pA, pB, pC]);
  const o2 = runOrder([pB, pC, pA]);
  const o3 = runOrder([pC, pA, pB]);
  const isoPass = (o1[0] === o2[2] && o1[0] === o3[1]) &&
                  (o1[1] === o2[0] && o1[1] === o3[2]) &&
                  (o1[2] === o2[1] && o1[2] === o3[0]);
  console.log(`State Isolation: ${isoPass ? 'PASS' : 'FAIL'}`);

  // Terminate Stockfish
  sf.terminate();

  // Save complete JSON
  const outputJson = {
    metadata: {
      date: new Date().toISOString(),
      vanguardVersion: 'Phase 5.4J Frozen',
      referenceEngine: 'Stockfish.js',
      referenceVersion: '10.0.2 (2019-08-15 Multi-Variant)',
      protocol: 'Depth 3 Parity & Max 5000ms Timeout',
      depth: 3,
      timeLimitMs: 5000
    },
    summary68: suite68.summary,
    summaryIndependent: suiteIndep.summary,
    depthScaling,
    top10Divergences,
    determinism: { pass: detPass, move: detMoves[0] },
    stateIsolation: { pass: isoPass }
  };

  fs.writeFileSync('phase_55_results.json', JSON.stringify(outputJson, null, 2));
  console.log('\nResultados completos salvos em phase_55_results.json');
}

main();
