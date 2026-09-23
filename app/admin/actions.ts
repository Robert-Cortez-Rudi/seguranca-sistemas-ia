"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getRequestContext } from "@/lib/request";
import { formToObject } from "@/lib/schemas";
import { updateUser } from "@/lib/services/admin";

// A01 — Gestão de usuários: só ADMIN, conferido de novo na action.
export async function updateUserAction(form: FormData): Promise<void> {
  const admin = await requireUser(["ADMIN"]);
  await updateUser(admin.id, formToObject(form), await getRequestContext());
  revalidatePath("/admin/usuarios");
}
