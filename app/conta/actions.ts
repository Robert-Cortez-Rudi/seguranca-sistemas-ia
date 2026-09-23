"use server";

// A01 — Cada action busca o usuário da sessão; o id do dono nunca vem do formulário.
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { formToObject } from "@/lib/schemas";
import { addCard, createAddress, deleteAddress, deleteCard } from "@/lib/services/account";

export async function createAddressAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["CUSTOMER"]);
  const res = await createAddress(user.id, formToObject(form));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/conta/enderecos");
  return { success: "Endereço salvo." };
}

export async function deleteAddressAction(form: FormData): Promise<void> {
  const user = await requireUser(["CUSTOMER"]);
  await deleteAddress(user.id, form.get("id"));
  revalidatePath("/conta/enderecos");
}

export async function addCardAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["CUSTOMER"]);
  const res = await addCard(user.id, formToObject(form));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/conta/cartoes");
  return { success: "Cartão salvo." };
}

export async function deleteCardAction(form: FormData): Promise<void> {
  const user = await requireUser(["CUSTOMER"]);
  await deleteCard(user.id, form.get("id"));
  revalidatePath("/conta/cartoes");
}
