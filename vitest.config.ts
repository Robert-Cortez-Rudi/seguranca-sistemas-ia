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
    // Testes funcionais compartilham o banco de teste: rodar em série evita corrida.
    fileParallelism: false,
    testTimeout: 20000,
    projects: [
      {
        // Unitários: funções puras de lib/, sem banco e sem Docker.
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup-unit.ts"],
        },
      },
      {
        // Funcionais: fluxos completos (serviços + Prisma) contra o banco de teste.
        extends: true,
        test: {
          name: "functional",
          include: ["tests/functional/**/*.test.ts"],
          globalSetup: ["tests/global-setup.ts"],
          setupFiles: ["tests/setup.ts"],
        },
      },
    ],
  },
});
