// Gera um .env local com segredos aleatórios a partir do .env.example.
// Não sobrescreve um .env existente.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.error(".env já existe; nada foi alterado. Apague-o se quiser gerar outro.");
  process.exit(1);
}

const example = readFileSync(".env.example", "utf8");
const port = /^POSTGRES_PORT=(\d+)\s*$/m.exec(example)?.[1] ?? "5434";

const b64 = (n) => randomBytes(n).toString("base64");
const user = "secureshop";
const pass = randomBytes(18).toString("base64url");

const values = {
  POSTGRES_USER: user,
  POSTGRES_PASSWORD: pass,
  DATABASE_URL: `postgresql://${user}:${pass}@127.0.0.1:${port}/secureshop`,
  DATABASE_URL_TEST: `postgresql://${user}:${pass}@127.0.0.1:${port}/secureshop_test`,
  ENCRYPTION_KEY: b64(32),
  BLIND_INDEX_KEY: b64(32),
  PAYMENT_WEBHOOK_SECRET: b64(32),
};

const out = example
  .split(/\r?\n/)
  .map((line) => {
    const m = /^([A-Z_]+)=$/.exec(line);
    return m && values[m[1]] ? `${m[1]}=${values[m[1]]}` : line;
  })
  .join("\n");

writeFileSync(".env", out, { mode: 0o600 });
console.log(`.env criado (Postgres na porta ${port}).`);
