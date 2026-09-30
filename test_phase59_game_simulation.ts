/**
 * FASE 5.9 — SIMULAÇÃO DE 100 PARTIDAS COMPLETAS (REAL GAME SIMULATION)
 *
 * Simula 100 partidas jogadas lance a lance em paralelo:
 * - A cada lance:
 *   - Gera lances legais em Bitboard e Chess.js (conjuntos idênticos)
 *   - Escolhe um lance legal aleatório
 *   - Aplica makeMove() em BitboardBackend e ChessJsBackend
 *   - Compara o estado FEN resultante
 *   - Continua até xeque-mate, afogamento, 50 lances ou 120 plies
 */

import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { ChessJsBackend } from './src/lib/board/chessJsBackend';
import { formatMoveCanonical } from './src/lib/board/validator';

console.log('=====================================================');
console.log('FASE 5.9 — SIMULAÇÃO DE 100 PARTIDAS COMPLETAS');
console.log('=====================================================\n');

const NUM_GAMES = 100;
const MAX_PLIES_PER_GAME = 120;

let totalPliesSimulated = 0;
let divergences = 0;

let seed = 1234567;
function randomChoice<T>(arr: T[]): T {
  seed = (seed * 9301 + 49297) % 233280;
  const idx = Math.floor((seed / 233280) * arr.length);
  return arr[idx];
}

const t0 = performance.now();

for (let gameId = 1; gameId <= NUM_GAMES; gameId++) {
  const bb = new BitboardBackend();
  const cb = new ChessJsBackend();

  let plies = 0;

  for (let ply = 0; ply < MAX_PLIES_PER_GAME; ply++) {
    if (cb.isGameOver() || bb.isGameOver()) {
      break;
    }

    const bbMoves = bb.generateLegalMoves();
    const cbMoves = cb.generateLegalMoves();

    const bbMoveKeys = bbMoves.map(formatMoveCanonical).sort();
    const cbMoveKeys = cbMoves.map(formatMoveCanonical).sort();

    if (bbMoveKeys.length !== cbMoveKeys.length || !bbMoveKeys.every((m, idx) => m === cbMoveKeys[idx])) {
      divergences++;
      console.error(`Divergência de lances legais na Partida ${gameId}, Ply ${ply}:`);
      console.error(`  Bitboard:`, bbMoveKeys);
      console.error(`  ChessJs: `, cbMoveKeys);
      break;
    }

    if (bbMoves.length === 0) break;

    // Escolher um lance legal aleatório
    const chosenKey = randomChoice(bbMoveKeys);
    const bbM = bbMoves.find(m => formatMoveCanonical(m) === chosenKey)!;
    const cbM = cbMoves.find(m => formatMoveCanonical(m) === chosenKey)!;

    bb.makeMove(bbM);
    cb.makeMove(cbM);

    const bbFen = bb.getFEN({ forceEnpassantSquare: true });
    const cbFen = cb.getFEN({ forceEnpassantSquare: true });

    // Normalizar comparação de FEN (peças, turno, roques, ep)
    const bbParts = bbFen.split(' ');
    const cbParts = cbFen.split(' ');

    if (bbParts[0] !== cbParts[0] || bbParts[1] !== cbParts[1] || bbParts[2] !== cbParts[2] || bbParts[3] !== cbParts[3]) {
      divergences++;
      console.error(`Divergência de FEN após lance ${chosenKey} na Partida ${gameId}, Ply ${ply}:`);
      console.error(`  Bitboard FEN: ${bbFen}`);
      console.error(`  ChessJs FEN:  ${cbFen}`);
      break;
    }

    plies++;
    totalPliesSimulated++;
  }

  if (divergences > 0) break;

  if (gameId % 20 === 0 || gameId === NUM_GAMES) {
    console.log(`  Progresso: ${gameId}/${NUM_GAMES} partidas completadas (${totalPliesSimulated} plies no total)...`);
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
console.log('\n=====================================================');
console.log(`RESULTADO DA SIMULAÇÃO DE PARTIDAS:`);
console.log(`  Partidas completadas: ${NUM_GAMES}/${NUM_GAMES}`);
console.log(`  Total de plies:       ${totalPliesSimulated}`);
console.log(`  Divergências:         ${divergences}`);
console.log(`  Tempo decorrido:      ${elapsed} s`);
console.log('=====================================================');

if (divergences === 0) {
  console.log('100% DE EQUIVALÊNCIA EM SIMULAÇÃO DE JOGO REAL CONFIRMADA!');
} else {
  console.error('FALHA NA SIMULAÇÃO DE JOGO REAL!');
  process.exit(1);
}
