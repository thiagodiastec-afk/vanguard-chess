import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  metrics,
  mobilityConfig
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS, BenchmarkPosition } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import * as fs from 'fs';

interface RunResult {
  id: string;
  category: string;
  expectedBestMove?: string;
  engineMove: string | null;
  score: number;
  elapsed: number;
  nodes: number;
  qNodes: number;
  completedDepth: number;
  verdict: 'CORRECT' | 'INCORRECT' | 'TIMEOUT';
  fen: string;
}

interface BenchmarkReport {
  configName: string;
  total: number;
  correct: number;
  incorrect: number;
  timeout: number;
  completed: number;
  accuracyCompleted: number;
  completionRate: number;
  medianTimeMs: number;
  p95TimeMs: number;
  medianNodes: number;
  medianQNodes: number;
  results: RunResult[];
}

function runSinglePosition(
  pos: BenchmarkPosition,
  maxTimeMs: number = 5000
): RunResult {
  const game = new Chess(pos.fen);
  metrics.clear();

  const start = performance.now();
  let move: string | null = null;
  let timedOut = false;

  try {
    move = calculateBestMove(game, 'dificil', { maxTimeMs });
    timedOut = metrics.timeoutDuringIteration;
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      timedOut = true;
    } else {
      throw err;
    }
  }
  const elapsed = performance.now() - start;
  if (elapsed >= maxTimeMs || timedOut) {
    timedOut = true;
  }

  const rootGame = new Chess(pos.fen);
  const score = evaluateBoard(rootGame);

  if (timedOut) {
    return {
      id: pos.id,
      category: pos.category,
      expectedBestMove: pos.expectedBestMove,
      engineMove: move,
      score,
      elapsed,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes,
      completedDepth: metrics.lastCompletedDepth,
      verdict: 'TIMEOUT',
      fen: pos.fen
    };
  }

  // Correctness check matching official protocol
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

  const isCorrect = passed && signOk;

  return {
    id: pos.id,
    category: pos.category,
    expectedBestMove: pos.expectedBestMove,
    engineMove: move,
    score,
    elapsed,
    nodes: metrics.nodes,
    qNodes: metrics.quiescenceNodes,
    completedDepth: metrics.lastCompletedDepth,
    verdict: isCorrect ? 'CORRECT' : 'INCORRECT',
    fen: pos.fen
  };
}

function runSuite(configName: string, setupFn: () => void, positions = SANITIZED_BENCHMARK_POSITIONS): BenchmarkReport {
  setupFn();
  console.log(`\n=============================================================`);
  console.log(` Executando Suite: ${configName} (${positions.length} posições)`);
  console.log(`=============================================================`);

  const results: RunResult[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const res = runSinglePosition(pos, 5000);
    results.push(res);
    process.stdout.write(`[${i + 1}/${positions.length}] ${pos.id} (${res.verdict}) ${res.elapsed.toFixed(0)}ms | `);
    if ((i + 1) % 4 === 0) process.stdout.write('\n');
  }
  process.stdout.write('\n');

  const total = results.length;
  const timeout = results.filter(r => r.verdict === 'TIMEOUT').length;
  const completed = total - timeout;
  const correct = results.filter(r => r.verdict === 'CORRECT').length;
  const incorrect = results.filter(r => r.verdict === 'INCORRECT').length;
  const accuracyCompleted = completed > 0 ? (correct / completed) * 100 : 0;
  const completionRate = (completed / total) * 100;

  const times = results.map(r => r.elapsed).sort((a, b) => a - b);
  const nodes = results.map(r => r.nodes).sort((a, b) => a - b);
  const qnodes = results.map(r => r.qNodes).sort((a, b) => a - b);

  const medianTimeMs = times[Math.floor(total * 0.5)];
  const p95TimeMs = times[Math.floor(total * 0.95)];
  const medianNodes = nodes[Math.floor(total * 0.5)];
  const medianQNodes = qnodes[Math.floor(total * 0.5)];

  const report: BenchmarkReport = {
    configName,
    total,
    correct,
    incorrect,
    timeout,
    completed,
    accuracyCompleted,
    completionRate,
    medianTimeMs,
    p95TimeMs,
    medianNodes,
    medianQNodes,
    results
  };

  console.log(`\n--- RESULTADOS PARA ${configName} ---`);
  console.log(`Total: ${total}`);
  console.log(`Correct: ${correct}`);
  console.log(`Incorrect: ${incorrect}`);
  console.log(`Timeout: ${timeout}`);
  console.log(`Completed: ${completed} (${completionRate.toFixed(2)}%)`);
  console.log(`Accuracy among completed: ${accuracyCompleted.toFixed(2)}%`);
  console.log(`Median Time: ${medianTimeMs.toFixed(1)} ms | P95: ${p95TimeMs.toFixed(1)} ms`);
  console.log(`Median Nodes: ${medianNodes} | Median QNodes: ${medianQNodes}`);

  return report;
}

// 1. Specific audit on the 5 timeout positions + promo_03
const FOCUS_NAMES = ['mate2_03', 'mate2_05', 'hanging_01', 'hanging_04', 'defense_01', 'promo_03'];
const FOCUS_POSITIONS = SANITIZED_BENCHMARK_POSITIONS.filter(p => FOCUS_NAMES.some(n => p.id.startsWith(n)));

async function main() {
  console.log('=== AUDITORIA CIRÚRGICA DE TIMEOUTS E PROMOÇÃO ===');
  const configs = [
    {
      name: 'Baseline (sem mobility)',
      setup: () => { mobilityConfig.bonusPerMove = 0; mobilityConfig.usePseudoLegal = false; }
    },
    {
      name: 'Mobility Legal (+1 cp)',
      setup: () => { mobilityConfig.bonusPerMove = 1; mobilityConfig.usePseudoLegal = false; }
    },
    {
      name: 'Mobility Legal (+2 cp)',
      setup: () => { mobilityConfig.bonusPerMove = 2; mobilityConfig.usePseudoLegal = false; }
    },
    {
      name: 'Mobility Pseudo (+1 cp)',
      setup: () => { mobilityConfig.bonusPerMove = 1; mobilityConfig.usePseudoLegal = true; }
    },
    {
      name: 'Mobility Pseudo (+2 cp)',
      setup: () => { mobilityConfig.bonusPerMove = 2; mobilityConfig.usePseudoLegal = true; }
    }
  ];

  console.log('\n--- TABELA DE FOCO: TIMEOUTS (5 POSIÇÕES) + PROMO_03 ---');
  for (const pos of FOCUS_POSITIONS) {
    console.log(`\nPosição: ${pos.id} (${pos.category}) Expected: ${pos.expectedBestMove}`);
    for (const cfg of configs) {
      cfg.setup();
      const res = runSinglePosition(pos, 5000);
      console.log(`  ${cfg.name.padEnd(28)}: ${res.verdict.padEnd(10)} Move: ${(res.engineMove || 'none').padEnd(8)} Time: ${res.elapsed.toFixed(1)}ms Nodes: ${res.nodes}`);
    }
  }

  // Now run full benchmark suites
  console.log('\n==================================================');
  console.log(' INICIANDO BENCHMARKS COMPLETOS DE 68 POSIÇÕES    ');
  console.log('==================================================');

  const repLegal1 = runSuite('Mobility Legal (+1 cp)', configs[1].setup);
  const repPseudo2 = runSuite('Mobility Pseudo (+2 cp)', configs[4].setup);
  const repPseudo1 = runSuite('Mobility Pseudo (+1 cp)', configs[3].setup);

  // Save summary JSON
  fs.writeFileSync('benchmark_54f1_summary.json', JSON.stringify({
    repLegal1,
    repPseudo2,
    repPseudo1
  }, null, 2));

  console.log('\nResultados salvos em benchmark_54f1_summary.json');
}

main();
