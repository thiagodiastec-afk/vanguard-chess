# Vanguard Chess

Aplicação web de xadrez com motor local, partidas online, perfis, chat e loja. O servidor Express entrega o build do Vite e expõe as rotas autenticadas usadas pelo cliente.

## Desenvolvimento

Requer Node.js e npm compatíveis com o `package-lock.json`.

```sh
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta `PORT` quando definida; por padrão, usa a porta 3000.

## Build e execução de produção

```sh
npm run lint
npm run build
npm start
```

O build gera os arquivos do navegador em `dist/` e o servidor em `dist/server.cjs`. Defina `NODE_ENV=production` e `PORT` no serviço que executa `npm start`. Este repositório não escolhe nem configura uma plataforma de hospedagem.

## Validação

```sh
npm run test:full
npm run test:rules
npm run test:smoke
npm run test:server
npm audit --audit-level=low
```

`test:rules` inicia o emulador Firestore e valida as regras, a migração privada e o rebaseline de ratings. O teste de migração executa no emulador; não aponta para produção.
`test:server` inicia o build de produção sem segredos e verifica que rotas protegidas, webhook, recompensas desligadas e página inicial respondem conforme o esperado.

O workflow `.github/workflows/quality.yml` roda esses gates em pull requests e pushes. O resultado remoto só estará confirmado depois da primeira execução no GitHub.

## Configuração do servidor

Copie `.env.example` para `.env` em desenvolvimento. O arquivo `.env` é ignorado pelo Git. Em produção, configure os mesmos valores no cofre de segredos do serviço:

- `FIREBASE_SERVICE_ACCOUNT`: JSON da conta de serviço Firebase Admin.
- `FIRESTORE_DATABASE_ID`: banco Firestore definido em `firebase-applet-config.json` e `firebase.json`.
- `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`: credenciais do ambiente Mercado Pago correspondente.
- `APP_URL`: origem pública HTTPS; o webhook recebe notificações em `/api/payment/webhook`.
- `GEMINI_API_KEY`: chave usada pela análise e tradução de mensagens.
- `PORT`: porta HTTP fornecida pelo ambiente.

Não use prefixo `VITE_` para segredos. A configuração web Firebase em `firebase-applet-config.json` identifica o projeto cliente; não substitui as credenciais Admin do servidor.

O App Check web usa reCAPTCHA Enterprise pela chave pública configurada em `firebase-applet-config.json` (ou, para sobrescrevê-la no ambiente de build, em `VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY`). O app web precisa estar registrado no Firebase App Check com a mesma chave e domínio de produção. O cliente inicializa App Check antes de Firestore/Auth. Não ative imposição no Firebase até implantar o cliente configurado e verificar as métricas de tráfego.
O servidor exige `FIRESTORE_DATABASE_ID` explicitamente e não escolhe um banco padrão quando a variável está ausente.

## Antes de publicar

1. Confirme o projeto e o banco Firestore de destino. Publique as regras e índices de `firebase.json` somente no destino revisado.
2. Rode `npm run migrate:private-users` com credenciais Admin para simulação e revise contagens e erros. A migração efetiva exige `npm run migrate:private-users -- --apply`.
3. A migração efetiva move carteira/assinatura para `/userPrivate/{uid}` e rebaselines dados competitivos legados sem marcador privado para Elo 1200, estatísticas zeradas e histórico público vazio. Os valores anteriores são arquivados privadamente (até 100 entradas de Elo). Planeje a comunicação dessa mudança antes de aplicá-la.
4. Migre os perfis antes de depender das consultas públicas versão 2. O bootstrap por login é uma rede de segurança, não substitui a migração em lote.
5. Configure e valide Firebase Admin, Mercado Pago em sandbox, URL HTTPS, webhook e Gemini. Conclua testes de ponta a ponta com duas contas.
6. Torneios só aparecem se forem provisionados pelo Admin SDK com `managedByServer: true`. O repositório não contém ferramenta de provisionamento; partidas de torneio e distribuição de prêmios não estão implementadas.

Recompensas por anúncio e moedas automáticas por resultado de partida permanecem desligadas. Não anuncie pagamentos ou prêmios de torneio até que esses fluxos sejam implementados e testados.

## Estado da auditoria

Veja [SECURITY_READINESS_AUDIT.md](SECURITY_READINESS_AUDIT.md) para evidências dos testes, riscos abertos, estado das integrações e itens pendentes para a release.
