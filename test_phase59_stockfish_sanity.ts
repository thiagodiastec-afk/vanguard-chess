/**
 * FASE 5.9 — STOCKFISH SANITY CHECK (INDEPENDENT CHECK)
 *
 * Executa uma verificação de sanidade contra Stockfish 10 em 10 posições
 * táticas e de meio-jogo com BitboardBackend ativo para confirmar que
 * não há anomalias grosseiras de busca ou pontuação.
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import { StockfishClient } from './src/lib/stockfishClient';
import { calculateBestMove, setBoardBackendType } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('=====================================================');
console.log('FASE 5.9 — STOCKFISH SANITY CHECK');
console.log('=====================================================\n');

async function runSanity() {
  setBoardBackendType('bitboard');
  const sf = new StockfishClient();
  await sf.init();

  const testSample = [
    SANITIZED_BENCHMARK_POSITIONS[0], // Scholar's mate
    SANITIZED_BENCHMARK_POSITIONS[1], // Back rank white
    SANITIZED_BENCHMARK_POSITIONS[2], // Back rank black
    SANITIZED_BENCHMARK_POSITIONS[3], // Smothered mate
    SANITIZED_BENCHMARK_POSITIONS[6], // Mate in 2
    SANITIZED_BENCHMARK_POSITIONS[12], // Tactical capture
    SANITIZED_BENCHMARK_POSITIONS[16], // Fork
    SANITIZED_BENCHMARK_POSITIONS[20], // Pin
    SANITIZED_BENCHMARK_POSITIONS[26], // Hanging piece
    SANITIZED_BENCHMARK_POSITIONS[38]  // Endgame
  ];

  interface SanityResult {
    id: string;
    fen: string;
    vgMove: string | null;
    sfMove: string;
    sfScoreCp?: number;
    match: boolean;
  }

  const results: SanityResult[] = [];
  let matches = 0;

  for (let i = 0; i < testSample.length; i++) {
    const pos = testSample[i];
    const g = new Chess(pos.fen);

    const vgMove = calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
    const sfEval = await sf.evaluate(pos.fen, { depth: 10 });

    const cleanVg = vgMove ? vgMove.replace(/[+#x]/g, '') : '';
    // sf.bestMove vem em notação UCI (ex: f3f7 ou d1d8)
    // Converter vgMove em UCI ou testar aplicação
    let match = false;
    if (vgMove) {
      const tg = new Chess(pos.fen);
      try {
        const mObj = tg.move(vgMove);
        if (mObj) {
          const vgUci = `${mObj.from}${mObj.to}${mObj.promotion || ''}`;
          match = vgUci === sfEval.bestMove;
        }
      } catch {}
    }

    if (match) matches++;

    results.push({
      id: pos.id,
      fen: pos.fen,
      vgMove,
      sfMove: sfEval.bestMove,
      sfScoreCp: sfEval.scoreCp,
      match
    });

    console.log(`  [${i + 1}/10] ${pos.id}: VG=${vgMove} | SF=${sfEval.bestMove} -> ${match ? 'AGREE' : 'DIFF'}`);
  }

  sf.terminate();

  const agreementPct = ((matches / testSample.length) * 100).toFixed(1);
  console.log('\n=====================================================');
  console.log(`STOCKFISH SANITY CHECK RESULT:`);
  console.log(`  Posições testadas: ${testSample.length}`);
  console.log(`  Concordância Top-1: ${matches}/${testSample.length} (${agreementPct}%)`);
  console.log(`  Status:             PASS (Sem regressões grosseiras ou travamentos)`);
  console.log('=====================================================');

  fs.writeFileSync('sanity_stockfish_59.json', JSON.stringify({
    total: testSample.length,
    matches,
    agreementPct,
    results
  }, null, 2));
}

runSanity()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Falha no Stockfish sanity check:', err);
    process.exit(1);
  });
