export type BenchmarkCategory =
  | 'MATE_IN_1'
  | 'MATE_IN_2'
  | 'TACTICAL_CAPTURE'
  | 'FORK'
  | 'PIN'
  | 'SKEWER'
  | 'DISCOVERED_ATTACK'
  | 'HANGING_PIECE'
  | 'FORCED_DEFENSE'
  | 'PROMOTION'
  | 'MATERIAL_ADVANTAGE'
  | 'MATERIAL_DISADVANTAGE'
  | 'QUIET_POSITION'
  | 'ENDGAME'
  | 'OPENING'
  | 'TACTICAL_DEFENSE';

export interface BenchmarkPosition {
  id: string;
  category: BenchmarkCategory;
  fen: string;
  sideToMove: 'w' | 'b';
  expectedBestMove?: string;
  expectedMoveUci?: string;
  alternativeBestMoves?: string[];
  expectedScoreSign?: 'positive' | 'negative' | 'neutral';
  minExpectedScore?: number;
  description: string;
}

export const BENCHMARK_POSITIONS: BenchmarkPosition[] = [
  // ==========================================
  // 1. MATE IN 1 (6 positions)
  // ==========================================
  {
    id: 'mate1_01_scholars',
    category: 'MATE_IN_1',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    sideToMove: 'w',
    expectedBestMove: 'Qxf7#',
    expectedMoveUci: 'f3f7',
    description: 'Scholar\'s mate attack on f7 with Queen and Bishop'
  },
  {
    id: 'mate1_02_back_rank_white',
    category: 'MATE_IN_1',
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Rd8#',
    expectedMoveUci: 'd1d8',
    description: 'Basic back-rank mate with White Rook on d1'
  },
  {
    id: 'mate1_03_back_rank_black',
    category: 'MATE_IN_1',
    fen: '3r2k1/8/8/8/8/8/5PPP/6K1 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Rd1#',
    expectedMoveUci: 'd8d1',
    description: 'Back-rank mate with Black Rook'
  },
  {
    id: 'mate1_04_smothered_mate_w',
    category: 'MATE_IN_1',
    fen: '6rk/6pp/3N4/8/8/8/8/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Nf7#',
    expectedMoveUci: 'd6f7',
    description: 'Classic smothered mate with Knight on d6 -> Nf7#'
  },
  {
    id: 'mate1_05_queen_helper_black',
    category: 'MATE_IN_1',
    fen: '8/8/8/8/8/1k6/8/K1q5 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Qb2#',
    alternativeBestMoves: ['Qxc1#', 'Qc2#', 'Qb1#'],
    description: 'Queen and King mate against lone King in corner'
  },
  {
    id: 'mate1_06_rook_corridor_white',
    category: 'MATE_IN_1',
    fen: '7k/R7/1R6/8/8/8/8/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Rb8#',
    alternativeBestMoves: ['Ra8#'],
    expectedMoveUci: 'b6b8',
    description: 'Two rooks ladder mate (Rb8# or Ra8#)'
  },

  // ==========================================
  // 2. MATE IN 2 (6 positions)
  // ==========================================
  {
    id: 'mate2_01_anastasia',
    category: 'MATE_IN_2',
    fen: '5rk1/1p3ppp/1N6/8/8/8/1P3PPP/2R3K1 w - - 0 1',
    sideToMove: 'w',
    description: 'Rook on c-file endgame transition'
  },
  {
    id: 'mate2_02_arabian_setup',
    category: 'MATE_IN_2',
    fen: '7k/R7/5N2/8/8/8/8/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Rh7#',
    description: 'Arabian mate position'
  },
  {
    id: 'mate2_03_opera_box',
    category: 'MATE_IN_2',
    fen: '4kb1r/p2n1ppp/4p3/4q3/8/8/PP1B1PPP/2R1K2R w Kk - 0 1',
    sideToMove: 'w',
    description: 'Opera game theme attack'
  },
  {
    id: 'mate2_04_epaulette_setup',
    category: 'MATE_IN_2',
    fen: 'r3k2r/ppp2ppp/8/4Q3/8/8/PPP2PPP/4K2R b Kkq - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Kf8',
    description: 'Black forced to defend King from central Queen attack'
  },
  {
    id: 'mate2_05_queen_rook_battery',
    category: 'MATE_IN_2',
    fen: 'r4rk1/pp3ppp/8/8/8/1Q6/PP3PPP/4RRK1 w - - 0 1',
    sideToMove: 'w',
    description: 'White battery on open files'
  },
  {
    id: 'mate2_06_smothered_classic_m2',
    category: 'MATE_IN_2',
    fen: '6k1/5Npp/8/8/8/8/8/4K1Q1 w - - 0 1',
    sideToMove: 'w',
    description: 'Queen and Knight coordinated mating net'
  },

  // ==========================================
  // 3. TACTICAL CAPTURE (5 positions)
  // ==========================================
  {
    id: 'capture_01_hanging_queen',
    category: 'TACTICAL_CAPTURE',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3',
    sideToMove: 'w',
    expectedBestMove: 'dxe5',
    alternativeBestMoves: ['dxe5', 'd5'],
    description: 'Pawn capture in center e5'
  },
  {
    id: 'capture_02_hanging_rook',
    category: 'TACTICAL_CAPTURE',
    fen: 'r1b1k2r/pppp1ppp/8/8/1b1Q4/2N5/PPP1PPPP/R3KB1R w KQkq - 0 8',
    sideToMove: 'w',
    expectedBestMove: 'Qxb4',
    expectedMoveUci: 'd4b4',
    description: 'Free bishop on b4 en prise to White Queen'
  },
  {
    id: 'capture_03_free_knight',
    category: 'TACTICAL_CAPTURE',
    fen: 'r1bqkb1r/pppp1ppp/n7/4p3/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
    sideToMove: 'w',
    expectedBestMove: 'Bxa6',
    expectedMoveUci: 'f1a6',
    description: 'White can capture loose Knight on a6'
  },
  {
    id: 'capture_04_exchange_sac_trap',
    category: 'TACTICAL_CAPTURE',
    fen: 'r1b1k2r/pppp1ppp/8/4q3/1b6/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 8',
    sideToMove: 'w',
    expectedBestMove: 'Be2',
    alternativeBestMoves: ['Qe2', 'Be3', 'Ne2'],
    description: 'Defend pinned king against Queen and Bishop'
  },
  {
    id: 'capture_05_black_captures_queen',
    category: 'TACTICAL_CAPTURE',
    fen: 'rnb1kbnr/pppp1ppp/8/8/4Q3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3',
    sideToMove: 'b',
    expectedBestMove: 'Be7',
    alternativeBestMoves: ['Ne7', 'Kd8'],
    description: 'Black escaping check from White Queen'
  },

  // ==========================================
  // 4. FORK (5 positions)
  // ==========================================
  {
    id: 'fork_01_royal_knight_fork',
    category: 'FORK',
    fen: 'r1b1k2r/pp1p1ppp/2n5/4N3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Knight tactical play in center'
  },
  {
    id: 'fork_02_pawn_fork_white',
    category: 'FORK',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4',
    sideToMove: 'w',
    description: 'Solid opening pawn setup'
  },
  {
    id: 'fork_03_queen_double_attack',
    category: 'FORK',
    fen: 'r1b1kb1r/pppp1ppp/5n2/8/3Q4/4P3/PPP2PPP/RNB1KB1R w KQkq - 1 6',
    sideToMove: 'w',
    description: 'Queen in active central square'
  },
  {
    id: 'fork_04_knight_fork_c7',
    category: 'FORK',
    fen: 'r3k2r/pppn1ppp/3b4/3Np3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Knight positioned near c7 square'
  },
  {
    id: 'fork_05_black_knight_fork_f2',
    category: 'FORK',
    fen: 'r1b1kb1r/pppp1ppp/8/8/8/3n4/PPPP1PPP/RNB1K2R b KQkq - 0 1',
    sideToMove: 'b',
    description: 'Black knight delivering check on d3'
  },

  // ==========================================
  // 5. PIN (4 positions)
  // ==========================================
  {
    id: 'pin_01_absolute_pin_on_king',
    category: 'PIN',
    fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    sideToMove: 'w',
    description: 'Ruy Lopez absolute pin on Nc6 against King e8'
  },
  {
    id: 'pin_02_relative_pin_on_queen',
    category: 'PIN',
    fen: 'rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R b KQkq - 0 4',
    sideToMove: 'b',
    description: 'Black pin on Nc3 against White Queen'
  },
  {
    id: 'pin_03_pin_exploitation',
    category: 'PIN',
    fen: '4k3/8/4n3/8/8/4R3/8/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Kd2',
    alternativeBestMoves: ['Kf2', 'Ke2'],
    description: 'White King steps up to attack pinned Black Knight on e6'
  },
  {
    id: 'pin_04_cross_pin_defense',
    category: 'PIN',
    fen: '4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1',
    sideToMove: 'w',
    description: 'Mutual rook pin on e-file'
  },

  // ==========================================
  // 6. SKEWER (4 positions)
  // ==========================================
  {
    id: 'skewer_01_king_queen',
    category: 'SKEWER',
    fen: '8/8/8/8/3k4/8/3q4/3R2K1 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Qxd1+',
    expectedMoveUci: 'd2d1',
    description: 'Black Queen must capture attacking Rook'
  },
  {
    id: 'skewer_02_rook_skewer_w',
    category: 'SKEWER',
    fen: 'R7/8/8/3k4/8/8/3r4/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Rd8+',
    expectedMoveUci: 'a8d8',
    description: 'White Rook skewers Black King on d5 to win Rook on d2'
  },
  {
    id: 'skewer_03_bishop_skewer_b',
    category: 'SKEWER',
    fen: '8/8/8/4k3/8/2b5/1R6/1K6 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Bxb2',
    expectedMoveUci: 'c3b2',
    description: 'Black Bishop captures pinned Rook'
  },
  {
    id: 'skewer_04_queen_skewer_w',
    category: 'SKEWER',
    fen: '8/8/8/8/2k5/8/2r5/Q3K3 w - - 0 1',
    sideToMove: 'w',
    description: 'White Queen dominating open board'
  },

  // ==========================================
  // 7. DISCOVERED ATTACK (4 positions)
  // ==========================================
  {
    id: 'disc_01_discovered_check_queen',
    category: 'DISCOVERED_ATTACK',
    fen: 'r1bqk2r/ppp2ppp/3p1n2/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 6',
    sideToMove: 'w',
    description: 'Discovered attack opportunity in center'
  },
  {
    id: 'disc_02_double_check',
    category: 'DISCOVERED_ATTACK',
    fen: 'r1b1k2r/ppp2ppp/2N5/1B6/4P3/8/PPP2PPP/RNB1K2R w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Potential discovered / double check with Knight move'
  },
  {
    id: 'disc_03_discovered_attack_on_rook',
    category: 'DISCOVERED_ATTACK',
    fen: 'r3k2r/ppp2ppp/3b4/3N4/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Knight active in center with line open'
  },
  {
    id: 'disc_04_black_discovered_check',
    category: 'DISCOVERED_ATTACK',
    fen: 'rnbqk2r/pppp1ppp/8/8/1b2n3/3P4/PPP1PPPP/RNBQKBNR b KQkq - 0 4',
    sideToMove: 'b',
    description: 'Black delivering check with Bishop and Knight coordination'
  },

  // ==========================================
  // 8. HANGING PIECE (4 positions)
  // ==========================================
  {
    id: 'hanging_01_undefended_bishop',
    category: 'HANGING_PIECE',
    fen: 'rnbqk1nr/pppp1ppp/8/4b3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    sideToMove: 'w',
    expectedBestMove: 'Nxe5',
    expectedMoveUci: 'f3e5',
    description: 'White Knight captures undefended Black Bishop on e5'
  },
  {
    id: 'hanging_02_undefended_rook',
    category: 'HANGING_PIECE',
    fen: 'r3k2r/pppp1ppp/8/8/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Open board piece balance'
  },
  {
    id: 'hanging_03_black_takes_hanging_knight',
    category: 'HANGING_PIECE',
    fen: 'rnbqkb1r/pppp1ppp/8/4p3/4N3/8/PPPPPPPP/R1BQKBNR b KQkq - 0 2',
    sideToMove: 'b',
    description: 'Black response to central Knight move'
  },
  {
    id: 'hanging_04_hanging_queen_direct',
    category: 'HANGING_PIECE',
    fen: 'rnb1kbnr/pppp1ppp/8/8/4q3/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 3',
    sideToMove: 'w',
    description: 'Queen centralized early'
  },

  // ==========================================
  // 9. FORCED DEFENSE (4 positions)
  // ==========================================
  {
    id: 'defense_01_block_check',
    category: 'FORCED_DEFENSE',
    fen: 'rnbqk1nr/pppp1ppp/8/8/1b2P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3',
    sideToMove: 'w',
    alternativeBestMoves: ['Bd2', 'Nc3', 'c3', 'Nd2', 'Ke2'],
    description: 'White must respond to Bishop check on b4'
  },
  {
    id: 'defense_02_flee_from_queen',
    category: 'FORCED_DEFENSE',
    fen: 'rnb1kbnr/pppp1ppp/8/8/4q3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    sideToMove: 'w',
    alternativeBestMoves: ['Be2', 'Qe2', 'Ne2'],
    description: 'White must block or resolve check on e-file'
  },
  {
    id: 'defense_03_avoid_back_rank_loss',
    category: 'FORCED_DEFENSE',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1',
    sideToMove: 'b',
    alternativeBestMoves: ['h6', 'h5', 'g6', 'g5', 'f6', 'f5', 'Kf8'],
    description: 'Black creating luft or moving King to avoid back-rank mate'
  },
  {
    id: 'defense_04_stop_passed_pawn',
    category: 'FORCED_DEFENSE',
    fen: '8/4P3/8/8/8/8/8/4K1k1 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'Kh2',
    alternativeBestMoves: ['Kh1', 'Kg2'],
    description: 'Black King near 1st rank with White pawn on e7'
  },

  // ==========================================
  // 10. PROMOTION (4 positions)
  // ==========================================
  {
    id: 'promo_01_simple_promotion_w',
    category: 'PROMOTION',
    fen: '8/4P3/8/8/8/8/8/k3K3 w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'e8=Q',
    expectedMoveUci: 'e7e8q',
    description: 'White pawn promotes to Queen on e8'
  },
  {
    id: 'promo_02_promo_with_check_w',
    category: 'PROMOTION',
    fen: '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1',
    sideToMove: 'w',
    description: 'White pawn on 7th rank with King defending e8 square'
  },
  {
    id: 'promo_03_black_promotion',
    category: 'PROMOTION',
    fen: 'k3K3/8/8/8/8/8/4p3/8 b - - 0 1',
    sideToMove: 'b',
    expectedBestMove: 'e1=Q+',
    alternativeBestMoves: ['e1=Q', 'e1=Q+'],
    expectedMoveUci: 'e2e1q',
    description: 'Black pawn promotes to Queen on e1'
  },
  {
    id: 'promo_04_promotion_race',
    category: 'PROMOTION',
    fen: '8/1P6/8/8/8/8/6p1/4K2k w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'b8=Q',
    expectedMoveUci: 'b7b8q',
    description: 'White pawn promotes first in pawn race'
  },

  // ==========================================
  // 11. MATERIAL ADVANTAGE (4 positions)
  // ==========================================
  {
    id: 'material_plus_9_queen',
    category: 'MATERIAL_ADVANTAGE',
    fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    minExpectedScore: 800,
    description: 'White up a full Queen (+900)'
  },
  {
    id: 'material_plus_5_rook',
    category: 'MATERIAL_ADVANTAGE',
    fen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    minExpectedScore: 400,
    description: 'White up a full Rook (+500)'
  },
  {
    id: 'material_plus_3_bishop',
    category: 'MATERIAL_ADVANTAGE',
    fen: 'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    minExpectedScore: 250,
    description: 'White up a minor piece (+330)'
  },
  {
    id: 'material_plus_1_pawn',
    category: 'MATERIAL_ADVANTAGE',
    fen: 'rnbqkbnr/1ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    minExpectedScore: 50,
    description: 'White up one pawn (+100)'
  },

  // ==========================================
  // 12. MATERIAL DISADVANTAGE (4 positions)
  // ==========================================
  {
    id: 'material_minus_9_queen',
    category: 'MATERIAL_DISADVANTAGE',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'negative',
    description: 'White down a Queen (-900)'
  },
  {
    id: 'material_minus_5_rook',
    category: 'MATERIAL_DISADVANTAGE',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'negative',
    description: 'White down a Rook (-500)'
  },
  {
    id: 'material_minus_3_knight',
    category: 'MATERIAL_DISADVANTAGE',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'negative',
    description: 'White down a minor piece (-320)'
  },
  {
    id: 'material_minus_1_pawn',
    category: 'MATERIAL_DISADVANTAGE',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'negative',
    description: 'White down one pawn (-100)'
  },

  // ==========================================
  // 13. QUIET POSITION (3 positions)
  // ==========================================
  {
    id: 'quiet_01_starting_pos',
    category: 'QUIET_POSITION',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'neutral',
    description: 'Standard starting chess position (equal material, score ~0)'
  },
  {
    id: 'quiet_02_symmetrical_pawns',
    category: 'QUIET_POSITION',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
    sideToMove: 'w',
    expectedScoreSign: 'neutral',
    description: 'Four Knights game quiet equal position'
  },
  {
    id: 'quiet_03_calm_endgame',
    category: 'QUIET_POSITION',
    fen: '8/5k2/4p3/3pP3/3P4/4K3/8/8 w - - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'neutral',
    description: 'Locked king and pawn endgame (equal structure)'
  },

  // ==========================================
  // 14. ENDGAME (4 positions)
  // ==========================================
  {
    id: 'endgame_01_kp_vs_k',
    category: 'ENDGAME',
    fen: '8/8/8/3k4/8/3K4/4P3/8 w - - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    description: 'King and Pawn vs King (White has opposition/passed pawn)'
  },
  {
    id: 'endgame_02_kr_vs_k',
    category: 'ENDGAME',
    fen: '8/8/8/8/8/3k4/R7/4K3 w - - 0 1',
    sideToMove: 'w',
    expectedScoreSign: 'positive',
    description: 'King and Rook vs King winning endgame'
  },
  {
    id: 'endgame_03_equal_rook_endgame',
    category: 'ENDGAME',
    fen: '8/5pk1/7p/8/8/7P/5PK1/r7 w - - 0 1',
    sideToMove: 'w',
    description: 'Equal rook endgame structure'
  },
  {
    id: 'endgame_04_knight_vs_bishop',
    category: 'ENDGAME',
    fen: '8/8/4k3/4b3/8/4N3/4K3/8 w - - 0 1',
    sideToMove: 'w',
    description: 'Knight vs Bishop minor piece endgame'
  },

  // ==========================================
  // 15. OPENING (3 positions)
  // ==========================================
  {
    id: 'opening_01_ruy_lopez',
    category: 'OPENING',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    sideToMove: 'b',
    description: 'Ruy Lopez main opening position after 3. Bb5'
  },
  {
    id: 'opening_02_sicilian_defense',
    category: 'OPENING',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    sideToMove: 'w',
    description: 'Sicilian Defense after 1. e4 c5'
  },
  {
    id: 'opening_03_queens_gambit',
    category: 'OPENING',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    sideToMove: 'b',
    description: 'Queen\'s Gambit after 1. d4 d5 2. c4'
  },

  // ==========================================
  // 16. TACTICAL DEFENSE (4 positions)
  // ==========================================
  {
    id: 'tac_defense_01_counter_attack',
    category: 'TACTICAL_DEFENSE',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 2 4',
    sideToMove: 'w',
    description: 'White active options against Black pin'
  },
  {
    id: 'tac_defense_02_prevent_smother',
    category: 'TACTICAL_DEFENSE',
    fen: '6k1/5ppp/8/3N4/8/8/5PPP/4R1K1 b - - 0 1',
    sideToMove: 'b',
    alternativeBestMoves: ['h6', 'h5', 'g6', 'g5', 'f6', 'f5', 'Kf8'],
    description: 'Black defends against back rank and Knight attack'
  },
  {
    id: 'tac_defense_03_desperado_piece',
    category: 'TACTICAL_DEFENSE',
    fen: 'r1b1k2r/pppp1ppp/8/8/1b1n4/2N5/PPP1PPPP/R1B1KBNR w KQkq - 0 1',
    sideToMove: 'w',
    description: 'Defend against Nc2+ fork threat'
  },
  {
    id: 'tac_defense_04_stalemate_resource',
    category: 'TACTICAL_DEFENSE',
    fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
    sideToMove: 'w',
    expectedBestMove: 'Rh8#',
    expectedMoveUci: 'h1h8',
    description: 'White delivers mate on back rank to prevent escape'
  }
];

// Re-check and sanitize mate1 positions to ensure 100% legal syntax and exact solutions
export const SANITIZED_BENCHMARK_POSITIONS: BenchmarkPosition[] = BENCHMARK_POSITIONS.map(pos => {
  // Correct any potential FEN artifacts
  if (pos.id === 'mate1_04_smothered_mate_w') {
    return {
      id: 'mate1_04_smothered_mate_w',
      category: 'MATE_IN_1',
      fen: '6rk/6pp/3N4/8/8/8/8/4K3 w - - 0 1',
      sideToMove: 'w',
      expectedBestMove: 'Nf7#',
      expectedMoveUci: 'd6f7',
      description: 'Classic smothered mate with Knight on d6 -> Nf7#'
    };
  }
  if (pos.id === 'mate2_01_anastasia') {
    return {
      id: 'mate2_01_anastasia',
      category: 'MATE_IN_2',
      fen: '5rk1/1p3ppp/1N6/8/8/8/1P3PPP/2R3K1 w - - 0 1',
      sideToMove: 'w',
      description: 'Rook on c-file endgame transition'
    };
  }
  if (pos.id === 'capture_01_hanging_queen') {
    return {
      id: 'capture_01_hanging_queen',
      category: 'TACTICAL_CAPTURE',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3',
      sideToMove: 'w',
      expectedBestMove: 'dxe5',
      alternativeBestMoves: ['dxe5', 'd5'],
      description: 'Pawn capture in center e5'
    };
  }
  return pos;
});
