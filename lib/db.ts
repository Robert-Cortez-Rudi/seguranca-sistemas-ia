import "server-only";
import { PrismaClient } from "@prisma/client";

// Uma instância por processo; no dev o hot reload recriaria conexões sem isso.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
