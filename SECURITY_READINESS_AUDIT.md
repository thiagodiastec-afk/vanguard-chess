# Vanguard Chess — auditoria de prontidão

**Status: ainda não liberar como produção.** Compilação e motor estão estáveis. Partidas, atualizações futuras de rating e dados privados de perfil agora são protegidos no servidor/regras. Ratings sem prova de origem são rebaselined uma vez para 1200 durante a migração e arquivados privadamente. A migração real, configuração dos provedores e validação ponta a ponta continuam pendentes.

## Corrigido nesta etapa

- Rotas de IA, chat, compras e pagamentos agora exigem um token Firebase verificado no servidor; os limites de entrada e de chamadas por usuário foram reduzidos.
- O servidor escolhe o produto e o preço do checkout. O webhook do Mercado Pago valida assinatura HMAC, consulta o pagamento diretamente e registra a entrega de forma idempotente.
- Removido o botão que simulava um pagamento aprovado. Recompensas de anúncio e recompensas de partida estão temporariamente desligadas até haver validação real no servidor.
- As regras do Firestore impedem alteração direta de saldo e de direitos Premium; também restringem a fila, convites e criação/entrada nos torneios.
- Configuração de ambiente duplicada corrigida; o servidor respeita `PORT` e `FIRESTORE_DATABASE_ID`.
- O servidor agora exige `FIRESTORE_DATABASE_ID` explícito ao iniciar e falha fechado sem selecionar silenciosamente um banco padrão; o README descreve o requisito.
- Dependências de produção e desenvolvimento verificadas: `npm audit` reportou zero vulnerabilidades depois da correção. O Firebase CLI fica fora das dependências do produto; é obtido sob demanda apenas para o teste de regras.
- O checkout abre uma aba sincronamente durante o clique para evitar bloqueio de pop-up pelo navegador, valida que a URL recebida usa HTTPS e oferece navegação na mesma aba se o pop-up for bloqueado.
- Partidas online agora são criadas, aceitas e alteradas por rotas autenticadas do servidor. Lances e encerramentos usam transações; o servidor valida legalidade, turno, relógio, empate, desistência e abandono.
- Elo e estatísticas de partidas online são atualizados pelo servidor na mesma transação que encerra a partida. O cliente não pode editar `elo`, `gamesPlayed`, `stats` ou `eloHistory`; partidas contra o computador não afetam o Elo competitivo.
- As regras Firestore negam criação/alteração/exclusão de `/games` por clientes e impedem que um jogador inscreva outra conta em torneio.
- Leitura de `/games` agora fica restrita aos participantes; terceiros só podem ler partidas `playing` em que ambos os jogadores habilitaram espectadores. Convites pendentes e partidas com espectador desativado permanecem privados.
- A leitura de `/queue` agora exige autenticação para impedir enumeração anônima de quem está procurando partida; usuários autenticados continuam podendo encontrar adversários.
- O calendário de torneios não pode mais ser criado pelo navegador: criação/edição de eventos fica restrita ao Admin SDK. O cliente só lista eventos com `managedByServer: true`; inscrições em eventos antigos/não confiáveis são ocultadas e bloqueadas. A inscrição só é aceita uma vez por usuário, em evento agendado, e o Elo é conferido no perfil público protegido.
- Convites diretos agora são criados pela rota autenticada `/api/challenge/create`, com limite de frequência e nome/Elo derivados do perfil canônico. As regras negam criação direta de convites pelo navegador, removendo a possibilidade de falsificar a identidade mostrada ao destinatário.
- Mensagens do chat de partida agora passam por `/api/game/chat/send`, que exige participação na partida, limita texto/frequência e usa o nome do perfil. O cliente não pode mais gravar mensagens diretamente.
- Dados de carteira, inventário de cosméticos, assinatura e histórico de pagamentos foram separados em `/userPrivate/{uid}`. O cliente só pode ler os próprios dados; apenas a criação do pacote inicial exato é permitida no cliente. Regras e consultas públicas exigem o marcador de perfil versão 2.
- `/api/profile/bootstrap` migra perfis legados individualmente de forma transacional e idempotente. `npm run migrate:private-users` oferece migração paginada, simulação por padrão e execução efetiva apenas com `--apply`. Quando não há marcador privado de rating confiável, Elo/estatísticas/histórico públicos são reiniciados para a base competitiva; o registro anterior (até 100 pontos do histórico) é preservado em `/userPrivate/{uid}`.
- Integração cliente do Firebase App Check ativa no código com reCAPTCHA Enterprise, inicializada antes de Firestore/Auth. O app web `ai-studio-applet-webapp` foi registrado no Firebase App Check com o provedor Fraud Defense e a chave pública de site criada para `vanguardchess.com.br` (inclui `www.vanguardchess.com.br`). A imposição continua desativada até publicar o cliente e observar as métricas.

## Evidência de validação

- Reinstalação limpa: `npm ci` concluiu; auditoria automática de 529 pacotes encontrou zero vulnerabilidades. O npm avisou que uma dependência transitiva `glob@10.5.0` está depreciada, sem vulnerabilidade reportada.
- `npm run lint`: passou.
- `npm run build`: passou; maior chunk atual: 399,41 kB, sem alerta de bundle acima de 500 kB.
- Revalidação limpa nesta auditoria: `npm run lint` e `npm run build` passaram após `npm ci`.
- Após tornar o ID do banco obrigatório: `npm run lint` e `npm run build` passaram de novo; o servidor sem `FIRESTORE_DATABASE_ID` encerrou com a mensagem esperada antes de abrir uma porta.
- `npm run test:full`: passou após instalação limpa — suíte geral 143/143; Zobrist incremental 5.548 transições/zero falhas; resíduos BITBOARD_ONLY `computeZobristHash=0`, `_makeMove=0`, `_undoMove=0`; equivalência de backends 52/52; make/undo 17/17; avaliação 5.173/5.173.
- `npm run test:smoke`: 68/68 posições aprovadas; mediana/máximo de busca 250,3/264,2 ms para orçamento nominal de 250 ms.
- `npm audit --audit-level=low`: zero vulnerabilidades reportadas.
- `git diff --check`: passou depois de remover espaços no fim das linhas alteradas; permanecem avisos do Git sobre conversão LF/CRLF.
- Preparação para envio em 30/09/2026: `npm run lint`, `npm run build`, `npm run test:full`, `npm run test:smoke` (68/68), `npm run test:server` (13 rotas protegidas + webhook/recompensas), `npm run test:rules` (53 verificações + migração no emulador) e `npm audit --audit-level=low` passaram; o teste de regras precisou de uma repetição após atingir o limite local de 60 s na primeira inicialização fria do emulador. Uma primeira tentativa de `test:server` também retornou `ECONNREFUSED` durante a espera pelo servidor, e a repetição passou. Não houve falha reproduzida nos retries.
- App Check registrado no Firebase para `ai-studio-applet-webapp` com o provedor Fraud Defense (reCAPTCHA Enterprise). A chave de site pública está configurada em `firebase-applet-config.json`; `VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY` pode sobrescrevê-la no build. Registro foi confirmado no Console do Firebase; a imposição permanece desativada até publicar este cliente e observar métricas.
- Verificação local após o registro: `npm run lint` passou (`tsc --noEmit`, exit 0) e `npm run build` passou (Vite e bundle do servidor, exit 0). No Console do Firebase, Cloud Firestore e Authentication continuam com imposição “Não aplicado”.
- Repositório remoto: `gh run list --repo thiagodiastec-afk/vanguard-chess` retornou zero execuções; portanto o workflow local ainda não tem evidência de CI remoto. `origin/main` permanece no commit `85980fc6c184d41dcbe98c34d725182510c2e44e`; as mudanças locais não foram publicadas.
- Emulador local do Firestore: 53 verificações de regras passaram, incluindo isolamento de `/userPrivate`, bloqueio de alteração de saldo/Premium/Elo por cliente, leitura privada/pública correta de partidas e fila, convites, mensagens diretas de chat e tentativas de forjar, adulterar ou duplicar inscrição em torneios. As consultas de lobby para partidas públicas e a fila autenticada foram aprovadas.
- `npm run test:server`: passou contra o build de produção — página inicial 200, 13 rotas protegidas 401, webhook sem assinatura 401, recompensas de partida/anúncio 503.
- Migração no emulador: simulação sem escrita, migração efetiva repetida duas vezes e validação de preservação de saldo, inventário, assinatura e histórico de pagamento passaram. O teste também confirmou o reset do Elo legado, arquivo privado de rating antigo e preservação de um novo rating após reexecutar a migração.
- Smoke test HTTP local: checkout sem token recebeu 401; recompensa de anúncio e distribuição antiga de resultado receberam 503.
- Smoke test HTTP local repetido após as alterações de segurança: bootstrap, criação de preferência, compra cosmética, convite e chat da partida sem token, além de webhook sem assinatura, responderam 401.
- Validação após migração online: `npm run lint`, `npm run build`, `npm run test:full`, `npm run test:phase513`, `npm run test:rules` e `npm audit --audit-level=low` passaram; o teste incremental passou com 5.548 transições e zero falhas.
- `npm run test:phase513:residual`: PASS. Contadores durante a busca BITBOARD_ONLY: Zobrist 0, `_makeMove` 0, `_undoMove` 0. O formato SAN faz um par make/undo de chess.js depois da busca, fora do caminho auditado.

## Investigação do travamento histórico

- A suíte atual da Fase 5.13 tem limites fixos (100 partidas × 55 plies, além de casos finitos) e terminou em aproximadamente 2–4 segundos nas execuções observadas; não foi reproduzido loop infinito.
- Na checagem atual ainda existem processos Node e Java iniciados em 27/09; o Java é filho do Antigravity IDE e parte dos Node descende de `cmd.exe` ou do servidor de linguagem. O Windows continua sem expor as linhas de comando dos processos antigos, então não foi possível vincular os Node ao comando da Fase 5.13. Nenhuma porta do app/emulador (3000, 4173, 8080, 9150, 9099 ou 5000) está escutando; os processos foram preservados porque não há prova suficiente para identificá-los como testes/build travados. Os Node visíveis iniciados em 29/09 pertencem ao runtime CUA do Codex.
- Como o processo original não tinha comando ou log acessível, não há evidência suficiente para afirmar qual comando histórico ficou bloqueado ou por quê. O teste reexecutável e o build atuais concluem.

## Bloqueadores antes de declarar pronto

1. **Migração operacional de perfis e rating.** Rode `npm run migrate:private-users` contra o banco correto em modo simulação; revise a contagem e erros. A execução `npm run migrate:private-users -- --apply` rebaselines Elo/estatísticas/histórico não verificados para a base de 1200 e arquiva os dados antigos privadamente. Informe essa mudança competitiva aos usuários antes de aplicá-la. Faça a migração com credenciais Admin no ambiente protegido. As regras filtram documentos legados sem versão 2 até a migração; o bootstrap por login é uma rede de segurança, não substitui a migração prévia.
2. **Integrações reais não foram exercitadas.** Não há `.env` local nem credenciais de serviço; o Firebase CLI também não conseguiu enumerar projetos acessíveis neste ambiente. É preciso configurar Firebase Admin, Mercado Pago (incluindo o segredo de webhook), `APP_URL` HTTPS e Gemini no cofre de segredos de produção e concluir uma compra de teste ponta a ponta. Nenhum segredo deve ir para o navegador ou para o repositório.
3. **Recompensas temporariamente indisponíveis.** Moedas por partidas e anúncios continuam desligadas. Reative apenas depois de integrar e validar o callback de uma rede de anúncios e uma política antifraude.
4. **Fluxos do produto.** Ainda falta teste E2E em navegador com duas contas para login, partida online e reconexão, perfil, compra, notificações e dispositivos móveis. A migração de partida precisa ser exercitada contra Firebase de teste com credenciais.
5. **Torneios.** O cliente não cria mais torneios automaticamente; documentos oficiais devem ser provisionados via Admin SDK. O fluxo atual é apenas calendário/inscrição; execução das partidas e distribuição de qualquer prêmio não estão implementadas, então não anuncie premiação real até completar e validar esse fluxo.
6. **Higiene e destino da release.** O inventário contém muitos artefatos de auditoria e alterações em andamento; nenhum arquivo foi descartado. O workflow CI foi adicionado, mas precisa da primeira execução remota no GitHub. Prepare uma lista explícita dos arquivos que entram no release; o repositório ainda não define uma plataforma de hospedagem. O `README.md` documenta build, testes, segredos e migração sem escolher um provedor.

## Configuração necessária no ambiente de produção

Preencher os segredos e configurações descritos em `.env.example` no gerenciador de segredos do ambiente, usar credenciais de teste do Mercado Pago primeiro e confirmar que o serviço está associado ao banco Firestore identificado por `FIRESTORE_DATABASE_ID`. A aplicação falha fechada quando autenticação ou pagamentos não estão configurados.

As regras agora têm `firebase.json` e teste repetível via `npm run test:rules`. Regras e índices se aplicam ao banco Firestore nomeado em `firebase.json`; confirme que corresponde ao projeto de destino e conclua a migração de perfis antes de publicar as regras. O script exige `FIREBASE_SERVICE_ACCOUNT` e `FIRESTORE_DATABASE_ID`, usa simulação sem `--apply` e não deve ser executado contra produção sem revisar a contagem da simulação.
