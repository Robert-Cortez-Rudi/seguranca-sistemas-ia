# SecureShop

E-commerce de compra e venda com entrega, construído para o trabalho de Segurança de
Sistemas (IFSP) seguindo o OWASP Top 10:2025. Os controles e a evidência de cada um estão
em [SECURITY.md](SECURITY.md).

**Stack:** Next.js 15 (App Router) · TypeScript strict · Prisma + PostgreSQL · Tailwind ·
Zod · Argon2id · TOTP (otplib) · Vitest · Mailpit.

## Pré-requisitos

| Ferramenta | Versão | Como conferir |
|---|---|---|
| Node.js | 20.18 ou mais novo | `node -v` |
| Docker com Compose v2 (no Windows e no macOS, o Docker Desktop) | qualquer recente | `docker compose version` |
| Git | qualquer | `git --version` |

O Docker precisa estar **aberto e rodando** antes dos comandos abaixo. No Windows e no
macOS, abra o Docker Desktop e espere o ícone indicar que ele está pronto.

Portas usadas na sua máquina: **3000** (aplicação), **5434** (Postgres), **1025** e
**8025** (Mailpit). Se alguma estiver ocupada, veja [Problemas comuns](#problemas-comuns).

## Instalação (primeira vez)

Os comandos valem para PowerShell, Prompt de Comando, bash e zsh.

```bash
git clone <url-do-repositório> secureshop
cd secureshop
npm install                    # também gera o Prisma Client
node scripts/gen-secrets.mjs   # cria o .env com senha do banco e chaves aleatórias
npm run db:up                  # sobe Postgres e Mailpit no Docker
npx prisma migrate deploy      # cria as tabelas
npm run db:seed                # cria usuários e produtos de teste
npm run dev
```

Abra **http://localhost:3000**.

Cada pessoa gera o próprio `.env`. Ele contém segredos, está no `.gitignore` e nunca deve
ser commitado nem compartilhado.

## Uso no dia a dia

```bash
npm run db:up    # se o Docker foi reiniciado
npm run dev
```

Para parar: `Ctrl+C` no terminal da aplicação e depois `npm run db:down`. Os dados do banco
continuam guardados.

Use sempre `npm run dev` (ou `npm start`), nunca `npx next dev`. O [server.mjs](server.mjs)
impede que alguém burle o limite de tentativas por IP (explicação em SECURITY.md, A07).

## Usuários de teste

Criados pelo `npm run db:seed`. São dados fictícios, só para uso local.

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | admin@secureshop.local | `Admin-Seed-2026!` |
| SELLER | vendedor1@secureshop.local | `Vendedor1-Seed-2026!` |
| SELLER | vendedor2@secureshop.local | `Vendedor2-Seed-2026!` |
| CUSTOMER | cliente1@secureshop.local | `Cliente1-Seed-2026!` |
| CUSTOMER | cliente2@secureshop.local | `Cliente2-Seed-2026!` |
| CUSTOMER | cliente3@secureshop.local | `Cliente3-Seed-2026!` |

- Cartão de teste: `4242 4242 4242 4242`, com qualquer validade futura e qualquer CVV.
- O pagamento é simulado: na tela de pagamento há os botões "Aprovar" e "Recusar".
- E-mails de recuperação de senha aparecem no Mailpit, em **http://localhost:8025**.
- Para o 2FA, use um app autenticador no celular (Google Authenticator, Microsoft
  Authenticator, Authy etc.).
- O `npm run db:seed` **apaga tudo** e recria os dados de teste. Use-o para voltar ao estado
  inicial.

## Popular com clientes e compras (e agendar)

O `npm run popular` cria clientes fictícios, com endereço e cartão de teste, e faz compras
com eles. Tudo passa pelas mesmas regras da aplicação: validação, cifragem, estoque, preço do
banco, webhook de pagamento assinado e AuditLog.

```bash
npm run popular -- --clientes 5 --compras 2 --pagamento aprovar
```

| Opção | Padrão | O que faz |
|---|---|---|
| `--clientes N` | 3 | clientes novos (0 = compra com clientes já criados pelo script com o mesmo prefixo) |
| `--compras N` | 1 | pedidos por cliente, com 1 a 3 produtos aleatórios |
| `--pagamento X` | aprovar | `aprovar`, `recusar` (devolve o estoque), `aleatorio` (80% aprovado) ou `nenhum` |
| `--prefixo P` | cliente | início do e-mail, ex.: `semana3` gera `semana3.202610051400.a1b2c3@secureshop.local` |
| `--senha S` | `Popular-Script-2026!` | senha dos clientes criados (use-a para entrar como eles) |

- O pagamento chama a aplicação em `APP_URL`, então ela precisa estar rodando (`npm run dev`).
  Sem ela, os pedidos ficam "aguardando pagamento".
- O script sai com código 1 se algo falhar. O Agendador de Tarefas mostra isso como falha.
- `npm run db:seed` apaga também os clientes criados pelo script.

**Agendar no Windows** (Agendador de Tarefas). Exemplo: toda segunda-feira às 14h, 5 clientes
com o prefixo `semana3`, gravando a saída em `popular.log`:

```powershell
schtasks /Create /TN "SecureShop semana3" /SC WEEKLY /D MON /ST 14:00 /TR "cmd /c cd /d \"C:\caminho\do\projeto\" && npm run popular -- --clientes 5 --prefixo semana3 >> popular.log 2>&1"
```

Para rodar uma única vez numa data: `/SC ONCE /SD 05/10/2026 /ST 14:00`. Para ver as tarefas,
use `schtasks /Query /TN "SecureShop semana3"`. Para apagar, use `schtasks /Delete /TN "SecureShop semana3" /F`.
O computador precisa estar ligado e com o Docker e a aplicação rodando no horário.

## Acesse sempre pelo endereço do `APP_URL`

O cookie de sessão tem a flag `Secure`. Os navegadores só a aceitam em HTTPS ou em
`localhost`. Por isso:

- Acesse por **`http://localhost:3000`**, o mesmo endereço do `APP_URL` no `.env`.
- **Não acesse pelo IP da máquina** (por exemplo `http://192.168.0.10:3000`) nem de outro
  dispositivo da rede. O login parece funcionar, mas o navegador descarta o cookie e você
  continua deslogado.
- Os testes foram feitos no Chrome (Chromium). Chrome, Edge e Firefox aceitam cookie `Secure`
  em `localhost`.

Para usar outra porta, mude `PORT` **e** `APP_URL` no `.env`. Por exemplo, `PORT=3001` e
`APP_URL=http://localhost:3001`. Se só o `PORT` mudar, o pagamento simulado e os links dos
e-mails continuam apontando para a porta antiga.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | aplicação em modo desenvolvimento |
| `npm run build` e depois `npm start` | aplicação em modo produção (CSP mais rígida) |
| `npm test` | 111 testes Vitest; precisa do Docker rodando |
| `npm run lint` | ESLint, com regras que proíbem `dangerouslySetInnerHTML`, `$queryRawUnsafe` e `eval` |
| `npm run typecheck` | TypeScript strict |
| `npm run audit` | `npm audit` das dependências de produção |
| `npm run db:up` / `npm run db:down` | liga e desliga Postgres e Mailpit |
| `npm run db:seed` | recria os dados de teste (apaga os atuais) |

Os testes usam um banco separado (`secureshop_test`), criado junto com o container. Eles
aplicam as migrations sozinhos e não mexem nos dados que você usa na aplicação.

## Problemas comuns

**"failed to connect to the docker API" ou "Cannot connect to the Docker daemon"**
O Docker não está rodando. Abra o Docker Desktop, espere ficar pronto e repita o comando.

**Porta do Postgres ocupada ("ports are not available" ou "address already in use")**
Mude `POSTGRES_PORT` no `.env.example` (por exemplo para `5435`), apague o `.env` e gere de
novo com `node scripts/gen-secrets.mjs`. As URLs do banco são geradas com a porta nova.

**Porta 3000 ocupada**
Mude `PORT` e `APP_URL` no `.env`, como explicado na seção acima.

**".env já existe; nada foi alterado"**
O gerador não sobrescreve um `.env`. Para gerar outro, apague o arquivo antes. Se o banco já
tinha sido criado com a senha antiga, recrie-o também: `docker compose down -v` e depois
`npm run db:up`, `npx prisma migrate deploy` e `npm run db:seed`.

**"password authentication failed" ou "Authentication failed against database server"**
O `.env` e o banco estão com senhas diferentes. Isso acontece quando o `.env` é gerado de novo
depois que o banco já existia. Solução: `docker compose down -v` (**apaga os dados do banco**),
depois `npm run db:up`, `npx prisma migrate deploy` e `npm run db:seed`.

**"Muitas tentativas a partir deste endereço. Tente novamente em alguns minutos."**
É o limite de 10 tentativas de login, cadastro ou recuperação por IP a cada 15 minutos. Espere,
ou zere o contador:
```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d secureshop -c "delete from \"RateLimit\";"'
```

**"E-mail ou senha inválidos" mesmo com a senha certa**
Depois de 5 erros a conta fica bloqueada por 15 minutos, e a mensagem continua a mesma de
propósito. Espere, entre como admin e use "Desbloquear" em Usuários, ou rode `npm run db:seed`.

**Faço login e continuo deslogado**
Você está acessando por um endereço diferente de `localhost`. Veja a seção sobre o `APP_URL`.

**Erro "@prisma/client did not initialize yet"**
Rode `npx prisma generate`.

## Estrutura

```
app/                 páginas e Server Actions (cada rota indica em comentário o item OWASP)
  (auth)/            login, cadastro, 2FA, recuperação de senha
  (loja)/            produto, carrinho, checkout, pagamento simulado
  conta/             dados, endereços, cartões, pedidos, segurança
  vendedor/          produtos e vendas do vendedor
  admin/             AuditLog e usuários
  api/webhooks/      webhook de pagamento (HMAC)
lib/                 regras de segurança e de negócio
  services/          lógica testável, sem dependência de cookies
  crypto.ts          encrypt(), decrypt(), blindIndex()
middleware.ts        CSP com nonce, CSRF de API, sessão e perfil por rota
server.mjs           servidor HTTP que protege o IP usado no limite de tentativas
prisma/              schema, migrations e seed
scripts/             gerador do .env e script de criação do banco de testes
tests/               testes Vitest
```
