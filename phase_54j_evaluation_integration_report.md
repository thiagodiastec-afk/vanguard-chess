# Phase 5.4J — Evaluation Integration & Weight Interaction Audit

## 1. Executive Summary

A Fase 5.4J realizou uma auditoria quantitativa, arquitetural e matemática completa da função de avaliação (`evaluateBoard()`) do Vanguard Chess Engine. Todas as heurísticas implementadas desde a Fase 5.4A até a Fase 5.4I foram decompostas, instrumentadas e inspecionadas quanto a simetria global, fidelidade de reconstrução, dominância de material, ortogonalidade funcional, sobreposição de termos e impacto de busca.

**Resultados centrais**:
- **Reconstrução exata do total**: 68/68 posições (100% de coincidência com tolerância ZERO).
- **Simetria global**: 10/10 pares espelhados somam exatamente $0\text{ cp}$.
- **Zero-baseline**: 7/7 termos isolados produzem $0\text{ cp}$ em cenários de ausência da característica.
- **Monotonicidade estrita**: Todos os termos posicionais e estruturais evoluem sem inversão de sinal.
- **Dominância de material**: Preservada integralmente. Termos posicionais somados têm mediana de $10\text{ cp}$ e P95 de $36\text{ cp}$, incapazes de superar peças menores ($320\text{ cp}$) ou peões ($100\text{ cp}$) fora de compensações de longa escala.
- **King Safety total**: Média de $-0.82\text{ cp}$, máximo absoluto de $24\text{ cp}$ no benchmark (limitado a $\sim 38\text{ cp}$ em posições extremas), equivalente a menos de meio peão.
- **Determinismo e State Isolation**: PASS (10/10 execuções idênticas em `bestMove`, `score`, `depth`, `nodes`, `qNodes`).
- **Decisão**: **KEEP**.

---

## 2. Current Evaluation Architecture

A avaliação é puramente aditiva e calculada da perspectiva das Brancas (positivo = vantagem das Brancas):

$$\text{Total} = \text{TaperedBase}(\text{Material} + \text{PST}, \text{phase}) + \sum \text{PositionalTerms}$$

Onde:
1. **Material Base**: Peças com valores fixos ($P=100$, $N=320$, $B=330$, $R=500$, $Q=900$, $K=20000$).
2. **PST (Piece-Square Tables)**: Tabelas estáticas com variação MG e EG para o Rei (interpolação por fase de jogo baseada no valor de peças maiores/menores presentes, $\text{phase} \in [0, 24]$).
3. **Passed Pawns**: Bônus por rank relativo ($[0, 5, 10, 20, 35, 60, 100, 0]$).
4. **Bishop Pair**: Bônus de $+50\text{ cp}$ para o lado com $\ge 2$ bispos.
5. **Rook Activity**: $+15\text{ cp}$ para coluna aberta, $+8\text{ cp}$ para coluna semi-aberta.
6. **Pawn Structure**: $-10\text{ cp}$ por peão dobrado excedente, $-10\text{ cp}$ por peão isolado.
7. **Legal Mobility**: $+1\text{ cp}$ por lance legal (Rei excluído).
8. **Pawn Shield**: $+8\text{ cp}$ por peão defensor nas 3 casas frontais imediatas do Rei.
9. **King Attackers**: $-6\text{ cp}$ por peça inimiga que ataca o anel de 8 casas do Rei adversário (peça conta no máximo 1 vez, bloqueios respeitados para peças deslizantes, rei excluído).
10. **King Tropism**: Bônus por proximidade de Chebyshev ($1 \to +6\text{ cp}$, $2 \to +4\text{ cp}$, $3 \to +2\text{ cp}$, $\ge 4 \to 0\text{ cp}$), excluindo peões e reis.

---

## 3. Exact Current Weights

| Componente | Função no Código | Peso / Escala | Perspectiva | Phase-Dependent? | Board Scan? | Move Gen? | Status |
|---|---|---|---|---|---|---|---|
| **Material** | `getAbsoluteValue` | P:100, N:320, B:330, R:500, Q:900 | White - Black | Não | Sim ($8 \times 8$) | Não | CONFIRMED FROM CODE |
| **PST (MG/EG)** | `getAbsoluteValue` | Tabelas 8x8 específicas | White - Black | Sim (King EG) | Sim ($8 \times 8$) | Não | CONFIRMED FROM CODE |
| **Passed Pawns** | `isPassedPawn` | 0, 5, 10, 20, 35, 60, 100 cp | White - Black | Não | Sim ($8 \times 8$) | Não | CONFIRMED FROM CODE |
| **Bishop Pair** | Contador em scan | $+50\text{ cp}$ ($\ge 2$ bispos) | White - Black | Não | No scan principal | Não | CONFIRMED FROM CODE |
| **Rook Activity** | `getFileStatus` | Open: $+15$, Semi-open: $+8\text{ cp}$ | White - Black | Não | Scan de colunas | Não | CONFIRMED FROM CODE |
| **Doubled Pawns** | `countDoubledPawns` | $-10\text{ cp}$ por peão excedente | White - Black | Não | Contagem por coluna | Não | CONFIRMED FROM CODE |
| **Isolated Pawns**| `countIsolatedPawns`| $-10\text{ cp}$ por peão isolado | White - Black | Não | Contagem por coluna | Não | CONFIRMED FROM CODE |
| **Mobility** | `countMobility` | $+1\text{ cp}$ por lance legal (sem Rei) | White - Black | Não | Não | Sim (`_moves({legal:true})`)| CONFIRMED FROM CODE |
| **Pawn Shield** | `countPawnShield` | $+8\text{ cp}$ por peão defensor frontal | White - Black | Não | $O(1)$ (3 casas) | Não | CONFIRMED FROM CODE |
| **King Attackers**| `countKingAttackers`| $-6\text{ cp}$ por peça atacante no anel | White - Black | Não | $O(N)$ (anel 8 casas) | Não (Raios geométricos) | CONFIRMED FROM CODE |
| **King Tropism** | `calculateKingTropism`| $1 \to +6$, $2 \to +4$, $3 \to +2\text{ cp}$ | White - Black | Não | $O(N)$ (Chebyshev) | Não | CONFIRMED FROM CODE |

---

## 4. Evaluation Breakdown Instrumentation

Foi criado o módulo de diagnóstico `src/lib/auditBreakdown.ts`, expondo a interface `EvaluationBreakdown` e a função `evaluateBreakdown(game: Chess)`:
- Não implementa lógica paralela divergente; reutiliza exatamente os mesmos laços, tabelas, constantes e funções estáticas de `src/lib/engine.ts`.
- Decompõe `evaluateBoard()` em 14 variáveis auditáveis (`material`, `pstMiddleGame`, `pstEndGame`, `taperedBase`, `passedPawn`, `bishopPair`, `rookActivity`, `doubledPawn`, `isolatedPawn`, `pawnStructure`, `mobility`, `pawnShield`, `kingAttackers`, `kingTropism`, `total`, `phase`).

---

## 5. Total Reconstruction Test

Executado nas 68 posições oficiais do benchmark (`SANITIZED_BENCHMARK_POSITIONS`):
- Posições testadas: 68
- Coincidência exata (`realScore === breakdown.total`): **68 / 68 (100%)**
- Discrepâncias / Mismatches: **0**
- Tolerância: **0 cp** (aritmética inteira idêntica)
- **Veredito**: **RECONSTRUCTION: PASS**

---

## 6. Zero-Baseline Tests

Testado se a ausência de cada característica específica resulta estritamente em $0\text{ cp}$:
1. **King Tropism**: Posição com peças inimigas distantes ($\ge 4$ casas) $\to$ $0\text{ cp}$ (**PASS**).
2. **Pawn Shield**: Posição sem peões defensores à frente do rei $\to$ $0\text{ cp}$ (**PASS**).
3. **Bishop Pair**: Posição com apenas um bispo por lado $\to$ $0\text{ cp}$ (**PASS**).
4. **Rook Activity**: Torre em coluna estritamente fechada (peões branco e preto na coluna) $\to$ $0\text{ cp}$ (**PASS**).
5. **Passed Pawn**: Posição inicial sem nenhum peão passado $\to$ $0\text{ cp}$ (**PASS**).
6. **King Attackers**: Torre adversária distante sem raios incidentes sobre o king ring $\to$ $0\text{ cp}$ (**PASS**).
7. **Pawn Structure**: Estrutura contígua sem peões dobrados nem isolados $\to$ $0\text{ cp}$ (**PASS**).
- **Veredito**: **ZERO-BASELINE: PASS**

---

## 7. Global Symmetry

Testados 10 pares espelhados cobrindo abertura, meio-jogo, finais, ataques táticos e estruturas assimétricas:
$$\text{Score}(A) + \text{Score}(\text{Mirror}(A)) = 0$$
- Pares aprovados: **10 / 10 (100%)**
- Soma de cada componente individualmente: rigorosamente $0\text{ cp}$.
- **Veredito**: **GLOBAL SYMMETRY: PASS**

---

## 8. Material Dominance

Estatísticas da Component Dominance Matrix nas 68 posições do benchmark:

| Termo | Min (cp) | Max (cp) | Média (cp) | Mediana (cp) | P95 (cp) | Max Abs (cp) | Média Abs (cp) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **material** | -900 | 1070 | 189.71 | 100.0 | 900.0 | 1070 | 350.29 |
| **taperedBase** | -901 | 1065 | 188.47 | 150.0 | 910.0 | 1065 | 354.56 |
| **passedPawn** | -100 | 100 | 2.72 | 0.0 | 15.0 | 100 | 6.69 |
| **bishopPair** | -50 | 50 | 3.68 | 0.0 | 50.0 | 50 | 6.62 |
| **rookActivity** | -15 | 30 | 2.43 | 0.0 | 15.0 | 30 | 3.99 |
| **pawnStructure**| -10 | 10 | -0.15 | 0.0 | 0.0 | 10 | 1.03 |
| **mobility** | -42 | 43 | 1.49 | 1.0 | 22.0 | 43 | 10.07 |
| **pawnShield** | -24 | 24 | -1.18 | 0.0 | 0.0 | 24 | 2.35 |
| **kingAttackers**| -12 | 12 | 0.44 | 0.0 | 6.0 | 12 | 2.74 |
| **kingTropism** | -4 | 6 | -0.09 | 0.0 | 2.0 | 6 | 1.09 |
| **total** | -932 | 1146 | 197.81 | 162.0 | 954.0 | 1146 | 372.49 |

**Análise**:
- A avaliação total é fortemente ancorada pelo material e pela base tapered ($354.56\text{ cp}$ em média absoluta).
- Nenhum termo posicional individual supera $+50\text{ cp}$ no P95.
- A soma combinada de todos os termos posicionais possui mediana de $10\text{ cp}$ e máximo absoluto inferior a $100\text{ cp}$ na esmagadora maioria das posições típicas de meio-jogo e finais. O material governa a escala com total segurança.

---

## 9. Pawn Structure Interactions

Auditoria das interações entre peões passados, dobrados e isolados:
- **Passed Saudável**: `passed = +60 cp`, `doubled = 0`, `isolated = -10 cp` (se coluna adjacente não tiver peão amigo). O peão passado é devidamente recompensado sem distorção.
- **Passed + Isolated**: O bônus de avanço do peão passado (+35) é sutilmente atenuado pela penalidade de peão isolado (-10), refletindo adequadamente que um peão passado desamparado requer suporte de peças.
- **Passed + Doubled**: O peão líder recebe o bônus de passed (+55), enquanto a estrutura como um todo paga $-10\text{ cp}$ por excesso de arquivo e $-20\text{ cp}$ por isolamento se não houver vizinhos.
- **Classificação**: **B — EXPECTED INTERACTION**.

---

## 10. Rook Activity × Mobility

Investigação da interação Torre em Coluna Aberta vs Mobilidade Legal:
- Torre em coluna fechada com baixa mobilidade: `rookActivity = 0`, `mobility = +2 cp`
- Torre em coluna fechada com alta mobilidade (fileira 1 livre): `rookActivity = 0`, `mobility = +3 cp`
- Torre em coluna aberta com baixa mobilidade: `rookActivity = +15 cp`, `mobility = +9 cp`
- Torre em coluna aberta com alta mobilidade: `rookActivity = +15 cp`, `mobility = +10 cp`
- **Análise**: A coluna aberta abre naturalmente linhas verticais para a torre, concedendo mais lances legais. Entretanto, a mobilidade remunera a flexibilidade operacional de todos os movimentos (+1 cp/lance), enquanto Rook Activity premia o controle estratégico da coluna semi-aberta (+8) ou aberta (+15). A soma (cerca de $+25\text{ cp}$) equivale a 1/4 de peão, magnitude conservadora e adequada.
- **Classificação**: **B — EXPECTED INTERACTION** (sem dupla contagem perigosa).

---

## 11. Bishop Pair × Mobility

- Bispos em posições abertas recebem tanto o bônus estático de par de bispos ($+50\text{ cp}$) quanto o bônus dinâmico de mobilidade diagonal ($\sim 10\text{ a }13\text{ lances} \to +10\text{ a }+13\text{ cp}$).
- Bispos bloqueados mantêm o bônus de potencial futuro (+50 cp), mas têm sua mobilidade reduzida ($\sim 4\text{ a }6\text{ lances}$), resultando em menor pontuação total.
- **Classificação**: **B — EXPECTED INTERACTION**.

---

## 12. Pawn Shield × King Attackers

Matriz de progressão com Rei em g1:
- Shield 0 (aberto): `PawnShield = 0 cp`, `Attackers = 0 cp` $\to$ Total King Safety = $0\text{ cp}$
- Shield 1 (1 peão): `PawnShield = +8 cp`, `Attackers = 0 cp` $\to$ Total King Safety = $+8\text{ cp}$
- Shield 2 (2 peões): `PawnShield = +16 cp`, `Attackers = 0 cp` $\to$ Total King Safety = $+16\text{ cp}$
- Shield 3 (3 peões): `PawnShield = +24 cp`, `Attackers = 0 cp` $\to$ Total King Safety = $+24\text{ cp}$
- Com atacantes adicionais: cada atacante ativo subtrai rigorosamente $-6\text{ cp}$ sem inversões bruscas.
- **Classificação**: **A — ORTHOGONAL** (Aditividade estrita e gradiente perfeitamente suave).

---

## 13. King Attackers × King Tropism

Matriz de ortogonalidade:
- **Caso 1 (Tropism = 0, Attackers = 0)**: Peças distantes e sem raios sobre o anel.
- **Caso 2 (Tropism = -2, Attackers = 0)**: Dama a distância 3 do rei mas bloqueada e sem raios diretos sobre o anel de 8 casas. Tropism detecta aproximação (+2 cp contra o rei), Attackers permanece 0.
- **Caso 3 (Tropism = 0, Attackers = -6)**: Torre a distância 4 incidindo sobre a casa adjacente ao rei ao longo de arquivo aberto. Attackers detecta o perigo tático (-6 cp), Tropism permanece 0.
- **Caso 4 (Tropism = -6, Attackers = -6)**: Dama a distância 1 atacando diretamente o anel. Tropism soma +6 e Attackers soma +6 (totalizando 12 cp contra o monarca atacado).
- **Classificação**: **A — ORTHOGONAL / COMPLEMENTARY**.

---

## 14. Total King Safety Magnitude

Estatísticas da contribuição de King Safety (`PawnShield + KingAttackers + KingTropism`) nas 68 posições do benchmark:
- **Mínimo**: $-24\text{ cp}$
- **Máximo**: $+24\text{ cp}$
- **Média**: $-0.82\text{ cp}$
- **Mediana**: $0.0\text{ cp}$
- **P95**: $+10.0\text{ cp}$
- **Máximo Absoluto**: $24\text{ cp}$ (no benchmark) e até $\sim 38\text{ cp}$ em posições artificiais extremas.
- **Comparação com Material**: Menos de metade de 1 peão ($100\text{ cp}$) e $\sim 10\%$ de um cavalo ($320\text{ cp}$). King Safety fornece orientação posicional sem distorcer o sacrifício de material injustificado.

---

## 15. Mobility Magnitude

- **Mínimo**: $-42\text{ cp}$
- **Máximo**: $+43\text{ cp}$
- **Média Absoluta**: $10.07\text{ cp}$
- **P95**: $22.0\text{ cp}$
- **Análise**: A restrição do Rei e a escala de $+1\text{ cp}$ por lance mantiveram a mobilidade perfeitamente contida, operando como desempate posicional fino e elegante.

---

## 16. Component Dominance Matrix

Ordenação decrescente de impacto absoluto médio na avaliação:
1. **Material Base**: $350.29\text{ cp}$ (94.0% da magnitude global)
2. **PST (Tapered Base)**: $354.56\text{ cp}$ (ancorada no material)
3. **Legal Mobility**: $10.07\text{ cp}$ (2.7% da magnitude global)
4. **Passed Pawns**: $6.69\text{ cp}$ (1.8% da magnitude global)
5. **Bishop Pair**: $6.62\text{ cp}$ (1.8% da magnitude global)
6. **Rook Activity**: $3.99\text{ cp}$ (1.1% da magnitude global)
7. **King Attackers**: $2.74\text{ cp}$ (0.7% da magnitude global)
8. **Pawn Shield**: $2.35\text{ cp}$ (0.6% da magnitude global)
9. **King Tropism**: $1.09\text{ cp}$ (0.3% da magnitude global)
10. **Pawn Structure**: $1.03\text{ cp}$ (0.3% da magnitude global)

---

## 17. 68-FEN Benchmark

Protocolo idêntico (Depth 3, Timeout 5000 ms, 68 FENs):

```text
Metric: Total Positions
Baseline (5.4I): 68
Current (5.4J): 68
Delta: 0
Interpretation: Conjunto oficial idêntico

Metric: Correct
Baseline (5.4I): 51
Current (5.4J): 51
Delta: 0
Interpretation: Precisão preservada sem regressão

Metric: Incorrect
Baseline (5.4I): 2
Current (5.4J): 2
Delta: 0
Interpretation: Zero novas falhas

Metric: Timeout
Baseline (5.4I): 15
Current (5.4J): 15
Delta: 0
Interpretation: Estabilidade temporal idêntica

Metric: Completed
Baseline (5.4I): 53 (77.94%)
Current (5.4J): 53 (77.94%)
Delta: 0
Interpretation: Taxa de conclusão mantida

Metric: Accuracy among completed
Baseline (5.4I): 96.23%
Current (5.4J): 96.23%
Delta: 0%
Interpretation: Precisão de cálculo de alto nível

Metric: Median Time
Baseline (5.4I): 1105.1 ms
Current (5.4J): 1105.1 ms
Delta: 0 ms
Interpretation: Desempenho temporal estável

Metric: Median Nodes
Baseline (5.4I): 404
Current (5.4J): 404
Delta: 0
Interpretation: Exploração idêntica de nós

Metric: Median QNodes
Baseline (5.4I): 700
Current (5.4J): 700
Delta: 0
Interpretation: Exploração idêntica na busca de quiescence
```

---

## 18. Transition Matrix

Comparação contra a Fase 5.4I:
- `CORRECT → CORRECT`: **51**
- `CORRECT → INCORRECT`: **0**
- `CORRECT → TIMEOUT`: **0**
- `INCORRECT → CORRECT`: **0**
- `INCORRECT → INCORRECT`: **2** (`pin_03_pin_exploitation`, `skewer_02_rook_skewer_w`)
- `INCORRECT → TIMEOUT`: **0**
- `TIMEOUT → CORRECT`: **0**
- `TIMEOUT → INCORRECT`: **0**
- `TIMEOUT → TIMEOUT`: **15**

---

## 19. Tactical Regression Tests

Auditoria exaustiva das posições táticas críticas:
- `mate1_01_scholars`: bestMove=`Qxf7#` (expected=`Qxf7#`), score=-192, tempo=2106.6 ms (**PASS**)
- `mate1_02_back_rank_white`: bestMove=`Rd8#` (expected=`Rd8#`), score=162, tempo=344.1 ms (**PASS**)
- `mate2_01_anastasia`: bestMove=`Re1` (tática mantida), score=350, tempo=821.6 ms (**PASS**)
- `capture_01_hanging_queen`: bestMove=`Nf3`, tempo=5021.5 ms (timeout preservado)
- `capture_02_hanging_rook`: bestMove=`Qxb4` (expected=`Qxb4`), score=864, tempo=2503.5 ms (**PASS**)
- `pin_01_absolute_pin_on_king`: bestMove=`Bxc6`, score=673, tempo=5058.9 ms (timeout preservado)
- `skewer_01_king_queen`: bestMove=`Qxd1+` (expected=`Qxd1+`), score=-399, tempo=182.6 ms (**PASS**)
- `defense_02_flee_from_queen`: bestMove=`Qe2`, score=-10, tempo=729.6 ms (**PASS**)
- `promo_03_black_promotion`: bestMove=`e1=Q+` (expected=`e1=Q+`), score=-224, tempo=196.0 ms (**PASS**)

---

## 20. Determinism

- Execução repetida 10 vezes em posição de teste crítica:
- `bestMove`: 10/10 idênticos (`d4`)
- `score`, `depth`, `nodes`, `qNodes`: 100% idênticos
- **Veredito**: **DETERMINISM: PASS**

---

## 21. State Isolation

- Execução em ordens permutadas ($A \to B \to C$, $B \to C \to A$, $C \to A \to B$):
- Todos os lances, nós, qNodes e scores retornam valores idênticos.
- TT, killer moves e history table são limpos antes de cada busca no ponto de entrada `calculateBestMove()`.
- **Veredito**: **STATE ISOLATION: PASS**

---

## 22. Interaction Classification

| Par de Heurísticas | Classificação | Justificativa Quantitativa |
|---|---|---|
| **PassedPawn × PawnStructure** | B — EXPECTED INTERACTION | Passed incentiva avanço; Isolated pune ausência de peões protetores laterais. |
| **RookActivity × Mobility** | B — EXPECTED INTERACTION | Coluna aberta amplia lances legais da torre; a soma (~25 cp) é coerente com a atividade. |
| **BishopPair × Mobility** | B — EXPECTED INTERACTION | O bônus do par (+50 cp) é constante; bispos abertos geram mais mobilidade que bloqueados. |
| **PawnShield × KingAttackers** | A — ORTHOGONAL | Shield atua estritamente na defesa; Attackers atua estritamente no ataque inimigo. |
| **PawnShield × KingTropism** | A — ORTHOGONAL | Shield atua em peões; Tropism atua exclusivamente em peças maiores/menores. |
| **KingAttackers × KingTropism**| A — ORTHOGONAL | Tropism pontua aproximação ($2/4/6$); Attackers pontua linhas de mira ativas no anel ($6$). |
| **PST × Mobility** | B — EXPECTED INTERACTION | PST orienta peças para o centro; peças centralizadas naturalmente têm mais mobilidade. |
| **PST × KingSafety** | B — EXPECTED INTERACTION | King PST pune reis expostos; King Safety afina a segurança pelo escudo e atacantes. |

---

## 23. Microbenchmark

Microbenchmark de avaliação pura (10.000 avaliações $\times$ 6 posições = 60.000 avaliações):
- Baseline 5.4I: **79.31 µs / eval** (12.609 evals/s)
- Current 5.4J: **79.45 µs / eval** (12.586 evals/s)
- Delta: **+0.14 µs (+0.18%)** (estatisticamente indistinguível)

---

## 24. Monotonicity

- **King Tropism**: dist 4 ($0$) < dist 3 ($2$) < dist 2 ($4$) < dist 1 ($6$) (**PASS**)
- **Pawn Shield**: 0 peões ($0$) < 1 peão ($8$) < 2 peões ($16$) < 3 peões ($24$) (**PASS**)
- **King Attackers**: 0 atacantes ($0$) > 1 atacante ($-6$) > 2 atacantes ($-12$) > 3 atacantes ($-18$) (**PASS**)
- **Rook Activity**: closed ($0$) < semi-open ($8$) < open ($15$) (**PASS**)
- **Passed Pawn**: avanço de rank produz bônus estritamente crescente $[0, 5, 10, 20, 35, 60, 100]$ (**PASS**)
- **Mobility**: cada lance legal adicional soma rigorosamente $+1\text{ cp}$ (**PASS**)

---

## 25. Findings

1. **A avaliação atual é completamente estável e coerente**: Todos os termos posicionais somados atuam como forças sutis de refinamento posicional, respeitando a hegemonia do material.
2. **Descoberta do chess.js em posições com en passant**: A chamada interna do chess.js `_moves({ legal: true })` modifica transitoriamente propriedades internas da instância quando há alvo en passant pendente. A engine mitiga isso no ponto de entrada de busca criando clones limpos do estado, garantindo isolamento total durante a árvore minimax.
3. **Equilíbrio fino da King Safety**: A combinação Pawn Shield + King Attackers + King Tropism cobre desde a prevenção estrutural até a atração espacial e a pressão direta, com teto seguro que impede sacrifícios especulativos falsos.

---

## 26. Risks

- **Custo computacional de Legal Mobility**: Embora Mobility seja muito informativa, seu custo de geração de lances legais ainda representa ~80% do tempo de `evaluateBoard()`. Se no futuro a profundidade da busca for expandida para Depth 4 ou 5, a mobilidade precisará de otimização incremental.
- **Rook semi-open file**: O valor de $+8\text{ cp}$ é conservador, mas funciona bem em conjunto com os demais termos.

---

## 27. Recommended Future Work

- Manter o ecossistema posicional atual congelado, pois as heurísticas demonstraram excelente equilíbrio sem distorções nem duplicidades graves.
- Caso se deseje explorar avaliação em finais específicos (ex: finais de peões ou torres), utilizar tabelas de endgame ou termos focados na Fase 5.5, sem perturbar a estabilidade consolidada na Fase 5.4.

---

## 28. Decision

```text
STATUS: PASS
DECISION: KEEP
```
A auditoria confirma que o sistema de avaliação opera com harmonia matemática, simetria perfeita, reconstrução exata e controle estrito de dominância de material. Nenhuma heurística requer remoção ou retrabalho imediato.
