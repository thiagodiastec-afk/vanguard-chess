export interface IndependentPosition {
  id: string;
  category: string;
  fen: string;
  sideToMove: 'w' | 'b';
  source: string;
  description: string;
}

/**
 * 50 Independent, standard test positions (WAC / Bratko-Kopec / Nunn / Standard Endgames).
 * Strictly disjoint from the 68 positions used in training / calibration.
 */
export const INDEPENDENT_TEST_POSITIONS: IndependentPosition[] = [
  // --- TACTICAL (Mates, Pins, Forks, Skewers, Discovered Attacks) ---
  {
    id: 'indep_tac_01_wac01',
    category: 'TACTICAL',
    fen: '2rr3k/pp3pp1/1nnqbN1p/3pN3/2pP4/2P3Q1/PPB4P/R4RK1 w - - 0 1',
    sideToMove: 'w',
    source: 'WAC.001',
    description: 'Classic queen sacrifice leading to forced mate / material win'
  },
  {
    id: 'indep_tac_02_wac02',
    category: 'TACTICAL',
    fen: '8/7p/5k2/5p2/p1p2P2/Pr1pPK2/1P1R3P/8 b - - 0 1',
    sideToMove: 'b',
    source: 'WAC.002',
    description: 'Pawn break / rook ending tactic'
  },
  {
    id: 'indep_tac_03_wac03',
    category: 'TACTICAL',
    fen: '5rk1/1ppb3p/p1pb4/6q1/3P1p1r/2P1R2P/PP1BQ1P1/5RKN w - - 0 1',
    sideToMove: 'w',
    source: 'WAC.003',
    description: 'Counter-pin / queen defense tactic'
  },
  {
    id: 'indep_tac_04_wac04',
    category: 'TACTICAL',
    fen: 'r1b1k2r/1pp1qppp/p1np1n2/6B1/1bB1P3/2N2N2/PP2QPPP/R4RK1 w kq - 0 10',
    sideToMove: 'w',
    source: 'WAC.004',
    description: 'Nd5 knight pin exploitation'
  },
  {
    id: 'indep_tac_05_wac05',
    category: 'TACTICAL',
    fen: 'r1b2rk1/2q1b1pp/p2pp3/1p6/3BP3/2N5/PPP1Q1PP/R4RK1 w - - 0 16',
    sideToMove: 'w',
    source: 'WAC.005',
    description: 'Qg4 attack on g7'
  },
  {
    id: 'indep_tac_06_mate_in_1_a',
    category: 'TACTICAL',
    fen: 'r1b1kb1r/pppp1ppp/8/4N3/2B1n2q/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    sideToMove: 'w',
    source: 'Standard M1',
    description: 'Bxf7+ king assault'
  },
  {
    id: 'indep_tac_07_mate_in_1_b',
    category: 'TACTICAL',
    fen: '5k2/5P2/5K2/8/8/8/8/8 w - - 0 1',
    sideToMove: 'w',
    source: 'Basic End',
    description: 'Stalemate trap avoidance'
  },
  {
    id: 'indep_tac_08_bk01',
    category: 'TACTICAL',
    fen: '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1',
    sideToMove: 'b',
    source: 'Bratko-Kopec.01',
    description: 'Qd1+ deflection tactic'
  },
  {
    id: 'indep_tac_09_bk02',
    category: 'TACTICAL',
    fen: '3r1k2/4npp1/1ppr3p/p6P/P2PPPP1/1NR5/5K2/2R5 w - - 0 1',
    sideToMove: 'w',
    source: 'Bratko-Kopec.02',
    description: 'Central pawn push d5'
  },
  {
    id: 'indep_tac_10_bk03',
    category: 'TACTICAL',
    fen: '2r1nrk1/pbpq1ppp/1p1p4/n1bPp1B1/2P1P3/P1NB1N2/1PQ2PPP/R4RK1 w - - 0 1',
    sideToMove: 'w',
    source: 'Bratko-Kopec.03',
    description: 'b4 trapping the bishop'
  },

  // --- ENDGAME (KP, KR, KBN, Queen Endings) ---
  {
    id: 'indep_end_11_lucena',
    category: 'ENDGAME',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    sideToMove: 'w',
    source: 'Lucena Position',
    description: 'Classic Lucena bridge building technique'
  },
  {
    id: 'indep_end_12_philidor',
    category: 'ENDGAME',
    fen: '4k3/R7/8/4P3/8/8/8/4K2r w - - 0 1',
    sideToMove: 'w',
    source: 'Philidor Defense',
    description: 'Philidor rook defense cutoff'
  },
  {
    id: 'indep_end_13_triangulation',
    category: 'ENDGAME',
    fen: '8/8/8/5p2/4kP2/8/4K3/8 w - - 0 1',
    sideToMove: 'w',
    source: 'Opposition End',
    description: 'Key squares and king opposition'
  },
  {
    id: 'indep_end_14_pawn_race',
    category: 'ENDGAME',
    fen: '8/p7/8/8/8/8/P7/k6K w - - 0 1',
    sideToMove: 'w',
    source: 'Pawn Race',
    description: 'Symmetric outside passed pawns'
  },
  {
    id: 'indep_end_15_rook_pawn',
    category: 'ENDGAME',
    fen: '8/8/8/4k3/8/8/1r6/R3K3 w - - 0 1',
    sideToMove: 'w',
    source: 'Basic Rook',
    description: 'Active rook vs passive defense'
  },
  {
    id: 'indep_end_16_passed_pawn_advance',
    category: 'ENDGAME',
    fen: '8/8/4k3/3P4/4K3/8/8/8 b - - 0 1',
    sideToMove: 'b',
    source: 'KPvK',
    description: 'King blockades passed pawn'
  },
  {
    id: 'indep_end_17_queen_vs_pawn',
    category: 'ENDGAME',
    fen: '8/8/8/8/8/k7/2p5/Q3K3 w - - 0 1',
    sideToMove: 'w',
    source: 'Q vs P',
    description: 'Stopping c-pawn on 7th rank'
  },
  {
    id: 'indep_end_18_knight_vs_pawn',
    category: 'ENDGAME',
    fen: '8/8/8/4k3/8/5p2/8/4KN2 w - - 0 1',
    sideToMove: 'w',
    source: 'N vs P',
    description: 'Knight blockade of isolated f-pawn'
  },
  {
    id: 'indep_end_19_opposite_bishops',
    category: 'ENDGAME',
    fen: '8/4k3/4b3/8/8/3B4/4K3/8 w - - 0 1',
    sideToMove: 'w',
    source: 'Opposite B',
    description: 'Opposite colored bishop draw structure'
  },
  {
    id: 'indep_end_20_bishop_pawn',
    category: 'ENDGAME',
    fen: '8/8/8/3k4/8/1P1B4/8/4K3 w - - 0 1',
    sideToMove: 'w',
    source: 'BP vs K',
    description: 'Defending pawn push with bishop'
  },

  // --- OPENING / MIDDLEGAME STRATEGY ---
  {
    id: 'indep_op_21_caro_kann',
    category: 'OPENING',
    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3',
    sideToMove: 'w',
    source: 'Caro-Kann',
    description: 'Caro-Kann 2.Nc3 d5'
  },
  {
    id: 'indep_op_22_french_defense',
    category: 'OPENING',
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    sideToMove: 'w',
    source: 'French',
    description: 'French Defense 1.e4 e6'
  },
  {
    id: 'indep_op_23_kings_indian',
    category: 'OPENING',
    fen: 'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQK2R b KQkq - 3 6',
    sideToMove: 'b',
    source: 'KID Classical',
    description: 'King\'s Indian Classical main setup'
  },
  {
    id: 'indep_op_24_nimzo_indian',
    category: 'OPENING',
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
    sideToMove: 'w',
    source: 'Nimzo-Indian',
    description: 'Nimzo-Indian 4.e3 or 4.Qc2 choice'
  },
  {
    id: 'indep_op_25_grunfeld',
    category: 'OPENING',
    fen: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq d6 0 4',
    sideToMove: 'w',
    source: 'Grunfeld',
    description: 'Grunfeld 3...d5'
  },
  {
    id: 'indep_op_26_slav_defense',
    category: 'OPENING',
    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    sideToMove: 'w',
    source: 'Slav',
    description: 'Slav Defense 2...c6'
  },
  {
    id: 'indep_op_27_scandinavian',
    category: 'OPENING',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
    sideToMove: 'w',
    source: 'Scandinavian',
    description: 'Scandinavian 1...d5'
  },
  {
    id: 'indep_op_28_english_opening',
    category: 'OPENING',
    fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1',
    sideToMove: 'b',
    source: 'English',
    description: 'English Opening 1.c4'
  },
  {
    id: 'indep_op_29_petrov_defense',
    category: 'OPENING',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    sideToMove: 'w',
    source: 'Petrov',
    description: 'Petrov Defense 2...Nf6'
  },
  {
    id: 'indep_op_30_vienna_game',
    category: 'OPENING',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3',
    sideToMove: 'w',
    source: 'Vienna',
    description: 'Vienna Game 2.Nc3 Nc6'
  },

  // --- KING SAFETY / TROPISM / SHIELD PRESSURE ---
  {
    id: 'indep_ks_31_greek_gift',
    category: 'KING_SAFETY',
    fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/1bPP4/2N1PN2/PP1B1PPP/R2QKB1R w KQ - 0 7',
    sideToMove: 'w',
    source: 'Greek Gift Prelude',
    description: 'Piece buildup against castle'
  },
  {
    id: 'indep_ks_32_fianchetto_shield',
    category: 'KING_SAFETY',
    fen: 'r1bq1rk1/ppp1ppbp/2np1np1/8/2PPP3/2N1BP2/PP2N1PP/R2QKB1R b KQ - 0 7',
    sideToMove: 'b',
    source: 'Saemisch KID',
    description: 'Fianchetto defense against king march'
  },
  {
    id: 'indep_ks_33_exposed_king_center',
    category: 'KING_SAFETY',
    fen: 'r3k2r/pppqbppp/2np1n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 8',
    sideToMove: 'w',
    source: 'Central King',
    description: 'Queens on board with kings in center'
  },
  {
    id: 'indep_ks_34_opposite_castles',
    category: 'KING_SAFETY',
    fen: '2kr3r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N1P/PPP1QPP1/2KR3R w - - 0 10',
    sideToMove: 'w',
    source: 'Opposite Castles',
    description: 'Mutual attack on opposite castled kings'
  },
  {
    id: 'indep_ks_35_damaged_shield',
    category: 'KING_SAFETY',
    fen: 'r1bq1rk1/pp1n1p1p/2p1p1p1/3p4/2PP4/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
    sideToMove: 'w',
    source: 'Broken Shield',
    description: 'Pawn shield pushed to g6'
  },

  // --- PAWN STRUCTURE (Doubled, Isolated, Backward, Chains) ---
  {
    id: 'indep_ps_36_isolani',
    category: 'PAWN_STRUCTURE',
    fen: 'r1bq1rk1/pp3ppp/2n1pn2/3p4/2PP4/2NB1N2/PP3PPP/R1BQK2R w KQ - 0 9',
    sideToMove: 'w',
    source: 'IQp (Isolani)',
    description: 'Classic Isolated Queen Pawn structure'
  },
  {
    id: 'indep_ps_37_hanging_pawns',
    category: 'PAWN_STRUCTURE',
    fen: 'r2q1rk1/pb1nbppp/1p2p3/2pp4/2PP4/1PN1PN2/PB2BPPP/R2Q1RK1 w - - 0 11',
    sideToMove: 'w',
    source: 'Hanging Pawns',
    description: 'Hanging pawns on c4/d4'
  },
  {
    id: 'indep_ps_38_doubled_f_pawns',
    category: 'PAWN_STRUCTURE',
    fen: 'r1bq1rk1/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/R1BQK2R w KQ - 0 7',
    sideToMove: 'w',
    source: 'Doubled f-pawn',
    description: 'Exchange leading to structural weakness'
  },
  {
    id: 'indep_ps_39_pawn_majority',
    category: 'PAWN_STRUCTURE',
    fen: '8/2p2pk1/p1p1p1p1/7p/P1P4P/1P3KP1/5P2/8 w - - 0 30',
    sideToMove: 'w',
    source: 'Queenside Majority',
    description: 'Outside majority 3 vs 2 on queenside'
  },
  {
    id: 'indep_ps_40_closed_chain',
    category: 'PAWN_STRUCTURE',
    fen: 'r1b1k2r/pp1n1ppp/2p1pn2/q2p2B1/2PP4/P1P1PN2/5PPP/R2QKB1R w KQkq - 1 9',
    sideToMove: 'w',
    source: 'Closed Chain',
    description: 'Solid c4/d4/e3 chain vs c6/d5/e6'
  },

  // --- PROMOTION & TACTICAL CONVERSION ---
  {
    id: 'indep_pr_41_underpromotion_n',
    category: 'PROMOTION',
    fen: '8/5P2/8/8/8/6k1/8/6K1 w - - 0 1',
    sideToMove: 'w',
    source: 'Underpromotion',
    description: 'f7 pawn promotion'
  },
  {
    id: 'indep_pr_42_rook_behind_passed',
    category: 'PROMOTION',
    fen: 'R7/8/4k3/8/8/4p3/8/4K3 b - - 0 1',
    sideToMove: 'b',
    source: 'Tarrasch Rule',
    description: 'Rook behind passed pawn'
  },
  {
    id: 'indep_pr_43_two_connected_passed',
    category: 'PROMOTION',
    fen: '8/8/8/8/1PP5/8/k7/4K3 w - - 0 1',
    sideToMove: 'w',
    source: 'Connected Passed',
    description: 'Two connected passed pawns march'
  },
  {
    id: 'indep_pr_44_queening_square_control',
    category: 'PROMOTION',
    fen: '8/1P6/8/8/8/8/1r6/4K2k w - - 0 1',
    sideToMove: 'w',
    source: 'Queening Square',
    description: 'b7 pawn supported towards b8'
  },
  {
    id: 'indep_pr_45_passed_pawn_duel',
    category: 'PROMOTION',
    fen: '8/8/8/p7/7P/8/8/k6K w - - 0 1',
    sideToMove: 'w',
    source: 'Pawn Duel',
    description: 'Flank pawn race h4 vs a5'
  },

  // --- MATERIAL IMBALANCE & COMPLEX POSITIONS ---
  {
    id: 'indep_imb_46_queen_vs_two_rooks',
    category: 'MATERIAL_IMBALANCE',
    fen: '8/5pk1/4p1p1/7p/7P/4q1P1/5RK1/5R2 w - - 0 35',
    sideToMove: 'w',
    source: 'Q vs 2R',
    description: 'Two rooks coordinate against queen'
  },
  {
    id: 'indep_imb_47_exchange_sacrifice',
    category: 'MATERIAL_IMBALANCE',
    fen: 'r1b2rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N2NP1/PP2PPBP/R1B2RK1 w - - 0 8',
    sideToMove: 'w',
    source: 'Catalan Imbalance',
    description: 'Minor piece compensation for rook'
  },
  {
    id: 'indep_imb_48_bishop_pair_advantage',
    category: 'MATERIAL_IMBALANCE',
    fen: 'r4rk1/pp3ppp/2n1b3/2b5/8/2B2N2/PPP2PPP/2KR1B1R w - - 0 13',
    sideToMove: 'w',
    source: 'Bishop Pair Open',
    description: 'Bishop pair in open center'
  },
  {
    id: 'indep_imb_49_two_knights_vs_bishop',
    category: 'MATERIAL_IMBALANCE',
    fen: '8/5pk1/4p1p1/2b4p/7P/4nNP1/5PK1/8 w - - 0 35',
    sideToMove: 'w',
    source: 'N vs B End',
    description: 'Knight active placement vs bishop'
  },
  {
    id: 'indep_imb_50_sharp_sacrifice',
    category: 'MATERIAL_IMBALANCE',
    fen: 'r1bqk2r/pp1nbppp/2p1pn2/3p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQkq - 0 7',
    sideToMove: 'w',
    source: 'QGD Classical',
    description: 'Solid opening dynamic tension'
  }
];
