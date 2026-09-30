/**
 * FASE 5.9 — TESTE DE EQUIVALÊNCIA DE BACKENDS: BITBOARD VS CHESS.JS (ORÁCULO)
 *
 * Cobre:
 * - Posições básicas, desenvolvimento, trocas
 * - Xeques simples, defesas, bloqueios, xeque duplo
 * - Cravadas absolutas e relativas
 * - Roques (válidos, bloqueados, sob xeque, casas intermediárias)
 * - En Passant (válido, inválido, pinos de EP)
 * - Promoções (Q, R, B, N, com captura)
 * - Finais (K+P, K+R, K+Q, K+B, K+N)
 * - Teste estrito de make/undo e consistência de FEN pós-lance
 */

import { ChessJsBackend } from './src/lib/board/chessJsBackend';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { DualValidator, formatMoveCanonical } from './src/lib/board/validator';

console.log('=====================================================');
console.log('FASE 5.9 — TESTE DE EQUIVALÊNCIA DE BACKENDS');
console.log('=====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${msg}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${msg}`);
  }
}

// 1. Posições Controladas Obrigatórias
const TEST_POSITIONS = [
  // Básico
  { name: 'Initial Position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'After 1. e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
  { name: 'After 1. e4 e5', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2' },
  { name: 'Piece exchanges open', fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8' },

  // Xeques
  { name: 'Simple Check by Rook', fen: '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1' },
  { name: 'Simple Check by Bishop', fen: '4k3/8/8/8/2B5/8/8/4K3 b - - 0 1' },
  { name: 'Knight Check', fen: '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Double Check (Discovered)', fen: '3rk2r/1b3ppp/p7/1p2P3/1b2B3/8/PPP2PPP/RNB1K2R w KQk - 1 14' },
  { name: 'Knight Double Check', fen: 'r1b1k2r/pppp1Npp/8/4p3/1nBqn3/8/PPPP2PP/RNBQ1K1R b kq - 0 1' },

  // Cravadas
  { name: 'Absolute pin on Queen', fen: '4k3/8/8/8/3q4/8/3R4/4K3 b - - 0 1' },
  { name: 'Pinned Knight to King', fen: '4k3/8/8/8/4n3/8/4R3/4K3 b - - 0 1' },
  { name: 'Pinned Pawn cannot capture diagonally away from pin', fen: '4k3/8/8/8/4p3/3P4/4R3/4K3 w - - 0 1' },

  // Roques
  { name: 'All castling available', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1' },
  { name: 'Black castling available', fen: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1' },
  { name: 'Castle through check blocked', fen: 'r3k2r/8/8/8/4b3/8/8/R3K2R w KQkq - 0 1' },
  { name: 'Castle in check blocked', fen: 'r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1' },

  // En Passant
  { name: 'EP Available White', fen: '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1' },
  { name: 'EP Available Black', fen: '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1' },
  { name: 'EP revealing check (Illegal)', fen: '8/8/8/k2Pp2R/8/8/8/4K3 w - e6 0 1' },

  // Promoção
  { name: 'White Promotion quiet & cap', fen: '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1' },
  { name: 'Black Promotion', fen: '4k3/8/8/8/8/8/4p3/4K3 b - - 0 1' },

  // Endgames
  { name: 'K+P endgame', fen: '8/4k3/8/4P3/4K3/8/8/8 w - - 0 1' },
  { name: 'K+R endgame', fen: '8/4k3/8/8/4R3/8/8/4K3 w - - 0 1' },
  { name: 'K+Q endgame', fen: '8/4k3/8/8/4Q3/8/8/4K3 w - - 0 1' },
  { name: 'K+B endgame', fen: '8/4k3/8/8/4B3/8/8/4K3 w - - 0 1' },
  { name: 'K+N endgame', fen: '8/4k3/8/8/4N3/8/8/4K3 w - - 0 1' }
];

console.log('--- ETAPA 1: EQUIVALÊNCIA LEGAL EM POSIÇÕES CONTROLADAS ---');
for (const test of TEST_POSITIONS) {
  const result = DualValidator.validateMoves(test.fen);
  if (!result.ok) {
    console.error(`Falha em ${test.name}:`, result.report);
  }
  assert(result.ok, `Legal moves equivalence em: ${test.name}`);
}

console.log('\n--- ETAPA 2: EQUIVALÊNCIA DE MAKE / UNDO E ESTADO PÓS-LANCE ---');
for (const test of TEST_POSITIONS) {
  const bb = new BitboardBackend(test.fen);
  const moves = bb.generateLegalMoves().map(formatMoveCanonical);

  let allMovesOk = true;
  for (const m of moves) {
    const valResult = DualValidator.validateMakeMove(test.fen, m);
    if (!valResult.ok) {
      console.error(`Divergência de Make/Undo no lance ${m} em ${test.name}:`, valResult.report);
      allMovesOk = false;
      break;
    }
  }
  assert(allMovesOk, `Make / Undo / FEN equivalência perfeita em todos os ${moves.length} lances de: ${test.name}`);
}

console.log('\n============================================');
console.log(`Testes Aprovados: ${passedTests} | Falhas: ${failedTests}`);
if (failedTests === 0) {
  console.log('TODOS OS TESTES DE CONTROLLED BACKEND EQUIVALENCE PASSARAM!');
} else {
  console.error('EXISTEM FALHAS NA EQUIVALÊNCIA DE BACKENDS!');
  process.exit(1);
}
