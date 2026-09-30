/**
 * VANGUARD CHESS — FASE 5.13
 * TESTE DE VALIDAÇÃO RIGOROSA DO ZOBRIST INCREMENTAL
 *
 * Cobre:
 * 1. Teste fundamental de 5.000+ transições com make/undo e comparação contra fullHash.
 * 2. Movimentos especiais: capturas, avanço simples/duplo de peão, en passant, promoções, promoções com captura, roques O-O e O-O-O.
 * 3. Transições de direitos de roque (mover rei, mover torre, capturar torre na casa inicial).
 * 4. Convenção e ciclo de vida de en passant.
 * 5. Sequências de 100 partidas profundas (50+ plies) com make sequencial e rollback completo.
 * 6. Transposition Table: transposição de lances diferentes e discriminação de componentes isolados.
 * 7. Isolamento de estado e simulação de interrupção/rollback.
 */

import { Chess } from 'chess.js';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import type { BitboardBoard } from './src/lib/bitboard/types';
import {
  computeZobristHashBitboard,
  computeZobristHash,
  sideToMoveKey,
  castlingKeys,
  enPassantKeys
} from './src/lib/zobrist';
import {
  parseFen,
  bitboardBoardToFen,
  CASTLE_WK,
  CASTLE_WQ,
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_ALL
} from './src/lib/bitboard';
import { TranspositionTable, Bound } from './src/lib/tt';
import { EngineMove } from './src/lib/board/types';
import { ox88ToSq64 } from './src/lib/board/mapping';

function boardStatesEqual(a: BitboardBoard, b: BitboardBoard): boolean {
  return (
    a.whitePawns === b.whitePawns &&
    a.whiteKnights === b.whiteKnights &&
    a.whiteBishops === b.whiteBishops &&
    a.whiteRooks === b.whiteRooks &&
    a.whiteQueens === b.whiteQueens &&
    a.whiteKing === b.whiteKing &&
    a.blackPawns === b.blackPawns &&
    a.blackKnights === b.blackKnights &&
    a.blackBishops === b.blackBishops &&
    a.blackRooks === b.blackRooks &&
    a.blackQueens === b.blackQueens &&
    a.blackKing === b.blackKing &&
    a.sideToMove === b.sideToMove &&
    a.castlingRights === b.castlingRights &&
    a.enPassantSquare === b.enPassantSquare &&
    a.halfmoveClock === b.halfmoveClock &&
    a.fullmoveNumber === b.fullmoveNumber
  );
}

function cloneBoardState(b: BitboardBoard): BitboardBoard {
  return {
    whitePawns: b.whitePawns,
    whiteKnights: b.whiteKnights,
    whiteBishops: b.whiteBishops,
    whiteRooks: b.whiteRooks,
    whiteQueens: b.whiteQueens,
    whiteKing: b.whiteKing,
    blackPawns: b.blackPawns,
    blackKnights: b.blackKnights,
    blackBishops: b.blackBishops,
    blackRooks: b.blackRooks,
    blackQueens: b.blackQueens,
    blackKing: b.blackKing,
    whiteOccupancy: b.whiteOccupancy,
    blackOccupancy: b.blackOccupancy,
    allOccupancy: b.allOccupancy,
    sideToMove: b.sideToMove,
    castlingRights: b.castlingRights,
    enPassantSquare: b.enPassantSquare,
    halfmoveClock: b.halfmoveClock,
    fullmoveNumber: b.fullmoveNumber,
    zobristHash: b.zobristHash
  };
}

let totalTransitionsTested = 0;
let failures = 0;

function assert(condition: boolean, msg: string, diagnostics?: any): void {
  if (!condition) {
    failures++;
    console.error(`\n[BLOCKED - FALHA DE VALIDAÇÃO] ${msg}`);
    if (diagnostics) {
      console.error('Detalhes do Erro:', JSON.stringify(diagnostics, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    }
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('================================================================');
console.log(' VANGUARD CHESS — FASE 5.13: AUDITORIA DO ZOBRIST INCREMENTAL');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. TESTES DE MOVIMENTOS ESPECIAIS OBRIGATÓRIOS
// -------------------------------------------------------------
console.log('--- 1. Validando Movimentos Especiais Obrigatórios ---');

function testSingleMoveSpecial(fen: string, desc: string, filterMove?: (m: EngineMove) => boolean): void {
  const backend = new BitboardBackend(fen);
  const moves = backend.generateLegalMoves();
  const targetMoves = filterMove ? moves.filter(filterMove) : moves;
  assert(targetMoves.length > 0, `Nenhum movimento encontrado para ${desc} em ${fen}`);

  for (const m of targetMoves) {
    totalTransitionsTested++;
    const stateBefore = cloneBoardState(backend.getBoardState());
    const hashBefore = backend.getZobristHash();
    const fullHashBefore = computeZobristHashBitboard(backend.getBoardState());
    assert(hashBefore === fullHashBefore, `Hash antes do lance diverge em ${desc}`, { fen, hashBefore, fullHashBefore });

    const undo = backend.makeMove(m);
    const hashAfterMake = backend.getZobristHash();
    const fullHashAfterMake = computeZobristHashBitboard(backend.getBoardState());
    assert(hashAfterMake === fullHashAfterMake, `Hash após make diverge em ${desc}`, { fen, move: m, hashAfterMake, fullHashAfterMake });

    backend.undoMove(undo);
    const hashAfterUndo = backend.getZobristHash();
    const stateAfterUndo = backend.getBoardState();
    assert(hashAfterUndo === hashBefore, `Hash após undo diverge em ${desc}`, { fen, move: m, hashAfterUndo, hashBefore });
    assert(boardStatesEqual(stateBefore, stateAfterUndo), `Estado após undo diverge em ${desc}`, { fen, move: m });
  }
  console.log(`  ✓ [PASS] ${desc} (${targetMoves.length} lances testados)`);
}

// A. Captura normal
testSingleMoveSpecial('r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 6', 'Capturas Normais', m => !!m.captured);

// B. Avanço simples e duplo de peão
testSingleMoveSpecial('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Avanço de Peão (1 e 2 casas)', m => m.piece === 'p');

// C. En passant: captura real
testSingleMoveSpecial('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'Captura En Passant Brancas', m => !!(m.flags & 8));
testSingleMoveSpecial('rnbqkbnr/pppp1ppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 2', 'Captura En Passant Negras', m => !!(m.flags & 8));

// D. Todas as promoções (Dama, Torre, Bispo, Cavalo)
testSingleMoveSpecial('8/4P3/8/8/8/8/k6K/8 w - - 0 1', 'Promoções Silenciosas (todas as 4 peças)');

// E. Promoções com captura (todas as 4 peças)
testSingleMoveSpecial('3r4/4P3/8/8/8/8/k6K/8 w - - 0 1', 'Promoções com Captura', m => !!m.captured && !!m.promotion);

// F. Roques O-O e O-O-O Brancas e Negras
testSingleMoveSpecial('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'Roques O-O e O-O-O Brancas', m => !!(m.flags & (32 | 64)));
testSingleMoveSpecial('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'Roques O-O e O-O-O Negras', m => !!(m.flags & (32 | 64)));

// G. Perda de direitos de roque ao capturar torre na casa inicial
testSingleMoveSpecial('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'Captura de Torre em Canto (A8/H8)', m => m.to === 0 || m.to === 7 || m.to === 56 || m.to === 63);

// -------------------------------------------------------------
// 2. TRANSIÇÕES ESPECÍFICAS DE DIREITOS DE ROQUE
// -------------------------------------------------------------
console.log('\n--- 2. Validando Transições de Direitos de Roque ---');

const castlingFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const bCast = new BitboardBackend(castlingFen);

// 1. Mover Rei Branco: perde KQ
const movesK = bCast.generateLegalMoves().filter(m => m.piece === 'k');
for (const m of movesK) {
  totalTransitionsTested++;
  const undo = bCast.makeMove(m);
  const bs = bCast.getBoardState();
  assert((bs.castlingRights & (CASTLE_WK | CASTLE_WQ)) === 0, 'Rei branco moveu mas manteve direitos WK/WQ');
  assert(bCast.getZobristHash() === computeZobristHashBitboard(bs), 'Hash diverge após perda de roque do rei branco');
  bCast.undoMove(undo);
  assert(bCast.getBoardState().castlingRights === CASTLE_ALL, 'Undo de rei branco não restaurou CASTLE_ALL');
  assert(bCast.getZobristHash() === computeZobristHashBitboard(bCast.getBoardState()), 'Hash diverge após undo de rei');
}
console.log('  ✓ [PASS] Perda e restauração de direitos de roque pelo Rei');

// 2. Mover Torre H1: perde apenas K
const movesRh1 = bCast.generateLegalMoves().filter(m => m.from === 7 && m.piece === 'r');
for (const m of movesRh1) {
  totalTransitionsTested++;
  const undo = bCast.makeMove(m);
  const bs = bCast.getBoardState();
  assert((bs.castlingRights & CASTLE_WK) === 0, 'Torre h1 moveu mas manteve CASTLE_WK');
  assert((bs.castlingRights & CASTLE_WQ) !== 0, 'Torre h1 moveu e perdeu CASTLE_WQ indevidamente');
  assert(bCast.getZobristHash() === computeZobristHashBitboard(bs), 'Hash diverge após mover torre h1');
  bCast.undoMove(undo);
  assert(bCast.getBoardState().castlingRights === CASTLE_ALL, 'Undo de torre h1 não restaurou CASTLE_ALL');
}
console.log('  ✓ [PASS] Perda e restauração de direito kingside pela Torre');

// -------------------------------------------------------------
// 3. CICLO DE VIDA DO EN PASSANT
// -------------------------------------------------------------
console.log('\n--- 3. Validando Ciclo de Vida e Convenção de En Passant ---');

const bEp = new BitboardBackend('rnbqkbnr/pppp1ppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2');
// Branco joga d2-d4 (avanço duplo com peão preto adjacente em e4)
const d4Move = bEp.generateLegalMoves().find(m => m.piece === 'p' && (m.flags & 4) && ox88ToSq64(m.to) === 27);
assert(!!d4Move, 'Lance d2-d4 não encontrado');

totalTransitionsTested++;
const undoD4 = bEp.makeMove(d4Move!);
assert(bEp.getBoardState().enPassantSquare !== -1, 'enPassantSquare não foi criado após d2-d4 com peão em e4');
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após criação de en passant');

// Lance posterior das pretas que NÃO captura en passant (ex: a7-a6)
const quietBlackMove = bEp.generateLegalMoves().find(m => m.piece === 'p' && !(m.flags & 8));
assert(!!quietBlackMove, 'Lance preto quiet não encontrado');
totalTransitionsTested++;
const undoQuiet = bEp.makeMove(quietBlackMove!);
assert(bEp.getBoardState().enPassantSquare === -1, 'enPassantSquare não expirou após lance normal');
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após expiração de en passant');

// Desfazer o lance quieto -> enPassantSquare e hash restaurados!
bEp.undoMove(undoQuiet);
assert(bEp.getBoardState().enPassantSquare !== -1, 'Undo não restaurou enPassantSquare');
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após restauração de en passant');

// Agora executar a captura en passant exd3!
const epCaptureMove = bEp.generateLegalMoves().find(m => !!(m.flags & 8));
assert(!!epCaptureMove, 'Captura en passant exd3 não encontrada');
totalTransitionsTested++;
const undoEpCap = bEp.makeMove(epCaptureMove!);
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após captura en passant');

bEp.undoMove(undoEpCap);
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após desfazer captura en passant');

bEp.undoMove(undoD4);
assert(bEp.getZobristHash() === computeZobristHashBitboard(bEp.getBoardState()), 'Hash diverge após desfazer avanço duplo inicial');
console.log('  ✓ [PASS] Ciclo completo de en passant (criação, expiração, captura e restauração)');

// -------------------------------------------------------------
// 4. SEQUÊNCIAS PROFUNDAS DE MAKE / UNDO (100 JOGOS x 50+ PLIES)
// -------------------------------------------------------------
console.log('\n--- 4. Validando Sequências Profundas (100 Jogos x 50+ Plies) ---');

const SEED = 0x12345678;
let rngState = SEED;
function prng(): number {
  rngState ^= rngState << 13;
  rngState ^= rngState >> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 4294967296;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const NUM_GAMES = 100;
const TARGET_PLIES = 55;

for (let g = 0; g < NUM_GAMES; g++) {
  const b = new BitboardBackend(START_FEN);
  const initialHash = b.getZobristHash();
  const initialState = cloneBoardState(b.getBoardState());

  const undos: any[] = [];
  const hashesHistory: number[] = [initialHash];

  for (let ply = 0; ply < TARGET_PLIES; ply++) {
    if (b.isGameOver()) break;
    const moves = b.generateLegalMoves();
    if (moves.length === 0) break;

    const chosenMove = moves[Math.floor(prng() * moves.length)];
    totalTransitionsTested++;

    const u = b.makeMove(chosenMove);
    undos.push(u);

    const incHash = b.getZobristHash();
    const fullHash = computeZobristHashBitboard(b.getBoardState());
    assert(incHash === fullHash, `Divergência no jogo ${g+1}, ply ${ply+1}`, {
      fen: b.getFEN(),
      move: chosenMove,
      incHash,
      fullHash
    });
    hashesHistory.push(incHash);
  }

  // Rollback completo de toda a partida
  while (undos.length > 0) {
    const u = undos.pop()!;
    b.undoMove(u);
    hashesHistory.pop();
    const expectedHash = hashesHistory[hashesHistory.length - 1];
    const currentIncHash = b.getZobristHash();
    const currentFullHash = computeZobristHashBitboard(b.getBoardState());

    assert(currentIncHash === expectedHash, `Divergência de hash durante rollback no jogo ${g+1}`, {
      currentIncHash,
      expectedHash
    });
    assert(currentIncHash === currentFullHash, `Hash incremental diverge do full durante rollback no jogo ${g+1}`);
  }

  // Verificar restauração integral do estado inicial
  assert(b.getZobristHash() === initialHash, `Hash final diverge do inicial no jogo ${g+1}`);
  assert(boardStatesEqual(b.getBoardState(), initialState), `Estado final diverge do inicial no jogo ${g+1}`);
}
console.log(`  ✓ [PASS] 100 partidas profundas completadas com 100% de paridade em make e rollback`);

// -------------------------------------------------------------
// 5. TESTES DE TRANSPOSITION TABLE (TT) E DISCRIMINAÇÃO DE CHAVE
// -------------------------------------------------------------
console.log('\n--- 5. Validando Transposition Table e Discriminação de Chaves ---');

const tt = new TranspositionTable(10000);

// A. Posição alcançada por ordens de lances diferentes (Transposição)
// Sequência 1: 1. d4 Nf6 2. c4
const b1 = new BitboardBackend();
const m_d4 = b1.generateLegalMoves().find(m => m.piece === 'p' && (m.flags & 4) && ox88ToSq64(m.to) === 27)!;
b1.makeMove(m_d4);
const m_Nf6 = b1.generateLegalMoves().find(m => m.piece === 'n' && ox88ToSq64(m.to) === 45)!;
b1.makeMove(m_Nf6);
const m_c4 = b1.generateLegalMoves().find(m => m.piece === 'p' && (m.flags & 4) && ox88ToSq64(m.to) === 26)!;
b1.makeMove(m_c4);
const hashSeq1 = b1.getZobristHash();

// Sequência 2: 1. c4 Nf6 2. d4
const b2 = new BitboardBackend();
const m2_c4 = b2.generateLegalMoves().find(m => m.piece === 'p' && (m.flags & 4) && ox88ToSq64(m.to) === 26)!;
b2.makeMove(m2_c4);
const m2_Nf6 = b2.generateLegalMoves().find(m => m.piece === 'n' && ox88ToSq64(m.to) === 45)!;
b2.makeMove(m2_Nf6);
const m2_d4 = b2.generateLegalMoves().find(m => m.piece === 'p' && (m.flags & 4) && ox88ToSq64(m.to) === 27)!;
b2.makeMove(m2_d4);
const hashSeq2 = b2.getZobristHash();

assert(hashSeq1 === hashSeq2, 'Transposição clássica (1.d4 Nf6 2.c4 vs 1.c4 Nf6 2.d4) produziu hashes diferentes!', { hashSeq1, hashSeq2 });

tt.store(hashSeq1, 4, 150, Bound.EXACT, 'c4');
const probed = tt.probe(hashSeq2);
assert(probed !== undefined && probed.score === 150, 'TT falhou em recuperar entrada gerada por transposição de lances');
console.log('  ✓ [PASS] Transposição de lances recuperada com exatidão pela TT');

// B. Discriminação de componentes: estados que diferem apenas em 1 atributo devem ter hashes diferentes
const baseState = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
const baseHash = computeZobristHashBitboard(baseState);

// Difere apenas no sideToMove
const blackTurnState = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
assert(baseHash !== computeZobristHashBitboard(blackTurnState), 'Colisão: mudança de turno não alterou o hash');

// Difere apenas nos direitos de roque
const noCastleState = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Qkq - 0 1');
assert(baseHash !== computeZobristHashBitboard(noCastleState), 'Colisão: remoção de direito de roque K não alterou o hash');

// Difere apenas em uma casa de peça
const movedKnightState = parseFen('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1');
assert(baseHash !== computeZobristHashBitboard(movedKnightState), 'Colisão: cavalo em f3 não alterou o hash');

console.log('  ✓ [PASS] Discriminação perfeita de componentes isolados (turno, roque, posição de peças)');

// -------------------------------------------------------------
// 6. ISOLAMENTO DE ESTADO E SIMULAÇÃO DE TIMEOUT / ROLLBACK
// -------------------------------------------------------------
console.log('\n--- 6. Validando Isolamento e Rollback após Interrupção / Timeout ---');

const bInterrupted = new BitboardBackend(START_FEN);
const initialInterruptedHash = bInterrupted.getZobristHash();
const initialInterruptedState = cloneBoardState(bInterrupted.getBoardState());

// Simular busca que faz vários lances e sofre exceção de TIMEOUT no meio
try {
  const m1 = bInterrupted.generateLegalMoves()[0];
  const u1 = bInterrupted.makeMove(m1);
  try {
    const m2 = bInterrupted.generateLegalMoves()[0];
    const u2 = bInterrupted.makeMove(m2);
    try {
      // Simulação do throw TIMEOUT
      throw new Error('TIMEOUT');
    } finally {
      bInterrupted.undoMove(u2);
    }
  } finally {
    bInterrupted.undoMove(u1);
  }
} catch (e: any) {
  if (e.message !== 'TIMEOUT') throw e;
}

assert(bInterrupted.getZobristHash() === initialInterruptedHash, 'Hash corrompido após recuperação de timeout');
assert(boardStatesEqual(bInterrupted.getBoardState(), initialInterruptedState), 'Estado corrompido após recuperação de timeout');
console.log('  ✓ [PASS] Recuperação perfeita de hash e estado após simulação de timeout');

// -------------------------------------------------------------
// 7. CONCLUSÃO E CRITÉRIOS DE APROVAÇÃO
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL DE TRANSIÇÕES VALIDADAS: ${totalTransitionsTested.toLocaleString()}`);
console.log(`FALHAS REGISTRADAS: ${failures}`);
console.log('================================================================\n');

if (failures === 0 && totalTransitionsTested >= 5000) {
  console.log('>>> STATUS FINAL: PASS — ZOBRIST INCREMENTAL VALIDATED <<<\n');
  process.exit(0);
} else {
  console.error(`>>> STATUS FINAL: BLOCKED — Total=${totalTransitionsTested}, Falhas=${failures} <<<`);
  process.exit(1);
}
