"use server";

// A01 — Ações do vendedor. O sellerId sai da sessão, nunca do formulário.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { getRequestContext } from "@/lib/request";
import { formToObject } from "@/lib/schemas";
import { createProduct, updateProduct, updateShipmentStatus } from "@/lib/services/seller";

export async function createProductAction(_prev: FormState, form: FormData): Promise<FormState> {
  const seller = await requireUser(["SELLER"]);
  const res = await createProduct(seller.id, formToObject(form));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/vendedor");
  redirect("/vendedor");
}

export async function updateProductAction(_prev: FormState, form: FormData): Promise<FormState> {
  const seller = await requireUser(["SELLER"]);
  const data = formToObject(form);
  const res = await updateProduct(seller.id, data.id, data);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/vendedor");
  return { success: "Produto atualizado." };
}

export async function updateShipmentAction(_prev: FormState, form: FormData): Promise<FormState> {
  const seller = await requireUser(["SELLER"]);
  const res = await updateShipmentStatus(seller.id, formToObject(form), await getRequestContext());
  if (!res.ok) return { error: res.error };
  revalidatePath("/vendedor/vendas");
  return { success: "Status atualizado." };
}
