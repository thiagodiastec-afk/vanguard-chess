# Relatório de Otimização da Mobilidade Legal — Fase 5.7B

**Status**: `STATUS: PASS`\
**Decisão**: `DECISION: KEEP`\
**Data**: 28 de Setembro de 2026\
**Componente**: Vanguard Chess Engine — Legal Mobility Optimization\
**Arquivos de Referência**: `src/lib/engine.ts`, `test_phase57b_mobility_equivalence.ts`, `phase_57b_mobility_optimization.json`

---

## A. Harness e Diagnóstico

### Causa Original da Divergência (499/500)
A auditoria diagnóstica da Fase 5.7B identificou que a divergência na posição 477 (`rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2`) não era decorrente de erro algorítmico em `src/lib/engine.ts`, mas sim de um estado ilegal criado pelo oráculo de teste no harness:
- Ao avaliar a mobilidade das Pretas (`b`), o harness forçava `g._turn = 'b'`, mas mantinha `g._epSquare = c6` (casa criada pelo avanço `c7-c5` das próprias pretas no lance anterior).
- O `chess.js` gerava capturas ilegais de en passant para as Pretas (`b7xc6 ep`, `d7xc6 ep`).
- A rotina de desfazer lances (`_undoMove`) do `chess.js` em capturas en passant inseria um peão branco fantasma em `c7` (`move.to - 16`), contaminando o tabuleiro em memória e bloqueando a Dama em `d8`.

### Correção Aplicada no Harness
Implementada a função arquitetural segura `getSafeGameForColor(fen, color)`:
```ts
export function getSafeGameForColor(fen: string, color: 'w' | 'b'): Chess {
  const parts = fen.split(' ');
  if (parts[1] === color) {
    return new Chess(fen);
  }
  const newTurn = color;
  const newEp = '-'; // En passant gerado pelo próprio jogador não é aplicável a ele
  const safeFen = `${parts[0]} ${newTurn} ${parts[2]} ${newEp} ${parts[4] || '0'} ${parts[5] || '1'}`;
  return new Chess(safeFen);
}
```
Essa construção garante que o estado do tabuleiro permaneça 100% canônico e legal perante as regras da FIDE e do `chess.js`, sem mutar propriedades privadas em memória.

### Validação
Nenhuma alteração foi necessária ou realizada em `src/lib/engine.ts`. O motor Vanguard permaneceu estritamente congelado.

---

## B. Equivalência Legal

Todos os testes de equivalência compararam a contagem de referência do `chess.js` com a implementação otimizada:

| Categoria de Teste | Amostra | Aprovados | Taxa de Equivalência | Status |
|---|---|---|---|---|
| **Controlled Positions** | 55 | 55 | **100.0%** | **PASS** |
| **Random Reachable Positions** | 500 | 500 | **100.0%** | **PASS** |
| **Divergências** | — | 0 | **0** | **PASS** |

### Equivalência Estrita por Tipo de Peça (500 Posições Aleatórias)

| Tipo de Peça | Posições Testadas | Equivalência Exata | Status |
|---|---|---|---|
| **Pawn (Peões)** | 500 | 500 / 500 | **PASS (100%)** |
| **Knight (Cavalos)** | 500 | 500 / 500 | **PASS (100%)** |
| **Bishop (Bispos)** | 500 | 500 / 500 | **PASS (100%)** |
| **Rook (Torres)** | 500 | 500 / 500 | **PASS (100%)** |
| **Queen (Damas)** | 500 | 500 / 500 | **PASS (100%)** |
| **King (Rei)** | 500 | 500 / 500 | **PASS (100%)** |
| **Total Non-King** | 500 | 500 / 500 | **PASS (100%)** |

Zero tolerância respeitada: **500/500 posições perfeitamente idênticas à referência**.

---

## C. Casos Especiais de En Passant

Validação direcionada cobrindo todas as nuances de regras:

1. **Posição de Regressão** (`rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2`):
   - White total mobility: **30** (29 non-king) $\to$ **PASS**
   - Black total mobility: **22** (22 non-king) $\to$ **PASS**
   - Movimentos ilegais `b7-c6(ep)` e `d7-c6(ep)` para as pretas: **0** $\to$ **PASS**
   - Dama preta em d8 mantendo suas saídas legais (`d8-c7`, `d8-b6`, `d8-a5`): **3 lances** $\to$ **PASS**
2. **Caso A — En Passant Válido para o Lado a Mover** (`4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1`):
   - Lance `e5xd6(ep)` gerado e contado com sucesso: **1 lance** $\to$ **PASS**
3. **Caso B — En Passant Inválido para o Lado Oposto**:
   - Lances e.p. contados para o lado que não possui o direito: **0** $\to$ **PASS**
4. **Caso C — En Passant Bloqueado por Segurança do Rei** (`4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 1`):
   - O peão branco em e5 está cravado na coluna e pelo rei em e1 e torre em e8. O lance `exd6(ep)` exporia o rei a xeque ilegal e foi filtrado: **0 lances** $\to$ **PASS**

---

## D. Performance e Microbenchmark

### Microbenchmark (10.000 Avaliações Estáticas em 8 Posições Típicas)

| Posição | Ref Mobility (µs) | Opt Mobility (µs) | Speedup Mobility | Ref Eval (µs) | Opt Eval (µs) | Speedup Eval | Evals/seg (Opt) |
|---|---|---|---|---|---|---|---|
| **Initial Position** | 103.1 | 108.7 | -5.5% | 100.3 | 105.9 | -5.6% | 9.442 |
| **Open Middlegame** | 162.8 | 145.8 | **+10.4%** | 180.2 | 163.2 | **+9.4%** | 6.128 |
| **Closed Middlegame** | 165.9 | 147.4 | **+11.2%** | 192.4 | 173.8 | **+9.6%** | 5.752 |
| **Tactical Position** | 210.3 | 198.9 | **+5.4%** | 215.0 | 203.7 | **+5.3%** | 4.910 |
| **Position with Check** | 81.3 | 39.3 | **+51.6%** | 88.6 | 46.7 | **+47.3%** | 21.404 |
| **Position with Multiple Pins** | 158.1 | 139.7 | **+11.7%** | 171.1 | 152.6 | **+10.8%** | 6.553 |
| **High Branching Position** | 207.9 | 189.6 | **+8.8%** | 221.5 | 203.2 | **+8.2%** | 4.920 |
| **Endgame Position** | 65.5 | 37.4 | **+43.0%** | 70.3 | 42.2 | **+40.0%** | 23.720 |
| **MÉDIA GERAL** | **144.4 µs** | **125.8 µs** | **+12.8%** | **154.9 µs** | **136.4 µs** | **+11.9%** | **10.366** |

**Ganhos observados**:
- Redução de **~18,6 µs** por cálculo de mobilidade (-12,8%).
- Redução de **~18,5 µs** no custo total de `evaluateBoard()` (-11,9%).
- Em posições em xeque e finais, onde a verificação de roque e movimentos de rei representavam grande fatia do custo, o ganho de velocidade atinge **43% a 51%**.

---

## E. Benchmark Oficial — 68 FENs

Executado rigorosamente com o protocolo oficial (Iterative Deepening até Depth 3, timeout de 3.000 ms):

| Métrica | Fase 5.7A (SAN Elimination) | Fase 5.7B (Mobility Optimization) | Variação |
|---|---|---|---|
| **Total de Posições** | 68 | 68 | — |
| **Correct** | 63 (92.65%) | 63 (92.65%) | Idêntico |
| **Incorrect** | 5 | 5 | Idêntico |
| **Timeouts** | 0 (0.0%) | 0 (0.0%) | Idêntico |
| **Completed** | 68 / 68 (100.0%) | 68 / 68 (100.0%) | 100% |
| **Accuracy among completed** | 92.65% | 92.65% | 0 regressões |
| **Tempo Mediano** | 214.5 ms | **184.4 ms** | **-30.1 ms (-14.0%)** |
| **Tempo P95** | 1.405.9 ms | 1.405.8 ms | Estável |
| **Nós Medianos (Minimax)** | 627 | 627 | Estável |
| **Nós Medianos (QSearch)** | 898 | 898 | Estável |

---

## F. Matriz de Transição (5.7A $\to$ 5.7B)

| Transição | Quantidade | Regra Crítica | Status |
|---|---|---|---|
| **CORRECT $\to$ CORRECT** | **63** | Preservado | **PASS** |
| **CORRECT $\to$ INCORRECT** | **0** | **DEVE SER ZERO** | **PASS (0 regressões)** |
| **CORRECT $\to$ TIMEOUT** | **0** | Zero timeouts | **PASS** |
| **INCORRECT $\to$ CORRECT** | **0** | — | — |
| **INCORRECT $\to$ INCORRECT** | **5** | Esperado | **PASS** |
| **INCORRECT $\to$ TIMEOUT** | **0** | — | **PASS** |
| **TIMEOUT $\to$ CORRECT** | **0** | — | — |
| **TIMEOUT $\to$ INCORRECT** | **0** | — | — |
| **TIMEOUT $\to$ TIMEOUT** | **0** | — | — |

Critério crítico absoluto: **CORRECT $\to$ INCORRECT = 0**.

---

## G. Determinismo

Executado em 10 iterações consecutivas na posição crítica:
- Todos os 10 lances foram idênticos (`Qxf7#`).
- Todos os nós de busca minimax (`nodes = 627`) e quiescence (`qNodes = 898`) foram exatamente idênticos.
- **Status**: `PASS`.

---

## H. Isolamento de Estado (State Isolation)

Executado em permutação circular de 3 posições:
1. Sequência 1: $A \to B \to C$
2. Sequência 2: $B \to C \to A$
3. Sequência 3: $C \to A \to B$

Comparação cruzada:
- Posição A ($seq_1[0] == seq_2[2] == seq_3[1]$): lances e nós idênticos.
- Posição B ($seq_1[1] == seq_2[0] == seq_3[2]$): lances e nós idênticos.
- Posição C ($seq_1[2] == seq_2[1] == seq_3[0]$): lances e nós idênticos.
- **Status**: `PASS`.

---

## I. Testes de Regressão

| Suíte de Testes | Quantidade | Resultado |
|---|---|---|
| `test_mobility.ts` | 20 testes | **20/20 PASS** |
| `test_king_tropism.ts` | 51 testes | **51/51 PASS** |
| `test_king_attackers.ts` | 47 testes | **47/47 PASS** |
| `test_pawn_shield.ts` | 40 testes | **40/40 PASS** |
| `test_pawn_structure.ts` | 13 testes | **13/13 PASS** |
| `test_phase57b_mobility_equivalence.ts` | 55 controlled + 500 random + 20 symmetry + 10x determinism + 3-way isolation | **TODOS PASS** |

---

## J. Decisão Final

```text
STATUS: PASS
DECISION: KEEP
```

### Justificativa:
1. **Equivalência Legal Absoluta**: 100% de equivalência comprovada contra o oráculo de referência em 55 posições controladas e 500 posições aleatórias (500/500 por tipo de peça).
2. **Definição de Mobilidade Legal Preservada**: Nenhuma aproximação pseudo-legal foi introduzida. Apenas movimentos estritamente legais continuam sendo contados.
3. **Ganho Mensurável de Performance**:
   - `evaluateBoard()` ficou **11,9% mais rápido** no microbenchmark.
   - Posições com xeque e finais ganharam de **43% a 51%** em velocidade de contagem.
   - O tempo mediano no benchmark de 68 FENs caiu de **214,5 ms para 184,4 ms (-14,0%)**.
4. **Zero Regressões**: `CORRECT -> INCORRECT = 0`.
5. **Determinismo e Isolamento de Estado**: 100% preservados.
6. **Integridade da Engine**: `src/lib/engine.ts` permaneceu estritamente limpo, sem bitboards ou reescrita desnecessária nesta fase.

---

**Fim da Fase 5.7B. A Fase 5.7C não foi iniciada.**
