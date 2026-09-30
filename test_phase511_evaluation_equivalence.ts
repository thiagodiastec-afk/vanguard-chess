/**
 * FASE 5.11 — TESTE DE EQUIVALÊNCIA EXATA DE AVALIAÇÃO ESTÁTICA
 *
 * Validação termo a termo entre o Oráculo (evaluateBoard / evaluateBreakdown do chess.js)
 * e o novo Avaliador Bitboard Nativo (evaluateBitboardBreakdown / evaluateBoardBitboard).
 *
 * Tolerância: ZERO centipawns de diferença em qualquer termo ou score final.
 */

import { Chess } from 'chess.js';
import { evaluateBoard } from './src/lib/engine';
import { evaluateBreakdown, EvaluationBreakdown } from './src/lib/auditBreakdown';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { evaluateBitboardBreakdown, evaluateBoardBitboard } from './src/lib/bitboard/evaluation';
import { CONTROLLED_POSITIONS } from './test_phase58_legal_equivalence';
import { BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('FASE 5.11 — TESTE DE EQUIVALÊNCIA DA AVALIAÇÃO ESTÁTICA');
console.log('=====================================================\n');

let totalTested = 0;
let passedPositions = 0;
let failedPositions = 0;

interface TermDiff {
  term: string;
  ref: number;
  bb: number;
  diff: number;
}

function compareBreakdowns(ref: EvaluationBreakdown, bb: EvaluationBreakdown): TermDiff[] {
  const diffs: TermDiff[] = [];
  const terms: (keyof EvaluationBreakdown)[] = [
    'material',
    'pstMiddleGame',
    'pstEndGame',
    'phase',
    'taperedBase',
    'passedPawn',
    'bishopPair',
    'rookActivity',
    'doubledPawn',
    'isolatedPawn',
    'pawnStructure',
    'mobility',
    'pawnShield',
    'kingAttackers',
    'kingTropism',
    'total'
  ];

  for (const term of terms) {
    if (ref[term] !== bb[term]) {
      diffs.push({
        term,
        ref: ref[term],
        bb: bb[term],
        diff: bb[term] - ref[term]
      });
    }
  }
  return diffs;
}

// -------------------------------------------------------------
// 1. Posições Controladas (105 posições da Fase 5.8)
// -------------------------------------------------------------
console.log('--- 1. TESTE EM POSIÇÕES CONTROLADAS (105 FENs) ---');

let controlledFailures = 0;
for (const p of CONTROLLED_POSITIONS) {
  totalTested++;
  const g = new Chess(p.fen);
  const backend = new BitboardBackend(p.fen);
  const state = backend.getBoardState();

  const refBreakdown = evaluateBreakdown(g);
  const bbBreakdown = evaluateBitboardBreakdown(state);
  const refFinal = evaluateBoard(g);
  const bbFinal = evaluateBoardBitboard(state);

  const diffs = compareBreakdowns(refBreakdown, bbBreakdown);
  if (diffs.length > 0 || refFinal !== bbFinal) {
    controlledFailures++;
    failedPositions++;
    console.error(`[FAIL] Divergência em posição controlada: ${p.description || p.id}`);
    console.error(`  FEN: ${p.fen}`);
    console.error(`  refFinal=${refFinal} vs bbFinal=${bbFinal}`);
    for (const d of diffs) {
      console.error(`  - Termo ${d.term}: ref=${d.ref} vs bb=${d.bb} (diff=${d.diff})`);
    }
    if (controlledFailures >= 5) {
      console.error('Interrompendo após 5 falhas para diagnóstico...');
      break;
    }
  } else {
    passedPositions++;
  }
}

if (controlledFailures === 0) {
  console.log(`[PASS] 105/105 posições controladas com equivalência exata de avaliação!\n`);
} else {
  console.error(`[FAIL] ${controlledFailures} falhas em posições controladas!\n`);
  process.exit(1);
}

// -------------------------------------------------------------
// 2. Posições Oficiais do Benchmark (68 FENs)
// -------------------------------------------------------------
console.log('--- 2. TESTE EM POSIÇÕES OFICIAIS DO BENCHMARK (68 FENs) ---');

let benchFailures = 0;
for (const pos of BENCHMARK_POSITIONS) {
  totalTested++;
  const g = new Chess(pos.fen);
  const backend = new BitboardBackend(pos.fen);
  const state = backend.getBoardState();

  const refBreakdown = evaluateBreakdown(g);
  const bbBreakdown = evaluateBitboardBreakdown(state);
  const refFinal = evaluateBoard(g);
  const bbFinal = evaluateBoardBitboard(state);

  const diffs = compareBreakdowns(refBreakdown, bbBreakdown);
  if (diffs.length > 0 || refFinal !== bbFinal) {
    benchFailures++;
    failedPositions++;
    console.error(`[FAIL] Divergência no benchmark: ${pos.id}`);
    console.error(`  FEN: ${pos.fen}`);
    console.error(`  refFinal=${refFinal} vs bbFinal=${bbFinal}`);
    for (const d of diffs) {
      console.error(`  - Termo ${d.term}: ref=${d.ref} vs bb=${d.bb} (diff=${d.diff})`);
    }
    if (benchFailures >= 5) break;
  } else {
    passedPositions++;
  }
}

if (benchFailures === 0) {
  console.log(`[PASS] 68/68 posições do benchmark com equivalência exata de avaliação!\n`);
} else {
  console.error(`[FAIL] ${benchFailures} falhas no benchmark!\n`);
  process.exit(1);
}

// -------------------------------------------------------------
// 3. Validação em Posições Aleatórias Alcançáveis (5.000 FENs)
// -------------------------------------------------------------
console.log('--- 3. TESTE MASSIVO EM 5.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS ---');

function generateReachableFens(count: number): string[] {
  const fens: Set<string> = new Set();
  while (fens.size < count) {
    const game = new Chess();
    const plies = 5 + Math.floor(Math.random() * 45);
    for (let p = 0; p < plies; p++) {
      if (game.isGameOver()) break;
      const moves = game.moves();
      if (moves.length === 0) break;
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      game.move(randomMove);
      fens.add(game.fen());
      if (fens.size >= count) break;
    }
  }
  return Array.from(fens);
}

const randomFens = generateReachableFens(5000);
let randomFailures = 0;
const startTime = performance.now();

for (let i = 0; i < randomFens.length; i++) {
  const fen = randomFens[i];
  totalTested++;
  const g = new Chess(fen);
  const backend = new BitboardBackend(fen);
  const state = backend.getBoardState();

  const refFinal = evaluateBoard(g);
  const bbFinal = evaluateBoardBitboard(state);

  if (refFinal !== bbFinal) {
    randomFailures++;
    failedPositions++;
    const refBreakdown = evaluateBreakdown(g);
    const bbBreakdown = evaluateBitboardBreakdown(state);
    const diffs = compareBreakdowns(refBreakdown, bbBreakdown);
    console.error(`[FAIL] Divergência em posição aleatória #${i + 1}`);
    console.error(`  FEN: ${fen}`);
    console.error(`  refFinal=${refFinal} vs bbFinal=${bbFinal}`);
    for (const d of diffs) {
      console.error(`  - Termo ${d.term}: ref=${d.ref} vs bb=${d.bb} (diff=${d.diff})`);
    }
    if (randomFailures >= 5) break;
  } else {
    passedPositions++;
  }

  if ((i + 1) % 1000 === 0) {
    console.log(`  Progresso: ${i + 1}/5000 posições validadas...`);
  }
}

const duration = ((performance.now() - startTime) / 1000).toFixed(2);

console.log('\n=====================================================');
console.log('RESUMO DA EQUIVALÊNCIA DA AVALIAÇÃO:');
console.log(`  Total de Posições Testadas: ${totalTested}`);
console.log(`  Posições Aprovadas:         ${passedPositions}/${totalTested} (${((passedPositions / totalTested) * 100).toFixed(2)}%)`);
console.log(`  Divergências de Score:      ${failedPositions}`);
console.log(`  Tempo Total:                ${duration} s`);
console.log('=====================================================');

if (failedPositions === 0) {
  console.log('\nEQUIVALÊNCIA EXATA DE AVALIAÇÃO 100% CONFIRMADA (ZERO DIVERGÊNCIAS)!');
} else {
  console.error('\nFALHA NA EQUIVALÊNCIA DE AVALIAÇÃO!');
  process.exit(1);
}
