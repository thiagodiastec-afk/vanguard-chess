# VANGUARD CHESS — FASE 5.11
## AUDITORIA E INVENTÁRIO DA AVALIAÇÃO ESTÁTICA
### Mapeamento do Avaliador de Referência e Estratégia de Migração para Bitboard

**Data:** 2026-09-29\
**Status:** AUDIT_COMPLETE\
**Baseline de Referência:** `evaluateBoard(game: Chess)` em [`src/lib/engine.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts)

---

## 1. VISÃO GERAL DA ARQUITETURA DE AVALIAÇÃO

No motor Vanguard Chess, a função de avaliação estática atual é `evaluateBoard(game: Chess)`.
A função retorna um score inteiro em centipawns a partir da **perspectiva das Brancas** (`White-relative score`):
- Valores positivos indicam vantagem para as Brancas.
- Valores negativos indicam vantagem para as Pretas.
- No `minimax` e na `quiescence`, o score é ajustado dependendo se o jogador atual é maximizador ou minimizador (`isMaximizingPlayer`).

### Ciclo de Execução e Gargalo Identificado:
Na Fase 5.10, todas as operações de busca (`generateLegalMoves`, `quiescence`, `isInCheck`, `makeMove`/`undoMove`) foram migradas para o `BitboardBackend`. No entanto, em cada nó folha e nós de stand-pat, a avaliação continuava chamando `game.board()`, que no `chess.js` reconstrói um array bidimensional 8x8 alocando objetos e strings em heap a cada invocação:
- ~80.000 a 90.000 chamadas de avaliação por busca de benchmark de 68 posições.
- Acesso repetido a `game.board()`, `_moves({ legal: false })`, e loops manuais em matriz 8x8.
- Objetivo da Fase 5.11: substituir esse acesso por consultas nativas a `BitboardBoard` de 64 bits, garantindo equivalência matemática exata (0 centipawns de diferença em qualquer termo).

---

## 2. INVENTÁRIO DOS TERMOS DE AVALIAÇÃO

Auditoria completa de todos os termos presentes em [`src/lib/engine.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts) e [`src/lib/auditBreakdown.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/auditBreakdown.ts):

| # | Termo | Função de Referência | Constantes & Pesos | Perspectiva | Dependência chess.js | Estratégia Bitboard |
|---|---|---|---|---|---|---|
| 1 | **Material** | `getAbsoluteValue()` | P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 | White - Black | `piece.type`, `piece.color` | `popcount(pieceBB) * value` |
| 2 | **Piece-Square Tables (PST)** | `getAbsoluteValue()` | Tabelas 8x8 para P, N, B, R, Q, K (MG e EG) | White - Black | `board[y][x]` | Arrays pré-calculados indexados por casa `0..63` |
| 3 | **Tapered Evaluation** | `evaluateBoard()` | `MAX_PHASE = 24`, N/B: 1, R: 2, Q: 4 | White - Black | Nenhuma direta (cálculo de fase) | Fase calculada por `popcount` de peças menores/maiores |
| 4 | **Passed Pawns** | `isPassedPawn()` | `[0, 5, 10, 20, 35, 60, 100, 0]` | White (+), Black (-) | Varredura de colunas adjacentes em `board[][]` | Máscaras de bitboard `frontSpan[color][sq]` |
| 5 | **Bishop Pair** | `evaluateBoard()` | `BISHOP_PAIR_BONUS = 50` | >= 2 bispos: +50 / -50 | Contagem de bispos brancos e pretos | `popcount(whiteBishops) >= 2` |
| 6 | **Rook Activity** | `getFileStatus()` | Aberto: 15, Semi-aberto: 8 | White (+), Black (-) | Presença de peões por coluna `whitePawnCounts` | `(pawns & FILE_MASKS[file]) === 0n` |
| 7 | **Doubled Pawns** | `countDoubledPawns()` | `DOUBLED_PAWN_PENALTY = 10` | -(White - Black) * 10 | `pawnCounts[col] > 1` | `popcount(pawns & FILE_MASKS[f]) - 1` |
| 8 | **Isolated Pawns** | `countIsolatedPawns()` | `ISOLATED_PAWN_PENALTY = 10` | -(White - Black) * 10 | Peões sem peões aliados em colunas adjacentes | `(pawns & ADJACENT_FILES[f]) === 0n` |
| 9 | **Mobility** | `countMobility()` | `MOBILITY_BONUS_PER_MOVE = 1` | (White - Black) * 1 | Geração pseudo-legal + make/undo/isKingAttacked | `generateLegalMovesForColor()` excluindo rei |
| 10 | **Pawn Shield** | `countPawnShield()` | `PAWN_SHIELD_BONUS = 8` | (White - Black) * 8 | 3 casas frontais do rei em `board[][]` | Máscara `pawnShieldMask[color][kingSq]` |
| 11 | **King Attackers** | `countKingAttackers()` | `KING_ATTACKER_PENALTY = 6` | (Black - White) * 6 | Anel de 8 casas ao redor do rei | `attackersToZone & enemyPieces` |
| 12 | **King Tropism** | `calculateKingTropism()`| Chebyshev: d=1: 6, d=2: 4, d=3: 2, d>=4: 0 | (Black - White) * 1 | Distância de N, B, R, Q ao rei inimigo | Distância Chebyshev entre `sq` e `kingSq` |

---

## 3. ESPECIFICAÇÃO MATEMÁTICA DE CADA TERMO

### 3.1 Material e PST (Tapered Base)
Para cada peça aliada e inimiga:
- Fase da partida:
  $$\text{phase} = \min(24, \text{knights} \times 1 + \text{bishops} \times 1 + \text{rooks} \times 2 + \text{queens} \times 4)$$
- Middlegame e Endgame Scores:
  $$\text{mgEval} = \sum_{\text{White}} (\text{val} + \text{PST}_{mg}) - \sum_{\text{Black}} (\text{val} + \text{PST}_{mg})$$
  $$\text{egEval} = \sum_{\text{White}} (\text{val} + \text{PST}_{eg}) - \sum_{\text{Black}} (\text{val} + \text{PST}_{eg})$$
- Interpolação Tapered:
  $$\text{taperedBase} = \text{round}\left( \frac{\text{mgEval} \times \text{phase} + \text{egEval} \times (24 - \text{phase})}{24} \right)$$

### 3.2 Mapeamento de Casas (Square Indexing)
- No `chess.js`: `board[row][col]`, onde `row = 0` é Rank 8 e `row = 7` é Rank 1; `col = 0` é File A e `col = 7` é File H.
- No `Bitboard`: `sq = 0..63`, onde `sq = 0` é A1 e `sq = 63` é H8.
  - `rank = sq >> 3` ($0..7$, onde 0 = Rank 1, 7 = Rank 8).
  - `file = sq & 7` ($0..7$, onde 0 = File A, 7 = File H).
  - Mapeamento direto: $\text{row} = 7 - \text{rank}$, $\text{col} = \text{file}$.
  - Tabelas lineares de 64 elementos `PST_64[sq]` serão pré-geradas para evitar conversões em tempo de execução.

### 3.3 Passed Pawns
Um peão branco em $(r, c)$ é passado se não houver nenhum peão preto em:
- coluna $c$ com rank $> r$;
- coluna $c-1$ com rank $> r$ (se $c > 0$);
- coluna $c+1$ com rank $> r$ (se $c < 7$).
Para peão preto, a condição é simétrica para ranks $< r$.
Bônus por relativeRank ($0..7$): `[0, 5, 10, 20, 35, 60, 100, 0]`.

### 3.4 Bishop Pair
Se Brancas têm $\ge 2$ bispos: $+50$ cp.
Se Pretas têm $\ge 2$ bispos: $-50$ cp.

### 3.5 Rook Activity
Para cada torre:
- Se não há peões brancos nem pretos na coluna da torre: **Arquivo Aberto** ($+15$ cp para branca, $-15$ cp para preta).
- Se não há peões aliados mas há peões inimigos na coluna: **Arquivo Semi-Aberto** ($+8$ cp para branca, $-8$ cp para preta).

### 3.6 Estrutura de Peões (Dobrados e Isolados)
Para cada cor:
- Peões dobrados: para cada coluna com $n > 1$ peões, excesso $= n - 1$. Penalidade: $10$ cp por peão excedente.
- Peões isolados: peões em colunas sem nenhum peão aliado nas colunas adjacentes. Penalidade: $10$ cp por peão isolado.
- Contribuição no score: $+(\text{BlackPenalties} - \text{WhitePenalties})$.

### 3.7 Mobilidade
Contagem de lances legais estritamente excluindo lances do Rei.
- Bônus: $+1$ cp por lance legal das Brancas, $-1$ cp por lance legal das Pretas.
- No `BitboardBackend`, `generateLegalMoves()` já exclui lances de rei quando filtrado, ou pode contar lances legais diretamente sem a penalidade de cópias do `chess.js`.

### 3.8 King Safety: Pawn Shield
Contagem de peões aliados nas 3 casas imediatamente à frente do rei:
- Rei Branco em $(r, c)$: casas em rank $r+1$ (row $r-1$), colunas $c-1, c, c+1$ (se no tabuleiro).
- Rei Preto em $(r, c)$: casas em rank $r-1$ (row $r+1$), colunas $c-1, c, c+1$.
- Bônus: $(\text{WhiteShield} - \text{BlackShield}) \times 8$ cp.

### 3.9 King Safety: King Attackers
Zona do Rei: as 8 casas adjacentes ao Rei.
Cada peça inimiga (P, N, B, R, Q) que ataque pelo menos uma casa da zona do Rei conta como **1 atacante**. O Rei inimigo é estritamente excluído.
Penalidade: $(\text{BlackAttackers} - \text{WhiteAttackers}) \times 6$ cp (mais atacantes sobre o rei preto favorece as brancas).

### 3.10 King Safety: King Tropism
Para cada peça inimiga menor/maior (N, B, R, Q):
Distância de Chebyshev $d = \max(|r_{\text{peça}} - r_{\text{rei}}|, |c_{\text{peça}} - c_{\text{rei}}|)$:
- $d = 1$: $+6$ cp
- $d = 2$: $+4$ cp
- $d = 3$: $+2$ cp
- $d \ge 4$: $0$ cp
Score: $\text{TropismBlackKing} - \text{TropismWhiteKing}$.

---

## 4. ESTRATÉGIA DE IMPLEMENTAÇÃO INCREMENTAL

1. Criar [`src/lib/bitboard/evaluation.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/evaluation.ts) contendo:
   - Estruturas pré-computadas (máscaras de arquivos, máscaras de peões passados, anéis de rei, tabelas PST 1D).
   - `evaluateBoardBitboard(board: BitboardBoard): number`.
   - `evaluateBitboardBreakdown(board: BitboardBoard): EvaluationBreakdown`.
2. Validar cada termo de forma isolada contra [`src/lib/auditBreakdown.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/auditBreakdown.ts).
3. Testar em 100 posições de teste e posições aleatórias com tolerância de **0 centipawns**.
4. Integrar ao `BitboardBackend.evaluate()` e conectar ao search de produção.
