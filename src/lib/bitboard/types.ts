/**
 * FASE 5.8 — TIPOS DO MOTOR BITBOARD
 *
 * Namespace isolado: src/lib/bitboard/
 * Representação experimental de tabuleiro e move generator em BigInt 64-bit.
 */

export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Square = number; // 0..63 (0 = a1, 63 = h8)

export type Bitboard = bigint;

export type CastlingRights = number; // 4 bits: WK=1, WQ=2, BK=4, BQ=8

export interface BitboardBoard {
  // Peças Brancas (6 bitboards)
  whitePawns: Bitboard;
  whiteKnights: Bitboard;
  whiteBishops: Bitboard;
  whiteRooks: Bitboard;
  whiteQueens: Bitboard;
  whiteKing: Bitboard;

  // Peças Pretas (6 bitboards)
  blackPawns: Bitboard;
  blackKnights: Bitboard;
  blackBishops: Bitboard;
  blackRooks: Bitboard;
  blackQueens: Bitboard;
  blackKing: Bitboard;

  // Ocupação consolidada (3 bitboards)
  whiteOccupancy: Bitboard;
  blackOccupancy: Bitboard;
  allOccupancy: Bitboard;

  // Estado da partida
  sideToMove: Color;
  castlingRights: CastlingRights; // bits 0..3
  enPassantSquare: Square; // -1 se não houver, 0..63 se houver
  halfmoveClock: number;
  fullmoveNumber: number;
  zobristHash?: number;
}

export interface CheckInfo {
  inCheck: boolean;
  doubleCheck: boolean;
  numCheckers: number;
  checkerSquares: Square[];
  checkMask: Bitboard; // Se em xeque simples: máscara com casas do atacante + casas entre atacante e rei. Se não: ~0n.
  pinnedPieces: Bitboard; // Bitboard com todas as peças aliadas que estão em cravada absoluta
  pinRays: Map<Square, Bitboard>; // Mapa de casa da peça cravada -> raio permitido de movimento
}

export interface UndoState {
  move: number; // Encoded move bitfield
  capturedPieceType?: PieceType;
  capturedSquare?: Square;
  castlingRights: CastlingRights;
  enPassantSquare: Square;
  halfmoveClock: number;
  fullmoveNumber: number;
  prevZobristHash?: number;
}
