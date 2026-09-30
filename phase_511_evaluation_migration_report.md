# VANGUARD CHESS — FASE 5.11
## RELATÓRIO OFICIAL DE MIGRAÇÃO DA AVALIAÇÃO ESTÁTICA PARA BITBOARDS
### Equivalência Exata, Isolamento do Oráculo e Benchmark Reprodutível

**Status:** PASS — READY_FOR_STAGE_4\
**Data:** 2026-09-29\
**Branch:** `main`\
**Referência Baseline:** 5.7B / 5.10\

---

## A. EXECUTIVE SUMMARY

A Fase 5.11 realizou com sucesso a migração completa da **avaliação estática** do motor Vanguard Chess para a representação nativa de **Bitboard 64-bit BigInt**, alcançando paridade matemática exata (0 centipawns de diferença em qualquer termo ou score final) em relação ao oráculo de referência legado `evaluateBoard(game: Chess)`.

Principais conquistas da fase:
1. **Migração Nativa sem Conversão em Runtime**:
   - O novo avaliador [`evaluateBoardBitboard(board: BitboardBoard)`](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/evaluation.ts) opera diretamente sobre os 12 bitboards de peças e 3 de ocupação.
   - Eliminação da reconstrução em cada nó folha do array bidimensional 8x8 do `chess.js` (`game.board()`) e de objetos/strings alocados em heap.
2. **Equivalência Exata Comprovada**:
   - **5.173 posições testadas**:
     - 105 posições controladas da Fase 5.8: **105/105 PASS (100%)**.
     - 68 posições do benchmark oficial: **68/68 PASS (100%)**.
     - 5.000 posições aleatórias alcançáveis: **5.000/5.000 PASS (100%)**.
   - Zero divergências de score final e zero divergências em qualquer um dos 12 termos avaliados.
3. **Ganho de Performance Aferido e Reprodutível**:
   - Avaliação estática pura: **2.56x mais rápida** no tempo agregado (-61.0% de tempo total).
   - Throughput de avaliações: subiu de **8.305 evals/sec** (`chess.js`) para **21.294 evals/sec** (`Bitboard`).
   - Mediana da avaliação estática isolada caiu de **106.50 µs** para **20.50 µs** (ganho superior a 5x na mediana).
   - No benchmark oficial completo de 68 posições com profundidade 3:
     - O tempo total de busca caiu de **27.34s** (`CHESSJS_ONLY`) para **20.74s** (`BITBOARD_ONLY`) (**-24.1% de redução de tempo total**).
     - A mediana por lance caiu de **195.3 ms** para **167.5 ms** (**-14.2% de redução na mediana**).
     - O P95 caiu de **1435.3 ms** para **1169.5 ms** (**-18.5% de redução no P95**).
4. **Critério Bloqueador Cumprido**:
   - `BASELINE CORRECT (63/68) -> NEW INCORRECT = 0` em todos os três modos (`CHESSJS_ONLY`, `BITBOARD_ONLY`, `BITBOARD_WITH_ORACLE`).
   - Zero timeouts registrados.
   - Testes de determinismo (10x), isolamento de estado (A->B->C) e rollback aprovados com 100% de sucesso.

---

## B. GIT AND PRODUCTION ISOLATION

Conforme exigido nas regras da Fase 5.11:
- O oráculo de referência legado `evaluateBoard(game: Chess)` permanece intacto e acessível em [`src/lib/engine.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts).
- Nenhuma alteração foi realizada em parâmetros estratégicos, profundidades, heurísticas, fórmulas ou pesos da busca.
- A biblioteca `chess.js` permanece instalada e ativa no modo de rollback e validação dual.
- Todas as alterações de produção foram centralizadas nos módulos de tabuleiro e engine:
  - [`src/lib/bitboard/evaluation.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/evaluation.ts) (novo módulo de avaliação nativa)
  - [`src/lib/bitboard/index.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/index.ts) (re-exportação das funções e tabelas)
  - [`src/lib/board/types.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/types.ts) (adição do método `evaluate(): number`)
  - [`src/lib/board/bitboardBackend.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/bitboardBackend.ts) (implementação de `evaluate()`)
  - [`src/lib/board/chessJsBackend.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/chessJsBackend.ts) (implementação de `evaluate()`)
  - [`src/lib/engine.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts) (chaveamento da avaliação no search path de quiescence por modo de execução)
- `npm run lint` (`tsc --noEmit`): **0 erros**.
- `npm run build`: **0 erros (build de produção concluído em 10.48s)**.

---

## C. EXISTING EVALUATION FORMULA

A função de avaliação original do Vanguard Chess calcula um score inteiro em centipawns da **perspectiva das Brancas**:
$$\text{Score} = \text{TaperedBase} + \text{PassedPawns} + \text{BishopPair} + \text{RookActivity} + \text{PawnStructure} + \text{Mobility} + \text{PawnShield} + \text{KingAttackers} + \text{KingTropism}$$

Onde:
1. **Tapered Base**:
   $$\text{phase} = \min(24, N \times 1 + B \times 1 + R \times 2 + Q \times 4)$$
   $$\text{mgEval} = \sum_{\text{White}} (\text{val} + \text{PST}_{\text{mg}}) - \sum_{\text{Black}} (\text{val} + \text{PST}_{\text{mg}})$$
   $$\text{egEval} = \sum_{\text{White}} (\text{val} + \text{PST}_{\text{eg}}) - \sum_{\text{Black}} (\text{val} + \text{PST}_{\text{eg}})$$
   $$\text{TaperedBase} = \text{round}\left( \frac{\text{mgEval} \times \text{phase} + \text{egEval} \times (24 - \text{phase})}{24} \right)$$
2. **Passed Pawns**: Bônus de relativeRank `[0, 5, 10, 20, 35, 60, 100, 0]` para peões sem oposição frontal ou em colunas adjacentes.
3. **Bishop Pair**: $+50$ cp para $\ge 2$ bispos brancos, $-50$ cp para $\ge 2$ bispos pretos.
4. **Rook Activity**: $+15$ cp por coluna aberta, $+8$ cp por coluna semi-aberta.
5. **Pawn Structure**: $-10$ cp por peão dobrado excedente, $-10$ cp por peão isolado.
6. **Mobility**: $+1$ cp por lance legal das Brancas (excluindo rei), $-1$ cp por lance legal das Pretas (excluindo rei).
7. **Pawn Shield**: $+8$ cp por peão aliado nas 3 casas imediatamente à frente do rei.
8. **King Attackers**: $+6$ cp por atacante inimigo na zona do rei adversário.
9. **King Tropism**: Bônus de distância de Chebyshev de peças menores/maiores inimigas em relação ao rei (d=1: 6, d=2: 4, d=3: 2).

---

## D. COMPONENT INVENTORY

| Termo | Função Legada | Função Bitboard Nativa | Constantes e Pesos | Perspectiva |
|---|---|---|---|---|
| **Material** | `getAbsoluteValue()` | Varredura de bitboards por peça | P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 | White - Black |
| **PST MG/EG** | `pawnEvalWhite/Black`, etc. | Tabelas 1D pré-computadas `PST_*[sq]` | Tabelas 64 entradas idênticas | White - Black |
| **Fase / Tapered** | Interpolação `phase / 24` | `clampedPhase` sobre popcount N, B, R, Q | `MAX_PHASE = 24`, round() | White - Black |
| **Passed Pawns** | `isPassedPawn()` | `WHITE/BLACK_PASSED_PAWN_MASK[sq]` | `[0, 5, 10, 20, 35, 60, 100, 0]` | White (+), Black (-) |
| **Bishop Pair** | `whiteBishops >= 2` | `popcount(bishops) >= 2` | `50` cp | White (+), Black (-) |
| **Rook Activity** | `getFileStatus()` | `whitePawns & FILE_MASKS[f]` | Aberto: 15 cp, Semi: 8 cp | White (+), Black (-) |
| **Doubled Pawns** | `countDoubledPawns()` | `countDoubledPawnsBB()` | `-10` cp por excesso | Black - White |
| **Isolated Pawns**| `countIsolatedPawns()`| `countIsolatedPawnsBB()`| `-10` cp por peão isolado | Black - White |
| **Mobility** | `countMobility()` | `countLegalMobilityBitboard()` | `1` cp por lance (sem rei) | White - Black |
| **Pawn Shield** | `countPawnShield()` | `WHITE/BLACK_PAWN_SHIELD_MASK[sq]`| `8` cp por peão frontal | White - Black |
| **King Attackers**| `countKingAttackers()`| `countKingAttackersBitboard()` | `6` cp por atacante (sem rei) | Black - White |
| **King Tropism** | `calculateKingTropism()`| `calculateKingTropismBitboard()`| `CHEBYSHEV_TROPISM[s1][s2]` | Black - White |

---

## E. PER-TERM EQUIVALENCE

Cada termo foi validado isoladamente através da função `compareBreakdowns()` comparando `evaluateBreakdown(game)` vs `evaluateBitboardBreakdown(state)`:

| Termo | Posições Testadas | Posições Aprovadas | Taxa de Acerto | Tolerância Máxima |
|---|---|---|---|---|
| Material | 5.173 | 5.173 | **100.00%** | 0 cp |
| PST Middlegame | 5.173 | 5.173 | **100.00%** | 0 cp |
| PST Endgame | 5.173 | 5.173 | **100.00%** | 0 cp |
| Phase & Tapered Base | 5.173 | 5.173 | **100.00%** | 0 cp |
| Passed Pawns | 5.173 | 5.173 | **100.00%** | 0 cp |
| Bishop Pair | 5.173 | 5.173 | **100.00%** | 0 cp |
| Rook Activity | 5.173 | 5.173 | **100.00%** | 0 cp |
| Doubled Pawns | 5.173 | 5.173 | **100.00%** | 0 cp |
| Isolated Pawns | 5.173 | 5.173 | **100.00%** | 0 cp |
| Legal Mobility (Non-King) | 5.173 | 5.173 | **100.00%** | 0 cp |
| Pawn Shield | 5.173 | 5.173 | **100.00%** | 0 cp |
| King Attackers | 5.173 | 5.173 | **100.00%** | 0 cp |
| King Tropism | 5.173 | 5.173 | **100.00%** | 0 cp |

---

## F. SCORE EQUIVALENCE

- **Total de Posições Avaliadas**: 5.173.
- **Posições com Score Idêntico**: 5.173 (100.00%).
- **Divergências Encontradas**: 0.
- **Diferença Máxima Absoluta**: 0 centipawns.

---

## G. RANDOM POSITIONS

A suíte executou a validação massiva em 5.000 posições únicas alcançáveis geradas por partidas aleatórias de 5 a 50 plies:
- Posições testadas: 5.000.
- Divergências de score: 0.
- Tempo decorrido: 1.48 s.
- Taxa de equivalência: **100.00%**.

---

## H. BENCHMARK OFICIAL DE 68 POSIÇÕES

O benchmark oficial foi executado com as 68 posições e parâmetros idênticos (dificuldade 'dificil' / depth 3, timeout 3000ms):

| Métrica | `CHESSJS_ONLY` | `BITBOARD_ONLY` | `BITBOARD_WITH_ORACLE` |
|---|---|---|---|
| **Corretos** | **63 / 68** | **63 / 68** | **63 / 68** |
| **Incorretos** | 5 | 5 | 5 |
| **Timeouts** | **0** | **0** | **0** |
| **Taxa de Conclusão** | 100.0% | 100.0% | 100.0% |
| **Acurácia entre Completados** | **92.65%** | **92.65%** | **92.65%** |
| **Tempo Total** | 27.34 s | **20.74 s (-24.1%)** | 50.61 s |
| **Mediana de Tempo** | 195.3 ms | **167.5 ms (-14.2%)** | 391.2 ms |
| **Percentil 95 (P95)** | 1435.3 ms | **1169.5 ms (-18.5%)** | 2644.1 ms |
| **Nós Medianos** | 627 | 739 | 739 |
| **QNós Medianos** | 898 | 1025 | 1025 |
| **Chamadas MoveGen** | 32.246 | 35.226 | 34.960 |
| **Chamadas MakeUndo** | 697.419 | 781.884 | 1.456.901 |
| **Chamadas Evaluator** | 80.728 | 86.788 | 85.925 |
| **Chamadas Oracle** | 0 | 0 | 263.160 |

---

## I. TRANSITION MATRICES

Critério bloqueador absoluto: `BASELINE CORRECT -> NEW INCORRECT = 0`.

### Matriz de Transição: `CHESSJS_ONLY` vs Baseline 5.7B
```text
                         NEW CORRECT   NEW INCORRECT   NEW TIMEOUT
BASELINE CORRECT (63)        63              0              0
BASELINE INCORRECT (5)        0              5              0
BASELINE TIMEOUT (0)          0              0              0
```

### Matriz de Transição: `BITBOARD_ONLY` vs Baseline 5.7B
```text
                         NEW CORRECT   NEW INCORRECT   NEW TIMEOUT
BASELINE CORRECT (63)        63              0              0
BASELINE INCORRECT (5)        0              5              0
BASELINE TIMEOUT (0)          0              0              0
```

### Matriz de Transição: `BITBOARD_WITH_ORACLE` vs Baseline 5.7B
```text
                         NEW CORRECT   NEW INCORRECT   NEW TIMEOUT
BASELINE CORRECT (63)        63              0              0
BASELINE INCORRECT (5)        0              5              0
BASELINE TIMEOUT (0)          0              0              0
```

---

## J. PERFORMANCE BREAKDOWN

Resultados do microbenchmark com 10.000 iterações em [`phase_511_evaluation_performance.json`](file:///c:/Users/User/chess/vanguard-chess/phase_511_evaluation_performance.json):

1. **Avaliador Completo (10.000 iterações)**:
   - `chess.js`: 1.204,12 ms | Mediana: **106,50 µs** | P95: 205,40 µs | **8.305 evals/sec**
   - `Bitboard`: 469,61 ms | Mediana: **20,50 µs** | P95: 130,60 µs | **21.294 evals/sec**
   - **Speedup**: **2,56x mais rápido** (-61,0% no tempo total de avaliação; **5,2x na mediana**).
2. **Breakdown por Termo Isolado (µs / chamada)**:
   - **Material & PST**: 2,43 µs (`chess.js`) vs **0,08 µs** (`Bitboard`) (**30x mais rápido**).
   - **Pawn Shield**: 5,18 µs (`chess.js`) vs **0,10 µs** (`Bitboard`) (**51x mais rápido**).
   - **King Attackers**: 5,57 µs (`chess.js`) vs **1,14 µs** (`Bitboard`) (**4,9x mais rápido**).
   - **King Tropism**: 5,21 µs (`chess.js`) vs **0,21 µs** (`Bitboard`) (**25x mais rápido**).
   - **Legal Mobility**: 70,78 µs (`chess.js`) vs **12,84 µs** (`Bitboard`) (**5,5x mais rápido**).
3. **Custo do Oráculo**:
   - No modo `BITBOARD_WITH_ORACLE`, a validação dual adiciona **+276,4%** de overhead à avaliação estática pura, explicando detalhadamente o custo da auditoria cruzada.

---

## K. ALLOCATION AND CONVERSION AUDIT

Durante a busca em `BITBOARD_ONLY`:
- **Alocações no Heap**: 0 arrays `board[8][8]` criados por avaliação (anteriormente gerados a cada chamada de `game.board()`).
- **Parsing de FEN**: 0 chamadas a `load()` ou parsing de string no loop de avaliação.
- **Tabelas de Lookup**: Arrays tipados `Int16Array` e `Uint8Array` alocados uma única vez na inicialização do módulo.
- **Representação Interna**: Uso exclusivo de números primitivos BigInt (64-bit) e inteiros 32-bit.

---

## L. DETERMINISM

Execução de [`test_phase59_determinism_isolation.ts`](file:///c:/Users/User/chess/vanguard-chess/test_phase59_determinism_isolation.ts):
- 10 iterações de busca completa na mesma posição.
- Lances, scores avaliados e nós visitados foram rigorosamente idênticos.
- Status: **PASS**.

---

## M. STATE ISOLATION

Três posições distintas alternando lances e buscas cíclicas sucessivas:
- Nenhuma contaminação cruzada de bitboards, zobrist ou flags foi detectada.
- Status: **PASS**.

---

## N. ROLLBACK

O ciclo operacional foi verificado:
```text
BITBOARD_ONLY → CHESSJS_ONLY → BITBOARD_ONLY → BITBOARD_WITH_ORACLE → CHESSJS_ONLY
```
- Em todas as etapas, os lances e avaliações permaneceram 100% consistentes.
- Rollback para `chess.js` pode ser efetuado a qualquer momento via `setExecutionMode('CHESSJS_ONLY')`.
- Status: **PASS**.

---

## O. REGRESSION SUITES

- `test_phase511_evaluation_equivalence.ts`: **5.173/5.173 PASS (100%)**.
- `test_phase510_backend_lifecycle.ts`: **9/9 PASS**.
- `test_phase510_make_undo.ts`: **17/17 PASS**.
- `test_phase510_quiescence_equivalence.ts`: **77/77 PASS**.
- `test_phase59_determinism_isolation.ts`: **4/4 PASS**.
- `test_phase59_rollback_mobility.ts`: **6/6 PASS**.
- `test_phase59_stockfish_sanity.ts`: **10/10 PASS**.
- `npm run lint`: **0 erros**.
- `npm run build`: **0 erros**.

---

## P. DIVERGENCES DIAGNOSED AND FIXED

Durante a implementação incremental do avaliador Bitboard, foram diagnosticadas e corrigidas duas diferenças sutis:
1. **Pulo de Lances de Rei na Mobilidade**:
   - Inicialmente, a verificação `if (m.piece === 'k') continue;` em `countLegalMobilityBitboard` falhava porque `RawMove` é um inteiro de 32 bits (onde `piece` não é uma propriedade de objeto). Corrigido utilizando `if (moveFrom(m) === kingSq) continue;`, restaurando paridade exata de mobilidade.
2. **Dupla Contagem de Damas em King Attackers**:
   - Inicialmente, a Dama estava sendo verificada em `enemyBishops | enemyQueens` e depois em `enemyRooks | enemyQueens`. Uma Dama que atacava em raio ortogonal e diagonal simultaneamente era contada como 2 atacantes, enquanto a regra estipula no máximo 1 atacante por peça. Corrigido com a união dos raios `bishopAttacks(qSq, occ) | rookAttacks(qSq, occ)`, alcançando paridade exata.

---

## Q. LIMITAÇÕES CONHECIDAS

1. **Conversão SAN na Raiz**: A conversão do lance final escolhido para string SAN ainda utiliza `_moveToSan()` na raiz uma única vez por busca.
2. **Persistência / PGN**: A UI e a camada de persistência utilizam a biblioteca do produto.
3. **Mecanismos de Análise Externa**: Ferramentas que recebem `Chess` diretamente continuam suportadas sem alterações de API.

---

## R. DECISÃO FINAL

```text
STATUS FINAL: PASS — READY_FOR_STAGE_4
```

Todas as metas da Fase 5.11 foram superadas:
- Todos os 12 termos de avaliação mapeados, documentados e migrados nativamente para Bitboards.
- 5.173 posições comparadas com 100% de exatidão e zero divergências.
- Avaliação estática pura 2.56x mais rápida (throughput de 21.294 evals/sec).
- Redução de -24.1% no tempo total do benchmark oficial de 68 posições.
- Zero regressões (`BASELINE CORRECT -> NEW INCORRECT = 0`) e zero timeouts.
- Lint e build de produção aprovados.

O motor Vanguard Chess está pronto para a **Fase 5.12 (Stage 4: Otimização Pura de Bitboard e Consolidação Arquitetural)**.
