import { SANITY_POSITIONS, SYMMETRY_PAIRS, CATEGORY_PAIRS } from './positions.ts';
import { getEvaluation } from './evaluator.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from '../engineBenchmark/benchmarkPositions.ts';

export function runSanityTests() {
  console.log('--- SANITY TESTS ---');
  for (const pos of SANITY_POSITIONS) {
    const val = getEvaluation(pos.fen);
    console.log(`[${pos.id}] ${pos.description}: ${val}`);
  }
}

export function runSymmetryTests() {
  console.log('\n--- SYMMETRY TESTS ---');
  for (const pair of SYMMETRY_PAIRS) {
    const valA = getEvaluation(pair.fenA);
    const valB = getEvaluation(pair.fenB);
    const diff = valA + valB; // Should be ~0 if symmetric (since evalB is for black, wait)
    // Actually, evalB is a black position. Does the evaluation function flip sign based on turn?
    // Let's check.
    console.log(`[${pair.id}] A: ${valA}, B: ${valB} => Diff(A+B): ${diff}`);
  }
}

export function runCategoryTests() {
  console.log('\n--- CATEGORY PAIR TESTS ---');
  for (const pair of CATEGORY_PAIRS) {
    const valA = getEvaluation(pair.fenA);
    const valB = getEvaluation(pair.fenB);
    const delta = valA - valB;
    console.log(`[${pair.category}] ${pair.description}`);
    console.log(`   EvalA: ${valA} | EvalB: ${valB} | Delta: ${delta}`);
  }
}

export function runBlunderAudit() {
  console.log('\n--- BLUNDER POSITION AUDIT ---');
  // Just sample 5 random tactical positions to see if material eval reflects the tactic
  const sample = SANITIZED_BENCHMARK_POSITIONS.filter(p => p.category === 'TACTICAL_CAPTURE').slice(0, 5);
  for (const pos of sample) {
    const val = getEvaluation(pos.fen);
    console.log(`[${pos.id}] Cat: ${pos.category}, Expected: ${pos.expectedBestMove}, Static Eval: ${val}`);
  }
}

export function runAll() {
  runSanityTests();
  runSymmetryTests();
  runCategoryTests();
  runBlunderAudit();
}

runAll();
