export interface PositionEvaluationResult {
  id: string;
  category: string;
  fen: string;
  sideToMove: 'w' | 'b';
  vanguardBestMove: string | null;
  expectedBestMove?: string;
  alternativeBestMoves?: string[];
  vanguardScore: number;
  expectedScoreSign?: 'positive' | 'negative' | 'neutral';
  isTop1Match: boolean;
  isSignMatch: boolean;
  isCriticalDisagreement: boolean;
  divergenceReason?: string;
  executionTimeMs: number;
}

export interface ReferenceComparisonSummary {
  totalPositions: number;
  top1Matches: number;
  top1AgreementPercent: number;
  top3Agreement: string; // 'NOT_AVAILABLE'
  top5Agreement: string; // 'NOT_AVAILABLE'
  signMatches: number;
  signAgreementPercent: number;
  criticalDisagreementsCount: number;
  criticalDisagreements: PositionEvaluationResult[];
}

export function compareToReference(results: PositionEvaluationResult[]): ReferenceComparisonSummary {
  const totalPositions = results.length;
  const top1Matches = results.filter(r => r.isTop1Match).length;
  const signMatches = results.filter(r => r.isSignMatch).length;
  const criticalDisagreements = results.filter(r => r.isCriticalDisagreement);

  return {
    totalPositions,
    top1Matches,
    top1AgreementPercent: totalPositions > 0 ? Number(((top1Matches / totalPositions) * 100).toFixed(2)) : 0,
    top3Agreement: 'NOT_AVAILABLE (Vanguard engine search returns only top-1 bestMove without multi-PV ranking)',
    top5Agreement: 'NOT_AVAILABLE (Vanguard engine search returns only top-1 bestMove without multi-PV ranking)',
    signMatches,
    signAgreementPercent: totalPositions > 0 ? Number(((signMatches / totalPositions) * 100).toFixed(2)) : 0,
    criticalDisagreementsCount: criticalDisagreements.length,
    criticalDisagreements
  };
}
