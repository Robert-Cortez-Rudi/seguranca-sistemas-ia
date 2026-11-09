import "server-only";
import { z } from "zod";
import { db } from "../db";
import { idSchema } from "../schemas";

// Catálogo público: só produtos ativos, e só campos que o visitante pode ver.
const publicProduct = {
  id: true,
  name: true,
  description: true,
  priceCents: true,
  stock: true,
  imageUrl: true,
  seller: { select: { name: true } },
} as const;

// A05 — Termo de busca validado: texto curto, sem controle; o Prisma parametriza a consulta.
const searchSchema = z.string().trim().max(60).regex(/^[^\p{C}]*$/u);

/** Normaliza o termo de busca da URL; valor inválido vira busca vazia (mostra tudo). */
export function parseSearch(value: unknown): string {
  const r = searchSchema.safeParse(value);
  return r.success ? r.data : "";
}

export async function listProducts(search?: string) {
  const q = parseSearch(search);
  return db.product.findMany({
    where: {
      active: true,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
    },
    select: publicProduct,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getProduct(productId: unknown) {
  const id = idSchema.safeParse(productId);
  if (!id.success) return null;
  return db.product.findFirst({ where: { id: id.data, active: true }, select: publicProduct });
}
