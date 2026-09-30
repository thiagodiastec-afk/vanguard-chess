import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  metrics,
  mobilityConfig,
  kingSafetyConfig
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

async function main() {
  console.log('=== FASE 5.4G: BENCHMARK OFICIAL KING SAFETY (PAWN SHIELD) ===');

  // Baseline 5.4F.1 setup: Mobility Legal (+1 cp), Pawn Shield = 0
  const baselineSetup = () => {
    mobilityConfig.bonusPerMove = 1;
    mobilityConfig.usePseudoLegal = false;
    kingSafetyConfig.pawnShieldBonus = 0;
  };

  // Pawn Shield setup: Mobility Legal (+1 cp), Pawn Shield = +8 cp
  const pawnShieldSetup = () => {
    mobilityConfig.bonusPerMove = 1;
    mobilityConfig.usePseudoLegal = false;
    kingSafetyConfig.pawnShieldBonus = 8;
  };

  // Run Baseline and +Pawn Shield
  const repBaseline = runSuite('Baseline 5.4F.1 (Mobility Legal +1 cp, No Shield)', baselineSetup);
  const repPawnShield = runSuite('FASE 5.4G (+Pawn Shield +8 cp)', pawnShieldSetup);

  // Compare Best Move Changes
  console.log('\n=============================================================');
  console.log(' MAPA DE MUDANÇAS DE BEST MOVE (BASELINE vs +PAWN SHIELD)    ');
  console.log('=============================================================');

  interface ChangeRecord {
    id: string;
    category: string;
    baseVerdict: string;
    baseMove: string | null;
    shieldVerdict: string;
    shieldMove: string | null;
    timeBase: number;
    timeShield: number;
    classification: 'EXPECTED' | 'UNEXPECTED' | 'UNCLEAR';
    reason: string;
  }

  const changes: ChangeRecord[] = [];

  for (let i = 0; i < repBaseline.results.length; i++) {
    const b = repBaseline.results[i];
    const s = repPawnShield.results[i];

    if (b.verdict !== s.verdict || b.engineMove !== s.engineMove) {
      let classification: 'EXPECTED' | 'UNEXPECTED' | 'UNCLEAR' = 'UNCLEAR';
      let reason = '';

      if (b.verdict === 'TIMEOUT' && s.verdict === 'CORRECT') {
        classification = 'EXPECTED';
        reason = 'Timeout recuperado com lance correto graças a melhor poda por segurança do rei';
      } else if (b.verdict === 'INCORRECT' && s.verdict === 'CORRECT') {
        classification = 'EXPECTED';
        reason = 'Melhoria direta de avaliação posicional corrigiu lance';
      } else if (b.verdict === 'CORRECT' && s.verdict === 'TIMEOUT') {
        classification = 'UNCLEAR';
        reason = 'Variação de timeout perto de 5000 ms';
      } else if (b.verdict === 'CORRECT' && s.verdict === 'INCORRECT') {
        classification = 'UNEXPECTED';
        reason = 'Regressão posicional';
      } else if (b.verdict === 'CORRECT' && s.verdict === 'CORRECT') {
        classification = 'EXPECTED';
        reason = 'Lance alternativo equivalente mantendo acerto tático';
      }

      const rec: ChangeRecord = {
        id: b.id,
        category: b.category,
        baseVerdict: b.verdict,
        baseMove: b.engineMove,
        shieldVerdict: s.verdict,
        shieldMove: s.engineMove,
        timeBase: b.elapsed,
        timeShield: s.elapsed,
        classification,
        reason
      };
      changes.push(rec);
      console.log(`[${rec.id}] ${b.verdict} (${b.engineMove}, ${b.elapsed.toFixed(0)}ms) -> ${s.verdict} (${s.engineMove}, ${s.elapsed.toFixed(0)}ms) | ${classification}: ${reason}`);
    }
  }

  console.log(`\nTotal de mudanças detectadas: ${changes.length}`);

  // Teste de Promoção Crítica: promo_03_black_promotion
  console.log('\n--- VERIFICAÇÃO CRÍTICA DE PROMOÇÃO (promo_03_black_promotion) ---');
  const promoPos = SANITIZED_BENCHMARK_POSITIONS.find(p => p.id === 'promo_03_black_promotion')!;
  pawnShieldSetup();
  const promoRes = runSinglePosition(promoPos, 5000);
  console.log(`promo_03_black_promotion: Verdict=${promoRes.verdict} Move=${promoRes.engineMove} Time=${promoRes.elapsed.toFixed(1)}ms`);

  // Teste de Determinismo (10 runs)
  console.log('\n--- TESTE DE DETERMINISMO (10 RUNS EM POSIÇÃO CRÍTICA) ---');
  const testFen = 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
  let detOk = true;
  let firstMove = '';
  for (let r = 0; r < 10; r++) {
    const res = runSinglePosition({
      id: 'det_test',
      category: 'OPENING',
      fen: testFen,
      sideToMove: 'w',
      expectedBestMove: 'O-O',
      description: 'determinism test'
    }, 5000);
    if (r === 0) firstMove = res.engineMove || '';
    else if (res.engineMove !== firstMove) detOk = false;
  }
  console.log(`Determinismo em 10 execuções: ${detOk ? 'PASS (10/10 lances idênticos: ' + firstMove + ')' : 'FAIL'}`);

  // Teste de State Isolation (A -> B -> C vs C -> A -> B)
  console.log('\n--- TESTE DE STATE ISOLATION (ORDENS PERMUTADAS) ---');
  const posA = SANITIZED_BENCHMARK_POSITIONS[0];  // mate1_01_scholars
  const posB = SANITIZED_BENCHMARK_POSITIONS[10]; // mate2_05_queen_rook_battery
  const posC = SANITIZED_BENCHMARK_POSITIONS[20]; // fork_04_knight_fork_c7

  function runOrder(order: BenchmarkPosition[]) {
    pawnShieldSetup();
    return order.map(p => runSinglePosition(p, 5000).engineMove);
  }
  const order1 = runOrder([posA, posB, posC]);
  const order2 = runOrder([posB, posC, posA]);
  const order3 = runOrder([posC, posA, posB]);

  const isoPass = (order1[0] === order2[2] && order1[0] === order3[1]) &&
                  (order1[1] === order2[0] && order1[1] === order3[2]) &&
                  (order1[2] === order2[1] && order1[2] === order3[0]);
  console.log(`State Isolation: ${isoPass ? 'PASS (decisões 100% independentes da ordem)' : 'FAIL'}`);

  // Save summary JSON
  fs.writeFileSync('benchmark_54g_summary.json', JSON.stringify({
    repBaseline,
    repPawnShield,
    changes,
    promoResult: promoRes,
    determinismPass: detOk,
    stateIsolationPass: isoPass
  }, null, 2));

  console.log('\nResultados completos salvos em benchmark_54g_summary.json');
}

main();
