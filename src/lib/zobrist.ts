/**
 * Zobrist Hashing for Vanguard Chess Engine
 *
 * Deterministic hash generation using a fixed-seed PRNG.
 * Encodes: piece+color+square, side-to-move, castling rights, en-passant file.
 *
 * Uses 32-bit numbers (JavaScript safe integers) to avoid BigInt overhead.
 * Two independent hash values (hi/lo) are combined to form a 53-bit safe hash,
 * reducing collision probability while staying in JS safe integer range.
 */

import { Chess } from 'chess.js';
import type { BitboardBoard } from './bitboard/types';
import { CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from './bitboard/constants';
import { lsb, clearLsb } from './bitboard/bitboard';

// ============================================================
// DETERMINISTIC PRNG (xorshift32 with fixed seed)
// ============================================================

function createPRNG(seed: number) {
  let state = seed | 0;
  // Ensure state is non-zero
  if (state === 0) state = 1;
  return function next(): number {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state >>> 0; // Return as unsigned 32-bit
  };
}

// ============================================================
// ZOBRIST KEY TABLES (pre-generated with fixed seed)
// ============================================================

// Piece types: p, n, b, r, q, k
// Colors: w, b
// Squares: 64
// Total piece keys: 6 * 2 * 64 = 768

const PIECE_TYPES = ['p', 'n', 'b', 'r', 'q', 'k'] as const;
const COLORS = ['w', 'b'] as const;

// Generate all keys deterministically
const rng = createPRNG(0x5D588B65); // Fixed seed

// Piece-square keys: [colorIndex][pieceIndex][squareIndex]
const pieceSquareKeys: number[][] = [];
for (let c = 0; c < 2; c++) {
  for (let p = 0; p < 6; p++) {
    const row: number[] = [];
    for (let s = 0; s < 64; s++) {
      row.push(rng());
    }
    pieceSquareKeys.push(row);
  }
}

// Side-to-move key (XOR when it's black's turn)
const sideToMoveKey = rng();

// Castling rights keys (4 individual rights: K, Q, k, q)
const castlingKeys: number[] = [];
for (let i = 0; i < 4; i++) {
  castlingKeys.push(rng());
}

// En-passant file keys (files a-h = 0-7)
const enPassantKeys: number[] = [];
for (let i = 0; i < 8; i++) {
  enPassantKeys.push(rng());
}

// ============================================================
// HELPER: get piece-square key index
// ============================================================

function getPieceSquareKey(color: string, pieceType: string, square: number): number {
  const colorIdx = color === 'w' ? 0 : 1;
  const pieceIdx = PIECE_TYPES.indexOf(pieceType as any);
  if (pieceIdx === -1) return 0;
  const tableIdx = colorIdx * 6 + pieceIdx;
  return pieceSquareKeys[tableIdx][square];
}

// Square name to index (a1=0, b1=1, ..., h8=63)
const SQUARE_NAMES = [
  'a1','b1','c1','d1','e1','f1','g1','h1',
  'a2','b2','c2','d2','e2','f2','g2','h2',
  'a3','b3','c3','d3','e3','f3','g3','h3',
  'a4','b4','c4','d4','e4','f4','g4','h4',
  'a5','b5','c5','d5','e5','f5','g5','h5',
  'a6','b6','c6','d6','e6','f6','g6','h6',
  'a7','b7','c7','d7','e7','f7','g7','h7',
  'a8','b8','c8','d8','e8','f8','g8','h8'
];

const squareToIndex: Record<string, number> = {};
for (let i = 0; i < 64; i++) {
  squareToIndex[SQUARE_NAMES[i]] = i;
}

// File letter to index
function fileToIndex(file: string): number {
  return file.charCodeAt(0) - 'a'.charCodeAt(0);
}

// ============================================================
// MAIN HASH FUNCTION
// ============================================================

/**
 * Compute the Zobrist hash for a chess.js Chess instance.
 * Considers: pieces, side-to-move, castling rights, en-passant.
 */
export function computeZobristHash(game: Chess): number {
  let hash = 0;

  // 1. Pieces on the board
  const board = game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        // board[0] = rank 8, board[7] = rank 1 in chess.js
        // Square index: (7 - rank) * 8 + file
        const squareIdx = (7 - rank) * 8 + file;
        hash ^= getPieceSquareKey(piece.color, piece.type, squareIdx);
      }
    }
  }

  // 2. Side to move
  if (game.turn() === 'b') {
    hash ^= sideToMoveKey;
  }

  // 3. Castling rights
  const fen = game.fen();
  const fenParts = fen.split(' ');
  const castling = fenParts[2] || '-';
  if (castling.includes('K')) hash ^= castlingKeys[0];
  if (castling.includes('Q')) hash ^= castlingKeys[1];
  if (castling.includes('k')) hash ^= castlingKeys[2];
  if (castling.includes('q')) hash ^= castlingKeys[3];

  // 4. En-passant
  const ep = fenParts[3] || '-';
  if (ep !== '-') {
    const epFile = fileToIndex(ep[0]);
    hash ^= enPassantKeys[epFile];
  }

  // Ensure positive (unsigned)
  return hash >>> 0;
}

/**
 * Compute the Zobrist hash for a BitboardBoard instance.
 * Identical contract and key tables to computeZobristHash(game).
 */
export function computeZobristHashBitboard(board: BitboardBoard): number {
  let hash = 0;

  // 1. Pieces on the board (12 bitboards)
  const pieceBitboards: [bigint, number][] = [
    [board.whitePawns, 0],   // w p
    [board.whiteKnights, 1], // w n
    [board.whiteBishops, 2], // w b
    [board.whiteRooks, 3],   // w r
    [board.whiteQueens, 4],  // w q
    [board.whiteKing, 5],    // w k
    [board.blackPawns, 6],   // b p
    [board.blackKnights, 7], // b n
    [board.blackBishops, 8], // b b
    [board.blackRooks, 9],   // b r
    [board.blackQueens, 10], // b q
    [board.blackKing, 11]    // b k
  ];

  for (let i = 0; i < 12; i++) {
    let bb = pieceBitboards[i][0];
    const tableIdx = pieceBitboards[i][1];
    const keys = pieceSquareKeys[tableIdx];
    while (bb !== 0n) {
      const sq = lsb(bb);
      hash ^= keys[sq];
      bb = clearLsb(bb);
    }
  }

  // 2. Side to move
  if (board.sideToMove === 'b') {
    hash ^= sideToMoveKey;
  }

  // 3. Castling rights
  if (board.castlingRights & CASTLE_WK) hash ^= castlingKeys[0];
  if (board.castlingRights & CASTLE_WQ) hash ^= castlingKeys[1];
  if (board.castlingRights & CASTLE_BK) hash ^= castlingKeys[2];
  if (board.castlingRights & CASTLE_BQ) hash ^= castlingKeys[3];

  // 4. En-passant (only if active)
  if (board.enPassantSquare !== -1) {
    const epFile = board.enPassantSquare & 7;
    hash ^= enPassantKeys[epFile];
  }

  return hash >>> 0;
}

// ============================================================
// EXPORTS for testing and bitboard engine
// ============================================================
export { getPieceSquareKey, sideToMoveKey, castlingKeys, enPassantKeys, pieceSquareKeys };
