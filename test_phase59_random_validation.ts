/**
 * FASE 5.9 — VALIDAÇÃO MASSIVA EM 5.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS
 *
 * Gera 5.000 posições únicas alcançáveis via random play a partir da posição inicial.
 * Em cada posição:
 * - BitboardBackend.generateLegalMoves()
 * - ChessJsBackend.generateLegalMoves()
 * - 100% de equivalência no conjunto de lances legais (sem missing, sem extra)
 */

import { Chess } from 'chess.js';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { ChessJsBackend } from './src/lib/board/chessJsBackend';
import { DualValidator, formatMoveCanonical } from './src/lib/board/validator';

console.log('=====================================================');
console.log('FASE 5.9 — VALIDAÇÃO MASSIVA EM 5.000 POSIÇÕES');
console.log('=====================================================\n');

const TARGET_POSITIONS = 5000;
const reachableFens: string[] = [];

// Gerador de posições alcançáveis
let seed = 42;
function randomChoice<T>(arr: T[]): T {
  seed = (seed * 9301 + 49297) % 233280;
  const idx = Math.floor((seed / 233280) * arr.length);
  return arr[idx];
}

console.log(`Gerando ${TARGET_POSITIONS} posições aleatórias alcançáveis...`);
const seenFens = new Set<string>();

while (reachableFens.length < TARGET_POSITIONS) {
  const g = new Chess();
  const maxPlies = 10 + Math.floor((seed / 233280) * 70); // 10 a 80 plies

  for (let ply = 0; ply < maxPlies; ply++) {
    if (g.isGameOver()) break;
    const moves = g.moves();
    if (moves.length === 0) break;
    const move = randomChoice(moves);
    g.move(move);

    const fen = g.fen();
    if (!seenFens.has(fen)) {
      seenFens.add(fen);
      reachableFens.push(fen);
      if (reachableFens.length >= TARGET_POSITIONS) break;
    }
  }
}

console.log(`${reachableFens.length} posições alcançáveis únicas geradas.\nIniciando validação cruzada contra o Oráculo Chess.js...`);

let passed = 0;
let divergences = 0;
const t0 = performance.now();

for (let i = 0; i < reachableFens.length; i++) {
  const fen = reachableFens[i];
  const result = DualValidator.validateMoves(fen);

  if (!result.ok) {
    divergences++;
    console.error(`\nDIVERGÊNCIA ENCONTRADA na posição ${i + 1}:`);
    console.error(result.report);
    break;
  }

  passed++;
  if ((i + 1) % 1000 === 0 || i === reachableFens.length - 1) {
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    console.log(`  Progresso: ${i + 1}/${TARGET_POSITIONS} posições validadas (${elapsed} s)...`);
  }
}

const totalTime = ((performance.now() - t0) / 1000).toFixed(2);
console.log('\n=====================================================');
console.log(`RESULTADO DA VALIDAÇÃO MASSIVA (5.000 POSIÇÕES):`);
console.log(`  Posições testadas: ${passed}/${TARGET_POSITIONS}`);
console.log(`  Divergências:      ${divergences}`);
console.log(`  Tempo total:       ${totalTime} s`);
console.log(`  Taxa de aprovação: ${((passed / TARGET_POSITIONS) * 100).toFixed(2)}%`);
console.log('=====================================================');

if (divergences === 0 && passed === TARGET_POSITIONS) {
  console.log('100% DE EQUIVALÊNCIA LEGAL EM 5.000 POSIÇÕES CONFIRMADA!');
} else {
  console.error('FALHA NA VALIDAÇÃO MASSIVA!');
  process.exit(1);
}
