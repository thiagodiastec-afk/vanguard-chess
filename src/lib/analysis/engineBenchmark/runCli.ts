import { runFullBenchmark } from './benchmarkRunner';
import { generateBenchmarkReportMarkdown } from './benchmarkReport';
import * as fs from 'fs';
import * as path from 'path';

try {
  console.log('=====================================================');
  console.log(' VANGUARD CHESS ENGINE QUALITY VALIDATION (FASE 5)');
  console.log('=====================================================\n');

  const startTime = Date.now();
  const benchmarkResult = runFullBenchmark();
  const totalDurationMs = Date.now() - startTime;

  const markdownReport = generateBenchmarkReportMarkdown(benchmarkResult);

  console.log(markdownReport);
  console.log('\n=====================================================');
  console.log(` Benchmark completed in ${totalDurationMs} ms`);
  console.log('=====================================================');
} catch (error) {
  console.error('Benchmark execution error:', error);
  process.exit(1);
}
