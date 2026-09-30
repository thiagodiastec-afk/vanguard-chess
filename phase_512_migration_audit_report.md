# VANGUARD CHESS — FASE 5.12
## POST-MIGRATION AUDIT REPORT — STAGE 4
### Auditoria Completa do Caminho Crítico, Integridade do Backend e Performance Real

**STATUS DA AUDITORIA:** `PASS — READY_FOR_STAGE_5`\
**DATA:** 29 de Setembro de 2026\
**ESCOPO:** Fases 5.8, 5.9, 5.10 e 5.11 (Geração de Lances, Make/Undo, Xeque, Quiescence e Avaliação Estática em Bitboards).

---

## 1. RESUMO EXECUTIVO

A Fase 5.12 executou uma auditoria rigorosa e empírica do motor Vanguard Chess após a migração das quatro etapas centrais para Bitboards (Fases 5.8 a 5.11).

### Principais Conclusões:
1. **Confirmação do Caminho Real**: O modo `BITBOARD_ONLY` opera com geração de lances (legal e tático), verificação de xeque, material insuficiente e avaliação estática 100% nativas em Bitboard. O oráculo `chess.js` está completamente dormente neste modo (zero chamadas e zero validações residuais).
2. **Performance Real Comprovada (3 Repetições do Benchmark 68)**:
   - `CHESSJS_ONLY`: **27,44 s** média | Mediana: **193,7 ms** | P95: **1396,0 ms** | NPS: **6.135** | 63/68 acertos (0 timeouts)
   - `BITBOARD_ONLY`: **20,59 s** média | Mediana: **172,3 ms** | P95: **1099,3 ms** | NPS: **8.769** | 63/68 acertos (0 timeouts)
   - `BITBOARD_WITH_ORACLE`: **50,63 s** média | Mediana: **396,1 ms** | P95: **2595,4 ms** | NPS: **3.519** | 63/68 acertos (0 timeouts)
   - O ganho líquido do `BITBOARD_ONLY` em relação ao legado é de **-24,99% no tempo total** (-6,85 segundos) e **+42,93% em nós por segundo (NPS)**, com determinismo absoluto e zero regressões táticas.
3. **Resolução da Discrepância de Métricas da Fase 5.11**: O número de `+276.4%` reportado na Fase 5.11 pertencia exclusivamente ao **microbenchmark da avaliação isolada** (onde executar o oráculo representava computar duas vezes a avaliação completa e fazer `assert`). No contexto da **busca completa em árvore**, o overhead do oráculo foi medido em **+145,94%** (de 20,59 s para 50,63 s), em perfeita concordância com os 50,61 s da Fase 5.11.
4. **Integridade de Regras e Empates**: Matriz de teste com 13 posições críticas de material insuficiente (`hasInsufficientMaterial`) obteve **13/13 (100.0%) de concordância** estrita entre o `BitboardBackend` e o `chess.js`.
5. **Gargalos Residuais Identificados**: Foram isolados 3 pontos de trabalho residual no modo `BITBOARD_ONLY` que totalizam ~1.700 ms por busca completa, encabeçados pela sincronização de `game._makeMove` para alimentar o hash Zobrist legado.

---

## 2. ARQUIVOS INSPECIONADOS

- [src/lib/engine.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/engine.ts)
- [src/lib/board/types.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/types.ts)
- [src/lib/board/factory.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/factory.ts)
- [src/lib/board/bitboardBackend.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/bitboardBackend.ts)
- [src/lib/board/chessJsBackend.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/chessJsBackend.ts)
- [src/lib/board/validator.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/board/validator.ts)
- [src/lib/bitboard/evaluation.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/evaluation.ts)
- [src/lib/bitboard/attacks.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/attacks.ts)
- [src/lib/bitboard/movegen.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/bitboard/movegen.ts)
- [src/lib/zobrist.ts](file:///c:/Users/User/chess/vanguard-chess/src/lib/zobrist.ts)

---

## 3. BACKEND EFETIVAMENTE UTILIZADO POR OPERAÇÃO

Para maiores detalhes e call graph completo, consultar [phase_512_execution_path_audit.md](file:///c:/Users/User/chess/vanguard-chess/phase_512_execution_path_audit.md).

| Operação da Busca | Modo `CHESSJS_ONLY` | Modo `BITBOARD_ONLY` | Modo `BITBOARD_WITH_ORACLE` |
| :--- | :---: | :---: | :---: |
| **Geração na Raiz** | `chess.js` | `BitboardBackend` | `BitboardBackend` + Oráculo |
| **Geração no Minimax** | `chess.js` | `BitboardBackend` | `BitboardBackend` + Oráculo |
| **Geração Tática Quiescence** | `chess.js` | `BitboardBackend` | `BitboardBackend` + Oráculo |
| **Make / Undo** | `chess.js` | `BitboardBackend` (+ sync `game`) | `BitboardBackend` + `game` |
| **Detecção de Xeque** | `chess.js` | `BitboardBackend` | `BitboardBackend` + Oráculo |
| **Material Insuficiente** | `chess.js` | `BitboardBackend` | `BitboardBackend` + Oráculo |
| **Avaliação Estática** | `evaluateBoard` | `evaluateBoardBitboard` | Bitboard + `evaluateBoard` |
| **Mobilidade** | `chess.js` | `BitboardBackend` (Ataques) | Bitboard + Oráculo |
| **Zobrist Hashing (TT)** | `computeZobristHash` | `computeZobristHash` (legado) | `computeZobristHash` |
| **Conversão SAN** | Raiz (1x) | Raiz (1x) | Raiz (1x) |
| **Oráculo e Assertions** | Desativado (0) | Desativado (0) | Ativo (~262.000 chamadas) |

---

## 4. PROFILING REPRODUZÍVEL (3 REPETIÇÕES DO BENCHMARK 68)

O protocolo executou 3 baterias completas com os 68 FENs oficiais para cada modo, sem alteração de heurísticas, TT ou limites de tempo/profundidade.

### Tabela Consolidada de Execução

| Métrica | `CHESSJS_ONLY` (Média de 3) | `BITBOARD_ONLY` (Média de 3) | `BITBOARD_WITH_ORACLE` (Média de 3) | Variação (Bitboard vs Legado) |
| :--- | :---: | :---: | :---: | :---: |
| **Tempo Total** | **27.443,7 ms** (27,44 s) | **20.586,0 ms** (20,59 s) | **50.629,8 ms** (50,63 s) | **-24,99% (-6,86 s)** |
| **Mediana por Posição** | **193,7 ms** | **172,3 ms** | **396,1 ms** | **-11,04%** |
| **Percentil 95 (P95)** | **1.396,0 ms** | **1.099,3 ms** | **2.595,4 ms** | **-21,25%** |
| **Nós por Segundo (NPS)** | **6.135** | **8.769** | **3.519** | **+42,93%** |
| **Total de Nós Visitados** | 168.342 | 180.457 | 178.143 | +7,19% |
| **Geração de Movimentos** | 32.246 | 35.226 | 35.072 | — |
| **Make / Undo Executados** | 697.419 | 781.884 | 1.463.638 | — |
| **Avaliações Estáticas** | 80.728 | 86.788 | 85.657 | — |
| **Chamadas ao Oráculo** | 0 | 0 | 262.304 | — |
| **Posições Corretas** | **63 / 68** | **63 / 68** | **63 / 68** | 0 divergências |
| **Timeouts** | **0** | **0** | **0** | 0 falhas |

### Repetibilidade Individual por Bateria
- `CHESSJS_ONLY`: Run 1: 27,50 s | Run 2: 27,77 s | Run 3: 27,07 s (Desvio padrão: ±1,3%)
- `BITBOARD_ONLY`: Run 1: 20,71 s | Run 2: 20,98 s | Run 3: 20,07 s (Desvio padrão: ±2,2%)
- `BITBOARD_WITH_ORACLE`: Run 1: 50,63 s | Run 2: 51,04 s | Run 3: 50,22 s (Desvio padrão: ±0,8%)

---

## 5. RESOLUÇÃO DA DISCREPÂNCIA DO OVERHEAD DO ORÁCULO DA FASE 5.11

Na documentação da Fase 5.11, surgiram dois valores para overhead do oráculo:
- `+276.4%` (Seção J.3)
- `+144.0%` (Derivado de 20,74 s vs 50,61 s na busca completa)

### Explicação Técnica Comprovada:
1. **Microbenchmark de Avaliação Isolada (10.000 iterações em posições estáticas)**:
   - `evaluateBoardBitboard`: 469,45 ms
   - `BITBOARD_WITH_ORACLE` (Bitboard + Chess.js evaluateBoard + assert): 1.767,10 ms
   - Variação relativa: `(1767.10 - 469.45) / 469.45 = +276.42%`.
2. **Busca Completa em Árvore (Benchmark 68 posições)**:
   - `BITBOARD_ONLY`: 20,59 s
   - `BITBOARD_WITH_ORACLE`: 50,63 s
   - Variação relativa: `(50.63 - 20.59) / 20.59 = +145.94%`.

**Conclusão**: Não houve erro nos dados brutos. A divergência decorreu de uma ambiguidade na rotulagem da métrica na documentação anterior. O overhead na busca real é de **+145,9%**, enquanto o custo de validação síncrona no microbenchmark da avaliação estática isolada é de **+276,4%**. Ambas as métricas estão agora formalmente catalogadas em seus respectivos domínios.

---

## 6. AUDITORIA DE TRABALHO RESIDUAL E GARGALOS (FASE 5.12)

Os resultados do profiling detalhado em [phase_512_residual_bottlenecks.json](file:///c:/Users/User/chess/vanguard-chess/phase_512_residual_bottlenecks.json) revelam os seguintes pontos de contenção no modo `BITBOARD_ONLY`:

### 1. `computeZobristHash(game)` (src/lib/zobrist.ts)
- **Frequência**: ~70.000 chamadas por busca completa (em cada probe e store da Transposition Table).
- **Mecanismo**: Invoca `game.board()` (alocação de matriz 8x8 de objetos) e `game.fen().split(' ')` (serialização de string para obter roque e en passant).
- **Custo unitário**: 5,09 µs por chamada.
- **Custo total na busca**: **~356,3 ms**.
- **Necessário para segurança agora?**: Sim, para garantir que o hash Zobrist permaneça 100% idêntico entre os backends sem quebrar as chaves de repetição ou TT.
- **Candidato para Stage 5**: Implementar `computeZobristHashBitboard(boardState: BoardState)` incremental em 64 bits.

### 2. Sincronização Dual: `game._makeMove` / `game._undoMove` (src/lib/engine.ts)
- **Frequência**: ~780.000 chamadas por busca completa.
- **Mecanismo**: O loop minimax chama `backend.makeMove(m)` e simultaneamente `(game as any)._makeMove(m)`.
- **Custo unitário**: 1,66 µs por chamada.
- **Custo total na busca**: **~1.293,1 ms**.
- **Necessário para segurança agora?**: Sim, unicamente para manter o objeto `game` em sincronia para alimentar o `computeZobristHash(game)` acima e consultas de peças em `orderMoves`.
- **Candidato para Stage 5**: Desacoplar `game` do loop interno do minimax.

### 3. Alocações em `orderMoves` (src/lib/engine.ts)
- **Frequência**: ~35.000 chamadas por busca.
- **Mecanismo**: Cria instâncias de `new Map()` e clones de array `[...moves].sort()` em cada nó interno do minimax.
- **Custo total na busca**: **~50 ms**.
- **Candidato para Stage 5**: Ordenação in-place baseada em pontuação compacta pré-alocada.

---

## 7. INTEGRIDADE DO BACKEND E REGRAS DE EMPATE

Conforme registrado em [phase_512_backend_integrity_report.md](file:///c:/Users/User/chess/vanguard-chess/phase_512_backend_integrity_report.md):
- A suíte de 13 cenários de `hasInsufficientMaterial()` alcançou **100% de concordância** com o `chess.js`, incluindo casos sutis como bispos de mesma cor versus bispos de cores opostas e dois cavalos contra rei isolado.
- Perft, idempotência de make/undo, quiescence, rollback na raiz e paridade de avaliação estática atingiram **100% de aprovação**.

---

## 8. RECOMENDAÇÃO TÉCNICA PARA O STAGE 5 (FASE 5.13)

Com base nas evidências empíricas coletadas na auditoria, o motor Vanguard está apto para avançar ao Stage 5. A prioridade de otimização deve focar estritamente na eliminação do trabalho residual identificado:

1. **Prioridade 1 (Maior Retorno - ~1,65 s de ganho potencial)**:
   - Implementar cálculo de chave Zobrist nativo e incremental no `BoardState` do Bitboard.
   - Desacoplar a instância `game` do loop interno do minimax e da quiescence, eliminando 780.000 chamadas de `_makeMove`/`_undoMove` por busca.
2. **Prioridade 2 (~50-100 ms de ganho potencial)**:
   - Otimizar `orderMoves` para evitar alocação de `Map` e clonagem de arrays por nó interno.
3. **Preservação Contínua**:
   - Manter `chess.js` disponível como oráculo configurável via flag de teste e rollback de segurança em caso de exceção de busca.

---

## 9. DECLARAÇÃO DE CONCLUSÃO

A Fase 5.12 cumpriu integralmente todas as regras inegociáveis:
- Nenhuma fórmula de avaliação ou heurística de busca foi alterada.
- `chess.js` foi mantido intacto.
- Todos os 6 artefatos obrigatórios foram produzidos com base em dados de execução real.
- Status final concedido: **`PASS — READY_FOR_STAGE_5`**.
