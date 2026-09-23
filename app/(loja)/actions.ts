"use server";

// A06 — Carrinho e checkout. Preço nunca vem do formulário; o id do usuário vem da sessão.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { getRequestContext } from "@/lib/request";
import { formToObject } from "@/lib/schemas";
import { addToCart, removeFromCart, setCartQuantity } from "@/lib/services/cart";
import { checkout } from "@/lib/services/checkout";

export async function addToCartAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["CUSTOMER"]);
  const res = await addToCart(user.id, { productId: form.get("productId"), quantity: form.get("quantity") });
  if (!res.ok) return { error: res.error };
  revalidatePath("/carrinho");
  return { success: "Adicionado ao carrinho." };
}

export async function updateCartAction(form: FormData): Promise<void> {
  const user = await requireUser(["CUSTOMER"]);
  const data = formToObject(form);
  if (data.intent === "remove") await removeFromCart(user.id, data.productId);
  else await setCartQuantity(user.id, { productId: data.productId, quantity: data.quantity });
  revalidatePath("/carrinho");
}

export async function checkoutAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["CUSTOMER"]);
  // O formulário inteiro vai para o serviço; o schema dele descarta tudo que não for addressId/cardId.
  const res = await checkout(user.id, formToObject(form), await getRequestContext());
  if (!res.ok) return { error: res.error };
  redirect(`/checkout/pagamento/${res.orderId}`);
}
