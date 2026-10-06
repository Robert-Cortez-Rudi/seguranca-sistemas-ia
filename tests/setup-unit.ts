// Testes unitários: só regras puras. Carrega o .env (a cifra precisa das chaves)
// e aponta o banco para um endereço inválido, para que nenhum teste unitário toque em banco algum.
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

process.env.DATABASE_URL = "postgresql://sem-banco:x@unit-tests.invalid:5432/nao-existe";
