/**
 * FASE 5.7B — SMOKE TEST & HARNESS DIAGNOSTIC
 *
 * Validates harness execution speed, watchdog timers, and checkpoints
 * without running the full heavy suite.
 */

import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  evaluateMobility,
  countMobility,
  referenceLegalMobility,
  optimizedLegalMobility,
  metrics
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('[5.7B SMOKE] START');
console.log('=====================================================\n');

interface StageTiming {
  stage: string;
  durationMs: number;
  status: 'PASS' | 'TIMEOUT' | 'FAIL';
}

const timings: StageTiming[] = [];

async function runWithWatchdog<T>(
  stageName: string,
  timeoutMs: number,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  console.log(`START ${stageName}`);

  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      console.error(`TIMEOUT_STAGE stage=${stageName} elapsedMs=${timeoutMs}`);
      reject(new Error(`STAGE_TIMEOUT: ${stageName}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(fn()), timeoutPromise]);
    clearTimeout(timer!);
    const durationMs = Math.round(performance.now() - start);
    console.log(`END ${stageName}`);
    console.log(`DURATION_MS ${durationMs}`);
    timings.push({ stage: stageName, durationMs, status: 'PASS' });
    return result;
  } catch (err: any) {
    clearTimeout(timer!);
    const durationMs = Math.round(performance.now() - start);
    console.log(`END ${stageName} (ERROR)`);
    console.log(`DURATION_MS ${durationMs}`);
    timings.push({
      stage: stageName,
      durationMs,
      status: err.message?.includes('STAGE_TIMEOUT') ? 'TIMEOUT' : 'FAIL'
    });
    throw err;
  }
}

async function smokeTest() {
  const globalStart = performance.now();

  // -------------------------------------------------------------
  // Stage 1: 10 Controlled Positions
  // -------------------------------------------------------------
  await runWithWatchdog('Controlled equivalence (10 pos)', 5000, () => {
    console.log('[1/5] Controlled equivalence: 10 positions');
    const sampleFens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
      'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1',
      'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
      '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1',
      '3k4/8/8/3B4/8/8/4R3/4K3 b - - 0 1',
      '4k3/8/8/4b3/8/8/4R3/4K3 b - - 0 1',
      'k7/8/8/8/8/8/8/7K w - - 0 1'
    ];

    let passed = 0;
    for (let i = 0; i < sampleFens.length; i++) {
      const g = new Chess(sampleFens[i]);
      const refW = referenceLegalMobility(g, 'w');
      const optW = optimizedLegalMobility(g, 'w');
      const countW = countMobility(g, 'w');

      const refB = referenceLegalMobility(g, 'b');
      const optB = optimizedLegalMobility(g, 'b');
      const countB = countMobility(g, 'b');

      const matchW = refW.totalNonKing === countW && refW.pawns === optW.pawns;
      const matchB = refB.totalNonKing === countB && refB.pawns === optB.pawns;

      if (matchW && matchB) passed++;
      console.log(`  [1/5] Checked controlled pos ${i + 1}/${sampleFens.length} -> ${matchW && matchB ? 'OK' : 'MISMATCH'}`);
    }
    console.log(`  Controlled Equivalence Result: ${passed}/${sampleFens.length}`);
  });

  // -------------------------------------------------------------
  // Stage 2: 20 Random Reachable Positions
  // -------------------------------------------------------------
  await runWithWatchdog('Random equivalence (20 pos)', 5000, () => {
    console.log('[2/5] Random equivalence: 20 positions');
    const positions: string[] = [];
    const g = new Chess();
    positions.push(g.fen());

    while (positions.length < 20 && !g.isGameOver()) {
      const moves = g.moves();
      if (moves.length === 0) break;
      const m = moves[Math.floor(Math.random() * moves.length)];
      g.move(m);
      positions.push(g.fen());
    }

    let passed = 0;
    for (let i = 0; i < positions.length; i++) {
      const curG = new Chess(positions[i]);
      const refW = referenceLegalMobility(curG, 'w');
      const optW = optimizedLegalMobility(curG, 'w');
      const countW = countMobility(curG, 'w');

      const refB = referenceLegalMobility(curG, 'b');
      const optB = optimizedLegalMobility(curG, 'b');
      const countB = countMobility(curG, 'b');

      const matchW = refW.totalNonKing === countW && refW.pawns === optW.pawns;
      const matchB = refB.totalNonKing === countB && refB.pawns === optB.pawns;

      if (matchW && matchB) passed++;
      if ((i + 1) % 5 === 0 || i === positions.length - 1) {
        console.log(`  [2/5] Random equivalence: ${i + 1}/${positions.length}`);
      }
    }
    console.log(`  Random Equivalence Result: ${passed}/${positions.length}`);
  });

  // -------------------------------------------------------------
  // Stage 3: 100 Microbenchmark Evaluations
  // -------------------------------------------------------------
  await runWithWatchdog('Microbenchmark (100 evals)', 5000, () => {
    console.log('[3/5] Microbenchmark: 100 evaluations');
    const g = new Chess();
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      evaluateBoard(g);
    }
    const elapsedMs = performance.now() - t0;
    const usPerEval = (elapsedMs * 1000) / 100;
    console.log(`  100 evals took ${elapsedMs.toFixed(2)} ms (${usPerEval.toFixed(1)} µs/eval, ${Math.round(1000000 / usPerEval)} evals/sec)`);
  });

  // -------------------------------------------------------------
  // Stage 4: 3 Official Benchmark FENs
  // -------------------------------------------------------------
  await runWithWatchdog('Official 3-FEN benchmark', 15000, () => {
    console.log('[4/5] Official 3-FEN benchmark');
    const sample = SANITIZED_BENCHMARK_POSITIONS.slice(0, 3);
    for (let i = 0; i < sample.length; i++) {
      const pos = sample[i];
      const g = new Chess(pos.fen);
      const t0 = performance.now();
      const move = calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
      const dt = performance.now() - t0;
      console.log(`  [4/5] FEN ${i + 1}/3 (${pos.id}): move=${move} in ${dt.toFixed(1)} ms (nodes=${metrics.nodes}, qNodes=${metrics.quiescenceNodes})`);
    }
  });

  // -------------------------------------------------------------
  // Stage 5: State Isolation (2 sequences)
  // -------------------------------------------------------------
  await runWithWatchdog('State isolation (2 sequences)', 15000, () => {
    console.log('[5/5] State isolation: 2 sequences (A -> B vs B -> A)');
    const fenA = SANITIZED_BENCHMARK_POSITIONS[0].fen;
    const fenB = SANITIZED_BENCHMARK_POSITIONS[1].fen;

    // Sequence 1: A then B
    const gA1 = new Chess(fenA);
    const mA1 = calculateBestMove(gA1, 'dificil', { maxTimeMs: 2000 });
    const nodesA1 = metrics.nodes;

    const gB1 = new Chess(fenB);
    const mB1 = calculateBestMove(gB1, 'dificil', { maxTimeMs: 2000 });
    const nodesB1 = metrics.nodes;

    // Sequence 2: B then A
    const gB2 = new Chess(fenB);
    const mB2 = calculateBestMove(gB2, 'dificil', { maxTimeMs: 2000 });
    const nodesB2 = metrics.nodes;

    const gA2 = new Chess(fenA);
    const mA2 = calculateBestMove(gA2, 'dificil', { maxTimeMs: 2000 });
    const nodesA2 = metrics.nodes;

    const passA = mA1 === mA2 && nodesA1 === nodesA2;
    const passB = mB1 === mB2 && nodesB1 === nodesB2;
    console.log(`  State Isolation A: ${passA ? 'PASS' : 'FAIL'} (${mA1} vs ${mA2})`);
    console.log(`  State Isolation B: ${passB ? 'PASS' : 'FAIL'} (${mB1} vs ${mB2})`);
  });

  const totalTimeMs = Math.round(performance.now() - globalStart);

  console.log('\n=== 5.7B SMOKE TEST TIMING ===');
  for (const t of timings) {
    console.log(`${t.stage}: ${t.durationMs} ms [${t.status}]`);
  }
  console.log(`TOTAL: ${totalTimeMs} ms`);
  console.log('\n[5.7B SMOKE] COMPLETE\n');
}

smokeTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Smoke test failed:', err);
    process.exit(1);
  });
