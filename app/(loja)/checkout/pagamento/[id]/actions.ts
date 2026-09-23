"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/schemas";
import { simulatePayment } from "@/lib/services/payment-simulator";

// A08 — Dispara o gateway simulado. A posse do pedido é conferida em simulatePayment.
export async function payAction(form: FormData): Promise<void> {
  const user = await requireUser(["CUSTOMER"]);
  const orderId = idSchema.safeParse(form.get("orderId"));
  if (!orderId.success) redirect("/conta/pedidos");
  await simulatePayment(user.id, orderId.data, form.get("result") === "approve");
  redirect(`/conta/pedidos/${orderId.data}`);
}
