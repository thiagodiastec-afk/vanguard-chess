# RELATÓRIO OFICIAL: FASE 5.4I — KING SAFETY: KING TROPISM

STATUS: PASS\
DECISION: KEEP\

## KING TROPISM: FORMULA & PESO
- **Métrica**: Distância de Chebyshev $\max(|row_{piece} - row_{king}|, |col_{piece} - col_{king}|)$
- **Peças elegíveis**: Apenas peças maiores e menores inimigas: Knight, Bishop, Rook, Queen.
- **Peças excluídas**: Pawns (estrutura própria coberta por Pawn Shield e Passed/Doubled/Isolated) e Kings (não conta como atacante).
- **Escala de peso conservadora**:
  - Distância 1: **+6 cp**
  - Distância 2: **+4 cp**
  - Distância 3: **+2 cp**
  - Distância $\ge$ 4: **0 cp**
- **Avaliação**: Puramente estática, $O(N)$ sobre as 64 casas do tabuleiro sem geração de lances (`moves()`, `_moves()`), sem `_makeMove`/`_undoMove` e sem `_isKingAttacked()`.
- **Perspectiva**: Score = `tropismBlackKing - tropismWhiteKing` (para White perspective).

---

## UNIT TESTS
- **Total**: 51/51 testes unitários aprovados (100% de sucesso).
- **Categorias validadas**:
  - Geometria (Distâncias 1, 2, 3, 4, 7, centro, borda, canto): 8/8 PASS
  - Peças individuais (Knight, Bishop, Rook, Queen): 4/4 PASS
  - Exclusões estritas (Pawn dist 1, 2, 3; King dist 1, 2, 3): 6/6 PASS
  - Bloqueio estático (Tropism mede proximidade geométrica independentemente de bloqueio): 4/4 PASS
  - Múltiplas peças (2, 3, 4 peças somando aditivamente): 3/3 PASS
  - Simetria estrita (White ataca Black King vs Black ataca White King, espelhos): 4/4 PASS
  - Não-duplicação (1 peça cobrindo múltiplas casas conta exatamente uma vez): 3/3 PASS
  - Monotonicidade (dist 4 $\to$ 3 $\to$ 2 $\to$ 1: $0 < 2 < 4 < 6$): 5/5 PASS
  - Tropism $\ne$ Attackers: 4/4 PASS
  - Invariância de valor material: 1/1 PASS
  - Interação com Pawn Shield: 3/3 PASS
  - Interação com King Attackers (Double counting check): 3/3 PASS
  - Interação com Rook Activity: 2/2 PASS
  - Determinismo estrito (10 runs): 1/1 PASS

---

## TROPISM VS KING ATTACKERS
Demonstrada a independência funcional em ambos os sentidos:
1. **Tropism > 0 e King Attackers = 0**:
   - Dama ou Bispo próximos ao Rei (distância 2 ou 3), mas bloqueados ou sem linhas de visão sobre o anel de 8 casas do Rei adversário.
   - Tropism registra a proximidade geométrica da peça (+2 ou +4 cp), enquanto King Attackers registra exatamente 0.
2. **King Attackers > 0 e Tropism = 0**:
   - Torre ou Dama distantes (distância 4 ou 6) com raio aberto incidindo sobre uma casa adjacente ao Rei.
   - King Attackers registra 1 atacante (-6 cp para o Rei atacado), enquanto Tropism registra 0 cp (distância $\ge$ 4).
3. **Double Counting Controlado**:
   - Quando uma peça está a distância 1 e ataca uma casa da zona do rei, ela contribui +6 cp por Tropism e +6 cp por King Attackers, totalizando +12 cp. O termo é aditivo e não sofre exponenciação artificial.

---

## BENCHMARK COMPARATIVO (68 FENs, Depth 3, Timeout 5000 ms)

| Métrica | Baseline 5.4H (Attackers) | FASE 5.4I (+King Tropism) | Delta |
|---|---:|---:|---:|
| **TOTAL** | 68 | 68 | 0 |
| **CORRECT** | 52 | 51 | -1 (timeout var) |
| **INCORRECT** | 2 | 2 | 0 |
| **TIMEOUT** | 14 | 15 | +1 |
| **COMPLETED** | 54 (79.41%) | 53 (77.94%) | -1 |
| **ACCURACY COMPLETED** | 96.30% | 96.23% | -0.07% |
| **MEDIAN TIME** | 1104.3 ms | 1105.1 ms | +0.8 ms |
| **P95 TIME** | 5060.0 ms | 5018.4 ms | -41.6 ms |
| **MEDIAN NODES** | 431 | 404 | **-6.26%** |
| **MEDIAN QNODES** | 708 | 700 | **-1.13%** |

---

## PERFORMANCE
- **Microbenchmark (10.000 avaliações $\times$ 6 posições = 60.000 avaliações)**:
  - Baseline 5.4H: **79.68 µs / eval** (12.550 evals/s)
  - + King Tropism: **79.31 µs / eval** (12.609 evals/s)
  - Overhead: **-0.37 µs (-0.47%)** — Overhead indetectável / zero custo líquido.
- **Eficiência de Busca**:
  - Mediana de nós caiu de 431 para **404 (-6.26%)**, demonstrando que a proximidade das peças auxilia a ordenação de lances e a poda alpha-beta.

---

## REGRESSÕES E MUDANÇAS DE LANCE
- **Regressões Enxadrísticas (CORRECT $\to$ INCORRECT)**: **0**
- **Variações de Timeout (CORRECT $\to$ TIMEOUT)**: 1
  - `tac_defense_03_desperado_piece`: tempo foi de 4649.5 ms para 5000.5 ms (+351 ms na borda do timeout de 5000 ms), mantendo exatamente o mesmo lance correto (`Kd1`).
- **Lances Alternativos Equivalentes (CORRECT $\to$ CORRECT)**: 1
  - `endgame_02_kr_vs_k`: de `Ra7` para `Ra4` (ambos mantêm corte do rei adversário e mate forçado trivial em final de torre).

---

## INTERAÇÕES ENTRE HEURÍSTICAS
- **Pawn Shield**: Não há conflito. Pawn Shield atua na estrutura de peões protetores; King Tropism mede peças móveis inimigas.
- **King Attackers**: Tropism atua como gradiente suave de aproximação ($+2/+4/+6$), enquanto Attackers penaliza linhas de mira ativas.
- **Legal Mobility**: Mobility avalia a liberdade global das peças no tabuleiro; King Tropism avalia a convergência das peças em direção ao monarca inimigo.
- **Rook Activity**: Uma torre em coluna aberta longe do rei pontua exclusivamente por Rook Activity (+15 cp) com Tropism = 0.
- **Material**: O bônus é idêntico para qualquer peça maior/menor à mesma distância (ex: distância 2 = +4 cp para Q, R, B e N), sem distorcer o balanço de material.

---

## TESTES TÁTICOS, PROMOÇÃO E ABERTURA
- **Táticas Fundamentais**: Mate-in-1, mate-in-2, hanging queen, hanging rook, pin, skewer e defesas táticas preservados integralmente.
- **Promoção Crítica**: `promo_03_black_promotion` manteve o lance ideal `e1=Q+` com 164.3 ms de resposta.
- **Comportamento na Abertura**: Na posição inicial e após lances clássicos (1.e4, 1.d4, 1.e4 e5 2.Nf3 Nc6, etc.), o King Tropism é estritamente **0 cp** para ambos os lados porque nenhuma peça atinge distância $\le 3$ do rei adversário. A engine mantém desenvolvimento natural (`Nc3` e `Nc6`).

---

## DETERMINISMO E STATE ISOLATION
- **Determinismo**: PASS (10/10 execuções idênticas na posição crítica: `d4`).
- **State Isolation**: PASS (execuções em ordens permutadas de posições produzem os mesmos lances e scores sem contaminação entre buscas).

---

## CONCLUSÃO
A heurística de **King Tropism** complementa o sistema de King Safety fornecendo um gradiente suave e contínuo de aproximação que orienta a busca em direção ao rei adversário mesmo antes de linhas de ataque diretas se abrirem. Com custo computacional nulo (-0.47% no microbenchmark) e redução de 6.26% na mediana de nós explorados, sem regressões conceituais ou táticas, a avaliação é aprovada para manutenção (`KEEP`).
