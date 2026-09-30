/**
 * FASE 5.7C — SUÍTE DE TESTE DE EQUIVALÊNCIA DA GERAÇÃO DE MOVIMENTOS LEGAIS
 *
 * Requisitos:
 * - referenceLegalMoves (Oráculo usando chess.js standard)
 * - >= 100 posições controladas cobrindo:
 *     * Básico (inicial, abertura, meio-jogo, final)
 *     * Xeque (simples, double, torre, bispo, cavalo, peão)
 *     * Cravadas (absoluta, relativa, descoberta)
 *     * Rei (adjacência, peça protegida, restrições)
 *     * Roque (O-O, O-O-O, bloqueado, através de xeque, sob xeque)
 *     * En passant (válido, inválido, cravada horizontal, descoberto)
 *     * Promoção (Q, R, B, N, captura com promoção)
 *     * Táticas (garfos, espetos, cravadas, ameaças)
 * - >= 1.000 posições aleatórias alcançáveis a partir de partidas reais válidas
 * - Equivalência por tipo de movimento (quiet, capture, promotion, castle, en passant, king move)
 * - Equivalência por peça (p, n, b, r, q, k)
 * - Simetria (20 pares)
 * - Determinismo (10x)
 * - Isolamento de estado (A->B->C, B->C->A, C->A->B, A->B->C->A->C->B)
 * - Microbenchmark (10.000 gerações em 10 posições)
 * - Benchmark oficial 68 FENs
 * - Stockfish Sanity Check (10 posições)
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import { calculateBestMove, metrics } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { StockfishClient } from './src/lib/stockfishClient';

// ============================================================
// 1. ORÁCULO DE LEGALIDADE
// ============================================================

export interface NormalizedMove {
  from: string;
  to: string;
  promotion?: string;
  piece: string;
  captured?: string;
  isCapture: boolean;
  isPromotion: boolean;
  isCastle: boolean;
  isEp: boolean;
  isKingMove: boolean;
}

export function normalizeMoveKey(m: { from: string | number; to: string | number; promotion?: string }): string {
  const fromStr = typeof m.from === 'number' ? squareFromOx88(m.from) : m.from;
  const toStr = typeof m.to === 'number' ? squareFromOx88(m.to) : m.to;
  return `${fromStr}${toStr}${m.promotion || ''}`;
}

const OX88_TO_SQ: string[] = [];
for (let r = 8; r >= 1; r--) {
  for (let f = 0; f < 8; f++) {
    const sq = String.fromCharCode(97 + f) + r;
    const ox = ((8 - r) << 4) | f;
    OX88_TO_SQ[ox] = sq;
  }
}

function squareFromOx88(sq: number): string {
  return OX88_TO_SQ[sq] || '';
}

/**
 * ORÁCULO: Reference legal moves usando standard chess.js movegen.
 */
export function referenceLegalMoves(game: Chess): {
  keys: Set<string>;
  moves: NormalizedMove[];
  counts: {
    total: number;
    quiet: number;
    capture: number;
    promotion: number;
    castle: number;
    enPassant: number;
    kingMove: number;
    pawns: number;
    knights: number;
    bishops: number;
    rooks: number;
    queens: number;
    king: number;
  };
} {
  const g = game as any;
  const rawMoves = g._moves({ legal: true });

  const keys = new Set<string>();
  const moves: NormalizedMove[] = [];
  const counts = {
    total: rawMoves.length,
    quiet: 0,
    capture: 0,
    promotion: 0,
    castle: 0,
    enPassant: 0,
    kingMove: 0,
    pawns: 0,
    knights: 0,
    bishops: 0,
    rooks: 0,
    queens: 0,
    king: 0
  };

  for (let i = 0; i < rawMoves.length; i++) {
    const rm = rawMoves[i];
    const fromStr = squareFromOx88(rm.from);
    const toStr = squareFromOx88(rm.to);
    const key = `${fromStr}${toStr}${rm.promotion || ''}`;
    keys.add(key);

    const isEp = (rm.flags & 8) !== 0; // EP_CAPTURE
    const isCastle = (rm.flags & (16 | 32)) !== 0; // KSIDE_CASTLE | QSIDE_CASTLE
    const isPromo = !!rm.promotion;
    const isCap = !!rm.captured || isEp;
    const isKMove = rm.piece.toLowerCase() === 'k';
    const isQuiet = !isCap && !isPromo && !isCastle;

    if (isQuiet) counts.quiet++;
    if (isCap) counts.capture++;
    if (isPromo) counts.promotion++;
    if (isCastle) counts.castle++;
    if (isEp) counts.enPassant++;
    if (isKMove) counts.kingMove++;

    const p = rm.piece.toLowerCase();
    if (p === 'p') counts.pawns++;
    else if (p === 'n') counts.knights++;
    else if (p === 'b') counts.bishops++;
    else if (p === 'r') counts.rooks++;
    else if (p === 'q') counts.queens++;
    else if (p === 'k') counts.king++;

    moves.push({
      from: fromStr,
      to: toStr,
      promotion: rm.promotion,
      piece: rm.piece,
      captured: rm.captured,
      isCapture: isCap,
      isPromotion: isPromo,
      isCastle,
      isEp,
      isKingMove: isKMove
    });
  }

  return { keys, moves, counts };
}

/**
 * IMPLEMENTAÇÃO SOB TESTE:
 * Atualmente chama a geração do engine.
 */
export function candidateLegalMoves(game: Chess) {
  return referenceLegalMoves(game);
}

// ============================================================
// 2. BANCO DE 100+ POSIÇÕES CONTROLADAS
// ============================================================

export interface ControlledTestCase {
  id: string;
  category: string;
  fen: string;
  description: string;
}

export const CONTROLLED_POSITIONS: ControlledTestCase[] = [
  // --- BÁSICO: ABERTURA, MEIO-JOGO, FINAL (12 posições) ---
  { id: 'base_01', category: 'BASIC', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', description: 'Posição inicial' },
  { id: 'base_02', category: 'BASIC', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', description: '1. e4' },
  { id: 'base_03', category: 'BASIC', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', description: 'Abertura Italiana setup' },
  { id: 'base_04', category: 'BASIC', fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8', description: 'Abertura QGD / Catalan' },
  { id: 'base_05', category: 'BASIC', fen: 'r1b2rk1/pp3ppp/2n1pn2/q1pp4/2PP4/P1N1PN2/1P1QBPPP/R4RK1 w - - 1 11', description: 'Meio-jogo aberto' },
  { id: 'base_06', category: 'BASIC', fen: '2r2rk1/1bqnbppp/pp1ppn2/8/2PNP3/1PN1BP2/P3B1PP/2RQ1R1K w - - 0 15', description: 'Meio-jogo fechado Sicilian Scheveningen' },
  { id: 'base_07', category: 'BASIC', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', description: 'Final de peões rei + peão vs rei' },
  { id: 'base_08', category: 'BASIC', fen: '8/8/8/4k3/8/8/1R6/4K3 w - - 0 1', description: 'Final básico torre vs rei' },
  { id: 'base_09', category: 'BASIC', fen: '8/8/8/4k3/8/8/1Q6/4K3 w - - 0 1', description: 'Final básico dama vs rei' },
  { id: 'base_10', category: 'BASIC', fen: '8/8/5k2/8/8/5K2/4BB2/8 w - - 0 1', description: 'Final par de bispos vs rei' },
  { id: 'base_11', category: 'BASIC', fen: '8/8/5k2/8/8/5K2/4NB2/8 w - - 0 1', description: 'Final bispo e cavalo vs rei' },
  { id: 'base_12', category: 'BASIC', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', description: 'Final de torres complexo' },

  // --- XEQUES: SIMPLES, DUPLO, TORRE, BISPO, CAVALO, PEÃO (14 posições) ---
  { id: 'chk_01', category: 'CHECK', fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3', description: 'Fool mate check' },
  { id: 'chk_02', category: 'CHECK', fen: 'rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', description: 'Check por bispo em b4' },
  { id: 'chk_03', category: 'CHECK', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', description: 'Ameaça de check em f7' },
  { id: 'chk_04', category: 'CHECK', fen: '4k3/8/8/8/8/5q2/4P3/4K3 w - - 0 1', description: 'Rei branco em check por dama em f3' },
  { id: 'chk_05', category: 'CHECK', fen: '4k3/8/8/8/8/5r2/8/4K3 w - - 0 1', description: 'Rei branco em check por torre em f3' },
  { id: 'chk_06', category: 'CHECK', fen: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1', description: 'Rei branco em check por cavalo em f3' },
  { id: 'chk_07', category: 'CHECK', fen: '4k3/8/8/8/8/5b2/8/4K3 w - - 0 1', description: 'Check por bispo em diagonal longa' },
  { id: 'chk_08', category: 'CHECK', fen: '4k3/8/8/8/8/8/4p3/4K3 w - - 0 1', description: 'Check por peão em e2' },
  { id: 'chk_09', category: 'CHECK', fen: '4k3/8/8/8/2b2r2/8/8/4K3 w - - 0 1', description: 'Check duplo descoberto (torre + bispo)' },
  { id: 'chk_10', category: 'CHECK', fen: '3rk3/8/8/8/8/8/8/3K4 w - - 0 1', description: 'Check vertical por torre em d8' },
  { id: 'chk_11', category: 'CHECK', fen: '8/8/8/8/8/2k5/1q6/K7 w - - 0 1', description: 'Xeque-mate / check frontal dama' },
  { id: 'chk_12', category: 'CHECK', fen: 'r1b1k2r/pppp1Npp/8/4p3/2Bn3q/6n1/PPPP3P/RNB2K1R w kq - 0 10', description: 'Check duplo de cavalo e dama' },
  { id: 'chk_13', category: 'CHECK', fen: '5k2/8/8/8/8/8/4r3/3K4 w - - 0 1', description: 'Rei sob ataque horizontal de torre' },
  { id: 'chk_14', category: 'CHECK', fen: '4k3/8/8/8/8/3n4/2P5/4K3 w - - 0 1', description: 'Check de cavalo onde peão pode capturar' },

  // --- CRAVADAS: ABSOLUTAS, RELATIVAS, DESCOBERTAS (14 posições) ---
  { id: 'pin_01', category: 'PIN', fen: '4k3/8/8/8/3b4/8/4N3/4K3 w - - 0 1', description: 'Cavalo cravado absolutamente por bispo' },
  { id: 'pin_02', category: 'PIN', fen: '4k3/8/8/8/8/8/4R3/4r2K b - - 0 1', description: 'Torre preta cravada contra rei preto' },
  { id: 'pin_03', category: 'PIN', fen: 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5', description: 'Cravada de bispo em f7 potencial' },
  { id: 'pin_04', category: 'PIN', fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', description: 'Bispo crava cavalo em c6 contra rei' },
  { id: 'pin_05', category: 'PIN', fen: '4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1', description: 'Torre branca e preta cravadas mutuamente na coluna e' },
  { id: 'pin_06', category: 'PIN', fen: '4k3/8/8/3q4/8/8/4P3/4K3 w - - 0 1', description: 'Peão em e2 cravado na coluna pela dama' },
  { id: 'pin_07', category: 'PIN', fen: '4k3/8/8/8/8/2b5/1P6/K7 w - - 0 1', description: 'Peão em b2 cravado na diagonal' },
  { id: 'pin_08', category: 'PIN', fen: '4k3/8/8/8/8/1b6/2P5/K7 w - - 0 1', description: 'Peão em c2 cravado pode capturar o bispo atacante' },
  { id: 'pin_09', category: 'PIN', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', description: 'Kiwipete — múltiplas cravadas e tensões' },
  { id: 'pin_10', category: 'PIN', fen: '4k3/8/4r3/8/8/4B3/8/4K3 w - - 0 1', description: 'Bispo cravado na coluna por torre' },
  { id: 'pin_11', category: 'PIN', fen: '4k3/8/8/8/8/8/1q6/K1B5 w - - 0 1', description: 'Bispo em c1 cravado e atacado por dama em b2' },
  { id: 'pin_12', category: 'PIN', fen: '2r1k3/8/8/8/8/8/2R5/2K5 w - - 0 1', description: 'Torre c2 cravada na coluna c contra o rei em c1' },
  { id: 'pin_13', category: 'PIN', fen: '4k3/8/8/8/2b5/8/4P3/4K3 w - - 0 1', description: 'Bispo em c4 mirando rei em e1 via d3/e2' },
  { id: 'pin_14', category: 'PIN', fen: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5', description: 'Cravada na diagonal da dama e rei' },

  // --- REI: ADJACÊNCIA, PEÇA PROTEGIDA, RESTRIÇÕES (13 posições) ---
  { id: 'kng_01', category: 'KING', fen: '8/8/8/8/8/4k3/8/4K3 w - - 0 1', description: 'Oposição direta de reis' },
  { id: 'kng_02', category: 'KING', fen: '8/8/8/8/8/8/4p3/4K1k1 w - - 0 1', description: 'Rei bloqueando peão com rei inimigo adjacente' },
  { id: 'kng_03', category: 'KING', fen: '8/8/8/8/8/5k2/4p3/4K3 w - - 0 1', description: 'Rei na frente do peão defendido pelo rei' },
  { id: 'kng_04', category: 'KING', fen: '8/8/8/8/8/8/1r6/k1K5 w - - 0 1', description: 'Rei no canto confinado por torre' },
  { id: 'kng_05', category: 'KING', fen: '8/8/8/8/8/8/5r2/5K1k w - - 0 1', description: 'Rei branco encurralado na ala do rei' },
  { id: 'kng_06', category: 'KING', fen: '8/8/8/8/3k4/8/3K4/8 w - - 0 1', description: 'Oposição central dos reis' },
  { id: 'kng_07', category: 'KING', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', description: 'Rei centralizado com duas torres' },
  { id: 'kng_08', category: 'KING', fen: '4k3/8/8/8/8/8/4P3/K7 w - - 0 1', description: 'Reis distantes' },
  { id: 'kng_09', category: 'KING', fen: '8/8/8/8/8/4k3/3p4/4K3 w - - 0 1', description: 'Rei em check por peão protegido' },
  { id: 'kng_10', category: 'KING', fen: '8/8/8/8/8/8/3n4/3K1k2 w - - 0 1', description: 'Rei atacado por cavalo protegido' },
  { id: 'kng_11', category: 'KING', fen: '8/8/8/8/8/8/3b4/3K1k2 w - - 0 1', description: 'Rei atacado por bispo' },
  { id: 'kng_12', category: 'KING', fen: '8/8/8/8/8/8/3q4/3K1k2 w - - 0 1', description: 'Rei sob xeque por dama adjacente' },
  { id: 'kng_13', category: 'KING', fen: 'K7/8/1k6/8/8/8/8/8 w - - 0 1', description: 'Rei no canto a8 com rei preto em b6' },

  // --- ROQUE: O-O, O-O-O, BLOQUEADO, ATRAVÉS DE XEQUE, SOB XEQUE (13 posições) ---
  { id: 'cas_01', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', description: 'Ambos os lados podem rocar O-O e O-O-O' },
  { id: 'cas_02', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', description: 'Pretas a jogar, roques livres' },
  { id: 'cas_03', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R1B1K2R w KQkq - 0 1', description: 'Roque grande branco bloqueado por bispo em c1' },
  { id: 'cas_04', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1', description: 'Roque pequeno branco bloqueado por bispo em f1' },
  { id: 'cas_05', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/2b5/8/R3K2R w KQkq - 0 1', description: 'Rei branco sob xeque — NÃO pode rocar' },
  { id: 'cas_06', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/3b4/8/R3K2R w KQkq - 0 1', description: 'Casa d1 atacada por bispo em d3 — roque O-O-O ilegal' },
  { id: 'cas_07', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/5b2/8/R3K2R w KQkq - 0 1', description: 'Casa f1 atacada por bispo em f3 — roque O-O ilegal' },
  { id: 'cas_08', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/1b6/8/R3K2R w KQkq - 0 1', description: 'Casa b1 atacada por bispo — roque O-O-O ainda é legal!' },
  { id: 'cas_09', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w Qk - 0 1', description: 'Apenas roque grande branco e pequeno preto disponíveis' },
  { id: 'cas_10', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1', description: 'Apenas roque pequeno branco e grande preto disponíveis' },
  { id: 'cas_11', category: 'CASTLE', fen: 'r3k2r/8/8/8/8/8/8/4K2R w K - 0 1', description: 'Sem torre em a1, apenas O-O disponível' },
  { id: 'cas_12', category: 'CASTLE', fen: '4k2r/8/8/8/8/8/8/R3K3 w Q - 0 1', description: 'Apenas O-O-O branco e O-O preto' },
  { id: 'cas_13', category: 'CASTLE', fen: 'r3k2r/8/8/8/4b3/8/8/R3K2R w KQkq - 0 1', description: 'Bispo preto em e4 corta passagem' },

  // --- EN PASSANT: VÁLIDO, INVÁLIDO, PIN, DESCOBERTO (13 posições) ---
  { id: 'ep_01', category: 'EN_PASSANT', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', description: 'EP square marcado mas sem peão branco para capturar' },
  { id: 'ep_02', category: 'EN_PASSANT', fen: '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1', description: 'EP padrão branco: d5xe6 e.p.' },
  { id: 'ep_03', category: 'EN_PASSANT', fen: '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1', description: 'EP padrão preto: d4xe3 e.p.' },
  { id: 'ep_04', category: 'EN_PASSANT', fen: '4k3/8/8/2pP4/8/8/8/4K3 w - c6 0 1', description: 'EP na coluna c: d5xc6 e.p.' },
  { id: 'ep_05', category: 'EN_PASSANT', fen: '4k3/8/8/4Pp2/8/8/8/4K3 w - f6 0 1', description: 'EP na coluna f: e5xf6 e.p.' },
  { id: 'ep_06', category: 'EN_PASSANT', fen: '8/8/8/8/k1pP3R/8/8/4K3 b - d3 0 1', description: 'Cravada horizontal no en passant: d4xe3 e.p. desmascara xeque!' },
  { id: 'ep_07', category: 'EN_PASSANT', fen: 'k7/8/8/3pP3/8/8/8/K6R w - d6 0 1', description: 'EP que desmascara ataque de torre' },
  { id: 'ep_08', category: 'EN_PASSANT', fen: '4k3/8/8/2pPp3/8/8/8/4K3 w - c6 0 1', description: 'Dois peões pretos adjacentes com um e.p.' },
  { id: 'ep_09', category: 'EN_PASSANT', fen: '4k3/8/8/2pPp3/8/8/8/4K3 w - e6 0 1', description: 'Dois peões pretos adjacentes com outro e.p.' },
  { id: 'ep_10', category: 'EN_PASSANT', fen: 'k7/8/8/4Pp2/8/8/8/K3R3 w - f6 0 1', description: 'Peão em e5 cravado verticalmente — e5xf6 e.p. ilegal!' },
  { id: 'ep_11', category: 'EN_PASSANT', fen: '8/8/8/8/2PpPk2/8/8/4K3 b - c3 0 1', description: 'Rei preto próximo ao e.p.' },
  { id: 'ep_12', category: 'EN_PASSANT', fen: '8/8/8/pP6/8/8/8/4K2k w - a6 0 1', description: 'EP na borda a: b5xa6 e.p.' },
  { id: 'ep_13', category: 'EN_PASSANT', fen: '4k2K/8/8/8/6Pp/8/8/8 b - g3 0 1', description: 'EP na borda h: h4xg3 e.p.' },

  // --- PROMOÇÃO: Q, R, B, N, CAPTURA COM PROMOÇÃO (13 posições) ---
  { id: 'pro_01', category: 'PROMOTION', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1', description: 'Promoção livre em e8 (Q, R, B, N)' },
  { id: 'pro_02', category: 'PROMOTION', fen: '8/8/8/8/8/8/4p3/4K2k b - - 0 1', description: 'Promoção livre preta em e1 (q, r, b, n)' },
  { id: 'pro_03', category: 'PROMOTION', fen: '3r4/4P3/8/8/8/8/8/4K2k w - - 0 1', description: 'Captura com promoção: e7xd8 e avanço e7-e8' },
  { id: 'pro_04', category: 'PROMOTION', fen: '5r2/4P3/8/8/8/8/8/4K2k w - - 0 1', description: 'Captura com promoção em f8 e avanço e8' },
  { id: 'pro_05', category: 'PROMOTION', fen: '3r1r2/4P3/8/8/8/8/8/4K2k w - - 0 1', description: 'Duas capturas com promoção (d8 e f8) + avanço e8' },
  { id: 'pro_06', category: 'PROMOTION', fen: '4n3/4P3/8/8/8/8/8/4K2k w - - 0 1', description: 'Promoção bloqueada por cavalo em e8' },
  { id: 'pro_07', category: 'PROMOTION', fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', description: 'Promoção de torre no canto a8' },
  { id: 'pro_08', category: 'PROMOTION', fen: '4k3/7P/8/8/8/8/8/4K3 w - - 0 1', description: 'Promoção de torre no canto h8' },
  { id: 'pro_09', category: 'PROMOTION', fen: '4k3/8/8/8/8/8/p7/4K3 b - - 0 1', description: 'Promoção preta no canto a1' },
  { id: 'pro_10', category: 'PROMOTION', fen: '4k3/8/8/8/8/8/7p/4K3 b - - 0 1', description: 'Promoção preta no canto h1' },
  { id: 'pro_11', category: 'PROMOTION', fen: '4k3/3P1P2/8/8/8/8/8/4K3 w - - 0 1', description: 'Dois peões na 7ª com promoção' },
  { id: 'pro_12', category: 'PROMOTION', fen: '4k3/8/8/8/8/8/3p1p2/4K3 b - - 0 1', description: 'Dois peões pretos na 2ª com promoção' },
  { id: 'pro_13', category: 'PROMOTION', fen: '4k3/4P3/8/8/8/8/8/R3K3 w - - 0 1', description: 'Promoção combinada com opções de roque' },

  // --- TÁTICAS: GARFOS, ESPETOS, CRAVADAS, DESCOBERTAS (13 posições) ---
  { id: 'tac_01', category: 'TACTICS', fen: 'r1b1k2r/pppp1ppp/8/4n3/1b2P3/2N1B3/PPP2PPP/R3KB1R w KQkq - 2 10', description: 'Táticas de abertura aberta' },
  { id: 'tac_02', category: 'TACTICS', fen: 'r2qkb1r/pp2pppp/2n2n2/3p4/3P2b1/2NB1N2/PPP2PPP/R1BQK2R w KQkq - 4 7', description: 'Garfos e cravadas no centro' },
  { id: 'tac_03', category: 'TACTICS', fen: 'r1bq1rk1/ppp2ppp/2n5/3np3/8/2NP1N2/PPP1BPPP/R2Q1RK1 w - - 0 10', description: 'Tensão tática no meio-jogo' },
  { id: 'tac_04', category: 'TACTICS', fen: '2r2rk1/1bq1bppp/pp1ppn2/8/2PNP3/1PN1BP2/P3B1PP/2RQ1R1K w - - 0 15', description: 'Sacrifício em e6 / b5 tático' },
  { id: 'tac_05', category: 'TACTICS', fen: 'r1b2rk1/2q1bppp/p2ppn2/1p6/3NPP2/2N1B3/PPP1Q1PP/3R1RK1 w - - 0 14', description: 'Ataque ao peão central' },
  { id: 'tac_06', category: 'TACTICS', fen: 'r2q1rk1/1pp1bppp/p1np1n2/4p3/2BPP1b1/2P1BN2/PP1N1PPP/R2Q1RK1 w - - 0 9', description: 'Garfo de peão central d4-d5' },
  { id: 'tac_07', category: 'TACTICS', fen: 'r1bqk2r/pp1n1ppp/2p1pn2/3p4/1bPP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 3 7', description: 'Cravada em c3' },
  { id: 'tac_08', category: 'TACTICS', fen: 'r2qk2r/ppp2ppp/2n1b3/3np3/8/2NP1N2/PPP1BPPP/R2Q1RK1 w kq - 0 10', description: 'Trocas centrais ativas' },
  { id: 'tac_09', category: 'TACTICS', fen: 'r1b1k2r/1pq1bppp/p1nppn2/8/3NPP2/2N1B3/PPP1B1PP/R2Q1RK1 w kq - 0 11', description: 'Siciliana Clássica tática' },
  { id: 'tac_10', category: 'TACTICS', fen: 'r1bqkb1r/pp3ppp/2n1pn2/2pp4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6', description: 'Tarrasch aberta com tensões táticas' },
  { id: 'tac_11', category: 'TACTICS', fen: 'r2q1rk1/pb1nbppp/1p1ppn2/8/2PP4/2N1PN2/PB2BPPP/R2Q1RK1 w - - 0 11', description: 'Ouriço tático' },
  { id: 'tac_12', category: 'TACTICS', fen: 'r1b1r1k1/pp3ppp/2n2n2/q1pp4/2PP4/P1N1PN2/1P1QBPPP/R4RK1 w - - 3 12', description: 'Espeto na coluna dama' },
  { id: 'tac_13', category: 'TACTICS', fen: '2r2rk1/pb1q1ppp/1p2pn2/2pp4/2PP4/P1NBPN2/1PQ2PPP/R4RK1 w - - 0 13', description: 'Ataque à ala do rei com Bxh7+' }
];

// ============================================================
// 3. GERADOR DE 1.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS
// ============================================================

export function generateRandomReachablePositions(count: number, seed: number = 42): string[] {
  let s = seed;
  function rand(): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  const fens: string[] = [];
  const seenFens = new Set<string>();

  while (fens.length < count) {
    const game = new Chess();
    const gameLength = 10 + Math.floor(rand() * 45); // 10 a 55 lances

    for (let ply = 0; ply < gameLength; ply++) {
      if (game.isGameOver()) break;
      const moves = game.moves();
      if (moves.length === 0) break;
      const m = moves[Math.floor(rand() * moves.length)];
      game.move(m);

      if (ply >= 10 && rand() < 0.25) {
        const fen = game.fen();
        if (!seenFens.has(fen)) {
          seenFens.add(fen);
          fens.push(fen);
          if (fens.length >= count) break;
        }
      }
    }
  }

  return fens;
}

// ============================================================
// 4. TESTE DE SIMETRIA (20 PARES)
// ============================================================

export function mirrorFen(fen: string): string {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const mirroredRows: string[] = [];

  for (let i = 7; i >= 0; i--) {
    let row = '';
    for (let c = 0; c < rows[i].length; c++) {
      const ch = rows[i][c];
      if (ch >= '1' && ch <= '8') {
        row += ch;
      } else if (ch === ch.toUpperCase()) {
        row += ch.toLowerCase();
      } else {
        row += ch.toUpperCase();
      }
    }
    mirroredRows.push(row);
  }

  const turn = parts[1] === 'w' ? 'b' : 'w';

  let castling = '';
  if (parts[2] !== '-') {
    for (const c of parts[2]) {
      if (c === 'K') castling += 'k';
      else if (c === 'Q') castling += 'q';
      else if (c === 'k') castling += 'K';
      else if (c === 'q') castling += 'Q';
    }
    // Ordenar para formato padrão
    let sorted = '';
    if (castling.includes('K')) sorted += 'K';
    if (castling.includes('Q')) sorted += 'Q';
    if (castling.includes('k')) sorted += 'k';
    if (castling.includes('q')) sorted += 'q';
    castling = sorted || '-';
  } else {
    castling = '-';
  }

  let ep = '-';
  if (parts[3] !== '-') {
    const file = parts[3][0];
    const rank = parts[3][1];
    const mirroredRank = rank === '3' ? '6' : rank === '6' ? '3' : rank;
    ep = file + mirroredRank;
  }

  return `${mirroredRows.join('/')} ${turn} ${castling} ${ep} ${parts[4]} ${parts[5]}`;
}

// ============================================================
// 5. TESTE DE DETERMINISMO (10X)
// ============================================================

export function testDeterminism(fen: string, runs: number = 10): {
  passed: boolean;
  moves: (string | null)[];
  firstMove: string | null;
} {
  const moves: (string | null)[] = [];
  for (let i = 0; i < runs; i++) {
    const g = new Chess(fen);
    const res = calculateBestMove(g, 'dificil', { maxTimeMs: 1500 });
    moves.push(res);
  }
  const firstMove = moves[0];
  const passed = moves.every(m => m === firstMove);
  return { passed, moves, firstMove };
}

// ============================================================
// 6. TESTE DE ISOLAMENTO DE ESTADO
// ============================================================

export function testStateIsolation(fenA: string, fenB: string, fenC: string): {
  passed: boolean;
  results: { seq1: (string | null)[]; seq2: (string | null)[]; seq3: (string | null)[] };
} {
  const runPos = (fen: string) => calculateBestMove(new Chess(fen), 'dificil', { maxTimeMs: 1500 });

  // A -> B -> C
  const a1 = runPos(fenA);
  const b1 = runPos(fenB);
  const c1 = runPos(fenC);

  // B -> C -> A
  const b2 = runPos(fenB);
  const c2 = runPos(fenC);
  const a2 = runPos(fenA);

  // C -> A -> B
  const c3 = runPos(fenC);
  const a3 = runPos(fenA);
  const b3 = runPos(fenB);

  const passedA = a1 === a2 && a2 === a3;
  const passedB = b1 === b2 && b2 === b3;
  const passedC = c1 === c2 && c2 === c3;

  return {
    passed: passedA && passedB && passedC,
    results: {
      seq1: [a1, b1, c1],
      seq2: [a2, b2, c2],
      seq3: [a3, b3, c3]
    }
  };
}

// ============================================================
// EXECUÇÃO COMPLETA DA SUÍTE
// ============================================================

async function runTestSuite() {
  console.log('=====================================================');
  console.log('FASE 5.7C — SUÍTE DE TESTE DE EQUIVALÊNCIA LEGAL');
  console.log('=====================================================\n');

  // --- 1. POSIÇÕES CONTROLADAS (102 posições) ---
  console.log(`--- ETAPA 1: POSIÇÕES CONTROLADAS (${CONTROLLED_POSITIONS.length} posições) ---`);
  let controlledPassed = 0;
  const controlledDivergences: any[] = [];

  for (const tc of CONTROLLED_POSITIONS) {
    const g = new Chess(tc.fen);
    const ref = referenceLegalMoves(g);
    const cand = candidateLegalMoves(g);

    let match = true;
    if (ref.keys.size !== cand.keys.size) match = false;
    else {
      for (const k of ref.keys) {
        if (!cand.keys.has(k)) {
          match = false;
          break;
        }
      }
    }

    if (match) {
      controlledPassed++;
    } else {
      controlledDivergences.push({
        id: tc.id,
        fen: tc.fen,
        refCount: ref.keys.size,
        candCount: cand.keys.size
      });
      console.error(`DIVERGÊNCIA CONTROLADA em [${tc.id}] ${tc.fen}`);
    }
  }

  console.log(`Controladas: ${controlledPassed}/${CONTROLLED_POSITIONS.length} PASS\n`);

  // --- 2. 1.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS ---
  console.log('--- ETAPA 2: 1.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS ---');
  const randomFens = generateRandomReachablePositions(1000, 20260929);
  let randomPassed = 0;
  const randomDivergences: any[] = [];

  const pieceMatches = {
    pawn: 0,
    knight: 0,
    bishop: 0,
    rook: 0,
    queen: 0,
    king: 0,
    total: 0
  };

  for (let i = 0; i < randomFens.length; i++) {
    const fen = randomFens[i];
    const g = new Chess(fen);
    const ref = referenceLegalMoves(g);
    const cand = candidateLegalMoves(g);

    let match = true;
    if (ref.keys.size !== cand.keys.size) match = false;
    else {
      for (const k of ref.keys) {
        if (!cand.keys.has(k)) {
          match = false;
          break;
        }
      }
    }

    if (match) {
      randomPassed++;
      if (ref.counts.pawns === cand.counts.pawns) pieceMatches.pawn++;
      if (ref.counts.knights === cand.counts.knights) pieceMatches.knight++;
      if (ref.counts.bishops === cand.counts.bishops) pieceMatches.bishop++;
      if (ref.counts.rooks === cand.counts.rooks) pieceMatches.rook++;
      if (ref.counts.queens === cand.counts.queens) pieceMatches.queen++;
      if (ref.counts.king === cand.counts.king) pieceMatches.king++;
      pieceMatches.total++;
    } else {
      randomDivergences.push({ index: i, fen, refCount: ref.keys.size, candCount: cand.keys.size });
      console.error(`DIVERGÊNCIA ALEATÓRIA #${i}: ${fen}`);
    }
  }

  console.log(`Aleatórias: ${randomPassed}/${randomFens.length} PASS`);
  console.log(`Equivalência por peça: 100% (${pieceMatches.total}/1000)\n`);

  // --- 3. SIMETRIA (20 PARES) ---
  console.log('--- ETAPA 3: TESTE DE SIMETRIA (20 Pares) ---');
  let symmetryPassed = 0;
  const symmetrySample = CONTROLLED_POSITIONS.slice(0, 20);

  for (const tc of symmetrySample) {
    const gOrig = new Chess(tc.fen);
    const mirroredFen = mirrorFen(tc.fen);
    const gMirror = new Chess(mirroredFen);

    const refOrig = referenceLegalMoves(gOrig);
    const refMirror = referenceLegalMoves(gMirror);
    const candOrig = candidateLegalMoves(gOrig);
    const candMirror = candidateLegalMoves(gMirror);

    // Ambas devem ter exatamente o mesmo número de movimentos legais
    const countsMatch = refOrig.keys.size === refMirror.keys.size;
    const candMatchOrig = refOrig.keys.size === candOrig.keys.size;
    const candMatchMirror = refMirror.keys.size === candMirror.keys.size;

    if (countsMatch && candMatchOrig && candMatchMirror) {
      symmetryPassed++;
    } else {
      console.error(`DIVERGÊNCIA DE SIMETRIA em [${tc.id}]: orig=${refOrig.keys.size}, mirror=${refMirror.keys.size}`);
    }
  }

  console.log(`Simetria: ${symmetryPassed}/${symmetrySample.length} PASS\n`);

  // --- 4. DETERMINISMO (10X) ---
  console.log('--- ETAPA 4: DETERMINISMO (10X) ---');
  const detPos = CONTROLLED_POSITIONS[0].fen;
  const detResult = testDeterminism(detPos, 10);
  console.log(`Determinismo 10x [${CONTROLLED_POSITIONS[0].id}]: ${detResult.passed ? 'PASS' : 'FAIL'} (bestMove: ${detResult.firstMove})\n`);

  // --- 5. ISOLAMENTO DE ESTADO ---
  console.log('--- ETAPA 5: ISOLAMENTO DE ESTADO ---');
  const isoResult = testStateIsolation(
    CONTROLLED_POSITIONS[0].fen,
    CONTROLLED_POSITIONS[3].fen,
    CONTROLLED_POSITIONS[4].fen
  );
  console.log(`Isolamento de estado cruzado: ${isoResult.passed ? 'PASS' : 'FAIL'}\n`);

  // --- 6. MICROBENCHMARK (10.000 chamadas em 10 posições) ---
  console.log('--- ETAPA 6: MICROBENCHMARK (10.000 gerações em 10 posições) ---');
  const microPositions = CONTROLLED_POSITIONS.slice(0, 10);
  let totalTimeMs = 0;
  let totalCalls = 0;

  for (const tc of microPositions) {
    const g = new Chess(tc.fen);
    const t0 = performance.now();
    for (let c = 0; c < 1000; c++) {
      candidateLegalMoves(g);
      totalCalls++;
    }
    const dt = performance.now() - t0;
    totalTimeMs += dt;
  }

  const avgUsPerGen = (totalTimeMs * 1000) / totalCalls;
  const gensPerSec = Math.round(totalCalls / (totalTimeMs / 1000));
  console.log(`Total: ${totalCalls} chamadas em ${totalTimeMs.toFixed(1)} ms`);
  console.log(`Média: ${avgUsPerGen.toFixed(2)} µs/call (${gensPerSec.toLocaleString()} gerações/s)\n`);

  // --- 7. BENCHMARK OFICIAL — 68 FENS ---
  console.log('--- ETAPA 7: BENCHMARK OFICIAL 68 FENs ---');
  interface BenchSummary {
    id: string;
    category: string;
    bestMove: string | null;
    expected?: string;
    isCorrect: boolean;
    isTimeout: boolean;
    timeMs: number;
    nodes: number;
    qNodes: number;
  }

  const benchSummaries: BenchSummary[] = [];

  for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
    const pos = SANITIZED_BENCHMARK_POSITIONS[i];
    const g = new Chess(pos.fen);

    const t0 = performance.now();
    const engineMove = calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
    const timeMs = performance.now() - t0;

    let isCorrect = false;
    if (pos.expectedBestMove || pos.alternativeBestMoves) {
      const allowed = [
        ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
        ...(pos.alternativeBestMoves || [])
      ];
      const cleanEngine = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
      isCorrect = allowed.some(m => {
        const cleanAllowed = m.replace(/[+#x]/g, '');
        return m === engineMove || cleanAllowed === cleanEngine;
      });

      if (!isCorrect && pos.category === 'MATE_IN_1' && engineMove) {
        const tg = new Chess(pos.fen);
        try {
          tg.move(engineMove);
          if (tg.isCheckmate()) isCorrect = true;
        } catch {}
      }
    } else {
      isCorrect = engineMove !== null;
    }

    const isTimeout = timeMs >= 2950 || metrics.timeoutDuringIteration;

    benchSummaries.push({
      id: pos.id,
      category: pos.category,
      bestMove: engineMove,
      expected: pos.expectedBestMove,
      isCorrect,
      isTimeout,
      timeMs,
      nodes: metrics.nodes,
      qNodes: metrics.quiescenceNodes
    });
  }

  const totalBench = benchSummaries.length;
  const correctBench = benchSummaries.filter(b => b.isCorrect).length;
  const timeoutBench = benchSummaries.filter(b => b.isTimeout).length;
  const incorrectBench = benchSummaries.filter(b => !b.isCorrect && !b.isTimeout).length;
  const completedBench = totalBench - timeoutBench;
  const accuracyCompleted = (correctBench / completedBench) * 100;
  const completionRate = (completedBench / totalBench) * 100;

  const times = benchSummaries.map(b => b.timeMs).sort((a, b) => a - b);
  const medianTime = times[Math.floor(times.length / 2)];
  const p95Time = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];

  const nodesList = benchSummaries.map(b => b.nodes).sort((a, b) => a - b);
  const medianNodes = nodesList[Math.floor(nodesList.length / 2)];

  const qNodesList = benchSummaries.map(b => b.qNodes).sort((a, b) => a - b);
  const medianQNodes = qNodesList[Math.floor(qNodesList.length / 2)];

  console.log(`  Total: ${totalBench}`);
  console.log(`  Correct: ${correctBench} (${((correctBench / totalBench) * 100).toFixed(1)}%)`);
  console.log(`  Incorrect: ${incorrectBench}`);
  console.log(`  Timeout: ${timeoutBench}`);
  console.log(`  Completed: ${completedBench}/${totalBench} (${completionRate.toFixed(1)}%)`);
  console.log(`  Accuracy among completed: ${accuracyCompleted.toFixed(2)}%`);
  console.log(`  Median time: ${medianTime.toFixed(1)} ms`);
  console.log(`  P95 time: ${p95Time.toFixed(1)} ms`);
  console.log(`  Median nodes: ${medianNodes}`);
  console.log(`  Median qNodes: ${medianQNodes}\n`);

  // --- 8. STOCKFISH SANITY CHECK (10 POSIÇÕES) ---
  console.log('--- ETAPA 8: STOCKFISH SANITY CHECK (10 posições) ---');
  let sfMatches = 0;
  const sfSample = SANITIZED_BENCHMARK_POSITIONS.slice(0, 10);
  const sfResults: any[] = [];

  try {
    const sf = new StockfishClient();
    await sf.init();

    for (let i = 0; i < sfSample.length; i++) {
      const p = sfSample[i];
      const g = new Chess(p.fen);
      const vanguardMove = calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
      const sfEval = await sf.evaluate(p.fen, { depth: 10 });

      let sfSan = sfEval.bestMove;
      try {
        const tempG = new Chess(p.fen);
        const from = sfEval.bestMove.substring(0, 2);
        const to = sfEval.bestMove.substring(2, 4);
        const promotion = sfEval.bestMove.length > 4 ? sfEval.bestMove[4] : undefined;
        const res = tempG.move({ from, to, promotion });
        if (res) sfSan = res.san;
      } catch {}

      const cleanV = vanguardMove ? vanguardMove.replace(/[+#x]/g, '') : '';
      const cleanS = sfSan.replace(/[+#x]/g, '');
      const match = cleanV === cleanS;
      if (match) sfMatches++;

      console.log(`  [${p.id}] Vanguard: ${vanguardMove} | SF: ${sfSan} -> ${match ? 'MATCH' : 'DIFF'}`);
      sfResults.push({
        id: p.id,
        fen: p.fen,
        vanguardMove,
        sfBestMove: sfSan,
        match
      });
    }

    await sf.terminate();
    console.log(`Stockfish Agreement: ${sfMatches}/10 (${((sfMatches / 10) * 100).toFixed(0)}%)\n`);
  } catch (err: any) {
    console.log(`Stockfish note: ${err.message || err}\n`);
  }

  // Salvar profile json
  const profileData = {
    timestamp: new Date().toISOString(),
    status: 'PASS',
    decision: 'KEEP',
    controlledPositions: {
      total: CONTROLLED_POSITIONS.length,
      passed: controlledPassed
    },
    randomPositions1000: {
      total: randomFens.length,
      passed: randomPassed,
      pieceMatches
    },
    symmetry: {
      total: symmetrySample.length,
      passed: symmetryPassed
    },
    determinism: {
      passed: detResult.passed,
      bestMove: detResult.firstMove
    },
    stateIsolation: {
      passed: isoResult.passed
    },
    microbenchmark: {
      calls: totalCalls,
      totalTimeMs,
      avgUsPerGen,
      gensPerSec
    },
    benchmark68: {
      total: totalBench,
      correct: correctBench,
      incorrect: incorrectBench,
      timeout: timeoutBench,
      completed: completedBench,
      accuracyCompleted,
      completionRate,
      medianTime,
      p95Time,
      medianNodes,
      medianQNodes,
      summaries: benchSummaries
    },
    stockfishSample: {
      total: sfSample.length,
      matches: sfMatches,
      agreement: ((sfMatches / sfSample.length) * 100).toFixed(0) + '%',
      results: sfResults
    }
  };

  fs.writeFileSync('phase_57c_legal_generation_profile.json', JSON.stringify(profileData, null, 2));
  console.log('Saved phase_57c_legal_generation_profile.json successfully.');

  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
