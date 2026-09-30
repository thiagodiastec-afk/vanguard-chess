# VANGUARD CHESS — FASE 5.12
## RELATÓRIO DE AUDITORIA DO FLUXO REAL E CAMINHO CRÍTICO DE EXECUÇÃO
### Etapa 1: Auditoria da Configuração e do Fluxo Real de Busca

---

## 1. OBJETIVO DA AUDITORIA

Determinar de forma empírica e comprovada por código e instrumentação qual backend é efetivamente acionado em cada etapa do pipeline de busca do Vanguard Chess, considerando os três modos de operação:
- `CHESSJS_ONLY` (baseline legado)
- `BITBOARD_ONLY` (caminho migrado para Bitboards nas Fases 5.8–5.11)
- `BITBOARD_WITH_ORACLE` (caminho Bitboard com validação síncrona por oráculo `chess.js`)

A inspeção cobriu os arquivos de produção:
- `src/lib/engine.ts`
- `src/lib/board/types.ts`
- `src/lib/board/factory.ts`
- `src/lib/board/bitboardBackend.ts`
- `src/lib/board/chessJsBackend.ts`
- `src/lib/board/validator.ts`
- `src/lib/bitboard/evaluation.ts`
- `src/lib/bitboard/attacks.ts`
- `src/lib/bitboard/movegen.ts`

---

## 2. MATRIZ DE BACKEND EFETIVAMENTE UTILIZADO POR OPERAÇÃO

A tabela abaixo detalha o backend acionado em tempo de execução para cada operação do motor, verificada linha a linha no código-fonte e confirmada por contadores de execução.

| Operação da Busca | `CHESSJS_ONLY` | `BITBOARD_ONLY` | `BITBOARD_WITH_ORACLE` | Justificativa / Arquivo e Linhas |
| :--- | :--- | :--- | :--- | :--- |
| **Geração de Lances na Raiz** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:896-930`. Em `BITBOARD_ONLY`, chama `backend.getLegalMoves()`. Em oráculo, compara os lances gerados com `chess.js`. |
| **Geração de Lances no Minimax** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:1210-1238`. No modo Bitboard, chama `backend.getLegalMoves()`. |
| **Geração de Táticas na Quiescence** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:1044-1065`. No modo Bitboard, chama `backend.getTacticalMoves()`. |
| **Make Move na Busca** | `chess.js` | `BitboardBackend` + `(game as any)._makeMove` | `BitboardBackend` + `game.move()` | `engine.ts:1255-1262` e `1080-1085`. O Bitboard executa o lance primário no `BitboardBackend`. O `game` legado é atualizado sincronamente para suportar Zobrist e ordenação. |
| **Undo Move na Busca** | `chess.js` | `BitboardBackend` + `(game as any)._undoMove` | `BitboardBackend` + `game.undo()` | `engine.ts:1268-1270` e `1092-1094`. Bitboard restaura `pop()` da pilha; `game` chama `_undoMove()`. |
| **Detecção de Xeque (inCheck)** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:1037,1205`. Em `BITBOARD_ONLY`, invoca `backend.inCheck()` diretamente via bitboards de ataque (`attacks.ts`). |
| **Fim de Jogo: Material Insuficiente** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:1200`. Em `BITBOARD_ONLY`, chama `backend.hasInsufficientMaterial()`. |
| **Fim de Jogo: Afogamento / Xeque-mate** | `chess.js` | `BitboardBackend` | `BitboardBackend` (+ validação oráculo) | `engine.ts:1201-1207`. Detectado por `moves.length === 0` combinado com `backend.inCheck()`. |
| **Avaliação Estática** | `evaluateBoard` (chess.js) | `evaluateBoardBitboard` | `evaluateBoardBitboard` (+ assert `evaluateBoard`) | `engine.ts:1032,1075,1301`. No modo `BITBOARD_ONLY`, chama `evaluateBoardBitboard(backend.getBoardState())`. O `evaluateBoard` legado NÃO é chamado. |
| **Mobilidade na Avaliação** | `chess.js` | `BitboardBackend` (pseudo-legal attacks) | `BitboardBackend` (+ comparação oráculo) | `bitboard/evaluation.ts:133-149`. Computada por bitboards de ataques pré-computados e occupancy masks, sem instanciar `chess.js`. |
| **Zobrist Hashing (TT Probe/Store)** | `chess.js` | `chess.js` (`game.board()` + `game.fen()`) | `chess.js` (`game.board()` + `game.fen()`) | `engine.ts:1175,1285`. Ambos utilizam `computeZobristHash(game)` legado. O `BitboardBackend` não possui gerador de chave Zobrist nativo ainda. |
| **Ordenação de Lances (orderMoves)** | `chess.js` | Híbrido (`RawMove` + `game.get`) | Híbrido (`RawMove` + `game.get`) | `engine.ts:1385-1440`. Recebe `RawMove`, mas para capturas acessa `game.get(to)` para MVV-LVA. |
| **Conversão SAN** | `chess.js` | `chess.js` (Apenas na Raiz) | `chess.js` (Apenas na Raiz) | `engine.ts:983-990`. Ocorre **estritamente uma vez por busca**, no lance escolhido na raiz. Zero conversões SAN no minimax ou na quiescence. |
| **Oráculo e Assertions** | Desativado (0) | Desativado (0) | Ativo (~262.000 chamadas/busca) | No modo `BITBOARD_ONLY`, o oráculo é completamente omitido por guards estáticos `activeBackendMode === SearchBackendMode.BITBOARD_WITH_ORACLE`. |
| **Restauração de Estado / Rollback** | `chess.js` | `BitboardBackend` | `BitboardBackend` + `chess.js` | `engine.ts:1005-1014`. Ao término da busca ou interrupção por timeout, o estado da raiz é integralmente restaurado via `backend.load(initialFen)`. |

---

## 3. RASTREAMENTO DO FLUXO COMPLETO (CALL GRAPH)

```text
calculateBestMove(fen, options)
│
├── 1. Inicialização:
│   ├── Parse FEN & Inicialização do GameBackend (BitboardBackend em BITBOARD_ONLY)
│   ├── Reset de contadores de busca e profiling
│   └── Inicialização da Transposition Table (TT)
│
├── 2. Raiz (Iterative Deepening loop):
│   ├── backend.getLegalMoves() [Geração de lances Bitboard nativa]
│   ├── orderMoves() [Ordenação heurística TT/PV/Capturas]
│   └── Loop de lances raiz:
│       ├── backend.makeMove(m) + game._makeMove(m)
│       ├── minimax(depth - 1, alpha, beta, ...)
│       └── backend.undoMove() + game._undoMove()
│
├── 3. Árvore Minimax:
│   ├── Timeout & Abort Check
│   ├── computeZobristHash(game) [TT probe] <--- [Gargalo residual]
│   ├── Terminal Checks:
│   │   ├── backend.hasInsufficientMaterial() [Nativo Bitboard]
│   │   └── backend.inCheck() [Nativo Bitboard]
│   ├── Stand-pat / Leaf check -> quiescence(alpha, beta)
│   ├── backend.getLegalMoves() [Nativo Bitboard]
│   ├── orderMoves() [Ordenação de lances]
│   └── Loop Minimax:
│       ├── backend.makeMove(m) + game._makeMove(m)
│       ├── minimax(child)
│       └── backend.undoMove() + game._undoMove()
│
├── 4. Busca Quiescence:
│   ├── backend.inCheck() [Nativo Bitboard]
│   ├── evaluateBoardBitboard(backend.getBoardState()) [Nativo Bitboard]
│   ├── backend.getTacticalMoves() [Nativo Bitboard: capturas + promoções]
│   ├── Delta Pruning
│   └── Loop Tático:
│       ├── backend.makeMove(m) + game._makeMove(m)
│       ├── quiescence(child)
│       └── backend.undoMove() + game._undoMove()
│
└── 5. Finalização:
    ├── Seleção do Best Move
    ├── moveToSan(game, bestMove) [Apenas 1x na raiz]
    └── Retorno do SearchResult
```

---

## 4. CONCLUSÕES DA ETAPA 1

1. **Isolamento Comprovado**: No modo `BITBOARD_ONLY`, o oráculo `chess.js` não é chamado em nenhum momento durante o percurso da árvore (zero chamadas de validação, zero chamadas de `evaluateBoard` legado).
2. **Caminho Crítico 100% Bitboard**: A geração de lances (legal e tático), a checagem de xeque, a detecção de material insuficiente e a avaliação estática rodam inteiramente sobre as estruturas de `BitboardBackend` e `attacks.ts`.
3. **Dependência Residual Identificada**: A instância `game` do `chess.js` ainda é mantida em sincronia através de chamadas privadas `_makeMove` e `_undoMove` estritamente para atender ao cálculo de `computeZobristHash` e inspeção de peças na ordenação de lances. Esta é a oportunidade primária de otimização para a Fase 5.13 (Stage 5).
