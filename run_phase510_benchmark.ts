/**
 * FASE 5.10 — BENCHMARK OFICIAL DE 68 POSIÇÕES & ISOLAMENTO DE PERFORMANCE
 *
 * Executa os 68 FENs oficiais nos três modos explícitos:
 * 1. CHESSJS_ONLY
 * 2. BITBOARD_ONLY
 * 3. BITBOARD_WITH_ORACLE
 *
 * Gera:
 * - phase_510_backend_performance.json
 * - phase_510_benchmark68.json
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  calculateBestMove,
  metrics,
  setExecutionMode,
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

  const results: PositionResult[] = [];
  let correctCount = 0;
  let timeoutCount = 0;
  let incorrectCount = 0;

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

    results.push({
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
      completedDepth: metrics.lastCompletedDepth,
      moveGenCalls: metrics.moveGenerationCalls,
      makeUndoCalls: metrics.makeUndoCalls,
      evaluatorCalls: metrics.evaluatorCalls,
      oracleCalls: metrics.oracleCalls,
      baselineCorrect: baseCorr
    });

    if ((i + 1) % 17 === 0 || i === SANITIZED_BENCHMARK_POSITIONS.length - 1) {
      console.log(`  [${mode}] Progresso: ${i + 1}/68 posições...`);
    }
  }

  const totalTimeMs = performance.now() - tStart;
  const times = results.map(r => r.timeMs).sort((a, b) => a - b);
  const medianTimeMs = times[Math.floor(times.length / 2)];
  const p95TimeMs = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];

  const nodesList = results.map(r => r.nodes).sort((a, b) => a - b);
  const medianNodes = nodesList[Math.floor(nodesList.length / 2)];
  const totalNodes = results.reduce((sum, r) => sum + r.nodes, 0);

  const qNodesList = results.map(r => r.qNodes).sort((a, b) => a - b);
  const medianQNodes = qNodesList[Math.floor(qNodesList.length / 2)];
  const totalQNodes = results.reduce((sum, r) => sum + r.qNodes, 0);

  const totalDepths = results.reduce((sum, r) => sum + r.completedDepth, 0);
  const averageCompletedDepth = totalDepths / results.length;

  const totalMoveGenCalls = results.reduce((sum, r) => sum + r.moveGenCalls, 0);
  const totalMakeUndoCalls = results.reduce((sum, r) => sum + r.makeUndoCalls, 0);
  const totalEvaluatorCalls = results.reduce((sum, r) => sum + r.evaluatorCalls, 0);
  const totalOracleCalls = results.reduce((sum, r) => sum + r.oracleCalls, 0);

  const completedCount = 68 - timeoutCount;
  const accuracyAmongCompleted = (correctCount / completedCount) * 100;
  const completionRate = (completedCount / 68) * 100;

  console.log(`\nRESUMO PARA ${mode}:`);
  console.log(`  Corretos:           ${correctCount} / 68`);
  console.log(`  Incorretos:         ${incorrectCount}`);
  console.log(`  Timeouts:           ${timeoutCount}`);
  console.log(`  Completados:        ${completedCount}/68 (${completionRate.toFixed(1)}%)`);
  console.log(`  Acurácia:           ${accuracyAmongCompleted.toFixed(2)}%`);
  console.log(`  Tempo Total:        ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Mediana:            ${medianTimeMs.toFixed(1)} ms`);
  console.log(`  P95:                ${p95TimeMs.toFixed(1)} ms`);
  console.log(`  Nós Medianos:       ${medianNodes}`);
  console.log(`  QNós Medianos:      ${medianQNodes}`);
  console.log(`  Chamadas MoveGen:   ${totalMoveGenCalls}`);
  console.log(`  Chamadas MakeUndo:  ${totalMakeUndoCalls}`);
  console.log(`  Chamadas Eval:      ${totalEvaluatorCalls}`);
  console.log(`  Chamadas Oracle:    ${totalOracleCalls}`);
  console.log(`  5.7B CORRECT -> NEW INCORRECT: ${correctToIncorrect}`);

  return {
    mode,
    totalPositions: 68,
    correct: correctCount,
    incorrect: incorrectCount,
    timeout: timeoutCount,
    completionRate,
    accuracyAmongCompleted,
    totalTimeMs,
    medianTimeMs,
    p95TimeMs,
    totalNodes,
    medianNodes,
    totalQNodes,
    medianQNodes,
    averageCompletedDepth,
    totalMoveGenCalls,
    totalMakeUndoCalls,
    totalEvaluatorCalls,
    totalOracleCalls,
    transitionMatrix: {
      correctToCorrect,
      correctToIncorrect,
      correctToTimeout,
      incorrectToCorrect,
      incorrectToIncorrect,
      incorrectToTimeout
    },
    positions: results
  };
}

async function main() {
  console.log('=====================================================');
  console.log('FASE 5.10 — SUÍTE DE BENCHMARK DOS TRÊS MODOS');
  console.log('=====================================================');

  const chessJsSummary = runBenchmarkForMode('CHESSJS_ONLY');
  const bitboardSummary = runBenchmarkForMode('BITBOARD_ONLY');
  const oracleSummary = runBenchmarkForMode('BITBOARD_WITH_ORACLE');

  // Gerar phase_510_backend_performance.json
  const perfData = {
    timestamp: new Date().toISOString(),
    benchmark: 'OFFICIAL_68_FENS',
    modes: {
      CHESSJS_ONLY: {
        totalTimeMs: chessJsSummary.totalTimeMs,
        medianTimeMs: chessJsSummary.medianTimeMs,
        p95TimeMs: chessJsSummary.p95TimeMs,
        totalNodes: chessJsSummary.totalNodes,
        medianNodes: chessJsSummary.medianNodes,
        totalQNodes: chessJsSummary.totalQNodes,
        medianQNodes: chessJsSummary.medianQNodes,
        completedDepth: chessJsSummary.averageCompletedDepth,
        timeouts: chessJsSummary.timeout,
        correct: chessJsSummary.correct,
        accuracy: chessJsSummary.accuracyAmongCompleted,
        moveGenCalls: chessJsSummary.totalMoveGenCalls,
        makeUndoCalls: chessJsSummary.totalMakeUndoCalls,
        evaluatorCalls: chessJsSummary.totalEvaluatorCalls,
        oracleCalls: chessJsSummary.totalOracleCalls
      },
      BITBOARD_ONLY: {
        totalTimeMs: bitboardSummary.totalTimeMs,
        medianTimeMs: bitboardSummary.medianTimeMs,
        p95TimeMs: bitboardSummary.p95TimeMs,
        totalNodes: bitboardSummary.totalNodes,
        medianNodes: bitboardSummary.medianNodes,
        totalQNodes: bitboardSummary.totalQNodes,
        medianQNodes: bitboardSummary.medianQNodes,
        completedDepth: bitboardSummary.averageCompletedDepth,
        timeouts: bitboardSummary.timeout,
        correct: bitboardSummary.correct,
        accuracy: bitboardSummary.accuracyAmongCompleted,
        moveGenCalls: bitboardSummary.totalMoveGenCalls,
        makeUndoCalls: bitboardSummary.totalMakeUndoCalls,
        evaluatorCalls: bitboardSummary.totalEvaluatorCalls,
        oracleCalls: bitboardSummary.totalOracleCalls
      },
      BITBOARD_WITH_ORACLE: {
        totalTimeMs: oracleSummary.totalTimeMs,
        medianTimeMs: oracleSummary.medianTimeMs,
        p95TimeMs: oracleSummary.p95TimeMs,
        totalNodes: oracleSummary.totalNodes,
        medianNodes: oracleSummary.medianNodes,
        totalQNodes: oracleSummary.totalQNodes,
        medianQNodes: oracleSummary.medianQNodes,
        completedDepth: oracleSummary.averageCompletedDepth,
        timeouts: oracleSummary.timeout,
        correct: oracleSummary.correct,
        accuracy: oracleSummary.accuracyAmongCompleted,
        moveGenCalls: oracleSummary.totalMoveGenCalls,
        makeUndoCalls: oracleSummary.totalMakeUndoCalls,
        evaluatorCalls: oracleSummary.totalEvaluatorCalls,
        oracleCalls: oracleSummary.totalOracleCalls
      }
    },
    speedupBitboardVsChessJs: {
      medianTimeReductionPercent: ((chessJsSummary.medianTimeMs - bitboardSummary.medianTimeMs) / chessJsSummary.medianTimeMs) * 100,
      totalTimeReductionPercent: ((chessJsSummary.totalTimeMs - bitboardSummary.totalTimeMs) / chessJsSummary.totalTimeMs) * 100
    },
    oracleOverheadPercent: ((oracleSummary.medianTimeMs - bitboardSummary.medianTimeMs) / bitboardSummary.medianTimeMs) * 100
  };

  fs.writeFileSync('phase_510_backend_performance.json', JSON.stringify(perfData, null, 2));
  console.log('\n[ARTEFATO CRIADO] phase_510_backend_performance.json');

  // Gerar phase_510_benchmark68.json
  const bench68Data = {
    timestamp: new Date().toISOString(),
    baselineReference: '5.7B',
    summaries: {
      CHESSJS_ONLY: chessJsSummary,
      BITBOARD_ONLY: bitboardSummary,
      BITBOARD_WITH_ORACLE: oracleSummary
    },
    transitionMatrices: {
      CHESSJS_ONLY: chessJsSummary.transitionMatrix,
      BITBOARD_ONLY: bitboardSummary.transitionMatrix,
      BITBOARD_WITH_ORACLE: oracleSummary.transitionMatrix
    },
    criticalConditionPassed: (
      chessJsSummary.transitionMatrix.correctToIncorrect === 0 &&
      bitboardSummary.transitionMatrix.correctToIncorrect === 0 &&
      oracleSummary.transitionMatrix.correctToIncorrect === 0
    )
  };

  fs.writeFileSync('phase_510_benchmark68.json', JSON.stringify(bench68Data, null, 2));
  console.log('[ARTEFATO CRIADO] phase_510_benchmark68.json');

  console.log('\n=====================================================');
  console.log('CRITÉRIO BLOQUEADOR: BASELINE CORRECT -> NEW INCORRECT = 0');
  console.log(`CHESSJS_ONLY:         ${chessJsSummary.transitionMatrix.correctToIncorrect}`);
  console.log(`BITBOARD_ONLY:        ${bitboardSummary.transitionMatrix.correctToIncorrect}`);
  console.log(`BITBOARD_WITH_ORACLE: ${oracleSummary.transitionMatrix.correctToIncorrect}`);
  console.log(`STATUS FINAL:         ${bench68Data.criticalConditionPassed ? 'APROVADO (0 REGRESSÕES)' : 'REPROVADO'}`);
  console.log('=====================================================');
}

main().catch(err => {
  console.error('Erro na execução do benchmark:', err);
  process.exit(1);
});
