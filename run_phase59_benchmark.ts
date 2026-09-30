/**
 * FASE 5.9 — BENCHMARK OFICIAL DE 68 POSIÇÕES & MATRIZ DE TRANSIÇÃO (STAGE 1)
 *
 * Executa o benchmark com:
 * - BitboardBackend como backend primário
 * - Timeout: 3.000 ms por posição
 * - Compara com a Baseline da Fase 5.7B (63/68 corretas, 0 timeouts, 0 regressões)
 * - Gera a Matriz de Transição estrita:
 *   5.7B CORRECT -> 5.9 INCORRECT = 0 (Critério Bloqueador)
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  calculateBestMove,
  metrics,
  setBoardBackendType
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('FASE 5.9 — BENCHMARK OFICIAL DE 68 POSIÇÕES (BITBOARD BACKEND)');
console.log('=====================================================\n');

// Ativar Bitboard como Backend Primário
setBoardBackendType('bitboard');

// Carregar resultados de referência da Fase 5.7B
const baseline57b = JSON.parse(fs.readFileSync('phase_57b_mobility_optimization.json', 'utf8')).benchmark68;
const baselineMap = new Map<string, boolean>();
for (const item of baseline57b.summaries) {
  baselineMap.set(item.id, item.isCorrect);
}

interface BenchSummary59 {
  id: string;
  category: string;
  fen: string;
  bestMove: string | null;
  expected: string | undefined;
  isCorrect: boolean;
  isTimeout: boolean;
  timeMs: number;
  nodes: number;
  qNodes: number;
  baselineCorrect: boolean;
}

const summaries: BenchSummary59[] = [];
let correctCount = 0;
let timeoutCount = 0;
let incorrectCount = 0;

// Matriz de Transição
let correctToCorrect = 0;
let correctToIncorrect = 0;
let correctToTimeout = 0;
let incorrectToCorrect = 0;
let incorrectToIncorrect = 0;
let incorrectToTimeout = 0;

const tStart = performance.now();

for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
  const pos = SANITIZED_BENCHMARK_POSITIONS[i];
  const g = new Chess(pos.fen);

  const start = performance.now();
  const engineMove = calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
  const timeMs = performance.now() - start;

  let isCorrect = false;
  if (pos.expectedBestMove || pos.alternativeBestMoves) {
    const allowed = [
      ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
      ...(pos.alternativeBestMoves || [])
    ];
    const cleanEngine = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
    isCorrect = allowed.some(m => {
      const cleanAllowed = m.replace(/[+#x]/g, '');
      return m === engineMove || cleanAllowed === cleanEngine;
    });

    if (!isCorrect && pos.category === 'MATE_IN_1' && engineMove) {
      const tg = new Chess(pos.fen);
      try {
        tg.move(engineMove);
        if (tg.isCheckmate()) isCorrect = true;
      } catch {}
    }
  } else {
    isCorrect = engineMove !== null;
  }

  const isTimeout = timeMs >= 2950 || metrics.timeoutDuringIteration;
  if (isTimeout) timeoutCount++;
  else if (isCorrect) correctCount++;
  else incorrectCount++;

  const baseCorr = baselineMap.get(pos.id) ?? false;
  if (baseCorr) {
    if (isTimeout) correctToTimeout++;
    else if (isCorrect) correctToCorrect++;
    else correctToIncorrect++;
  } else {
    if (isTimeout) incorrectToTimeout++;
    else if (isCorrect) incorrectToCorrect++;
    else incorrectToIncorrect++;
  }

  summaries.push({
    id: pos.id,
    category: pos.category,
    fen: pos.fen,
    bestMove: engineMove,
    expected: pos.expectedBestMove,
    isCorrect,
    isTimeout,
    timeMs,
    nodes: metrics.nodes,
    qNodes: metrics.quiescenceNodes,
    baselineCorrect: baseCorr
  });

  if ((i + 1) % 17 === 0 || i === SANITIZED_BENCHMARK_POSITIONS.length - 1) {
    console.log(`  Progresso: ${i + 1}/68 posições concluídas...`);
  }
}

const totalDurationMs = performance.now() - tStart;
const times = summaries.map(s => s.timeMs).sort((a, b) => a - b);
const medianTime = times[Math.floor(times.length / 2)];
const p95Time = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
const nodesList = summaries.map(s => s.nodes).sort((a, b) => a - b);
const medianNodes = nodesList[Math.floor(nodesList.length / 2)];
const qNodesList = summaries.map(s => s.qNodes).sort((a, b) => a - b);
const medianQNodes = qNodesList[Math.floor(qNodesList.length / 2)];

const completedCount = 68 - timeoutCount;
const accuracyCompleted = (correctCount / completedCount) * 100;

console.log('\n=====================================================');
console.log('RESULTADO DO BENCHMARK OFICIAL DE 68 POSIÇÕES (5.9):');
console.log(`  Total:               68`);
console.log(`  Corretos:            ${correctCount}`);
console.log(`  Incorretos:          ${incorrectCount}`);
console.log(`  Timeouts:            ${timeoutCount}`);
console.log(`  Completados:         ${completedCount}/68 (${((completedCount / 68) * 100).toFixed(1)}%)`);
console.log(`  Acurácia Completos:  ${accuracyCompleted.toFixed(2)}%`);
console.log(`  Tempo Mediano:       ${medianTime.toFixed(1)} ms`);
console.log(`  Tempo P95:           ${p95Time.toFixed(1)} ms`);
console.log(`  Nós Medianos:        ${medianNodes}`);
console.log(`  QNós Medianos:       ${medianQNodes}`);
console.log('=====================================================');

console.log('\n=====================================================');
console.log('MATRIZ DE TRANSIÇÃO (5.7B Baseline -> 5.9 Bitboard):');
console.log('-----------------------------------------------------');
console.log(`  5.7B CORRECT   -> 5.9 CORRECT:   ${correctToCorrect} / ${baseline57b.correct}`);
console.log(`  5.7B CORRECT   -> 5.9 INCORRECT: ${correctToIncorrect} (CRITÉRIO CRÍTICO: DEVE SER 0)`);
console.log(`  5.7B CORRECT   -> 5.9 TIMEOUT:   ${correctToTimeout}`);
console.log(`  5.7B INCORRECT -> 5.9 CORRECT:   ${incorrectToCorrect}`);
console.log(`  5.7B INCORRECT -> 5.9 INCORRECT: ${incorrectToIncorrect}`);
console.log(`  5.7B INCORRECT -> 5.9 TIMEOUT:   ${incorrectToTimeout}`);
console.log('=====================================================');

// Salvar resultado do benchmark para ser agregado no relatório
fs.writeFileSync(
  'benchmark_59_results.json',
  JSON.stringify(
    {
      total: 68,
      correct: correctCount,
      incorrect: incorrectCount,
      timeout: timeoutCount,
      completed: completedCount,
      accuracyCompleted,
      medianTime,
      p95Time,
      medianNodes,
      medianQNodes,
      totalDurationMs,
      transitionMatrix: {
        correctToCorrect,
        correctToIncorrect,
        correctToTimeout,
        incorrectToCorrect,
        incorrectToIncorrect,
        incorrectToTimeout
      },
      summaries
    },
    null,
    2
  )
);

if (correctToIncorrect === 0) {
  console.log('\nCRITÉRIO DE TRANSIÇÃO SATISFEITO: 0 REGRESSÕES (CORRECT -> INCORRECT = 0)!');
} else {
  console.error(`\nBLOQUEIO: ${correctToIncorrect} REGRESSÕES DETECTADAS!`);
  process.exit(1);
}
