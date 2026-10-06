# SECURITY.md — Controles do SecureShop mapeados ao OWASP Top 10:2025

Este documento lista cada controle implementado, onde ele está no código e o que o comprova:
um teste automatizado (Vitest, `npm test`) ou uma verificação no navegador (Playwright contra
o build de produção). Situação em 23/09/2026: **111 testes passando**, `npm audit` sem
vulnerabilidades, lint e typecheck limpos.

## Testes obrigatórios do trabalho

| Exigência | Onde está o teste |
|---|---|
| IDOR: cliente A não acessa pedido do cliente B | [tests/functional/access-control.test.ts](tests/functional/access-control.test.ts) — "cliente A não acessa pedido do cliente B"; no navegador, cliente2 recebe 404 no pedido e no pagamento do cliente1 |
| Brute force: 6ª tentativa bloqueada | [tests/functional/auth.test.ts](tests/functional/auth.test.ts) — "brute force: a 6ª tentativa é bloqueada mesmo com a senha correta" |
| Token de reset expirado ou reutilizado é rejeitado | [tests/functional/password-reset.test.ts](tests/functional/password-reset.test.ts) — "token expirado…", "token reutilizado…", "dois usos simultâneos…"; no navegador, o link reaberto mostra "Link inválido ou expirado" |
| `' OR 1=1--` e `<script>alert(1)</script>` não causam efeito | [tests/functional/injection.test.ts](tests/functional/injection.test.ts), [tests/functional/auth.test.ts](tests/functional/auth.test.ts); no navegador, produto com `<script>` no nome aparece como texto e nenhum `alert()` dispara |
| Preço adulterado no checkout é ignorado | [tests/functional/checkout.test.ts](tests/functional/checkout.test.ts) — "preço adulterado no checkout é ignorado"; no navegador, campos `totalCents=1` injetados no formulário e o pedido saiu com R$ 115,00 |

## A01 — Broken Access Control

| Controle | Onde | Evidência |
|---|---|---|
| Middleware (runtime Node) valida a sessão **no banco** e o perfil em `/conta`, `/vendedor`, `/admin`, `/carrinho`, `/checkout`; a sessão provisória de 2FA não passa | [middleware.ts](middleware.ts), [lib/route-access.ts](lib/route-access.ts) | [tests/unit/route-access.test.ts](tests/unit/route-access.test.ts) + navegador |
| Caminho normalizado antes da checagem (`/ADMIN`, `//admin//`, `/%61dmin`); caminho mal codificado é tratado como protegido | [lib/route-access.ts](lib/route-access.ts) | idem |
| Banco fora do ar no middleware → 503 (fail closed), nunca libera o acesso | [middleware.ts](middleware.ts) | — |
| Perfil errado recebe **404** (não 403) e gera `ACCESS_DENIED` no AuditLog | [middleware.ts](middleware.ts), [lib/auth.ts](lib/auth.ts) | navegador: 6 negações registradas |
| Defesa em profundidade: toda página e toda Server Action chama `requireUser(perfis)` de novo. Server Action é endpoint público e não herda a proteção da página | [lib/auth.ts](lib/auth.ts), `app/**/actions.ts` | — |
| Consultas sempre com o dono no `where` (`{ id, userId }` ou `{ id, sellerId }`); não existe função que busque recurso só pelo id | [lib/services/](lib/services/) | testes de IDOR para pedido, endereço, cartão, carrinho, produto e entrega |
| Recurso de outro e recurso inexistente dão o mesmo resultado (sem enumeração) | idem | teste "pedido de outro e pedido inexistente…" |
| IDs validados por formato antes de chegar ao banco | [lib/schemas.ts](lib/schemas.ts) (`idSchema`) | teste "id malicioso não chega ao banco" |
| O id do dono nunca vem do formulário: sai da sessão | `app/**/actions.ts` | — |
| Vendedor vê só as próprias vendas, só os próprios itens do pedido, sem CPF nem cartão do cliente | [lib/services/seller.ts](lib/services/seller.ts) | teste + navegador |
| Admin não altera a própria conta (evita se trancar para fora); desativar ou mudar perfil derruba as sessões do alvo | [lib/services/admin.ts](lib/services/admin.ts) | [tests/functional/payment-seller-admin.test.ts](tests/functional/payment-seller-admin.test.ts) |
| CSRF: Server Actions só aceitam POST com Origin igual ao Host (checagem nativa do Next) + cookie `SameSite=Lax`; rotas `/api/*` que alteram estado exigem `Origin` igual a `APP_URL` | [lib/origin.ts](lib/origin.ts), [middleware.ts](middleware.ts) | [tests/unit/origin.test.ts](tests/unit/origin.test.ts) — "CSRF em rotas de API" |
| Redirecionamento pós-login só para caminho interno (bloqueia `//evil.example`) | [lib/auth.ts](lib/auth.ts) | navegador |

## A02 — Security Misconfiguration

| Controle | Onde | Evidência |
|---|---|---|
| CSP com nonce por requisição; `script-src` sem `unsafe-inline` e sem `unsafe-eval` em produção; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | [lib/csp.ts](lib/csp.ts), [middleware.ts](middleware.ts) | [tests/unit/csp.test.ts](tests/unit/csp.test.ts); navegador sem nenhuma violação de CSP em todas as telas |
| Todas as páginas renderizadas por requisição, para que o nonce chegue aos scripts | [app/layout.tsx](app/layout.tsx) | build lista todas as rotas como `ƒ (Dynamic)` |
| Interface (design system, animações e fontes) sem afrouxar a CSP: animações só em CSS de arquivo, nenhum `style` inline, fontes servidas do próprio domínio via `next/font` (`font-src 'self'`) | [app/globals.css](app/globals.css), [app/layout.tsx](app/layout.tsx) | `grep -rn "style=" app components` não retorna nada; build de produção sem dependência nova |
| HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP | [next.config.ts](next.config.ts) | conferido com `curl -D -` no build de produção |
| Cabeçalho `X-Powered-By` removido | [next.config.ts](next.config.ts) | idem |
| Segredos só no `.env` (fora do git); `.env.example` sem valores; gerador de segredos aleatórios | [.gitignore](.gitignore), [.env.example](.env.example), [scripts/gen-secrets.mjs](scripts/gen-secrets.mjs) | `git check-ignore .env` |
| Postgres e Mailpit expostos só em `127.0.0.1` | [docker-compose.yml](docker-compose.yml) | — |
| Testes rodam num banco separado e se recusam a rodar sem ele | [tests/setup.ts](tests/setup.ts) | — |

**Troca aceita:** a CSP com nonce impede páginas estáticas. Todas as páginas são renderizadas
no servidor a cada requisição, o que custa desempenho em troca de nunca precisar de `unsafe-inline`.

## A03 — Software Supply Chain Failures

| Controle | Onde | Evidência |
|---|---|---|
| Versões exatas (`save-exact`), `package-lock.json` versionado, `engine-strict` | [package.json](package.json), [.npmrc](.npmrc) | — |
| Dependências transitivas vulneráveis (`postcss` do Next, `deepmerge-ts` do Prisma) forçadas para versões corrigidas via `overrides`, sem subir versão major | [package.json](package.json) | `npm audit`: 0 vulnerabilidades |
| Plugin `vite-tsconfig-paths` removido quando o Vite passou a resolver os caminhos sozinho: uma dependência a menos | [vitest.config.ts](vitest.config.ts) | — |

## A04 — Cryptographic Failures

| Controle | Onde | Evidência |
|---|---|---|
| CPF, telefone, endereço, número e titular do cartão, segredo TOTP e endereço do pedido cifrados com AES-256-GCM, IV aleatório de 12 bytes por registro | [lib/crypto.ts](lib/crypto.ts) | [tests/unit/crypto.test.ts](tests/unit/crypto.test.ts) |
| Contexto da coluna como AAD: valor cifrado copiado para outra coluna não decifra | [lib/crypto.ts](lib/crypto.ts) | idem |
| Chave inválida ou ausente derruba a operação (fail closed) | [lib/crypto.ts](lib/crypto.ts) | idem |
| CPF com blind index HMAC-SHA256 (`cpfHash`, único) usando chave separada da de cifragem | [lib/crypto.ts](lib/crypto.ts), [prisma/schema.prisma](prisma/schema.prisma) | idem |
| Cartão: número cifrado + `last4` + bandeira. CVV validado e descartado, sem coluna no banco | [prisma/schema.prisma](prisma/schema.prisma), [lib/services/account.ts](lib/services/account.ts) | teste "cartão: número cifrado, CVV descartado…" |
| Exibição mascarada: `***.456.789-**`, `**** 4242`, `(11) *****-4321` | [lib/mask.ts](lib/mask.ts) | [tests/unit/validators.test.ts](tests/unit/validators.test.ts); navegador confere o CPF e que o número do cartão não está no HTML |
| `select` explícito no Prisma: listagens não trazem campos cifrados nem hash de senha | [lib/services/](lib/services/) | teste "listagem de usuários não traz CPF…" |
| Tokens de sessão e de reset guardados como SHA-256 | [lib/session.ts](lib/session.ts) | [tests/functional/auth.test.ts](tests/functional/auth.test.ts) |

## A05 — Injection

| Controle | Onde | Evidência |
|---|---|---|
| Toda entrada validada com Zod no servidor: CPF com dígito verificador, CEP, Luhn, validade do cartão, UF, e-mail, quantidades, preços, ids | [lib/schemas.ts](lib/schemas.ts), [lib/validators.ts](lib/validators.ts) | [tests/unit/validators.test.ts](tests/unit/validators.test.ts) |
| Só Prisma. O único SQL manual (contador do rate limit) usa `$queryRaw` com template, que é parametrizado | [lib/rate-limit.ts](lib/rate-limit.ts) | [tests/functional/injection.test.ts](tests/functional/injection.test.ts) |
| Lint proíbe `dangerouslySetInnerHTML`, `$queryRawUnsafe`, `$executeRawUnsafe` e `eval` | [eslint.config.mjs](eslint.config.mjs) | `npm run lint` |
| Texto de vendedores (nome, descrição) exibido só por JSX, que escapa HTML | `app/**` | navegador: `<script>` exibido como texto, nenhum `alert()` |
| Texto livre sem caracteres de controle | [lib/schemas.ts](lib/schemas.ts) | — |
| E-mails em texto puro, sem HTML montado com dado do usuário | [lib/mail.ts](lib/mail.ts) | — |

## A06 — Insecure Design

| Controle | Onde | Evidência |
|---|---|---|
| Checkout recebe só `addressId` e `cardId`; preço, frete e total recalculados a partir do banco; o schema descarta qualquer outro campo | [lib/services/checkout.ts](lib/services/checkout.ts) | teste "preço adulterado no checkout é ignorado" + navegador |
| Carrinho guarda só produto e quantidade, nunca preço | [lib/services/cart.ts](lib/services/cart.ts) | teste "preço enviado junto ao item é ignorado" |
| Quantidade de 1 a 10 por produto, no máximo 20 produtos por carrinho, sempre dentro do estoque | [lib/schemas.ts](lib/schemas.ts), [lib/services/cart.ts](lib/services/cart.ts) | teste "quantidade precisa ser de 1 a 10…" |
| Estoque baixado dentro da transação com `UPDATE ... WHERE stock >= qtd`; se um item falha, o pedido inteiro é desfeito | [lib/services/checkout.ts](lib/services/checkout.ts) | testes "estoque insuficiente desfaz…" e "duas compras simultâneas da última unidade" |
| A linha do carrinho é travada no início do checkout: duplo clique gera um único pedido | idem | teste "duplo clique do mesmo cliente…" (comprovado que falha sem a trava) |
| Entrega segue PAGO → SEPARANDO → ENVIADO → ENTREGUE, só o próximo passo; ENVIADO exige rastreio; transição condicional ao status atual | [lib/shipment.ts](lib/shipment.ts), [lib/services/seller.ts](lib/services/seller.ts) | teste "atualiza a própria entrega seguindo o fluxo…" + navegador |
| Pagamento recusado cancela o pedido e devolve o estoque reservado | [lib/services/payment.ts](lib/services/payment.ts) | teste "pagamento recusado cancela…" |
| Limites de endereços (10) e cartões (5) por usuário | [lib/services/account.ts](lib/services/account.ts) | — |

## A07 — Authentication Failures

| Controle | Onde | Evidência |
|---|---|---|
| Argon2id, `m=19456, t=2, p=1` | [lib/password.ts](lib/password.ts) | teste confere o prefixo `$argon2id$v=19$m=19456,t=2,p=1$` |
| Senha de 12 a 128 caracteres, sem senha comum, sem repetir um caractere, sem conter o e-mail | [lib/password.ts](lib/password.ts), [lib/common-passwords.ts](lib/common-passwords.ts) | [tests/functional/auth.test.ts](tests/functional/auth.test.ts) |
| Mensagem única "E-mail ou senha inválidos." para e-mail inexistente, senha errada, conta bloqueada e conta desativada | [lib/services/auth.ts](lib/services/auth.ts) | idem |
| E-mail inexistente também passa por um Argon2 (hash descartável), para não vazar por tempo de resposta | [lib/services/auth.ts](lib/services/auth.ts) | — |
| Bloqueio de 15 min após 5 falhas; a 6ª tentativa é recusada mesmo com a senha certa | [lib/services/auth.ts](lib/services/auth.ts) | teste "brute force…" |
| Rate limit por IP (10 req / 15 min) em login, cadastro e reset, com contador atômico no Postgres (sobrevive a reinício) | [lib/rate-limit.ts](lib/rate-limit.ts) | teste "rate limit por IP" + navegador (o limite disparou nas execuções repetidas) |
| IP do cliente não pode ser forjado com `X-Forwarded-For`: o [server.mjs](server.mjs) reescreve o cabeçalho com o IP do socket (ou com o IP acrescentado pelo proxy confiável, via `TRUST_PROXY_HOPS`) | [server.mjs](server.mjs) | navegador com `X-Forwarded-For: 6.6.6.6` gravou `::1` no AuditLog |
| Cadastro sempre cria CUSTOMER; campo `role` enviado pelo cliente é ignorado | [lib/services/auth.ts](lib/services/auth.ts) | teste "mass assignment" |
| E-mail ou CPF já cadastrado: mesma mensagem genérica, sem dizer qual dos dois | [lib/services/auth.ts](lib/services/auth.ts) | teste de conflito |
| Sessão: token de 32 bytes (`crypto.randomBytes`), SHA-256 no banco, expira em 8h, apagada se expirada ou se o usuário for desativado | [lib/session.ts](lib/session.ts) | [tests/functional/auth.test.ts](tests/functional/auth.test.ts) |
| Cookie `__Host-ss_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` | [lib/auth.ts](lib/auth.ts) | navegador confirmou os atributos e que `document.cookie` não o enxerga |
| Sessão regenerada no login e na troca de senha | [app/(auth)/actions.ts](app/(auth)/actions.ts), [lib/services/password.ts](lib/services/password.ts) | teste "troca de senha logado" |

**Problema achado durante a implementação:** o Next só preenche `X-Forwarded-For` quando ele
chega vazio (`base-server.js`, operador `??=`). Sem o `server.mjs`, um script trocaria esse
cabeçalho a cada tentativa e nunca atingiria o limite por IP.

### Recuperação de senha

| Controle | Onde | Evidência |
|---|---|---|
| Token de 32 bytes, SHA-256 no banco, validade de 15 min, uso único (marcação condicional `usedAt IS NULL` dentro de transação, resiste a duas requisições simultâneas) | [lib/services/password.ts](lib/services/password.ts) | [tests/functional/password-reset.test.ts](tests/functional/password-reset.test.ts): expirado, reutilizado, paralelo |
| Resposta idêntica exista o e-mail ou não; o envio do e-mail não é aguardado, para o tempo de resposta não denunciar a conta | idem | teste "resposta idêntica" |
| Novo pedido invalida o link anterior | idem | teste "pedir de novo invalida" |
| Após redefinir: token consumido, todas as sessões derrubadas, bloqueio zerado, `PASSWORD_RESET` no AuditLog, e-mail avisando da troca | idem | teste + navegador com Mailpit |
| Link montado com `APP_URL` do `.env`, nunca com o cabeçalho `Host` (impede envenenamento do link) | [lib/mail.ts](lib/mail.ts) | — |

### 2FA (TOTP)

| Controle | Onde | Evidência |
|---|---|---|
| Segredo TOTP cifrado (AES-GCM); 2FA só liga depois de um código válido | [lib/services/mfa.ts](lib/services/mfa.ts) | [tests/functional/mfa.test.ts](tests/functional/mfa.test.ts) |
| Login em duas etapas: após a senha, sessão provisória `mfaPending` de 5 min que não abre nenhuma página | [lib/services/auth.ts](lib/services/auth.ts), [middleware.ts](middleware.ts) | teste + navegador (`/conta` redireciona para `/entrar`) |
| Anti-replay: o passo TOTP usado fica gravado (`totpLastStep`) e o mesmo código não entra de novo | [lib/services/mfa.ts](lib/services/mfa.ts) | teste "replay" |
| Erros de código contam para o bloqueio da conta; com 2FA ativo a senha certa não zera o contador | idem | testes "erros de código contam…" e "senha certa não zera…" |
| 10 códigos de recuperação (50 bits cada), guardados em SHA-256, uso único, exibidos uma vez | idem | teste "código de recuperação funciona uma única vez" |
| Desligar o 2FA exige senha atual + código | idem | teste "desligar exige senha e código" |

**Falha de desenho corrigida durante a fase 4:** a primeira versão zerava o contador de falhas
quando a senha estava correta, antes do código TOTP. Quem já tivesse a senha poderia repetir
"login + 5 chutes de código" sem nunca bloquear a conta.

## A08 — Software or Data Integrity Failures

| Controle | Onde | Evidência |
|---|---|---|
| Webhook de pagamento assinado com HMAC-SHA256 sobre `timestamp.corpo`, comparação em tempo constante, assinatura conferida antes de ler o corpo | [lib/services/payment.ts](lib/services/payment.ts), [app/api/webhooks/pagamento/route.ts](app/api/webhooks/pagamento/route.ts) | [tests/functional/payment-seller-admin.test.ts](tests/functional/payment-seller-admin.test.ts): assinatura forjada, ausente e corpo alterado; navegador: chamada forjada recebe 401 |
| Anti-replay: timestamp com no máximo 5 min de diferença + `eventId` único (tabela `WebhookEvent`) | idem | testes "replay…" e "timestamp com mais de 5 minutos…" |
| Valor pago precisa ser igual ao total do pedido; o pedido só sai de `PENDING_PAYMENT` uma vez | idem | testes "valor diferente…" e "pedido já pago…" |
| Corpo limitado a 4 KB; resposta genérica em qualquer recusa, com o motivo só no AuditLog | idem | — |
| O gateway simulado roda no servidor: o navegador nunca vê o segredo nem monta a assinatura | [lib/services/payment-simulator.ts](lib/services/payment-simulator.ts) | navegador |

## A09 — Security Logging & Alerting Failures

| Controle | Onde | Evidência |
|---|---|---|
| AuditLog com ação, usuário, IP, user agent e data: `LOGIN_OK`, `LOGIN_FAIL`, `LOCKOUT`, `PASSWORD_RESET`, `ACCESS_DENIED`, `ORDER_CREATED`, além de `RATE_LIMITED`, `ORDER_PAID`, `WEBHOOK_REJECTED`, `SHIPMENT_UPDATED`, `MFA_*`, `USER_UPDATED` | [lib/audit.ts](lib/audit.ts), [prisma/schema.prisma](prisma/schema.prisma) | testes + navegador (tela do admin) |
| Metadata filtrado: chaves com senha, token, CPF, cartão, código etc. são descartadas; strings cortadas em 200 caracteres | [lib/audit.ts](lib/audit.ts) | teste "nunca grava a senha digitada"; navegador confere a tela do admin sem CPF, cartão ou senha |
| AuditLog visível só para ADMIN, com filtro por ação e paginação | [app/admin/page.tsx](app/admin/page.tsx) | navegador |

## A10 — Mishandling of Exceptional Conditions

| Controle | Onde | Evidência |
|---|---|---|
| Erros ao usuário sempre genéricos; stack trace só no log do servidor | [app/error.tsx](app/error.tsx), [app/global-error.tsx](app/global-error.tsx), [app/api/webhooks/pagamento/route.ts](app/api/webhooks/pagamento/route.ts) | — |
| Fail closed: chave de cifragem ausente, segredo do webhook ausente, `APP_URL` ausente, banco fora do ar no middleware e rate limit sem resposta **negam** a operação | [lib/crypto.ts](lib/crypto.ts), [lib/services/payment.ts](lib/services/payment.ts), [lib/mail.ts](lib/mail.ts), [middleware.ts](middleware.ts), [lib/rate-limit.ts](lib/rate-limit.ts) | teste "falha fechado sem chave válida" |
| Hash de senha corrompido nega o login em vez de lançar erro | [lib/password.ts](lib/password.ts) | — |

## Limitações conhecidas

- **Gateway de pagamento simulado.** Num sistema real, o número do cartão não passaria pelo
  servidor da loja (tokenização no provedor, PCI-DSS). Aqui ele é cifrado e guardado porque o
  trabalho pede.
- **Estoque reservado sem prazo.** Um pedido que nunca recebe o webhook segura o estoque. Um
  job de expiração de pedidos `PENDING_PAYMENT` resolveria.
- **Rate limit por janela fixa.** Permite até 2× o limite na virada da janela. Uma janela
  deslizante seria mais precisa.
- **Cookie `Secure` em `http://localhost`.** Os navegadores aceitam em localhost. Fora dele, a
  aplicação precisa de HTTPS.
- **Script de popular dados sem rate limit.** O [scripts/popular.ts](scripts/popular.ts) chama
  `createCustomer()`, a mesma regra do cadastro (Zod, política de senha, Argon2id, cifragem,
  AuditLog `REGISTER`) sem o rate limit por IP, que só existe em `register()`, a rota pública.
  Quem roda o script já tem o `.env` e acesso direto ao banco, então o limite não protegeria
  nada. Os eventos do script ficam no AuditLog com IP `script-local`.
- **Lista de senhas comuns curta** (cerca de 100 entradas com 12+ caracteres). Em produção,
  consultar uma lista maior ou a API k-anonymity do Have I Been Pwned.
