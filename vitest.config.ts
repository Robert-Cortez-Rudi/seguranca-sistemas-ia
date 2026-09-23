import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" lança erro fora do bundle de servidor do Next; nos testes vira módulo vazio.
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Testes de integração compartilham o banco de teste: rodar em série evita corrida.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
