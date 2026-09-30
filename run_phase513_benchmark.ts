/**
 * FASE 5.13 — microbenchmark reproduzível do custo do hash Zobrist.
 * Compara o recálculo completo com a leitura do hash mantido pelo backend,
 * usando estados legais derivados das mesmas 68 posições de referência.
 */
import * as fs from 'node:fs';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { computeZobristHashBitboard } from './src/lib/zobrist';

const boards = [] as ReturnType<BitboardBackend['getBoardState']>[];
let parityChecks = 0;

for (const position of SANITIZED_BENCHMARK_POSITIONS) {
  const backend = new BitboardBackend(position.fen);
  for (let ply = 0; ply < 24; ply++) {
    const moves = backend.generateLegalMoves();
    if (moves.length === 0) break;

    backend.makeMove(moves[(ply * 17 + 3) % moves.length]);
    const state = backend.getBoardState();
    if (backend.getZobristHash() !== computeZobristHashBitboard(state)) {
      throw new Error(`Hash divergente em ${position.id}, ply ${ply + 1}`);
    }
    boards.push(state);
    parityChecks++;
  }
}

const repetitions = 12;
let fullChecksum = 0;
let incrementalChecksum = 0;

function measureFullRecalculation(): number {
  const start = performance.now();
  for (let round = 0; round < repetitions; round++) {
    for (const state of boards) {
      fullChecksum = (fullChecksum + computeZobristHashBitboard(state)) >>> 0;
    }
  }
  return performance.now() - start;
}

function measureIncrementalHashRead(): number {
  const start = performance.now();
  for (let round = 0; round < repetitions; round++) {
    for (const state of boards) {
      incrementalChecksum = (incrementalChecksum + (state.zobristHash ?? 0)) >>> 0;
    }
  }
  return performance.now() - start;
}

// Warm both code paths, then alternate their order to reduce order bias.
measureFullRecalculation();
measureIncrementalHashRead();
const fullSamplesMs: number[] = [];
const incrementalSamplesMs: number[] = [];
for (let sample = 0; sample < 7; sample++) {
  if (sample % 2 === 0) {
    fullSamplesMs.push(measureFullRecalculation());
    incrementalSamplesMs.push(measureIncrementalHashRead());
  } else {
    incrementalSamplesMs.push(measureIncrementalHashRead());
    fullSamplesMs.push(measureFullRecalculation());
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

if (fullChecksum !== incrementalChecksum) {
  throw new Error(`Checksums divergentes: full=${fullChecksum}, cached=${incrementalChecksum}`);
}

const fullRecalculationMedianMs = median(fullSamplesMs);
const incrementalReadMedianMs = median(incrementalSamplesMs);
const result = {
  phase: '5.13',
  positions: SANITIZED_BENCHMARK_POSITIONS.length,
  validatedBoardStates: boards.length,
  parityChecks,
  repetitionsPerSample: repetitions,
  samplesPerMethod: fullSamplesMs.length,
  fullRecalculationMedianMs,
  incrementalReadMedianMs,
  measuredHashReadSpeedup: fullRecalculationMedianMs / incrementalReadMedianMs,
  checksum: fullChecksum,
  fullSamplesMs,
  incrementalSamplesMs
};

fs.writeFileSync('phase_513_zobrist_benchmark.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Positions: ${result.positions}`);
console.log(`Validated states and hash parity checks: ${result.validatedBoardStates} / ${result.parityChecks}`);
console.log(`Full recalculation median: ${fullRecalculationMedianMs.toFixed(2)} ms`);
console.log(`Incremental hash read median: ${incrementalReadMedianMs.toFixed(2)} ms`);
console.log(`Hash-read speedup in this microbenchmark: ${result.measuredHashReadSpeedup.toFixed(1)}x`);
console.log(`Checksums: full=${fullChecksum}, incremental=${incrementalChecksum}`);
console.log('Results saved to phase_513_zobrist_benchmark.json');
