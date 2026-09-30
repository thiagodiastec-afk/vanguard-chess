import { PairTest, AuditPosition } from './types.ts';

export const SANITY_POSITIONS: AuditPosition[] = [
  { id: 'sanity_base', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', description: 'Starting position', category: 'NEUTRAL' },
  { id: 'sanity_white_queen', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNQ w KQkq - 0 1', description: 'White has 2 queens', category: 'MATERIAL' },
  { id: 'sanity_black_queen', fen: 'qnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', description: 'Black has 2 queens', category: 'MATERIAL' },
  { id: 'sanity_k_vs_k', fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', description: 'King vs King', category: 'NEUTRAL' },
];

export const SYMMETRY_PAIRS: PairTest[] = [
  { id: 'sym_e4', category: 'SYMMETRY', fenA: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', fenB: 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 1', description: 'White e4 vs Black e5' },
  { id: 'sym_knight_f3', category: 'SYMMETRY', fenA: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', fenB: 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1', description: 'White Nf3 vs Black Nf6' }
];

export const CATEGORY_PAIRS: PairTest[] = [
  // MATERIAL
  { id: 'mat_knight', category: 'MATERIAL', fenA: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1', description: 'King vs King + Knight' },
  // MOBILITY
  { id: 'mob_knight', category: 'MOBILITY', fenA: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/8/N3K3 w - - 0 1', description: 'Centralized Knight vs Corner Knight' },
  // PAWN STRUCTURE
  { id: 'struct_doubled', category: 'PAWN_STRUCTURE', fenA: '4k3/8/8/8/p7/P7/1P6/4K3 w - - 0 1', fenB: '4k3/8/8/8/p7/P7/P7/4K3 w - - 0 1', description: 'Connected pawns vs Doubled pawns' },
  { id: 'struct_isolated', category: 'PAWN_STRUCTURE', fenA: '4k3/8/8/8/p7/P7/1P6/4K3 w - - 0 1', fenB: '4k3/8/8/8/p7/P7/3P4/4K3 w - - 0 1', description: 'Connected chain vs Isolated pawn' },
  // PASSED PAWN
  { id: 'passed_pawn', category: 'PASSED_PAWN', fenA: '4k3/8/8/4P3/8/8/4p3/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/4P2p/4K3 w - - 0 1', description: 'Advanced Passed Pawn vs Pawn on 2nd rank (equal material)' },
  // BISHOP PAIR
  { id: 'bishop_pair', category: 'BISHOP_PAIR', fenA: '4k3/8/8/8/8/8/4BB2/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/4BN2/4K3 w - - 0 1', description: 'Two Bishops vs Bishop + Knight' },
  // ROOK ACTIVITY
  { id: 'rook_7th', category: 'ROOK_ACTIVITY', fenA: '4k3/4R3/8/8/8/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1', description: 'Rook on 7th rank vs Rook on 2nd rank' },
  // PIECE ACTIVITY
  { id: 'active_queen', category: 'PIECE_ACTIVITY', fenA: '4k3/8/8/4Q3/8/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1', description: 'Central Queen vs Corner Queen' },
  // KING SAFETY
  { id: 'king_safety', category: 'KING_SAFETY', fenA: '6k1/ppp5/8/8/8/8/8/4K3 b - - 0 1', fenB: 'k7/p7/8/8/8/8/8/4K3 b - - 0 1', description: 'Castled King vs Exposed King' },
  // ENDGAME
  { id: 'endgame_k_p', category: 'ENDGAME', fenA: '4k3/8/8/8/8/4P3/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', description: 'Endgame King+Pawn advanced vs start' },
  // TAPERED
  { id: 'endgame_king', category: 'TAPERED', fenA: '4k3/8/8/4K3/8/8/8/8 w - - 0 1', fenB: '4k3/8/8/8/8/8/8/K7 w - - 0 1', description: 'Central King vs Corner King in Endgame' },
  { id: 'midgame_king', category: 'TAPERED', fenA: 'rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1RK1 w kq - 0 1', fenB: 'rnbqkb1r/pppppppp/8/8/8/4K3/PPPPPPPP/RNBQ1R2 w kq - 0 1', description: 'Castled King vs Central King in Midgame' }
];
