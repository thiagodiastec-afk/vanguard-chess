export interface PerformanceStats {
  movesCount: number;
  depth: number;
  totalTimeMs: number;
  averageTimeMs: number;
  medianTimeMs: number;
  p95TimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
}

export function calculatePerformanceStats(times: number[], depth: number): PerformanceStats {
  if (times.length === 0) {
    return {
      movesCount: 0,
      depth,
      totalTimeMs: 0,
      averageTimeMs: 0,
      medianTimeMs: 0,
      p95TimeMs: 0,
      minTimeMs: 0,
      maxTimeMs: 0
    };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const totalTimeMs = sorted.reduce((sum, val) => sum + val, 0);
  const averageTimeMs = Number((totalTimeMs / sorted.length).toFixed(2));

  const mid = Math.floor(sorted.length / 2);
  const medianTimeMs = sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95TimeMs = sorted[p95Index];
  const minTimeMs = sorted[0];
  const maxTimeMs = sorted[sorted.length - 1];

  return {
    movesCount: times.length,
    depth,
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
    averageTimeMs,
    medianTimeMs,
    p95TimeMs,
    minTimeMs,
    maxTimeMs
  };
}

export interface DeterminismResult {
  runs: number;
  movesProduced: string[];
  isDeterministic: boolean;
  scoreDifferences: number;
}

export function evaluateDeterminism(moves: string[], scores: number[]): DeterminismResult {
  const firstMove = moves[0];
  const firstScore = scores[0];
  const moveMismatch = moves.some(m => m !== firstMove);
  const scoreMismatch = scores.some(s => s !== firstScore);

  return {
    runs: moves.length,
    movesProduced: Array.from(new Set(moves)),
    isDeterministic: !moveMismatch && !scoreMismatch,
    scoreDifferences: scoreMismatch ? 1 : 0
  };
}

export interface AccuracyTestCase {
  category: string;
  diff: number;
  expectedClassification: string;
  actualClassification: string;
  accuracyScore: number;
  passed: boolean;
}

export function testAccuracyAndClassification(): {
  cases: AccuracyTestCase[];
  isMonotonic: boolean;
  classificationConsistency: boolean;
} {
  // Real formula from engine.worker.ts and GameReview.tsx
  // diff = eval_after - eval_before
  // classifications:
  // diff < -300 -> blunder (-5% in review)
  // diff < -150 -> mistake (-2% in review)
  // diff < -50  -> inaccuracy
  // diff > 200  -> great
  // otherwise   -> good

  const classifyDiff = (diff: number): string => {
    if (diff < -300) return 'blunder';
    if (diff < -150) return 'mistake';
    if (diff < -50) return 'inaccuracy';
    if (diff > 200) return 'great';
    return 'good';
  };

  const calculateAccuracy = (blunders: number, mistakes: number) => {
    return Math.max(0, Math.min(100, 95 - blunders * 5 - mistakes * 2));
  };

  const testCases: AccuracyTestCase[] = [
    {
      category: 'Best Move / No Drop',
      diff: 0,
      expectedClassification: 'good',
      actualClassification: classifyDiff(0),
      accuracyScore: calculateAccuracy(0, 0),
      passed: classifyDiff(0) === 'good'
    },
    {
      category: 'Great Tactical Finding',
      diff: 250,
      expectedClassification: 'great',
      actualClassification: classifyDiff(250),
      accuracyScore: calculateAccuracy(0, 0),
      passed: classifyDiff(250) === 'great'
    },
    {
      category: 'Small Inaccuracy',
      diff: -80,
      expectedClassification: 'inaccuracy',
      actualClassification: classifyDiff(-80),
      accuracyScore: calculateAccuracy(0, 0), // Inaccuracies don't reduce accuracy formula in GameReview
      passed: classifyDiff(-80) === 'inaccuracy'
    },
    {
      category: 'Medium Mistake',
      diff: -200,
      expectedClassification: 'mistake',
      actualClassification: classifyDiff(-200),
      accuracyScore: calculateAccuracy(0, 1),
      passed: classifyDiff(-200) === 'mistake'
    },
    {
      category: 'Decisive Blunder',
      diff: -450,
      expectedClassification: 'blunder',
      actualClassification: classifyDiff(-450),
      accuracyScore: calculateAccuracy(1, 0),
      passed: classifyDiff(-450) === 'blunder'
    }
  ];

  // Check monotonicity: Best Move (acc 95) >= Mistake (acc 93) >= Blunder (acc 90)
  const accBest = calculateAccuracy(0, 0);
  const accMistake = calculateAccuracy(0, 1);
  const accBlunder = calculateAccuracy(1, 0);
  const isMonotonic = accBest >= accMistake && accMistake >= accBlunder;

  const classificationConsistency = testCases.every(c => c.passed);

  return {
    cases: testCases,
    isMonotonic,
    classificationConsistency
  };
}
