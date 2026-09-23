import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // A05 — proibições do projeto
      "react/no-danger": "error",
      "no-restricted-properties": [
        "error",
        { property: "$queryRawUnsafe", message: "Proibido: use Prisma parametrizado (A05)." },
        { property: "$executeRawUnsafe", message: "Proibido: use Prisma parametrizado (A05)." },
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },
];

export default config;
