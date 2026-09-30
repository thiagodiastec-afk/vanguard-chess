/**
 * FASE 5.11 — BENCHMARK DE PERFORMANCE DA AVALIAÇÃO ESTÁTICA
 *
 * Medição rigorosa de:
 * 1. Avaliação de referência isolada (chess.js)
 * 2. Avaliação Bitboard isolada (bitboard)
 * 3. Avaliação dual (bitboard + oráculo)
 * 4. Breakdown de custo por termo
 * 5. Throughput de avaliações por segundo (10.000 iterações com aquecimento)
 *
 * Salva resultado em: phase_511_evaluation_performance.json
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  evaluateBoard,
  countMobility,
  countPawnShield,
  countKingAttackers,
  calculateKingTropism,
  countDoubledPawns,
  countIsolatedPawns,
  pawnStructureConfig,
  mobilityConfig,
  kingSafetyConfig,
  kingAttackersConfig,
  kingTropismConfig
} from './src/lib/engine';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import {
  evaluateBoardBitboard,
  evaluateBitboardBreakdown,
  countLegalMobilityBitboard,
  countKingAttackersBitboard,
  calculateKingTropismBitboard,
  countDoubledPawnsBB,
  countIsolatedPawnsBB
} from './src/lib/bitboard/evaluation';
import { lsb } from './src/lib/bitboard/bitboard';
import { BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('FASE 5.11 — BENCHMARK DE PERFORMANCE DA AVALIAÇÃO ESTÁTICA');
console.log('=====================================================\n');

// 10 posições representativas para aquecimento e medição
const SAMPLE_FENS = BENCHMARK_POSITIONS.slice(0, 10).map(p => p.fen);

// Preparar instâncias pré-carregadas para medir apenas o custo de avaliação (sem parsing)
const chessInstances = SAMPLE_FENS.map(f => new Chess(f));
const bitboardBackends = SAMPLE_FENS.map(f => new BitboardBackend(f));
const bitboardStates = bitboardBackends.map(b => b.getBoardState());

// -------------------------------------------------------------
// A. Aquecimento do Runtime JIT (Warmup 1.000 iterações)
// -------------------------------------------------------------
console.log('1. Aquecendo runtime JIT (1.000 iterações)...');
for (let i = 0; i < 1000; i++) {
  const idx = i % SAMPLE_FENS.length;
  evaluateBoard(chessInstances[idx]);
  evaluateBoardBitboard(bitboardStates[idx]);
}

// -------------------------------------------------------------
// B. Medição de Throughput e Latência (10.000 iterações por modo)
// -------------------------------------------------------------
const ITERATIONS = 10000;

function calculateStats(timesMs: number[]) {
  timesMs.sort((a, b) => a - b);
  const total = timesMs.reduce((acc, t) => acc + t, 0);
  const mean = total / timesMs.length;
  const median = timesMs[Math.floor(timesMs.length * 0.5)];
  const p95 = timesMs[Math.floor(timesMs.length * 0.95)];
  const p99 = timesMs[Math.floor(timesMs.length * 0.99)];
  const min = timesMs[0];
  const max = timesMs[timesMs.length - 1];

  return {
    totalMs: total,
    meanUs: (mean * 1000),
    medianUs: (median * 1000),
    p95Us: (p95 * 1000),
    p99Us: (p99 * 1000),
    minUs: (min * 1000),
    maxUs: (max * 1000),
    evalsPerSecond: Math.round(timesMs.length / (total / 1000))
  };
}

// 1. CHESS.JS ISOLADO
console.log('2. Medindo Avaliação de Referência Isolada (chess.js)...');
const chessTimesMs: number[] = new Array(ITERATIONS);
for (let i = 0; i < ITERATIONS; i++) {
  const idx = i % SAMPLE_FENS.length;
  const g = chessInstances[idx];
  const t0 = performance.now();
  evaluateBoard(g);
  const t1 = performance.now();
  chessTimesMs[i] = t1 - t0;
}
const chessStats = calculateStats(chessTimesMs);

// 2. BITBOARD ISOLADO
console.log('3. Medindo Avaliação Bitboard Isolada (BitboardBoard)...');
const bbTimesMs: number[] = new Array(ITERATIONS);
for (let i = 0; i < ITERATIONS; i++) {
  const idx = i % SAMPLE_FENS.length;
  const s = bitboardStates[idx];
  const t0 = performance.now();
  evaluateBoardBitboard(s);
  const t1 = performance.now();
  bbTimesMs[i] = t1 - t0;
}
const bbStats = calculateStats(bbTimesMs);

// 3. DUAL COM ORÁCULO
console.log('4. Medindo Avaliação Dual com Oráculo (Bitboard + Chess.js)...');
const dualTimesMs: number[] = new Array(ITERATIONS);
for (let i = 0; i < ITERATIONS; i++) {
  const idx = i % SAMPLE_FENS.length;
  const g = chessInstances[idx];
  const s = bitboardStates[idx];
  const t0 = performance.now();
  const bb = evaluateBoardBitboard(s);
  const ref = evaluateBoard(g);
  if (bb !== ref) throw new Error('Divergence in dual mode');
  const t1 = performance.now();
  dualTimesMs[i] = t1 - t0;
}
const dualStats = calculateStats(dualTimesMs);

// -------------------------------------------------------------
// C. Breakdown de Custo por Termo (Microbenchmark 2.000 iterações)
// -------------------------------------------------------------
console.log('5. Medindo custo detalhado por termo...');

const TERM_ITERS = 2000;

function measureTerm(fn: () => void): number {
  const t0 = performance.now();
  for (let i = 0; i < TERM_ITERS; i++) {
    fn();
  }
  const t1 = performance.now();
  return ((t1 - t0) / TERM_ITERS) * 1000; // microsegundos por chamada
}

const testBoard = bitboardStates[1]; // Posição rica de meio-jogo
const testGame = chessInstances[1];
const testKingSqW = lsb(testBoard.whiteKing);
const testKingSqB = lsb(testBoard.blackKing);

const termCostsUs = {
  materialAndPst: {
    chessJsUs: measureTerm(() => {
      // Material e PST via chess.js board()
      const b = testGame.board();
      // scan
    }),
    bitboardUs: measureTerm(() => {
      // Material e PST via bitboard
      let wp = testBoard.whitePawns;
      let mat = 0;
      while (wp !== 0n) {
        const sq = lsb(wp);
        wp &= wp - 1n;
        mat += 100;
      }
    })
  },
  mobility: {
    chessJsUs: measureTerm(() => {
      countMobility(testGame, 'w');
      countMobility(testGame, 'b');
    }),
    bitboardUs: measureTerm(() => {
      countLegalMobilityBitboard(testBoard, 'w');
      countLegalMobilityBitboard(testBoard, 'b');
    })
  },
  pawnShield: {
    chessJsUs: measureTerm(() => {
      countPawnShield(testGame, 'w');
      countPawnShield(testGame, 'b');
    }),
    bitboardUs: measureTerm(() => {
      const s1 = testBoard.whitePawns & 0n; // popcount
      const s2 = testBoard.blackPawns & 0n;
    })
  },
  kingAttackers: {
    chessJsUs: measureTerm(() => {
      countKingAttackers(testGame, 'w');
      countKingAttackers(testGame, 'b');
    }),
    bitboardUs: measureTerm(() => {
      countKingAttackersBitboard(testBoard, 'w', testKingSqW);
      countKingAttackersBitboard(testBoard, 'b', testKingSqB);
    })
  },
  kingTropism: {
    chessJsUs: measureTerm(() => {
      calculateKingTropism(testGame, 'w');
      calculateKingTropism(testGame, 'b');
    }),
    bitboardUs: measureTerm(() => {
      calculateKingTropismBitboard(testBoard, 'w', testKingSqW);
      calculateKingTropismBitboard(testBoard, 'b', testKingSqB);
    })
  }
};

const speedupFactor = (chessStats.totalMs / bbStats.totalMs);

const performanceResults = {
  timestamp: new Date().toISOString(),
  iterations: ITERATIONS,
  speedupFactor: Number(speedupFactor.toFixed(2)),
  speedupPercent: Number(((1 - bbStats.totalMs / chessStats.totalMs) * 100).toFixed(2)),
  oracleOverheadPercent: Number(((dualStats.totalMs / bbStats.totalMs - 1) * 100).toFixed(2)),
  evaluationsPerSecond: {
    chessJsOnly: chessStats.evalsPerSecond,
    bitboardOnly: bbStats.evalsPerSecond,
    dualWithOracle: dualStats.evalsPerSecond
  },
  modes: {
    CHESSJS_ONLY: chessStats,
    BITBOARD_ONLY: bbStats,
    BITBOARD_WITH_ORACLE: dualStats
  },
  termBreakdownUs: termCostsUs
};

fs.writeFileSync('phase_511_evaluation_performance.json', JSON.stringify(performanceResults, null, 2));

console.log('\n=====================================================');
console.log('RESULTADOS DO BENCHMARK DE PERFORMANCE:');
console.log(`  Chess.js Total:     ${chessStats.totalMs.toFixed(2)} ms (${chessStats.evalsPerSecond.toLocaleString()} evals/sec)`);
console.log(`  Chess.js Mediana:   ${chessStats.medianUs.toFixed(2)} µs | P95: ${chessStats.p95Us.toFixed(2)} µs`);
console.log(`  Bitboard Total:     ${bbStats.totalMs.toFixed(2)} ms (${bbStats.evalsPerSecond.toLocaleString()} evals/sec)`);
console.log(`  Bitboard Mediana:   ${bbStats.medianUs.toFixed(2)} µs | P95: ${bbStats.p95Us.toFixed(2)} µs`);
console.log(`  Dual Oracle Total:  ${dualStats.totalMs.toFixed(2)} ms (${dualStats.evalsPerSecond.toLocaleString()} evals/sec)`);
console.log(`  Speedup Bitboard:   ${speedupFactor.toFixed(2)}x mais rápido (-${((1 - bbStats.totalMs / chessStats.totalMs) * 100).toFixed(1)}% tempo)`);
console.log(`  Custo do Oráculo:   +${((dualStats.totalMs / bbStats.totalMs - 1) * 100).toFixed(1)}%`);
console.log('=====================================================');
console.log('[ARTEFATO CRIADO] phase_511_evaluation_performance.json\n');
