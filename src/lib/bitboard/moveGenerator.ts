/**
 * FASE 5.8 — GERADOR DE MOVIMENTOS PSEUDO-LEGAIS BITBOARD
 */

import { Bitboard, BitboardBoard, Color, Square } from './types';
import {
  BB_EMPTY,
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  NOT_FILE_A,
  NOT_FILE_H,
  RANK_2,
  RANK_7,
  SQ_A1,
  SQ_A8,
  SQ_B1,
  SQ_B8,
  SQ_C1,
  SQ_C8,
  SQ_D1,
  SQ_D8,
  SQ_E1,
  SQ_E8,
  SQ_F1,
  SQ_F8,
  SQ_G1,
  SQ_G8,
  SQ_H1,
  SQ_H8,
  squareRank,
  squareToBit
} from './constants';
import { clearLsb, lsb } from './bitboard';
import {
  bishopAttacks,
  isSquareAttacked,
  KING_ATTACKS,
  KNIGHT_ATTACKS,
  queenAttacks,
  rookAttacks
} from './attacks';
import {
  encodeMove,
  FLAG_CAPTURE,
  FLAG_DOUBLE_PAWN,
  FLAG_EP_CAPTURE,
  FLAG_KING_CASTLE,
  FLAG_PROMO_B,
  FLAG_PROMO_CAP_B,
  FLAG_PROMO_CAP_N,
  FLAG_PROMO_CAP_Q,
  FLAG_PROMO_CAP_R,
  FLAG_PROMO_N,
  FLAG_PROMO_Q,
  FLAG_PROMO_R,
  FLAG_QUEEN_CASTLE,
  FLAG_QUIET,
  RawMove
} from './moveTypes';

export function generatePseudoLegalMoves(board: BitboardBoard): RawMove[] {
  const moves: RawMove[] = [];
  const us: Color = board.sideToMove;
  const them: Color = us === 'w' ? 'b' : 'w';

  const friendlyOcc = us === 'w' ? board.whiteOccupancy : board.blackOccupancy;
  const enemyOcc = us === 'w' ? board.blackOccupancy : board.whiteOccupancy;
  const allOcc = board.allOccupancy;
  const emptySquares = ~allOcc & 0xFFFFFFFFFFFFFFFFn;

  // ============================================================
  // 1. PEÕES
  // ============================================================
  if (us === 'w') {
    let pawns = board.whitePawns;
    while (pawns !== BB_EMPTY) {
      const from = lsb(pawns);
      pawns = clearLsb(pawns);

      const r = squareRank(from);
      const isPromo = r === 6; // Indo para a 8ª fileira

      // Avanço simples (+8)
      const toSingle = from + 8;
      const singleBit = squareToBit(toSingle);
      if ((singleBit & emptySquares) !== BB_EMPTY) {
        if (isPromo) {
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_Q));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_R));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_B));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_N));
        } else {
          moves.push(encodeMove(from, toSingle, FLAG_QUIET));

          // Avanço duplo (+16)
          if (r === 1) {
            const toDouble = from + 16;
            const doubleBit = squareToBit(toDouble);
            if ((doubleBit & emptySquares) !== BB_EMPTY) {
              moves.push(encodeMove(from, toDouble, FLAG_DOUBLE_PAWN));
            }
          }
        }
      }

      // Capturas diagonais (+7 = Noroeste, +9 = Nordeste)
      const fromBit = squareToBit(from);

      // Noroeste (+7): file > 0 (NOT_FILE_A)
      if ((fromBit & NOT_FILE_A) !== BB_EMPTY) {
        const toNW = from + 7;
        const nwBit = squareToBit(toNW);
        if ((nwBit & enemyOcc) !== BB_EMPTY) {
          if (isPromo) {
            moves.push(encodeMove(from, toNW, FLAG_PROMO_CAP_Q));
            moves.push(encodeMove(from, toNW, FLAG_PROMO_CAP_R));
            moves.push(encodeMove(from, toNW, FLAG_PROMO_CAP_B));
            moves.push(encodeMove(from, toNW, FLAG_PROMO_CAP_N));
          } else {
            moves.push(encodeMove(from, toNW, FLAG_CAPTURE));
          }
        } else if (toNW === board.enPassantSquare) {
          moves.push(encodeMove(from, toNW, FLAG_EP_CAPTURE));
        }
      }

      // Nordeste (+9): file < 7 (NOT_FILE_H)
      if ((fromBit & NOT_FILE_H) !== BB_EMPTY) {
        const toNE = from + 9;
        const neBit = squareToBit(toNE);
        if ((neBit & enemyOcc) !== BB_EMPTY) {
          if (isPromo) {
            moves.push(encodeMove(from, toNE, FLAG_PROMO_CAP_Q));
            moves.push(encodeMove(from, toNE, FLAG_PROMO_CAP_R));
            moves.push(encodeMove(from, toNE, FLAG_PROMO_CAP_B));
            moves.push(encodeMove(from, toNE, FLAG_PROMO_CAP_N));
          } else {
            moves.push(encodeMove(from, toNE, FLAG_CAPTURE));
          }
        } else if (toNE === board.enPassantSquare) {
          moves.push(encodeMove(from, toNE, FLAG_EP_CAPTURE));
        }
      }
    }
  } else {
    // us === 'b'
    let pawns = board.blackPawns;
    while (pawns !== BB_EMPTY) {
      const from = lsb(pawns);
      pawns = clearLsb(pawns);

      const r = squareRank(from);
      const isPromo = r === 1; // Indo para a 1ª fileira

      // Avanço simples (-8)
      const toSingle = from - 8;
      const singleBit = squareToBit(toSingle);
      if ((singleBit & emptySquares) !== BB_EMPTY) {
        if (isPromo) {
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_Q));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_R));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_B));
          moves.push(encodeMove(from, toSingle, FLAG_PROMO_N));
        } else {
          moves.push(encodeMove(from, toSingle, FLAG_QUIET));

          // Avanço duplo (-16)
          if (r === 6) {
            const toDouble = from - 16;
            const doubleBit = squareToBit(toDouble);
            if ((doubleBit & emptySquares) !== BB_EMPTY) {
              moves.push(encodeMove(from, toDouble, FLAG_DOUBLE_PAWN));
            }
          }
        }
      }

      // Capturas diagonais (-9 = Sudoeste, -7 = Sudeste)
      const fromBit = squareToBit(from);

      // Sudoeste (-9): file > 0 (NOT_FILE_A)
      if ((fromBit & NOT_FILE_A) !== BB_EMPTY) {
        const toSW = from - 9;
        const swBit = squareToBit(toSW);
        if ((swBit & enemyOcc) !== BB_EMPTY) {
          if (isPromo) {
            moves.push(encodeMove(from, toSW, FLAG_PROMO_CAP_Q));
            moves.push(encodeMove(from, toSW, FLAG_PROMO_CAP_R));
            moves.push(encodeMove(from, toSW, FLAG_PROMO_CAP_B));
            moves.push(encodeMove(from, toSW, FLAG_PROMO_CAP_N));
          } else {
            moves.push(encodeMove(from, toSW, FLAG_CAPTURE));
          }
        } else if (toSW === board.enPassantSquare) {
          moves.push(encodeMove(from, toSW, FLAG_EP_CAPTURE));
        }
      }

      // Sudeste (-7): file < 7 (NOT_FILE_H)
      if ((fromBit & NOT_FILE_H) !== BB_EMPTY) {
        const toSE = from - 7;
        const seBit = squareToBit(toSE);
        if ((seBit & enemyOcc) !== BB_EMPTY) {
          if (isPromo) {
            moves.push(encodeMove(from, toSE, FLAG_PROMO_CAP_Q));
            moves.push(encodeMove(from, toSE, FLAG_PROMO_CAP_R));
            moves.push(encodeMove(from, toSE, FLAG_PROMO_CAP_B));
            moves.push(encodeMove(from, toSE, FLAG_PROMO_CAP_N));
          } else {
            moves.push(encodeMove(from, toSE, FLAG_CAPTURE));
          }
        } else if (toSE === board.enPassantSquare) {
          moves.push(encodeMove(from, toSE, FLAG_EP_CAPTURE));
        }
      }
    }
  }

  // ============================================================
  // 2. CAVALOS
  // ============================================================
  let knights = us === 'w' ? board.whiteKnights : board.blackKnights;
  while (knights !== BB_EMPTY) {
    const from = lsb(knights);
    knights = clearLsb(knights);

    let att = KNIGHT_ATTACKS[from] & ~friendlyOcc;
    while (att !== BB_EMPTY) {
      const to = lsb(att);
      att = clearLsb(att);
      const isCap = (squareToBit(to) & enemyOcc) !== BB_EMPTY;
      moves.push(encodeMove(from, to, isCap ? FLAG_CAPTURE : FLAG_QUIET));
    }
  }

  // ============================================================
  // 3. BISPOS
  // ============================================================
  let bishops = us === 'w' ? board.whiteBishops : board.blackBishops;
  while (bishops !== BB_EMPTY) {
    const from = lsb(bishops);
    bishops = clearLsb(bishops);

    let att = bishopAttacks(from, allOcc) & ~friendlyOcc;
    while (att !== BB_EMPTY) {
      const to = lsb(att);
      att = clearLsb(att);
      const isCap = (squareToBit(to) & enemyOcc) !== BB_EMPTY;
      moves.push(encodeMove(from, to, isCap ? FLAG_CAPTURE : FLAG_QUIET));
    }
  }

  // ============================================================
  // 4. TORRES
  // ============================================================
  let rooks = us === 'w' ? board.whiteRooks : board.blackRooks;
  while (rooks !== BB_EMPTY) {
    const from = lsb(rooks);
    rooks = clearLsb(rooks);

    let att = rookAttacks(from, allOcc) & ~friendlyOcc;
    while (att !== BB_EMPTY) {
      const to = lsb(att);
      att = clearLsb(att);
      const isCap = (squareToBit(to) & enemyOcc) !== BB_EMPTY;
      moves.push(encodeMove(from, to, isCap ? FLAG_CAPTURE : FLAG_QUIET));
    }
  }

  // ============================================================
  // 5. DAMAS
  // ============================================================
  let queens = us === 'w' ? board.whiteQueens : board.blackQueens;
  while (queens !== BB_EMPTY) {
    const from = lsb(queens);
    queens = clearLsb(queens);

    let att = queenAttacks(from, allOcc) & ~friendlyOcc;
    while (att !== BB_EMPTY) {
      const to = lsb(att);
      att = clearLsb(att);
      const isCap = (squareToBit(to) & enemyOcc) !== BB_EMPTY;
      moves.push(encodeMove(from, to, isCap ? FLAG_CAPTURE : FLAG_QUIET));
    }
  }

  // ============================================================
  // 6. REI (Lances normais + Roque)
  // ============================================================
  const kingBb = us === 'w' ? board.whiteKing : board.blackKing;
  const kingSq = lsb(kingBb);

  if (kingSq !== -1) {
    let att = KING_ATTACKS[kingSq] & ~friendlyOcc;
    while (att !== BB_EMPTY) {
      const to = lsb(att);
      att = clearLsb(att);
      const isCap = (squareToBit(to) & enemyOcc) !== BB_EMPTY;
      moves.push(encodeMove(kingSq, to, isCap ? FLAG_CAPTURE : FLAG_QUIET));
    }

    // Roque (Castling)
    if (us === 'w') {
      if (kingSq === SQ_E1) {
        // Roque curto (O-O)
        if ((board.castlingRights & CASTLE_WK) !== 0) {
          const emptyK = (squareToBit(SQ_F1) | squareToBit(SQ_G1)) & allOcc;
          if (emptyK === BB_EMPTY && (board.whiteRooks & squareToBit(SQ_H1)) !== BB_EMPTY) {
            if (
              !isSquareAttacked(board, SQ_E1, 'b') &&
              !isSquareAttacked(board, SQ_F1, 'b') &&
              !isSquareAttacked(board, SQ_G1, 'b')
            ) {
              moves.push(encodeMove(SQ_E1, SQ_G1, FLAG_KING_CASTLE));
            }
          }
        }
        // Roque longo (O-O-O)
        if ((board.castlingRights & CASTLE_WQ) !== 0) {
          const emptyQ = (squareToBit(SQ_D1) | squareToBit(SQ_C1) | squareToBit(SQ_B1)) & allOcc;
          if (emptyQ === BB_EMPTY && (board.whiteRooks & squareToBit(SQ_A1)) !== BB_EMPTY) {
            if (
              !isSquareAttacked(board, SQ_E1, 'b') &&
              !isSquareAttacked(board, SQ_D1, 'b') &&
              !isSquareAttacked(board, SQ_C1, 'b')
            ) {
              moves.push(encodeMove(SQ_E1, SQ_C1, FLAG_QUEEN_CASTLE));
            }
          }
        }
      }
    } else {
      // us === 'b'
      if (kingSq === SQ_E8) {
        // Roque curto (O-O)
        if ((board.castlingRights & CASTLE_BK) !== 0) {
          const emptyK = (squareToBit(SQ_F8) | squareToBit(SQ_G8)) & allOcc;
          if (emptyK === BB_EMPTY && (board.blackRooks & squareToBit(SQ_H8)) !== BB_EMPTY) {
            if (
              !isSquareAttacked(board, SQ_E8, 'w') &&
              !isSquareAttacked(board, SQ_F8, 'w') &&
              !isSquareAttacked(board, SQ_G8, 'w')
            ) {
              moves.push(encodeMove(SQ_E8, SQ_G8, FLAG_KING_CASTLE));
            }
          }
        }
        // Roque longo (O-O-O)
        if ((board.castlingRights & CASTLE_BQ) !== 0) {
          const emptyQ = (squareToBit(SQ_D8) | squareToBit(SQ_C8) | squareToBit(SQ_B8)) & allOcc;
          if (emptyQ === BB_EMPTY && (board.blackRooks & squareToBit(SQ_A8)) !== BB_EMPTY) {
            if (
              !isSquareAttacked(board, SQ_E8, 'w') &&
              !isSquareAttacked(board, SQ_D8, 'w') &&
              !isSquareAttacked(board, SQ_C8, 'w')
            ) {
              moves.push(encodeMove(SQ_E8, SQ_C8, FLAG_QUEEN_CASTLE));
            }
          }
        }
      }
    }
  }

  return moves;
}
