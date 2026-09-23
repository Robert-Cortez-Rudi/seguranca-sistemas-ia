import "server-only";
import { decrypt, encrypt } from "../crypto";
import { db } from "../db";
import { maskCard } from "../mask";
import { addressSchema, cardSchema, idSchema } from "../schemas";
import { cardBrand } from "../validators";
import type { FieldErrors } from "./auth";

// A01 — Toda consulta filtra por userId. Não existe função que receba só o id do recurso.
// A04 — Dados cifrados saem daqui já mascarados ou só para o próprio dono.

export const MAX_ADDRESSES = 10;
export const MAX_CARDS = 5;

type Fail = { ok: false; error: string; fieldErrors?: FieldErrors };

export type AddressView = {
  id: string;
  label: string;
  uf: string;
  recipient: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
};

export async function listAddresses(userId: string): Promise<AddressView[]> {
  const rows = await db.address.findMany({
    where: { userId },
    select: { id: true, label: true, uf: true, payloadEnc: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(({ payloadEnc, ...r }) => ({ ...r, ...JSON.parse(decrypt(payloadEnc, "address.payload")) }));
}

export async function createAddress(userId: string, input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  if ((await db.address.count({ where: { userId } })) >= MAX_ADDRESSES) {
    return { ok: false, error: `Limite de ${MAX_ADDRESSES} endereços.` };
  }
  const { label, uf, ...payload } = parsed.data;
  const row = await db.address.create({
    data: { userId, label, uf, payloadEnc: encrypt(JSON.stringify(payload), "address.payload") },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/** Apaga só se o endereço for do usuário. Outro dono ou id inexistente: mesmo resultado. */
export async function deleteAddress(userId: string, addressId: unknown): Promise<boolean> {
  const id = idSchema.safeParse(addressId);
  if (!id.success) return false;
  const res = await db.address.deleteMany({ where: { id: id.data, userId } });
  return res.count === 1;
}

export type CardView = { id: string; label: string; brand: string; expMonth: number; expYear: number };

export async function listCards(userId: string): Promise<CardView[]> {
  // select explícito: numberEnc e holderEnc nem saem do banco.
  const rows = await db.paymentCard.findMany({
    where: { userId },
    select: { id: true, last4: true, brand: true, expMonth: true, expYear: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(({ last4, ...r }) => ({ ...r, label: maskCard(last4) }));
}

export async function addCard(userId: string, input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  if ((await db.paymentCard.count({ where: { userId } })) >= MAX_CARDS) {
    return { ok: false, error: `Limite de ${MAX_CARDS} cartões.` };
  }
  // O CVV foi validado pelo schema e é descartado aqui: não existe coluna para ele.
  const { number, holder, expMonth, expYear } = parsed.data;
  const row = await db.paymentCard.create({
    data: {
      userId,
      numberEnc: encrypt(number, "card.number"),
      holderEnc: encrypt(holder, "card.holder"),
      last4: number.slice(-4),
      brand: cardBrand(number),
      expMonth,
      expYear,
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

export async function deleteCard(userId: string, cardId: unknown): Promise<boolean> {
  const id = idSchema.safeParse(cardId);
  if (!id.success) return false;
  // Cartão usado em pedido fica (histórico); os demais são apagados.
  const used = await db.order.count({ where: { paymentCardId: id.data, userId } });
  if (used > 0) return false;
  const res = await db.paymentCard.deleteMany({ where: { id: id.data, userId } });
  return res.count === 1;
}
