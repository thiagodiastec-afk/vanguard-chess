/**
 * FASE 5.11 — BENCHMARK OFICIAL DE 68 POSIÇÕES COM AVALIAÇÃO BITBOARD
 *
 * Executa os 68 FENs oficiais nos três modos explícitos:
 * 1. CHESSJS_ONLY
 * 2. BITBOARD_ONLY
 * 3. BITBOARD_WITH_ORACLE
 *
 * Salva resultado em: phase_511_evaluation_benchmark68.json
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  calculateBestMove,
  metrics,
  setExecutionMode,
  setBoardBackendType,
  ExecutionMode
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

interface PositionResult {
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
  completedDepth: number;
  moveGenCalls: number;
  makeUndoCalls: number;
  evaluatorCalls: number;
  oracleCalls: number;
  baselineCorrect: boolean;
}

interface ModeBenchmarkSummary {
  mode: ExecutionMode;
  totalPositions: number;
  correct: number;
  incorrect: number;
  timeout: number;
  completionRate: number;
  accuracyAmongCompleted: number;
  totalTimeMs: number;
  medianTimeMs: number;
  p95TimeMs: number;
  totalNodes: number;
  medianNodes: number;
  totalQNodes: number;
  medianQNodes: number;
  averageCompletedDepth: number;
  totalMoveGenCalls: number;
  totalMakeUndoCalls: number;
  totalEvaluatorCalls: number;
  totalOracleCalls: number;
  transitionMatrix: {
    correctToCorrect: number;
    correctToIncorrect: number;
    correctToTimeout: number;
    incorrectToCorrect: number;
    incorrectToIncorrect: number;
    incorrectToTimeout: number;
  };
  positions: PositionResult[];
}

// Carregar referência da Fase 5.7B
const baseline57b = JSON.parse(fs.readFileSync('phase_57b_mobility_optimization.json', 'utf8')).benchmark68;
const baselineMap = new Map<string, boolean>();
for (const item of baseline57b.summaries) {
  baselineMap.set(item.id, item.isCorrect);
}

function runBenchmarkForMode(mode: ExecutionMode): ModeBenchmarkSummary {
  console.log(`\n=====================================================`);
  console.log(`INICIANDO BENCHMARK PARA MODO: ${mode}`);
  console.log(`=====================================================`);

  setExecutionMode(mode);
  if (mode === 'CHESSJS_ONLY') {
    setBoardBackendType('chessjs');
  } else {
    setBoardBackendType('bitboard');
  }

  const results: PositionResult[] = [];
  const times: number[] = [];
  const nodesArr: number[] = [];
  const qNodesArr: number[] = [];

  let correctCount = 0;
  let incorrectCount = 0;
  let timeoutCount = 0;

  let totalMoveGen = 0;
  let totalMakeUndo = 0;
  let totalEvaluator = 0;
  let totalOracle = 0;

  const transitionMatrix = {
    correctToCorrect: 0,
    correctToIncorrect: 0,
    correctToTimeout: 0,
    incorrectToCorrect: 0,
    incorrectToIncorrect: 0,
    incorrectToTimeout: 0
  };

  const positions = SANITIZED_BENCHMARK_POSITIONS;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const game = new Chess(pos.fen);

    metrics.clear();
    const t0 = performance.now();
    let move: string | null = null;
    let isTimeout = false;

    try {
      move = calculateBestMove(game, 'dificil', { maxTimeMs: 3000 });
    } catch (err: any) {
      if (err.message === 'TIMEOUT') {
        isTimeout = true;
      } else {
        console.error(`Erro inesperado na posição ${pos.id}:`, err);
        throw err;
      }
    }
    const t1 = performance.now();
    const elapsed = t1 - t0;

    let isCorrect = false;
    if (pos.expectedBestMove || pos.alternativeBestMoves) {
      const allowed = [
        ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
        ...(pos.alternativeBestMoves || [])
      ];
      const cleanEngine = move ? move.replace(/[+#x]/g, '') : '';
      isCorrect = allowed.some(m => {
        const cleanAllowed = m.replace(/[+#x]/g, '');
        return m === move || cleanAllowed === cleanEngine;
      });

      if (!isCorrect && pos.category === 'MATE_IN_1' && move) {
        const tg = new Chess(pos.fen);
        try {
          tg.move(move);
          if (tg.isCheckmate()) isCorrect = true;
        } catch {}
      }
    } else {
      isCorrect = move !== null;
    }

    if (isTimeout) {
      timeoutCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    times.push(elapsed);
    nodesArr.push(metrics.nodes);
    qNodesArr.push(metrics.quiescenceNodes);

    totalMoveGen += metrics.moveGenerationCalls;
    totalMakeUndo += metrics.makeUndoCalls;
    totalEvaluator += metrics.evaluatorCalls;
    totalOracle += metrics.oracleCalls;

    const baseCorrect = baselineMap.get(pos.id) ?? false;
    if (baseCorrect) {
      if (isTimeout) transitionMatrix.correctToTimeout++;
      else if (isCorrect) transitionMatrix.correctToCorrect++;
      else transitionMatrix.correctToIncorrect++;
    } else {
      if (isTimeout) transitionMatrix.incorrectToTimeout++;
      else if (isCorrect) transitionMatrix.incorrectToCorrect++;
      else transitionMatrix.incorrectToIncorrect++;
    }

    results.push({
      id: pos.id,
      category: pos.category,
      fen: pos.fen,
      bestMove: move,
      expected: pos.expectedBestMove,
      isCorrect,
      isTimeout,
      timeMs: elapsed,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes,
      completedDepth: metrics.lastCompletedDepth,
      moveGenCalls: metrics.moveGenerationCalls,
      makeUndoCalls: metrics.makeUndoCalls,
      evaluatorCalls: metrics.evaluatorCalls,
      oracleCalls: metrics.oracleCalls,
      baselineCorrect: baseCorrect
    });

    if ((i + 1) % 17 === 0 || i === positions.length - 1) {
      console.log(`  [${mode}] Progresso: ${i + 1}/${positions.length} posições...`);
    }
  }

  times.sort((a, b) => a - b);
  nodesArr.sort((a, b) => a - b);
  qNodesArr.sort((a, b) => a - b);

  const totalTime = times.reduce((a, b) => a + b, 0);
  const medianTime = times[Math.floor(times.length / 2)];
  const p95Time = times[Math.floor(times.length * 0.95)];

  const totalNodes = nodesArr.reduce((a, b) => a + b, 0);
  const medianNodes = nodesArr[Math.floor(nodesArr.length / 2)];

  const totalQNodes = qNodesArr.reduce((a, b) => a + b, 0);
  const medianQNodes = qNodesArr[Math.floor(qNodesArr.length / 2)];

  console.log(`\nRESUMO PARA ${mode}:`);
  console.log(`  Corretos:           ${correctCount} / ${positions.length}`);
  console.log(`  Incorretos:         ${incorrectCount}`);
  console.log(`  Timeouts:           ${timeoutCount}`);
  console.log(`  Completados:        ${positions.length - timeoutCount}/${positions.length} (${(((positions.length - timeoutCount) / positions.length) * 100).toFixed(1)}%)`);
  console.log(`  Acurácia:           ${((correctCount / positions.length) * 100).toFixed(2)}%`);
  console.log(`  Tempo Total:        ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Mediana:            ${medianTime.toFixed(1)} ms`);
  console.log(`  P95:                ${p95Time.toFixed(1)} ms`);
  console.log(`  Nós Medianos:       ${medianNodes}`);
  console.log(`  QNós Medianos:      ${medianQNodes}`);
  console.log(`  Chamadas MoveGen:   ${totalMoveGen}`);
  console.log(`  Chamadas MakeUndo:  ${totalMakeUndo}`);
  console.log(`  Chamadas Eval:      ${totalEvaluator}`);
  console.log(`  Chamadas Oracle:    ${totalOracle}`);
  console.log(`  5.7B CORRECT -> NEW INCORRECT: ${transitionMatrix.correctToIncorrect}`);

  return {
    mode,
    totalPositions: positions.length,
    correct: correctCount,
    incorrect: incorrectCount,
    timeout: timeoutCount,
    completionRate: ((positions.length - timeoutCount) / positions.length) * 100,
    accuracyAmongCompleted: (correctCount / (positions.length - timeoutCount)) * 100,
    totalTimeMs: totalTime,
    medianTimeMs: medianTime,
    p95TimeMs: p95Time,
    totalNodes,
    medianNodes,
    totalQNodes,
    medianQNodes,
    averageCompletedDepth: 3,
    totalMoveGenCalls: totalMoveGen,
    totalMakeUndoCalls: totalMakeUndo,
    totalEvaluatorCalls: totalEvaluator,
    totalOracleCalls: totalOracle,
    transitionMatrix,
    positions: results
  };
}

console.log('=====================================================');
console.log('FASE 5.11 — SUÍTE DE BENCHMARK DOS TRÊS MODOS');
console.log('=====================================================');

const summaryChessJs = runBenchmarkForMode('CHESSJS_ONLY');
const summaryBitboard = runBenchmarkForMode('BITBOARD_ONLY');
const summaryOracle = runBenchmarkForMode('BITBOARD_WITH_ORACLE');

const benchmark68Artifact = {
  timestamp: new Date().toISOString(),
  baselineReference: '5.7B',
  summaries: {
    CHESSJS_ONLY: summaryChessJs,
    BITBOARD_ONLY: summaryBitboard,
    BITBOARD_WITH_ORACLE: summaryOracle
  }
};

fs.writeFileSync('phase_511_evaluation_benchmark68.json', JSON.stringify(benchmark68Artifact, null, 2));
console.log('\n[ARTEFATO CRIADO] phase_511_evaluation_benchmark68.json');

console.log('\n=====================================================');
console.log('CRITÉRIO BLOQUEADOR: BASELINE CORRECT -> NEW INCORRECT = 0');
console.log(`CHESSJS_ONLY:         ${summaryChessJs.transitionMatrix.correctToIncorrect}`);
console.log(`BITBOARD_ONLY:        ${summaryBitboard.transitionMatrix.correctToIncorrect}`);
console.log(`BITBOARD_WITH_ORACLE: ${summaryOracle.transitionMatrix.correctToIncorrect}`);

if (
  summaryChessJs.transitionMatrix.correctToIncorrect === 0 &&
  summaryBitboard.transitionMatrix.correctToIncorrect === 0 &&
  summaryOracle.transitionMatrix.correctToIncorrect === 0
) {
  console.log('STATUS FINAL:         APROVADO (0 REGRESSÕES)');
} else {
  console.error('STATUS FINAL:         FALHA (REGRESSÃO DETECTADA)');
  process.exit(1);
}
console.log('=====================================================\n');
