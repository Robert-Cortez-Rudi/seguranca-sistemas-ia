# CLAUDE.md — SecureShop (Trabalho de Segurança de Sistemas)

## Objetivo
E-commerce de compra e venda com entrega, contendo dados sensíveis
(nome, CPF, endereço, cartão, telefone), construído seguindo o OWASP Top 10:2025.
Todo código deve priorizar segurança sobre conveniência.

## Stack
- Next.js 15 (App Router) + TypeScript strict
- Prisma + PostgreSQL (docker-compose)
- Tailwind CSS
- Zod (validação), @node-rs/argon2 (hash), otplib (2FA), Vitest (testes)
- Mailpit (SMTP local para e-mails de recuperação)
- Autenticação implementada manualmente (NÃO usar NextAuth/Clerk)

## Perfis (RBAC)
- CUSTOMER: compra, vê só os próprios pedidos e dados
- SELLER: cadastra produtos, vê só as próprias vendas, atualiza status de entrega
- ADMIN: vê AuditLog e gerencia usuários

## Modelo de dados (mínimo)
User, Session, PasswordResetToken, Address, PaymentCard, Product,
Cart, Order, OrderItem, Shipment, AuditLog

## Regras de segurança OBRIGATÓRIAS

### Senhas e login (A07)
- Hash com Argon2id (memoryCost 19456, timeCost 2). Nunca MD5/SHA/bcrypt fraco.
- Política: mínimo 12 caracteres; checar contra lista de senhas comuns.
- Mensagem de erro genérica: "E-mail ou senha inválidos" (não revelar se o e-mail existe).
- Bloqueio temporário de 15 min após 5 tentativas falhas por conta.
- Rate limit por IP nas rotas de login, cadastro e reset (10 req / 15 min).
- 2FA TOTP opcional, com códigos de recuperação armazenados com hash.

### Sessão
- Token aleatório de 32 bytes (crypto.randomBytes), salvo no banco como SHA-256.
- Cookie: httpOnly, secure, sameSite=lax, path=/, expiração de 8h.
- Regenerar sessão no login e ao trocar senha; invalidar todas as sessões no reset.

### Recuperação de senha
- Token aleatório de 32 bytes, salvo com hash SHA-256, validade de 15 min, uso único.
- Resposta sempre igual: "Se o e-mail existir, enviaremos um link" (anti-enumeração).
- Após redefinir: invalidar token, derrubar sessões ativas e registrar no AuditLog.
- Enviar e-mail avisando que a senha foi alterada.

### Dados sensíveis (A04)
- CPF, telefone, endereço e número do cartão cifrados com AES-256-GCM
  (IV aleatório por registro, chave em ENCRYPTION_KEY no .env).
- Centralizar em lib/crypto.ts: encrypt(), decrypt(), blindIndex().
- CPF: coluna cifrada + coluna cpfHash (HMAC-SHA256) para busca e unicidade.
- Cartão: guardar número cifrado, last4 e bandeira. NUNCA salvar CVV.
- Exibir dados mascarados: CPF ***.456.789-**, cartão **** 4242.
- Nunca retornar campos sensíveis em APIs sem necessidade (usar select explícito no Prisma).

### Controle de acesso (A01)
- Toda rota/Server Action verifica sessão E dono do recurso
  (ex.: where: { id, userId: session.userId }).
- Recurso de outro usuário retorna 404 (não 403), evitando enumeração.
- Middleware protege /conta, /vendedor, /admin por perfil.

### Entrada e injeção (A05)
- Validar TODA entrada com Zod no servidor (CPF com dígito verificador, CEP, Luhn no cartão).
- Somente Prisma; proibido $queryRawUnsafe.
- React escapa HTML por padrão; proibido dangerouslySetInnerHTML.

### Regras de negócio (A06)
- Preço, frete e total SEMPRE recalculados no servidor a partir do banco.
- Estoque decrementado em transação; quantidade > 0 e com limite máximo.
- Transições de status de entrega validadas: PAGO → SEPARANDO → ENVIADO → ENTREGUE.

### Configuração (A02)
- next.config: headers CSP (sem unsafe-inline em scripts), HSTS,
  X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy.
- Segredos só no .env; criar .env.example sem valores; .env no .gitignore.
- Proteção CSRF: Server Actions + sameSite; verificar Origin em rotas de API.

### Dependências e integridade (A03 / A08)
- Lockfile versionado; rodar npm audit; versões fixas.
- Webhook de pagamento simulado deve validar assinatura HMAC.

### Logs e erros (A09 / A10)
- AuditLog: LOGIN_OK, LOGIN_FAIL, LOCKOUT, PASSWORD_RESET, ACCESS_DENIED,
  ORDER_CREATED, com IP, userAgent e data. Nunca logar senha, token, CPF ou cartão.
- Erros ao usuário sempre genéricos; stack trace só no log do servidor.
- Falhas devem negar por padrão (fail closed).

## Dados de teste
- Seed apenas com dados FICTÍCIOS (CPFs gerados, cartões de teste 4242 4242 4242 4242).
- Usuários seed: admin, 2 vendedores, 3 clientes.

## Testes obrigatórios (Vitest)
- IDOR: cliente A não acessa pedido do cliente B.
- Brute force: 6ª tentativa bloqueada.
- Token de reset expirado ou reutilizado é rejeitado.
- Payload ' OR 1=1-- e <script>alert(1)</script> não causam efeito.
- Preço adulterado no checkout é ignorado.

## Forma de trabalhar
- Trabalhar em fases pequenas e rodar os testes ao fim de cada uma.
- Ao criar qualquer rota, explicar em comentário qual item OWASP ela protege.
- Manter SECURITY.md atualizado mapeando cada controle ao OWASP Top 10:2025.
