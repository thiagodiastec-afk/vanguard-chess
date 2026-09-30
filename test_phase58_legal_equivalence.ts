/**
 * FASE 5.8 — TESTE MASSIVO DE EQUIVALÊNCIA LEGAL: BITBOARD VS CHESS.JS ORÁCULO
 *
 * Requisitos:
 * - 105 posições controladas cobrindo todos os casos especiais (roque, cravadas, xeques, promoções, EP)
 * - >= 2.000 posições aleatórias alcançáveis geradas a partir de partidas válidas
 * - Comparação de conjunto normalizado (from + to + promotion)
 * - Exigência: 100% de equivalência exata (tolerância zero a divergências)
 */

import { Chess } from 'chess.js';
import * as fs from 'fs';
import {
  parseFen,
  generateLegalMoves,
  moveToUci,
  isInCheck
} from './src/lib/bitboard';

console.log('=====================================================');
console.log('FASE 5.8 — TESTE MASSIVO DE EQUIVALÊNCIA LEGAL');
console.log('=====================================================\n');

// 1. Oráculo Chess.js
function getChessJsLegalMoves(fen: string): Set<string> {
  const g = new Chess(fen) as any;
  const rawMoves = g._moves({ legal: true });
  const keys = new Set<string>();

  const SQUARES: string[] = [];
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = String.fromCharCode(97 + f) + r;
      const ox = ((8 - r) << 4) | f;
      SQUARES[ox] = sq;
    }
  }

  for (let i = 0; i < rawMoves.length; i++) {
    const rm = rawMoves[i];
    const fromStr = SQUARES[rm.from];
    const toStr = SQUARES[rm.to];
    const promo = rm.promotion ? rm.promotion.toLowerCase() : '';
    keys.add(`${fromStr}${toStr}${promo}`);
  }
  return keys;
}

// 2. Bitboard Legal Moves
function getBitboardLegalMoves(fen: string): Set<string> {
  const b = parseFen(fen);
  const moves = generateLegalMoves(b);
  const keys = new Set<string>();
  for (let i = 0; i < moves.length; i++) {
    keys.add(moveToUci(moves[i]));
  }
  return keys;
}

// 3. Posições Controladas (105 posições cobrindo todas as categorias críticas)
export const CONTROLLED_POSITIONS = [
  // Básico (12)
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

  // Xeques (14)
  { id: 'chk_01', category: 'CHECK', fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3', description: 'Fool mate check' },
  { id: 'chk_02', category: 'CHECK', fen: 'rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', description: 'Check por bispo em b4' },
  { id: 'chk_03', category: 'CHECK', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', description: 'Ameaça de check em f7' },
  { id: 'chk_04', category: 'CHECK', fen: '4k3/8/8/8/8/5q2/4P3/4K3 w - - 0 1', description: 'Rei branco em check por dama em f3' },
  { id: 'chk_05', category: 'CHECK', fen: '4k3/8/8/8/8/5r2/8/4K3 w - - 0 1', description: 'Rei branco em check por torre em f3' },
  { id: 'chk_06', category: 'CHECK', fen: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1', description: 'Rei branco em check por cavalo em f3' },
  { id: 'chk_07', category: 'CHECK', fen: '4k3/8/8/8/8/5b2/8/4K3 w - - 0 1', description: 'Check por bispo em diagonal longa' },
  { id: 'chk_08', category: 'CHECK', fen: '4k3/8/8/8/8/8/4p3/4K3 w - - 0 1', description: 'Check por peão em e2' },
  { id: 'chk_09', category: 'CHECK', fen: '4k3/8/8/8/1b2r3/8/8/4K3 w - - 0 1', description: 'Check duplo descoberto (torre + bispo)' },
  { id: 'chk_10', category: 'CHECK', fen: '3rk3/8/8/8/8/8/8/3K4 w - - 0 1', description: 'Check vertical por torre em d8' },
  { id: 'chk_11', category: 'CHECK', fen: '8/8/8/8/8/2k5/1q6/K7 w - - 0 1', description: 'Xeque-mate / check frontal dama' },
  { id: 'chk_12', category: 'CHECK', fen: 'r1b1k2r/pppp1Npp/8/4p3/2Bn3q/6n1/PPPP3P/RNB2K1R w kq - 0 10', description: 'Check duplo de cavalo e dama' },
  { id: 'chk_13', category: 'CHECK', fen: '5k2/8/8/8/8/8/4r3/3K4 w - - 0 1', description: 'Rei sob ataque horizontal de torre' },
  { id: 'chk_14', category: 'CHECK', fen: '4k3/8/8/8/8/3n4/2P5/4K3 w - - 0 1', description: 'Check de cavalo onde peão pode capturar' },

  // Cravadas (14)
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

  // Rei (13)
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

  // Roque (13)
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

  // En Passant (13)
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

  // Promoção (13)
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

  // Táticas (13)
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

// 4. Gerador de partidas aleatórias alcançáveis
function generateRandomFens(count: number, seed: number = 42): string[] {
  let s = seed;
  function rand(): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  const fens: string[] = [];
  const seenFens = new Set<string>();

  while (fens.length < count) {
    const game = new Chess();
    const gameLength = 10 + Math.floor(rand() * 45);

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

interface DivergenceInfo {
  fen: string;
  source: string;
  refCount: number;
  bbCount: number;
  missingInBb: string[];
  extraInBb: string[];
  inCheck: boolean;
}

let controlledPassed = 0;
let randomPassed = 0;
const divergences: DivergenceInfo[] = [];

// ============================================================
// ETAPA 1: POSIÇÕES CONTROLADAS (105 POSIÇÕES)
// ============================================================
console.log(`--- ETAPA 1: POSIÇÕES CONTROLADAS (${CONTROLLED_POSITIONS.length} posições) ---`);

for (const tc of CONTROLLED_POSITIONS) {
  const refMoves = getChessJsLegalMoves(tc.fen);
  const bbMoves = getBitboardLegalMoves(tc.fen);

  let match = refMoves.size === bbMoves.size;
  const missing: string[] = [];
  const extra: string[] = [];

  for (const m of refMoves) {
    if (!bbMoves.has(m)) {
      match = false;
      missing.push(m);
    }
  }

  for (const m of bbMoves) {
    if (!refMoves.has(m)) {
      match = false;
      extra.push(m);
    }
  }

  if (match) {
    controlledPassed++;
  } else {
    const b = parseFen(tc.fen);
    const div: DivergenceInfo = {
      fen: tc.fen,
      source: `Controlled [${tc.id}] ${tc.description}`,
      refCount: refMoves.size,
      bbCount: bbMoves.size,
      missingInBb: missing,
      extraInBb: extra,
      inCheck: isInCheck(b, b.sideToMove)
    };
    divergences.push(div);
    console.error(`\nDIVERGÊNCIA CONTROLADA em [${tc.id}]:`);
    console.error(`  FEN: ${tc.fen}`);
    console.error(`  Esperado (chess.js): ${Array.from(refMoves).sort().join(' ')}`);
    console.error(`  Obtido   (bitboard): ${Array.from(bbMoves).sort().join(' ')}`);
    console.error(`  Faltando: ${missing.join(' ')}`);
    console.error(`  Extras:   ${extra.join(' ')}\n`);
    break; // STOP
  }
}

if (divergences.length > 0) {
  console.error(`TESTE PARADO POR DIVERGÊNCIA CONTROLADA. ${controlledPassed}/${CONTROLLED_POSITIONS.length} aprovadas.`);
  process.exit(1);
}

console.log(`Posições Controladas: ${controlledPassed}/${CONTROLLED_POSITIONS.length} PASS (100%)\n`);

// ============================================================
// ETAPA 2: 2.000 POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS
// ============================================================
const RANDOM_COUNT = 2000;
console.log(`--- ETAPA 2: ${RANDOM_COUNT.toLocaleString()} POSIÇÕES ALEATÓRIAS ALCANÇÁVEIS ---`);

const randomFens = generateRandomFens(RANDOM_COUNT, 20260929);

const startTime = performance.now();
for (let i = 0; i < randomFens.length; i++) {
  const fen = randomFens[i];
  const refMoves = getChessJsLegalMoves(fen);
  const bbMoves = getBitboardLegalMoves(fen);

  let match = refMoves.size === bbMoves.size;
  const missing: string[] = [];
  const extra: string[] = [];

  for (const m of refMoves) {
    if (!bbMoves.has(m)) {
      match = false;
      missing.push(m);
    }
  }

  for (const m of bbMoves) {
    if (!refMoves.has(m)) {
      match = false;
      extra.push(m);
    }
  }

  if (match) {
    randomPassed++;
    if ((randomPassed % 500) === 0) {
      console.log(`  Progresso: ${randomPassed}/${RANDOM_COUNT} posições validadas...`);
    }
  } else {
    const b = parseFen(fen);
    const div: DivergenceInfo = {
      fen,
      source: `Random #${i}`,
      refCount: refMoves.size,
      bbCount: bbMoves.size,
      missingInBb: missing,
      extraInBb: extra,
      inCheck: isInCheck(b, b.sideToMove)
    };
    divergences.push(div);
    console.error(`\nDIVERGÊNCIA ALEATÓRIA #${i}:`);
    console.error(`  FEN: ${fen}`);
    console.error(`  Esperado (chess.js): ${Array.from(refMoves).sort().join(' ')}`);
    console.error(`  Obtido   (bitboard): ${Array.from(bbMoves).sort().join(' ')}`);
    console.error(`  Faltando: ${missing.join(' ')}`);
    console.error(`  Extras:   ${extra.join(' ')}\n`);
    break; // STOP
  }
}

const elapsedMs = performance.now() - startTime;

if (divergences.length > 0) {
  console.error(`TESTE PARADO POR DIVERGÊNCIA. ${randomPassed}/${RANDOM_COUNT} aprovadas.`);
  process.exit(1);
}

console.log(`\n=====================================================`);
console.log(`RESUMO DA EQUIVALÊNCIA LEGAL:`);
console.log(`  Posições Controladas: ${controlledPassed}/${CONTROLLED_POSITIONS.length} PASS (100%)`);
console.log(`  Posições Aleatórias:  ${randomPassed}/${RANDOM_COUNT} PASS (100%)`);
console.log(`  Tempo total:          ${(elapsedMs / 1000).toFixed(2)} s`);
console.log(`  Taxa de aprovação:    100.0%`);
console.log(`=====================================================\n`);
console.log('EQUIVALÊNCIA LEGAL PERFEITA (ZERO DIVERGÊNCIAS)!');
