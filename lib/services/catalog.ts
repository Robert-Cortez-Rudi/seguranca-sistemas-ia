import "server-only";
import { db } from "../db";
import { idSchema } from "../schemas";

// Catálogo público: só produtos ativos, e só campos que o visitante pode ver.
const publicProduct = {
  id: true,
  name: true,
  description: true,
  priceCents: true,
  stock: true,
  seller: { select: { name: true } },
} as const;

export async function listProducts() {
  return db.product.findMany({ where: { active: true }, select: publicProduct, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function getProduct(productId: unknown) {
  const id = idSchema.safeParse(productId);
  if (!id.success) return null;
  return db.product.findFirst({ where: { id: id.data, active: true }, select: publicProduct });
}
