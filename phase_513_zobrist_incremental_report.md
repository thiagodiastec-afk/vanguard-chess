# Fase 5.13 — Zobrist incremental

## Resultado

O hash incremental está validado para os casos cobertos. `BitboardBackend.makeMove()` atualiza o hash por XOR e `undoMove()` restaura o hash anterior. O caminho `BITBOARD_ONLY` não usa o cálculo Zobrist de `chess.js` nem seus métodos de movimento durante a busca.

## Validação

- `npx tsx test_phase513_zobrist_incremental.ts`: PASS; 5.548 transições, zero falhas. Inclui capturas, en passant, promoções, roque, direitos de roque, transposições e rollback de sequências.
- Verificação de busca: `BITBOARD_ONLY` retornou uma jogada; chamadas a `_makeMove`/`_undoMove` durante a busca: 0/0. `computeZobristHash(game)` inicia lendo `game.board()`; a instrumentação registrou zero chamadas a `board()` durante a busca. A única leitura de `fen()` observada foi a inicialização do backend.
- Verificação repetível agora em `npm run test:phase513:residual`: `computeZobristHash(game)`, `_makeMove` e `_undoMove` registraram 0 chamadas durante a busca BITBOARD_ONLY. Depois da busca, `_moveToSan` usa um par `_makeMove`/`_undoMove` de chess.js para formatar a notação SAN; esse trabalho de apresentação ocorre fora da busca. Lance devolvido no ensaio: `Nxd5`; FEN original preservado.
- Busca limitada a 1 ms: retornou uma jogada válida, preservou o FEN e terminou em 7 ms no ambiente medido.
- `npm run lint`: PASS (`tsc --noEmit`).
- `npm run build`: PASS. O Vite ainda avisa que um chunk ultrapassa 500 kB.
- `npm test`: PASS nas 68 posições, todas com lance legal; limite de busca de 250 ms por posição; mediana medida de 250,3 ms e máximo de 256,5 ms.
- `npm run test:full`: PASS; reúne a validação limitada, Fase 5.13, equivalência dos backends, make/undo e equivalência de avaliação; concluiu dentro de 60 s.
- Regressão de integração: Fase 5.9 backend equivalence PASS (52 verificações, zero falhas); Fase 5.10 make/undo PASS (17 verificações, zero falhas); Fase 5.11 avaliação PASS (5.173 posições, zero divergências).

## Benchmark reproduzível

Execute `npx tsx run_phase513_benchmark.ts`. O script valida a paridade antes de medir e grava `phase_513_zobrist_benchmark.json`.

Na execução registrada: 68 posições, 1.609 estados e 1.609 verificações de paridade aprovadas. Em sete amostras com 12 passagens por método, a mediana foi 38,78 ms para recalcular todos os hashes e 0,27 ms para ler os hashes armazenados (142,5× neste microbenchmark). Os checksums coincidiram. Essa medição isola o custo do hash; não representa aceleração global da busca.

## Correções adicionais encontradas na revisão

- O timeout não chegava à quiescência; agora a busca verifica o prazo nos nós e durante a geração e exploração dos lances táticos.
- Chamadas de busca sem prazo explícito agora usam limite padrão de 3.000 ms, correspondente ao limite do benchmark oficial da fase 5.9.
- A checagem TypeScript encontrou uma referência inválida na ordenação legada e um import de tipo no módulo errado; ambos foram corrigidos.

## Separação entre teste e benchmark

O teste normal e a regressão completa têm limites de tempo por busca e terminam em menos de 60 s. A validação histórica mais extensa foi preservada em `run_full_validation.ts` e pode ser executada com `npm run benchmark:legacy`; ela gera análises de profundidade e desempenho que podem levar mais tempo e não faz parte do caminho normal de aprovação.
