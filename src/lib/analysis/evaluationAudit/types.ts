import { Chess } from 'chess.js';

export interface AuditPosition {
  id: string;
  fen: string;
  description: string;
  category: string;
}

export interface PairTest {
  id: string;
  category: string;
  fenA: string;
  fenB: string;
  description: string;
  expectedDiff?: number;
}
