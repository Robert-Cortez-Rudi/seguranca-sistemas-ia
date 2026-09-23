// Aplica as migrations no banco de teste uma vez, antes da suíte.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export default function setup() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST não definido.");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
