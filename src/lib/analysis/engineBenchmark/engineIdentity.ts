export interface EngineIdentity {
  ENGINE_NAME: string;
  ENGINE_VERSION: string;
  ENGINE_IMPLEMENTATION: string;
  SEARCH_ALGORITHM: string;
  EVALUATION_MODEL: string;
  DEFAULT_DEPTH: number;
  MAX_DEPTH: number | string;
  DEPTH_UNIT: string;
  TIME_LIMIT: string;
  TRANSPOSITION_TABLE: string;
  QUIESCENCE_SEARCH: string;
  MOVE_ORDERING: string;
  ITERATIVE_DEEPENING: string;
  PRUNING: string;
  ACCURACY_FORMULA: string;
  CLASSIFICATION_THRESHOLDS: Record<string, string>;
}

export const VANGUARD_ENGINE_IDENTITY: EngineIdentity = {
  ENGINE_NAME: "Vanguard Chess Engine",
  ENGINE_VERSION: "1.0.0",
  ENGINE_IMPLEMENTATION: "TypeScript / JavaScript Native (src/lib/engine.ts)",
  SEARCH_ALGORITHM: "Minimax with Alpha-Beta Pruning",
  EVALUATION_MODEL: "Simplified Piece-Square Tables (HCE) + Standard Material Weights (P:100, N:320, B:330, R:500, Q:900, K:20000)",
  DEFAULT_DEPTH: 3,
  MAX_DEPTH: 3,
  DEPTH_UNIT: "plies (half-moves)",
  TIME_LIMIT: "NOT_IMPLEMENTED",
  TRANSPOSITION_TABLE: "NOT_IMPLEMENTED",
  QUIESCENCE_SEARCH: "IMPLEMENTED (max depth 6, captures + promotions + checks)",
  MOVE_ORDERING: "Recursive at all nodes. Priority: Mate (#) > Promotion (=Q/=R/=B/=N) > Captures (x, MVV-LVA approx) > Checks (+) > Normal.",
  ITERATIVE_DEEPENING: "NOT_IMPLEMENTED",
  PRUNING: "Alpha-Beta Pruning (standard fail-soft minimax)",
  ACCURACY_FORMULA: "95 - (blunders * 5) - (mistakes * 2) [percentage clamped in UI]",
  CLASSIFICATION_THRESHOLDS: {
    blunder: "diff < -300 centipawns",
    mistake: "-300 <= diff < -150 centipawns",
    inaccuracy: "-150 <= diff < -50 centipawns",
    great: "diff > +200 centipawns",
    good: "-50 <= diff <= +200 centipawns"
  }
};
