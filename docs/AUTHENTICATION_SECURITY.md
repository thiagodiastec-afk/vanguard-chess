# Segurança da autenticação

Revisão de 05/11/2026, base `fc5cc015e483c9d6f1dd0cb828378ca00f95262f`.
Este documento distingue código testado de configuração operacional não verificada.

## Fluxo e política

`AuthModal` usa o SDK Firebase para e-mail/senha, Google, Apple, telefone e conta anônima. `initFirebase` configura persistência de sessão e inicializa App Check antes de Auth/Firestore. O SDK gerencia ID/refresh tokens; o produto não mantém um armazenamento próprio de senhas. Anônimos também possuem UID autenticado: não equivalem a e-mail verificado nem a conta administrativa.

`authenticatedApiFetch` aceita apenas `/api/` na origem atual. A validação ocorre antes de obter credenciais; URLs com usuário/senha e redirecionamentos são rejeitados. O token é anexado em Authorization. A identidade da sessão é conferida após as esperas, inclusive quando um novo login usa o mesmo UID. Um HTTP 401 pode provocar um único refresh/reenvio; `AUTH_REAUTHENTICATION_REQUIRED` exige novo login e não causa reenvio. O corpo de uma Request é preservado no retry.

Todas as rotas ativas que usam `authenticatedUid` passam por `verifyIdToken(token, true)`. O Admin SDK verifica assinatura/projeto/validade e consulta o estado do usuário para rejeitar revogação e desativação. Não há cache próprio desse resultado. Isso acrescenta latência/uso do serviço Auth por requisição; monitore capacidade, erros e p95 antes de ampliar tráfego. Falhas desconhecidas/configuração indisponível retornam 503, nunca concedem acesso. Tokens expirados, inválidos e sessões revogadas retornam códigos estáveis sem mensagem bruta do SDK. Logs do modal de autenticação também deixam de imprimir exceções completas.

A autorização de negócio continua usando o UID verificado; não se confia em UID fornecido pelo cliente. O webhook Mercado Pago usa sua assinatura própria e não recebe ID token Firebase. Recompensas legadas permanecem desativadas.

**Limite:** leituras/escritas diretas do SDK web passam pelas regras Firestore, sem executar o verificador da API. Esta alteração não implementa revogação imediata nessas regras: tokens já emitidos podem permanecer aceitos até expirar. Para revogação imediata nesse caminho, é necessário projetar metadados de revogação privados, atualizados por processo confiável, e regras/testes correspondentes. Não foi introduzida uma dependência de metadados ausentes que bloquearia todos os usuários. O emulador de regras não comprova revogação real de tokens assinados pelo Firebase.

## App Check: observação, sem enforcement

O cliente envia `X-Firebase-AppCheck` quando o SDK consegue fornecer um token. A busca tem prazo de 250 ms; erros/prazo excedido não bloqueiam uma requisição Auth válida. O SDK pode concluir a obtenção depois, permitindo uso do cache na próxima chamada.

`FIREBASE_APPCHECK_MONITOR=true` habilita observação na fronteira autenticada da API; o padrão é desligado. Após validar Auth, o servidor verifica a assinatura do token App Check e a correspondência do appId ao app web configurado. O prazo também é 250 ms. Logs contêm somente `outcome: valid|missing|invalid`, sem token, UID, email ou exceção. `invalid` inclui falha do provedor/prazo excedido: não é prova de abuso. Há latência limitada adicional durante observação; um prazo curto pode subcontar tokens válidos durante uma busca fria de chaves.

Não existe opção de enforcement da API neste PR. Observação não impede clientes modificados de chamar a API. App Check complementa Auth/autorização/limites, não os substitui. A configuração de Firestore/Authentication no console é independente da API Express.

### Procedimento operacional pendente

1. Acessar o projeto correto no Firebase e confirmar appId, banco nomeado e domínios legítimos. A auditoria de 12/10 registrou app não registrado; esse estado não foi reconfirmado em 05/11.
2. Conferir a chave reCAPTCHA Enterprise score-based e seus domínios; registrar o app com a mesma chave. Não gerar/substituir credenciais sem planejamento. A chave pública pode ser sobrescrita por `VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY` no build, portanto alterar apenas uma variável do processo após o build não modifica o cliente.
3. Implantar cliente/servidor em homologação com enforcement desligado; registrar o SHA efetivamente publicado. Ativar apenas observação da API. Confirmar emissão de tokens válidos e appId correto sem copiar tokens para logs.
4. Exercitar login e recuperação de senha, provedores habilitados, anônimo, dois usuários, reconexão e dispositivos suportados; validar Firestore e chamadas Express. Revogar sessões/desativar somente uma conta de teste e comprovar 401 na API com token antigo; novo login válido deve recuperar acesso. Não desativar contas reais.
5. Observar métricas Firebase de tráfego verificado/não verificado e logs da API em período representativo; resolver domínios, versões antigas, bloqueadores de conteúdo e quedas de provedor. O relatório de logs da API não substitui métricas Firestore/Auth.
6. Somente após comprovação de registro e tráfego legítimo, planejar enforcement por produto com rollback e monitoramento. Não ativá-lo apenas porque este PR passou no CI.

Nesta sessão não havia CLI Firebase/Google Cloud autenticada disponível; a tentativa de inspeção visual foi encerrada pela ferramenta porque não identificou com segurança a URL do Chrome. Nenhum registro, enforcement, segredo ou implantação de produção foi alterado. Merge/CI não provam implantação no Render.

## Credenciais e histórico

A configuração Firebase web identifica o projeto e é pública; não equivale à chave privada Admin. Mantenha conta de serviço, tokens Mercado Pago/Gemini e segredo HMAC no cofre do servidor, sem prefixo VITE_. Evite exportar arquivos de credenciais para dentro do checkout; `.env*` é ignorado, mas isso não protege arquivos JSON arbitrários.

Uma varredura limitada em memória de 782 blobs alcançáveis por refs locais, incluindo os heads públicos dos PRs 1/2, encontrou padrão de chave privada em `update_env.mjs` histórico. Nenhuma correspondência desses padrões foi encontrada na árvore rastreada atual. Foram buscados marcadores de chave privada, campos private_key e formatos PAT GitHub; isso não é uma varredura completa nem confirma validade/revogação. Nenhum conteúdo encontrado foi impresso ou incluído neste PR.

Em 05/11/2026, a API autenticada do GitHub confirmou o alerta Secret Scanning #2 como resolved/revoked (resolvido em 12/10). Foram consultados somente tipo/estado/resolução, sem expor o campo secreto. Secret Scanning, Push Protection e Dependabot security updates estão ativos; padrões genéricos e validity checks aparecem desativados. A marcação do alerta não é uma consulta ao IAM: um administrador ainda deve conferir o ID da chave em ambiente seguro e revisar acessos suspeitos. Não testar a credencial exposta por meio de autenticação.

A remoção da árvore atual não apaga histórico. Não reescrevemos branches/tags nem fizemos force-push. Após coordenar clones/forks e backups, avaliar expurgo de histórico; as refs `refs/pull/1/head` e `refs/pull/2/head` são controladas pelo GitHub. Solicitar ao GitHub Support remoção de referências/cache afetados conforme a política aplicável. O pedido deve identificar repositório, caminhos e refs/commits, sem colar a chave. Nenhum chamado de suporte foi enviado nesta sessão.

## Dependências e validação

Atualizações compatíveis no lockfile: body-parser 1.20.9, DOMPurify 3.4.17, qs 6.16.2, re2js 2.9.1 e Vite 6.4.5. Elas removem os achados altos/crítico observados na instalação.

Restam quatro achados moderados na cadeia Firebase Admin → Firestore API → google-gax 5 → rimraf → glob/minimatch. `npm audit fix` não os resolve nas faixas atuais; não foram forçadas versões major/pre-1 incompatíveis. O gate `npm audit --audit-level=low` permanece ativo e deve falhar enquanto essa cadeia não receber correção compatível. Não confundir build/testes funcionais aprovados com audit aprovado. Há PRs Dependabot 3–7 com as mesmas cinco atualizações; este PR não os fecha nem mescla.

Comandos: `npm run test:auth`, `npm run lint`, `npm run build`, `npm run test:server`, `npm run test:full`, `npm run test:rules`, `npm run test:visibility`, `npm run test:rate-limit`, `npm run test:payment-signature`, `npm run test:ai-fallback`, `npm run test:smoke`, `npm audit --audit-level=low`.

Referências oficiais: [revogação de sessões](https://firebase.google.com/docs/auth/admin/manage-sessions), [App Check Enterprise web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [backend personalizado](https://firebase.google.com/docs/app-check/custom-resource-backend), [remoção de dados sensíveis do GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Resultados locais desta revisão: 23/23 testes de autenticação; typecheck/build; HTTP smoke de 17 rotas; suíte geral 143/143; test:full (5.548 transições Zobrist e 5.173 avaliações sem divergência); regras e migração Firestore no emulador; visibilidade, limites, assinatura de webhook e fallback IA; smoke de 68/68 posições. Auditoria npm: quatro moderadas, exit code não zero. O GitHub também mantém 12 alertas Dependabot na branch padrão; este PR ainda não foi mesclado. Verificações CI iniciadas no PR #8; resultados remotos ficam no próprio PR.
