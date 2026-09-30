export * from './engineIdentity';
export * from './benchmarkPositions';
export * from './benchmarkMetrics';
export * from './referenceComparison';
export * from './benchmarkRunner';
export * from './benchmarkReport';

import { runFullBenchmark } from './benchmarkRunner';
import { generateBenchmarkReportMarkdown } from './benchmarkReport';

export function executeAndPrintBenchmark() {
  console.log('Running Vanguard Engine Quality Validation (FASE 5)...');
  const result = runFullBenchmark();
  const report = generateBenchmarkReportMarkdown(result);
  return { result, report };
}
