# VANGUARD CHESS — FASE 5.10
## STAGE 2A — AUDITORIA DO CAMINHO REAL DE EXECUÇÃO (SEARCH PATH AUDIT)

**Data da Auditoria:** 29 de Setembro de 2026\
**Status do Motor:** Vanguard Engine (Minimax + Alpha-Beta + Quiescence + Transposition Table + Iterative Deepening)\
**Objetivo:** Mapear rigorosamente todas as chamadas de regras, tabuleiro, geração de movimentos, make/undo e avaliação no search path de produção para identificar dependências ativas de `chess.js` versus `Bitboard`.

---

### 1. Mapa de Operações no Caminho de Execução

| Operação | Localização (Arquivo & Linhas) | Backend Atual | Backend Pretendido (Stage 2) | Pode Migrar nesta Fase? | Justificativa / Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Geração de Lances na Raiz** | `src/lib/engine.ts:1270-1272` (`calculateBestMove`) | **Bitboard** (via `createBoardBackend`) ou `chess.js` | Bitboard | **SIM (Já migrado no Stage 1)** | Suportado pela flag de backend. |
| **Geração de Lances no Minimax** | `src/lib/engine.ts:1053-1054` (`minimax`) | **chess.js** (`(game as any)._moves({ legal: true })`) | Bitboard (`backend.generateLegalMoves()`) | **SIM** | Equivalência legal 100% comprovada na Fase 5.9 (5.000 FENs). |
| **Geração Tática na Quiescence** | `src/lib/engine.ts:923-937` (`quiescence`) | **chess.js** (`(game as any)._moves()`) + make/undo/inCheck para checar xeques | Bitboard (`backend.generateLegalMoves()` filtrado ou pseudo-legal tático) | **SIM** | 100% equivalente para capturas, promoções e xeques. |
| **Make/Undo no Minimax** | `src/lib/engine.ts:1062, 1067` e `1105, 1110` | **chess.js** (`(game as any)._makeMove()` / `_undoMove()`) | Bitboard (`backend.makeMove()` / `undoMove()`) | **SIM** | Make/undo idempotente com 100% de paridade FEN (Fase 5.9). |
| **Make/Undo na Quiescence** | `src/lib/engine.ts:955, 960` e `978, 983` | **chess.js** (`(game as any)._makeMove()` / `_undoMove()`) | Bitboard (`backend.makeMove()` / `undoMove()`) | **SIM** | Make/undo idempotente com 100% de paridade FEN. |
| **Detecção de Xeque (`inCheck`)** | `src/lib/engine.ts:931, 1042` | **chess.js** (`game.inCheck()`, `game.isCheckmate()`) | Bitboard (`backend.isInCheck()`) | **SIM** | Detecção de xeque 100% equivalente (Fase 5.8 e 5.9). |
| **Detecção de Fim de Jogo (`isGameOver`)** | `src/lib/engine.ts:889, 1040` | **chess.js** (`game.isGameOver()`, `game.isCheckmate()`) | Híbrido / Bitboard | **CONDICIONAL** | Regra de 50 lances e mate são idênticos; 3-fold repetition exige hash history. Se necessário, manter verificação terminal rápida. |
| **Hash Zobrist (`computeZobristHash`)** | `src/lib/engine.ts:1019`, `src/lib/zobrist.ts:114-154` | **chess.js** (`game.board()`, `game.fen()`) | Mantido / Suportado por `board.board()` | **NÃO ALTERAR LÓGICA** | Não reescrever tabela de Zobrist nesta fase. |
| **Ordenação de Lances (`orderMoves`)** | `src/lib/engine.ts:1168-1258` | Compatível (`InternalMove` / `EngineMove`) | Mantido | **NÃO ALTERAR LÓGICA** | Usa chaves de casas 0x88 e flags (`BITS`). Já alinhado no Stage 1. |
| **Avaliação Estática (`evaluateBoard`)** | `src/lib/engine.ts:713-861` | **chess.js** (`game.board()`, matriz 8x8) | Mantido atual | **NÃO (Regra Absoluta 1.1)** | Não reescrever avaliação estática; manter pontuação cp matematicamente idêntica. |
| **Mobilidade Legal na Avaliação** | `src/lib/engine.ts:308-320` (`countMobility`) | **chess.js** (`_moves({ legal: false })` + `_makeMove` + `_isKingAttacked`) | Manter ou usar `BitboardBackend` | **SIM (sob validação estrita)** | Apenas se a pontuação resultante for identicamente preservada. |
| **Formatação SAN na Raiz** | `src/lib/engine.ts:1373` (`calculateBestMove`) | **chess.js** (`_moveToSan`) | chess.js | **NÃO** | Executado exatamente 1 vez por busca na raiz; custo desprezível (<0,1%). |

---

### 2. Evidências Encontradas no Código Atual

1. **Raiz do Search (`calculateBestMove`)**:
   - `engine.ts:1270-1272`: O gerador raiz já possui a bifurcação pelo `boardConfig.backendType`. Quando configurado para `'bitboard'`, `createBoardBackend(game.fen(), 'bitboard').generateLegalMoves()` é chamado.
2. **Árvore Recursiva Minimax (`minimax`)**:
   - `engine.ts:1054`: Continua invocando diretamente `(game as any)._moves({ legal: true })`.
   - `engine.ts:1062, 1067, 1105, 1110`: Continua executando `(game as any)._makeMove(moves[i])` e `(game as any)._undoMove()`.
   - Portanto, **73,4% do gargalo da busca** identificado na Fase 5.6 e 5.7C ainda está ativo dentro da recursão minimax!
3. **Quiescence Search (`quiescence`)**:
   - `engine.ts:924`: Continua invocando `(game as any)._moves({ legal: true })`.
   - `engine.ts:930-932`: Executa make/undo e `game.inCheck()` no `chess.js` para filtrar lances que dão xeque.
   - `engine.ts:955, 960, 978, 983`: Executa make/undo no `chess.js`.
4. **Isolamento de Backend**:
   - O objeto `game: Chess` ainda é passado diretamente na assinatura de `minimax` e `quiescence`, acoplando a busca ao objeto global do `chess.js`.

---

### 3. Conclusão da Auditoria do Stage 2A

O backend Bitboard está 100% pronto e validado, porém no Stage 1 ele foi conectado apenas na raiz de `calculateBestMove()`. Para que o ganho de throughput medido na Fase 5.8 (6,4x na geração pseudo-legal e 1,4x na geração legal pura) se traduza em velocidade real na busca, a árvore interna `minimax` e `quiescence` precisa operar sobre a instância de `BoardBackend`.
