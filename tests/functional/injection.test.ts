import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { login, LOGIN_ERROR, register } from "@/lib/services/auth";
import { addToCart } from "@/lib/services/cart";
import { getProduct } from "@/lib/services/catalog";
import { requestPasswordReset, RESET_REQUEST_MESSAGE } from "@/lib/services/password";
import { createProduct } from "@/lib/services/seller";
import { generateCpf } from "@/lib/validators";
import { resetDb } from "../helpers/db";
import { createUser, ctx } from "../helpers/factory";

beforeEach(resetDb);

const SQLI = ["' OR 1=1--", "admin'--", "1; DROP TABLE \"User\";--", "' UNION SELECT * FROM \"User\"--"];
const XSS = "<script>alert(1)</script>";

describe("injeção de SQL (A05)", () => {
  it.each(SQLI)("login com %s não autentica e não quebra", async (payload) => {
    await createUser({ email: "alvo@teste.local" });
    expect(await login({ email: payload, password: payload }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
    expect(await login({ email: "alvo@teste.local", password: payload }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
  });

  it("payloads em ids e e-mails são recusados pela validação, e as tabelas continuam intactas", async () => {
    const user = await createUser();
    for (const p of SQLI) {
      expect(await getProduct(p)).toBeNull();
      expect((await addToCart(user.id, { productId: p, quantity: 1 })).ok).toBe(false);
      expect(await requestPasswordReset({ email: p }, ctx())).toEqual({ ok: true, message: RESET_REQUEST_MESSAGE });
    }
    expect(await db.user.count()).toBe(1);
  });

  it("payload de SQL em campo de texto é gravado literalmente (consulta parametrizada)", async () => {
    const seller = await createUser({ role: "SELLER" });
    const res = await createProduct(seller.id, { name: SQLI[2], description: SQLI[0], priceCents: 100, stock: 1 });
    if (!res.ok) throw new Error(res.error);
    expect((await getProduct(res.id))?.name).toBe(SQLI[2]);
    expect(await db.user.count()).toBe(1);
  });
});

describe("XSS (A05)", () => {
  it("<script> é aceito como texto e devolvido sem alteração; o React escapa na saída", async () => {
    const seller = await createUser({ role: "SELLER" });
    const res = await createProduct(seller.id, { name: XSS, description: `<img src=x onerror=alert(2)>`, priceCents: 100, stock: 1 });
    if (!res.ok) throw new Error(res.error);
    const product = await getProduct(res.id);
    expect(product?.name).toBe(XSS);
  });

  it("<script> no e-mail do cadastro é recusado pela validação", async () => {
    const res = await register(
      { name: "X", email: `${XSS}@teste.local`, cpf: generateCpf(), phone: "11987654321", password: "Senha-Bem-Forte-123", confirmPassword: "Senha-Bem-Forte-123" },
      ctx(),
    );
    expect(res.ok).toBe(false);
  });
});
