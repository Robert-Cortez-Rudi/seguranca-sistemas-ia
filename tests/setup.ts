// Carrega o .env e aponta o Prisma para o banco de teste antes de qualquer import da aplicação.
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST não definido: os testes nunca rodam no banco de desenvolvimento.");
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
