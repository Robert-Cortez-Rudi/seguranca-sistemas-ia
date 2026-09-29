// Popula o banco com clientes e compras FICTÍCIOS, passando pelas mesmas regras da aplicação:
// validação Zod, política de senha, cifragem AES-256-GCM, estoque em transação, preço do banco,
// pagamento pelo webhook assinado com HMAC (A08) e AuditLog (A09).
//
// Uso (com a aplicação rodando, para o pagamento):
//   npm run popular -- --clientes 5 --compras 2 --pagamento aprovar
//
// Opções:
//   --clientes N     clientes novos a criar (padrão 3; 0 = só compras com clientes do script já existentes)
//   --compras N      pedidos por cliente (padrão 1)
//   --pagamento X    aprovar | recusar | aleatorio | nenhum (padrão aprovar)
//   --prefixo P      início do e-mail dos clientes (padrão "cliente"); só letras, números, ponto e hífen
//   --senha S        senha dos clientes criados (padrão SENHA_PADRAO abaixo, documentada no README)
//
// Sai com código 1 se algo falhar, para o Agendador de Tarefas registrar a falha.
// Nunca imprime senha, CPF ou cartão (A09).

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { db } from "../lib/db";
import type { RequestContext } from "../lib/request";
import { addCard, createAddress } from "../lib/services/account";
import { createCustomer } from "../lib/services/auth";
import { addToCart } from "../lib/services/cart";
import { checkout } from "../lib/services/checkout";
import { simulatePayment } from "../lib/services/payment-simulator";
import { generateCpf, UFS } from "../lib/validators";

// Só para o ambiente local, como as senhas do seed.
const SENHA_PADRAO = "Popular-Script-2026!";
const DOMINIO = "secureshop.local";
const CTX: RequestContext = { ip: "script-local", userAgent: "scripts/popular.ts" };

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olívia", "Paulo"];
const SOBRENOMES = ["Almeida", "Barbosa", "Costa", "Dias", "Ferreira", "Gomes", "Lima", "Martins", "Oliveira", "Pereira", "Ribeiro", "Souza"];
const CIDADES: Partial<Record<(typeof UFS)[number], string>> = {
  SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Belo Horizonte", PR: "Curitiba", RS: "Porto Alegre", BA: "Salvador", PE: "Recife", DF: "Brasília",
};

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function lerOpcoes() {
  const { values } = parseArgs({
    options: {
      clientes: { type: "string", default: "3" },
      compras: { type: "string", default: "1" },
      pagamento: { type: "string", default: "aprovar" },
      prefixo: { type: "string", default: "cliente" },
      senha: { type: "string", default: SENHA_PADRAO },
    },
  });
  const clientes = Number(values.clientes);
  const compras = Number(values.compras);
  if (!Number.isInteger(clientes) || clientes < 0 || clientes > 200) throw new Error("--clientes deve ser um inteiro de 0 a 200");
  if (!Number.isInteger(compras) || compras < 0 || compras > 20) throw new Error("--compras deve ser um inteiro de 0 a 20");
  if (!["aprovar", "recusar", "aleatorio", "nenhum"].includes(values.pagamento)) {
    throw new Error("--pagamento deve ser aprovar, recusar, aleatorio ou nenhum");
  }
  if (!/^[a-z0-9.-]{1,30}$/.test(values.prefixo)) throw new Error("--prefixo aceita só letras minúsculas, números, ponto e hífen");
  return { clientes, compras, pagamento: values.pagamento, prefixo: values.prefixo, senha: values.senha };
}

async function criarCliente(prefixo: string, senha: string): Promise<{ id: string; email: string }> {
  const nome = `${pick(NOMES)} ${pick(SOBRENOMES)}`;
  // Carimbo de data + sufixo aleatório: rodar o script de novo nunca repete e-mail.
  const d = new Date();
  const carimbo = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]
    .map((n) => String(n).padStart(2, "0")).join(""); // hora local: AAAAMMDDhhmm
  const email = `${prefixo}.${carimbo}.${randomBytes(3).toString("hex")}@${DOMINIO}`;

  const res = await createCustomer(
    { name: nome, email, cpf: generateCpf(), phone: `119${String(int(0, 99_999_999)).padStart(8, "0")}`, password: senha, confirmPassword: senha },
    CTX,
  );
  if (!res.ok) throw new Error(`cadastro de ${email}: ${res.error} ${JSON.stringify(res.fieldErrors ?? {})}`);

  const uf = pick(Object.keys(CIDADES) as (typeof UFS)[number][]);
  const end = await createAddress(res.userId, {
    label: "Casa", recipient: nome, cep: String(int(10_000_000, 99_999_999)), street: "Rua Fictícia",
    number: String(int(1, 9999)), complement: "", district: "Centro", city: CIDADES[uf], uf,
  });
  if (!end.ok) throw new Error(`endereço de ${email}: ${end.error}`);

  const ano = new Date().getFullYear() + 3;
  const cartao = await addCard(res.userId, { number: "4242424242424242", holder: nome, expMonth: 12, expYear: ano, cvv: "123" });
  if (!cartao.ok) throw new Error(`cartão de ${email}: ${cartao.error}`);

  return { id: res.userId, email };
}

async function comprar(userId: string, pagamento: string): Promise<string> {
  const produtos = await db.product.findMany({ where: { active: true, stock: { gt: 0 } }, select: { id: true, stock: true } });
  if (produtos.length === 0) throw new Error("nenhum produto com estoque");

  // 1 a 3 produtos diferentes, 1 a 3 unidades cada (sem passar do estoque).
  const escolhidos = [...produtos].sort(() => Math.random() - 0.5).slice(0, int(1, Math.min(3, produtos.length)));
  for (const p of escolhidos) {
    const r = await addToCart(userId, { productId: p.id, quantity: Math.min(int(1, 3), p.stock) });
    if (!r.ok) throw new Error(`carrinho: ${r.error}`);
  }

  const [end, cartao] = await Promise.all([
    db.address.findFirst({ where: { userId }, select: { id: true } }),
    db.paymentCard.findFirst({ where: { userId }, select: { id: true } }),
  ]);
  const pedido = await checkout(userId, { addressId: end?.id, cardId: cartao?.id }, CTX);
  if (!pedido.ok) throw new Error(`checkout: ${pedido.error}`);

  let situacao = "aguardando pagamento";
  if (pagamento !== "nenhum") {
    const aprovar = pagamento === "aleatorio" ? Math.random() < 0.8 : pagamento === "aprovar";
    try {
      const ok = await simulatePayment(userId, pedido.orderId, aprovar);
      situacao = ok ? (aprovar ? "pago" : "recusado") : "pagamento rejeitado pelo webhook";
    } catch {
      situacao = "aguardando pagamento (a aplicação não está rodando em APP_URL)";
    }
  }
  return `pedido ${pedido.orderId} de ${reais(pedido.totalCents)}: ${situacao}`;
}

async function main() {
  const opt = lerOpcoes();
  console.log(`[${new Date().toLocaleString("pt-BR")}] popular: ${opt.clientes} cliente(s), ${opt.compras} compra(s) cada, pagamento=${opt.pagamento}`);

  const clientes: { id: string; email: string }[] = [];
  for (let i = 0; i < opt.clientes; i++) {
    const c = await criarCliente(opt.prefixo, opt.senha);
    clientes.push(c);
    console.log(`  + cliente ${c.email}`);
  }
  if (opt.clientes === 0) {
    // Sem clientes novos: compra com os que o script criou antes (mesmo prefixo).
    clientes.push(...(await db.user.findMany({
      where: { role: "CUSTOMER", active: true, email: { startsWith: `${opt.prefixo}.`, endsWith: `@${DOMINIO}` } },
      select: { id: true, email: true },
    })));
    if (clientes.length === 0) throw new Error(`nenhum cliente com o prefixo "${opt.prefixo}" encontrado`);
  }

  let falhas = 0;
  for (const c of clientes) {
    for (let i = 0; i < opt.compras; i++) {
      try {
        console.log(`  $ ${c.email}: ${await comprar(c.id, opt.pagamento)}`);
      } catch (err) {
        falhas++;
        console.error(`  ! ${c.email}: ${(err as Error).message}`);
      }
    }
  }
  console.log(`Concluído: ${opt.clientes} cliente(s) criados, ${clientes.length * opt.compras - falhas} pedido(s), ${falhas} falha(s).`);
  if (falhas > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`Erro: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
