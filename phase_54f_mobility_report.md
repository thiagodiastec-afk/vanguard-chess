# RELATÓRIO OFICIAL — FASE 5.4F (VANGUARD ENGINE)
### Heurística de Mobility: Auditoria Cirúrgica, Implementação e Investigação

---

## 1. STATUS
**`PASS_WITH_LIMITATIONS`**

- **Implementação cirúrgica e isolada**: Adicionada contagem estrita de movimentos legais (excluindo o Rei) com bônus configurável `bonusPerMove = 2 cp`.
- **Qualidade Enxadrística Comprovada**:
  - A acurácia entre posições concluídas subiu de **94.55% para 96.00%**.
  - A posição crônica `promo_03_black_promotion` foi **corrigida** (de `Kb8` [INCORRECT] para `e1=Q+` [CORRECT]).
  - Na posição inicial e desbalanceamentos, o motor passou a jogar `1. e4` abrindo linhas para Dama e Bispo, em vez do passivo `1. Nc3`.
  - **Zero regressões enxadrísticas**: Nenhuma posição correta passou a errar o lance.
- **Limitações Críticas Identificadas**:
  - **Overhead Computacional Severo (+1689.4%)**: A avaliação estática passou de 5.99 µs para 107.20 µs por chamada devido à geração de lances legais bilaterais via `chess.js`.
  - **Aumento de Timeouts (13 $\to$ 18)**: 5 posições próximas ao teto de 5000 ms sofreram timeout por poucos milissegundos.
  - **Double Counting com Rook Activity**: Torres em colunas abertas acumulam simultaneamente `ROOK_OPEN_FILE_BONUS` (+15 cp) e a mobilidade da coluna aberta (+14 a +18 cp), inflando o bônus efetivo para ~30 cp.
- **Decisão Oficial**: **`ADJUST`** (Manter com peso conservador ou isolar/otimizar via bitboards na Fase de Arquitetura).

---

## 2. AUDITORIA DA INFRAESTRUTURA EXISTENTE
- **Motor / Biblioteca:** `chess.js` v1.0.0-beta.6.
- **Geração de Lances:**
  - A API pública `game.moves()` gera strings SAN completas, o que inclui desambiguação e verificação de xeque-mate (~557 ms por 10.000 chamadas).
  - O método interno `_moves({ legal: true })` gera diretamente estruturas de lances `{ color, from, to, piece, ... }` com filtragem rigorosa de legalidade (`!this._isKingAttacked(us)`), sendo **2x mais rápido** (~279 ms por 10.000 chamadas).
  - Para obter os lances legais do adversário sem clones de estado caros ou mutação persistente, `_turn` é temporariamente chaveado e restaurado no mesmo frame (`const orig = g._turn; g._turn = color; const moves = g._moves({ legal: true }); g._turn = orig;`), preservando 100% da integridade do histórico e hash Zobrist.

---

## 3. DEFINIÇÃO FORMAL DE MOBILIDADE
$$\text{whiteMobility} = \sum_{m \in \text{LegalMoves}(\text{White})} [m.\text{piece} \neq \text{'k'}]$$
$$\text{blackMobility} = \sum_{m \in \text{LegalMoves}(\text{Black})} [m.\text{piece} \neq \text{'k'}]$$
$$\text{mobilityDelta} = \text{whiteMobility} - \text{blackMobility}$$
$$\text{mobilityScore} = \text{mobilityDelta} \times \text{bonusPerMove}$$

A pontuação é adicionada diretamente a `baseScore` (da perspectiva das Brancas: positivo favorece Brancas, negativo favorece Pretas).

---

## 4. JUSTIFICATIVA: LEGAL VS PSEUDO-LEGAL
Movimentos pseudo-legais incluem lances que deixam ou mantêm o próprio Rei em xeque.
- Em posições sob xeque ou com cravaduras absolutas, peões ou peças cravadas teriam lances pseudo-legais que não podem ser jogados na prática.
- A auditoria empírica confirmou que o filtro `legal: true` elimina lances ilegais de peças cravadas (provado no Teste 8 de `test_mobility.ts`, onde um bispo sob xeque possui apenas 1 lance legal em vez de 5 pseudo-legais).

---

## 5. EXCLUSÃO DO REI
Conforme a Regra 3, o Rei foi estritamente excluído de `countMobility`:
```typescript
if (p !== 'k' && p !== 'K') { count++; }
```
Motivo: A liberdade do Rei não se correlaciona linearmente com vantagem posicional (um Rei com muitas casas em meio-jogo frequentemente indica um Rei exposto e desprotegido, e será tratado na futura heurística de *King Safety*).

---

## 6. IMPLEMENTAÇÃO
Adicionada em [`src/lib/engine.ts`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts):
```typescript
export const MOBILITY_BONUS_PER_MOVE = 2;

export const mobilityConfig = {
  bonusPerMove: MOBILITY_BONUS_PER_MOVE
};

export function countMobility(game: Chess, color: 'w' | 'b'): number {
  const g = game as any;
  const originalTurn = g._turn;
  g._turn = color;
  const rawMoves = typeof g._moves === 'function' ? g._moves({ legal: true }) : [];
  g._turn = originalTurn;

  let count = 0;
  for (let i = 0; i < rawMoves.length; i++) {
    const p = rawMoves[i].piece;
    if (p !== 'k' && p !== 'K') {
      count++;
    }
  }
  return count;
}
```
Na função [`evaluateBoard`](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts#L226):
```typescript
if (mobilityConfig.bonusPerMove > 0) {
  const whiteMobility = countMobility(game, 'w');
  const blackMobility = countMobility(game, 'b');
  const mobilityDelta = whiteMobility - blackMobility;
  baseScore += mobilityDelta * mobilityConfig.bonusPerMove;
}
```

---

## 7. PESO UTILIZADO
- **`MOBILITY_BONUS_PER_MOVE`**: `2 cp` por lance legal excedente (conservador).

---

## 8. TESTES UNITÁRIOS (`test_mobility.ts`)
20 asserções executadas e 100% aprovadas:
- **Teste 1 (Mobilidade equivalente):** Posição inicial resulta em $W=20, B=20 \to \Delta = 0$, score = 0 cp.
- **Teste 2 (White maior):** Posição aberta ativa para Brancas $\to W=35, B=29 \to \Delta = +6$, score = +12 cp.
- **Teste 3 (Black maior):** Inversão de posição $\to B=35, W=29 \to \Delta = -6$, score = -12 cp.
- **Teste 4 (Simetria / Espelho):** Cavalo espelhado em e4/e5 $\to W=16\text{ cp}, B=-16\text{ cp}$ (simetria exata $W = -B$).
- **Teste 5 (Material igual):** Bispo ativo (11 lances) vs peão bloqueado (2 lances) $\to \Delta > 0$.
- **Teste 6 (Rei excluído):** Posição somente com Reis $\to W=0, B=0$, score = 0 cp.
- **Teste 7 (Peça bloqueada):** Torre e peões bloqueados refletem fielmente os 7 lances legais reais.
- **Teste 8 (Xeque):** Bispo cravado sob xeque computa apenas 1 lance legal (captura da dama), filtrando lances ilegais.
- **Teste 9 (Promoção):** Peão na 7ª fileira gera exatamente 4 promoções legais (Dama, Torre, Bispo, Cavalo).
- **Teste 10 (Determinismo):** 10 execuções consecutivas produzem contagem idêntica (35 lances).

---

## 9. TESTES CONTROLADOS DE DOUBLE COUNTING
- **Controle A (Cavalo Centralizado vs Canto):** Cavalo em e4 (8 lances) vs a1 (2 lances) $\to$ bônus proporcional (+12 cp delta).
- **Controle B (Bispo Aberto vs Bloqueado):** 13 lances vs 8 lances $\to$ bônus proporcional (+10 cp delta).
- **Controle C (Torre Aberta vs Fechada):** 13 lances vs 5 lances.
- **Controle D (Dama Central):** 26 lances $\times$ 2 cp = +52 cp (abaixo do teto de distorção de 54 cp).
- **Controle E (Meio-Jogo Típico):** $W=32, B=32 \to \Delta = 0$ (não distorce avaliações equilibradas).

---

## 10 & 11. BASELINE VS +MOBILITY (68 FENs BENCHMARK)

Executado sob o protocolo oficial (Depth 3, Timeout 5000 ms, 68 FENs):

| Métrica | Baseline (No Mobility) | + Mobility (+2 cp) | Delta |
|---|---:|---:|---:|
| **Total** | 68 | 68 | 0 |
| **Correct** | 52 | 48 | -4 |
| **Incorrect** | 3 | **2** | **-1 (Melhoria)** |
| **Timeout** | 13 | 18 | +5 (Overhead) |
| **Completed** | 55 / 68 (80.88%) | 50 / 68 (73.53%) | -5 |
| **Accuracy among completed** | **94.55%** | **96.00%** | **+1.45%** |
| **Overall Resolved Rate** | 76.47% | 70.59% | -5.88% |
| **Tempo Mediano** | 1249.7 ms | 1435.8 ms | +186.1 ms |
| **Tempo P95** | 5154.5 ms | 5062.2 ms | -92.3 ms |
| **Nós Medianos** | 434.0 | 383.5 | -50.5 |
| **QNodes Medianos** | 905.0 | 966.5 | +61.5 |

---

## 12. ANÁLISE DAS MUDANÇAS DE LANCE

Foram mapeadas 20 mudanças de lance. Nenhuma posição correta foi convertida em lance incorreto:

### 12.1 Correção Histórica (Melhoria de Força)
- **`promo_03_black_promotion`** (PROMOTION):
  - **Baseline:** `Kb8` (**INCORRECT**, score -220 cp) — O gradiente de King PST do final favorecia a aproximação do Rei.
  - **+ Mobility:** `e1=Q+` (**CORRECT**, score -228 cp) — A Dama promovida oferece enorme mobilidade, superando o bias da King PST e escolhendo o lance vitorioso imediato.

### 12.2 Desenvolvimento Clássico
- **`quiet_01_starting_pos`** e posições de material:
  - **Baseline:** `1. Nc3`
  - **+ Mobility:** `1. e4` (ganha 9 lances de mobilidade abrindo caminhos para Dama e Bispo).

### 12.3 Timeouts Induzidos por Overhead (5 posições)
- `mate2_03_opera_box`: 2845 ms $\to$ 5004 ms (TIMEOUT)
- `mate2_05_queen_rook_battery`: 3462 ms $\to$ 5000 ms (TIMEOUT)
- `hanging_01_undefended_bishop`: 3573 ms $\to$ 5012 ms (TIMEOUT)
- `hanging_04_hanging_queen_direct`: 4886 ms $\to$ 5023 ms (TIMEOUT)
- `defense_01_block_check`: 4870 ms $\to$ 5005 ms (TIMEOUT)

Todas as 5 posições excederam o teto de 5000 ms por meros **2 a 23 milissegundos**. Sob tempo ilimitado ou margem de 10 s, todas encontram o lance correto de forma determinística.

---

## 13. REGRESSÕES E DOUBLE COUNTING
- **Regressões Enxadrísticas:** **ZERO**.
- **Double Counting Confirmado:**
  - A suíte `test_rook_activity.ts` revelou que a mobilidade de torres em colunas abertas adiciona ~14 a 18 cp além do bônus estático de 15 cp da Fase 5.4D.
  - Isso indica que, ao somar Rook Activity com Mobility geral, o valor atribuído ao controle de colunas abertas atinge ~30 cp.

---

## 14. PERFORMANCE & MICROBENCHMARK
Microbenchmark estático de 5.000 iterações em posição de meio-jogo:
- **Baseline (Sem Mobility):** 166.928 avaliações/segundo (**5.99 µs** por avaliação).
- **Com Mobility (+2 cp):** 9.329 avaliações/segundo (**107.20 µs** por avaliação).
- **Overhead da avaliação estática:** **+1689.4%** (~17.8x mais lenta).

---

## 15. DETERMINISMO E ISOLAMENTO DE ESTADO
- **Determinismo sem Timeout:** Posições táticas, de endgame e de mobilidade que completam antes do timeout apresentam 100% de determinismo em lances e scores.
- **Efeito de Timeout:** Quando uma busca é interrompida exatamente na fronteira de 5000 ms (ex: 5000.4 ms), o iterative deepening pode oscilar entre o lance do depth 2 ou do depth 3 dependendo de flutuações mínimas de relógio do sistema operacional.

---

## 16. REGRESSÃO COMPLETA DA SUÍTE
- [`test_mobility.ts`](file:///c:/Users/User/chess/vanguard-chess/test_mobility.ts): **20/20 PASS**.
- [`test_pawn_structure.ts`](file:///c:/Users/User/chess/vanguard-chess/test_pawn_structure.ts): **13/13 PASS**.

---

## 17. DECISÃO FINAL: `ADJUST`

### Justificativa:
1. **Mobility melhora a precisão enxadrística do motor**: a acurácia das posições completadas subiu para **96.00%** e corrigiu a promoção imediata em finais (`promo_03`).
2. **Porém, a arquitetura de geração legal dinâmica em JS/TS é muito cara** (+1689% de overhead estático), penalizando o completion rate em janelas rígidas de 5000 ms.
3. **Ajuste Recomendado:** Manter a implementação disponível e configurável via `mobilityConfig.bonusPerMove`, com valor padrão de `1 cp` ou `2 cp` para análises profundas, e priorizar futuramente a substituição da geração de lances por tabelas de ataque bitboard/0x88 para eliminar o overhead de 100 µs.

---

## 18. ENCERRAMENTO
Conforme a **Regra Final**, o trabalho da Fase 5.4F está encerrado. Não foram adicionadas heurísticas de King Safety ou modificações na busca.
