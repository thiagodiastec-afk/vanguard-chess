# Relatório de Diagnóstico de Divergência de Mobilidade — Fase 5.7B

**Status**: `STATUS: DIAGNOSED`\
**Decisão**: `DECISION: STOP`\
**Data**: 28 de Setembro de 2026\
**Arquivo Analisado**: `test_phase57b_mobility_divergence.ts` / `src/lib/engine.ts`\
**Escopo**: Diagnóstico rigoroso da divergência 499/500 encontrada na suíte de equivalência aleatória da Fase 5.7B (sem modificação em `src/lib/engine.ts`).

---

## A. Posição Divergente

- **FEN**: `rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2`
- **randomIndex**: 477 (também presente no caso controlado #26 "En Passant Available")
- **Seed / Origem**: Posição legal clássica da Defesa Siciliana após os lances `1. e4 c5`.
- **Lado com Divergência**: Pretas (`sideTested: 'b'`).

---

## B. Contagem da Referência

Execução de `referenceLegalMobility(game, 'b')`:

```text
REFERENCE:
  pawns: 17
  knights: 4
  bishops: 0
  rooks: 0
  queens: 3
  king: 0
  totalNonKing: 24
  total: 24
```

---

## C. Contagem da Otimizada

Execução de `countMobility(game, 'b')` / `optimizedLegalMobility(game, 'b')`:

```text
OPTIMIZED:
  pawns: 17
  knights: 4
  bishops: 0
  rooks: 0
  queens: 1
  king: 0
  totalNonKing: 22
  total: 22
  countMobility: 22
```

### Delta (Otimizada − Referência):

```text
DELTA:
  pawns: 0
  knights: 0
  bishops: 0
  rooks: 0
  queens: -2
  king: 0
  totalNonKing: -2
  total: -2
```

---

## D. Movimento Divergente

A divergência decorre da interação entre **movimentos ilegais de en passant** gerados pelo `chess.js` e a consequente obstrução da Dama:

1. **Movimentos ilegais gerados pelo chess.js ao forçar `_turn = 'b'` com `_epSquare = 'c6'`**:
   - `b7-c6 (ep)` (flags: `BITS.EP_CAPTURE` / 8)
   - `d7-c6 (ep)` (flags: `BITS.EP_CAPTURE` / 8)
   *Ambos são movimentos ilegais para as Pretas, pois `c6` foi criada pelo avanço `c7-c5` das próprias pretas no lance anterior.*

2. **Movimentos da Dama perdidos na Otimizada**:
   - `d8-b6` (casa 3 $\to$ casa 33)
   - `d8-a5` (casa 3 $\to$ casa 48)

---

## E. Peça / Origem

- **Peças Causadoras**: Peões pretos em **b7** e **d7** tentando capturar en passant na casa **c6**.
- **Peça Afetada**: Dama preta em **d8** (`Qd8`), que teve sua diagonal obstruída na casa **c7**.

---

## F. Causa Raiz

**Categoria**: `EN_PASSANT` (combinada com `BOARD_STATE` e `SIDE_TO_MOVE`).

### Mecanismo Físico da Falha no Tabuleiro em Memória:

1. **Invariante Violado do Estado de Xadrez**:
   - No FEN `... w KQkq c6 0 2`, o turno é das Brancas (`w`). O alvo de en passant `c6` existe **exclusivamente para as Brancas**.
   - Ao avaliar a mobilidade das Pretas (`color = 'b'`), o motor/oráculo faz:
     ```ts
     g._turn = 'b';
     ```
     mantendo `g._epSquare = 34` (`c6`).
   - Carregar um FEN com turno `'b'` e en passant `'c6'` é expressamente rejeitado pelo `chess.js` com a exceção:
     `Error: Invalid FEN: illegal en-passant square`. Trata-se de um **estado de tabuleiro matematicamente e legalmente impossível**.

2. **Geração Fantasma no chess.js**:
   - Estando o turno em `'b'` e `_epSquare` em `c6`, o `chess.js` checa se os peões pretos em b7 e d7 podem avançar em diagonal para `_epSquare`. Como para as Pretas o avanço diagonal de b7 e d7 atinge `c6`, o `chess.js` adiciona `b7xc6 (ep)` e `d7xc6 (ep)`.
   - O oráculo `referenceLegalMobility` conta ambos os movimentos, totalizando 17 lances de peão (ao invés dos 15 reais).

3. **Corrupção do Tabuleiro 0x88 no `_undoMove`**:
   - Durante a filtragem de legalidade, o `chess.js` executa `this._makeMove(move)` e em seguida `this._undoMove()`.
   - No `_undoMove()` do `chess.js`:
     ```ts
     if (move.flags & BITS.EP_CAPTURE) {
       let index: number;
       if (us === BLACK) {
         index = move.to - 16; // c6 - 16 = c7 (casa 18 no 0x88)
       } else {
         index = move.to + 16;
       }
       this._set(index, { type: PAWN, color: them });
     }
     ```
   - Ao desfazer a suposta captura en passant das Pretas em `c6`, o algoritmo do `chess.js` presume que havia um peão adversário (Branco) na casa imediatamente anterior (`c7`).
   - **Ele insere um peão branco fantasma na casa `c7`** (`_board[18] = { type: 'p', color: 'w' }`)!

4. **Consequência na Dama em d8**:
   - Na implementação otimizada `countMobility`, os lances de peão são testados primeiro. Ao testar o lance fantasma `b7xc6(ep)`, o `_undoMove` deposita o peão branco fantasma em `c7`.
   - Quando o loop atinge a Dama em d8, a casa `c7` está ocupada pelo peão fantasma. A Dama só consegue gerar o lance de captura `d8xc7` (1 lance), ficando impossibilitada de deslizar livremente pela diagonal até `b6` e `a5`.
   - Por essa razão, a Dama tem sua mobilidade reduzida de 3 para 1.

---

## G. Impacto no Search

Execução do search na posição com divergência:

```text
calculateBestMove("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"):
  bestMove: Nc3
  completedDepth: 3
  nodes: 1175
  qNodes: 1346
```

- **Impacto no lance raiz**: Nenhum (`bestMove = Nc3`).
- **Análise**: Na posição original, o turno é das Brancas. A mobilidade das Brancas é perfeitamente idêntica entre referência e otimizada (30 movimentos).
- A divergência só se manifesta ao inspecionar a mobilidade do lado adversário que **não tem o direito ao en passant** criado pelo seu próprio avanço duplo de peão.

---

## H. Classificação

**Classificação Oficial**: `STATE_BUG` (com componente de `REFERENCE_BUG` no oráculo).

### Justificativa:
1. `chess.js` não suporta troca de turno sem saneamento de `_epSquare`.
2. O estado `_turn = 'b'` com `_epSquare = c6` é inválido segundo as Leis do Xadrez da FIDE e o validador de FEN do próprio `chess.js`.
3. A contagem da referência (24 movimentos para as Pretas) continha **dois movimentos manifestamente ilegais**: capturas en passant no próprio peão. A contagem legal correta e real das Pretas nessa posição é **22 movimentos**.

---

## Critério de Parada e Status

```text
STATUS: DIAGNOSED
DECISION: STOP
```

- A divergência foi isolada com precisão absoluta até a peça, casa, lance e linha de código do `chess.js`.
- Conforme a regra estrita do protocolo:
  - **Nenhuma alteração foi realizada em `src/lib/engine.ts`**.
  - A correção **não** foi aplicada nesta etapa.
  - A Fase 5.7C **não** foi iniciada.
