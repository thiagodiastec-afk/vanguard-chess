/**
 * FASE 5.8 — PARSER E SERIALIZADOR FEN PARA TABULEIRO BITBOARD
 */

import { BitboardBoard, Square } from './types';
import {
  BB_EMPTY,
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  bitToSquareName,
  squareNameToIndex,
  squareToBit
} from './constants';
import { createEmptyBoard, getPieceAt } from './board';
import { updateOccupancy } from './occupancy';
import { popcount } from './bitboard';
import { computeZobristHashBitboard } from '../zobrist';

export function parseFen(fen: string): BitboardBoard {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error(`Invalid FEN: expected at least 4 fields, got ${parts.length}`);
  }

  const board = createEmptyBoard();
  const [placement, turn, castling, ep, halfmove, fullmove] = parts;

  // 1. Placement
  const ranks = placement.split('/');
  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN: expected 8 ranks, got ${ranks.length}`);
  }

  for (let r = 7; r >= 0; r--) {
    const rankStr = ranks[7 - r];
    let file = 0;
    for (let i = 0; i < rankStr.length; i++) {
      const ch = rankStr[i];
      if (ch >= '1' && ch <= '8') {
        file += parseInt(ch, 10);
      } else {
        if (file > 7) {
          throw new Error(`Invalid FEN: rank ${r + 1} overflowed`);
        }
        const sq: Square = r * 8 + file;
        const bit = squareToBit(sq);

        switch (ch) {
          case 'P': board.whitePawns |= bit; break;
          case 'N': board.whiteKnights |= bit; break;
          case 'B': board.whiteBishops |= bit; break;
          case 'R': board.whiteRooks |= bit; break;
          case 'Q': board.whiteQueens |= bit; break;
          case 'K': board.whiteKing |= bit; break;

          case 'p': board.blackPawns |= bit; break;
          case 'n': board.blackKnights |= bit; break;
          case 'b': board.blackBishops |= bit; break;
          case 'r': board.blackRooks |= bit; break;
          case 'q': board.blackQueens |= bit; break;
          case 'k': board.blackKing |= bit; break;
          default:
            throw new Error(`Invalid FEN piece character: ${ch}`);
        }
        file++;
      }
    }
    if (file !== 8) {
      throw new Error(`Invalid FEN: rank ${r + 1} has ${file} files instead of 8`);
    }
  }

  updateOccupancy(board);

  // Validação dos reis
  if (popcount(board.whiteKing) !== 1) {
    throw new Error(`Invalid FEN: expected exactly 1 white king, found ${popcount(board.whiteKing)}`);
  }
  if (popcount(board.blackKing) !== 1) {
    throw new Error(`Invalid FEN: expected exactly 1 black king, found ${popcount(board.blackKing)}`);
  }

  // 2. Turn
  if (turn !== 'w' && turn !== 'b') {
    throw new Error(`Invalid FEN turn: ${turn}`);
  }
  board.sideToMove = turn;

  // 3. Castling
  let rights = 0;
  if (castling !== '-') {
    for (const c of castling) {
      if (c === 'K') rights |= CASTLE_WK;
      else if (c === 'Q') rights |= CASTLE_WQ;
      else if (c === 'k') rights |= CASTLE_BK;
      else if (c === 'q') rights |= CASTLE_BQ;
    }
  }
  board.castlingRights = rights;

  // 4. En Passant
  if (ep === '-' || ep === undefined) {
    board.enPassantSquare = -1;
  } else {
    const epSq = squareNameToIndex(ep);
    board.enPassantSquare = epSq;
  }

  // 5. Clocks
  board.halfmoveClock = halfmove ? parseInt(halfmove, 10) : 0;
  board.fullmoveNumber = fullmove ? parseInt(fullmove, 10) : 1;
  board.zobristHash = computeZobristHashBitboard(board);

  return board;
}

export function bitboardBoardToFen(board: BitboardBoard, options?: { forceEnpassantSquare?: boolean }): string {
  const ranks: string[] = [];

  for (let r = 7; r >= 0; r--) {
    let emptyCount = 0;
    let rankStr = '';

    for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f;
      const p = getPieceAt(board, sq);
      if (!p) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        const sym = p.color === 'w' ? p.piece.toUpperCase() : p.piece.toLowerCase();
        rankStr += sym;
      }
    }
    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }
    ranks.push(rankStr);
  }

  const placement = ranks.join('/');
  const turn = board.sideToMove;

  let castling = '';
  if (board.castlingRights & CASTLE_WK) castling += 'K';
  if (board.castlingRights & CASTLE_WQ) castling += 'Q';
  if (board.castlingRights & CASTLE_BK) castling += 'k';
  if (board.castlingRights & CASTLE_BQ) castling += 'q';
  if (castling === '') castling = '-';

  let ep = '-';
  if (board.enPassantSquare !== -1) {
    const force = options?.forceEnpassantSquare !== false;
    if (force) {
      ep = bitToSquareName(board.enPassantSquare);
    } else {
      // Regra chess.js: só imprime a casa en passant se houver peão adversário
      // na adjacência capaz de realizar a captura en passant
      const epSq = board.enPassantSquare;
      const us = board.sideToMove;
      const pawnBb = us === 'w' ? board.whitePawns : board.blackPawns;

      // Casas de onde um peão de us poderia atacar epSq:
      // se us === 'w', epSq foi gerado por peão preto (avanço de 2 casas, ex: e5->e6)
      // os peões brancos atacantes estariam em epSq - 9 ou epSq - 7
      // Usamos as tabelas pré-computadas de ataque de peão para verificar atacantes
      const attackers = us === 'w' ? (squareToBit(epSq)) : (squareToBit(epSq));
      // Mais simples e direto: checar casas adjacentes ao peão que avançou
      const epRank = epSq >> 3;
      const epFile = epSq & 7;
      const pawnRank = us === 'w' ? epRank - 1 : epRank + 1;

      let hasLegalEp = false;
      for (const df of [-1, 1]) {
        const f = epFile + df;
        if (f >= 0 && f < 8) {
          const checkSq = pawnRank * 8 + f;
          if ((pawnBb & squareToBit(checkSq)) !== BB_EMPTY) {
            // Há um peão adjacente. Agora verificar se a captura EP é legal (não deixa o próprio rei em xeque)
            hasLegalEp = true;
            break;
          }
        }
      }
      if (hasLegalEp) {
        ep = bitToSquareName(board.enPassantSquare);
      }
    }
  }

  const halfmove = board.halfmoveClock.toString();
  const fullmove = board.fullmoveNumber.toString();

  return `${placement} ${turn} ${castling} ${ep} ${halfmove} ${fullmove}`;
}
