// Seed com dados FICTÍCIOS: CPFs gerados, cartão de teste 4242, endereços inventados.
// As senhas abaixo valem só para o ambiente local e estão documentadas no README.
import { existsSync } from "node:fs";
import { PrismaClient, Role } from "@prisma/client";
import { blindIndex, encrypt } from "../lib/crypto";
import { hashPassword } from "../lib/password";
import { generateCpf } from "../lib/validators";

if (!process.env.ENCRYPTION_KEY && existsSync(".env")) process.loadEnvFile(".env");

const db = new PrismaClient();

const USERS: { email: string; name: string; role: Role; password: string }[] = [
  { email: "admin@secureshop.local", name: "Ana Admin", role: "ADMIN", password: "Admin-Seed-2026!" },
  { email: "vendedor1@secureshop.local", name: "Bruno Vendedor", role: "SELLER", password: "Vendedor1-Seed-2026!" },
  { email: "vendedor2@secureshop.local", name: "Carla Vendedora", role: "SELLER", password: "Vendedor2-Seed-2026!" },
  { email: "cliente1@secureshop.local", name: "Diego Cliente", role: "CUSTOMER", password: "Cliente1-Seed-2026!" },
  { email: "cliente2@secureshop.local", name: "Elisa Cliente", role: "CUSTOMER", password: "Cliente2-Seed-2026!" },
  { email: "cliente3@secureshop.local", name: "Fábio Cliente", role: "CUSTOMER", password: "Cliente3-Seed-2026!" },
];

const PRODUCTS: Record<string, { name: string; description: string; priceCents: number; stock: number }[]> = {
  "vendedor1@secureshop.local": [
    { name: "Fone Bluetooth", description: "Fone sem fio com cancelamento de ruído.", priceCents: 19990, stock: 25 },
    { name: "Teclado Mecânico", description: "Switches marrons, layout ABNT2.", priceCents: 34900, stock: 10 },
    { name: "Mouse Sem Fio", description: "Sensor óptico de 16000 DPI.", priceCents: 12950, stock: 40 },
  ],
  "vendedor2@secureshop.local": [
    { name: "Garrafa Térmica 1L", description: "Mantém a temperatura por 24h.", priceCents: 8990, stock: 60 },
    { name: "Mochila Notebook", description: "Compartimento acolchoado para 15,6\".", priceCents: 15900, stock: 15 },
    { name: "Caderno Pontilhado", description: "A5, 160 páginas.", priceCents: 3990, stock: 100 },
  ],
};

async function main() {
  // Recria do zero: ordem das filhas para as pais.
  await db.$transaction([
    db.auditLog.deleteMany(), db.shipment.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(),
    db.cartItem.deleteMany(), db.cart.deleteMany(), db.product.deleteMany(), db.paymentCard.deleteMany(),
    db.address.deleteMany(), db.recoveryCode.deleteMany(), db.passwordResetToken.deleteMany(),
    db.session.deleteMany(), db.rateLimit.deleteMany(), db.user.deleteMany(),
  ]);

  for (const u of USERS) {
    const cpf = generateCpf();
    const user = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: await hashPassword(u.password),
        cpfEnc: encrypt(cpf, "user.cpf"),
        cpfHash: blindIndex(cpf),
        phoneEnc: encrypt(`119${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, "user.phone"),
      },
    });

    for (const p of PRODUCTS[u.email] ?? []) {
      await db.product.create({ data: { ...p, sellerId: user.id } });
    }

    if (u.role === "CUSTOMER") {
      const address = {
        recipient: u.name,
        cep: "01310100",
        street: "Avenida Fictícia",
        number: String(100 + USERS.indexOf(u)),
        complement: "",
        district: "Centro",
        city: "São Paulo",
      };
      await db.address.create({
        data: { userId: user.id, label: "Casa", uf: "SP", payloadEnc: encrypt(JSON.stringify(address), "address.payload") },
      });
      await db.paymentCard.create({
        data: {
          userId: user.id,
          numberEnc: encrypt("4242424242424242", "card.number"),
          holderEnc: encrypt(u.name.toUpperCase(), "card.holder"),
          last4: "4242",
          brand: "VISA",
          expMonth: 12,
          expYear: 2030,
        },
      });
    }
  }
  console.log(`Seed concluído: ${USERS.length} usuários.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
