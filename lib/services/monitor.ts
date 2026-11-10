import "server-only";
import type { OrderStatus, Role, TransactionResult } from "@prisma/client";
import { decrypt } from "../crypto";
import { db } from "../db";
import { maskCard, maskCpf, maskPhone } from "../mask";

// A01/A04/A09 — Painel de monitoramento do ADMIN (/admin/monitor).
// Mostra quantos usuários, produtos comprados e transações existem e os registros de cada um.
// Dados sensíveis saem SEMPRE mascarados (CPF ***.456.789-**, cartão **** 4242),
// e nenhuma consulta traz hash de senha, segredo TOTP ou número de cartão (select explícito).

export const MONITOR_PAGE_SIZE = 25;
export const MONITOR_TABS = ["usuarios", "produtos", "transacoes"] as const;
export type MonitorTab = (typeof MONITOR_TABS)[number];

/** Janela usada no indicador "nos últimos minutos" dos cartões de contagem. */
export const RECENT_WINDOW_MIN = 10;

export function parseMonitorTab(value: unknown): MonitorTab {
  return MONITOR_TABS.includes(value as MonitorTab) ? (value as MonitorTab) : "usuarios";
}

export function parseMonitorPage(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(1, Math.min(10_000, n)) : 1;
}

/** Decifra e mascara; se o dado estiver corrompido, mostra só a máscara (falha fechada, sem stack). */
function safeMask(enc: string | null, context: string, mask: (v: string) => string): string {
  if (!enc) return "—";
  try {
    return mask(decrypt(enc, context));
  } catch {
    return mask("");
  }
}

export async function getMonitorCounts() {
  const since = new Date(Date.now() - RECENT_WINDOW_MIN * 60_000);
  const [usersByRole, usersRecent, ordersByStatus, ordersRecent, items, itemsRecent, itemsPaid, txByResult, txRecent, approved] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.count({ where: { createdAt: { gte: since } } }),
    db.orderItem.aggregate({ _count: { _all: true }, _sum: { quantity: true } }),
    db.orderItem.count({ where: { order: { createdAt: { gte: since } } } }),
    db.orderItem.aggregate({ where: { order: { status: "PAID" } }, _sum: { quantity: true } }),
    db.paymentTransaction.groupBy({ by: ["result"], _count: { _all: true } }),
    db.paymentTransaction.count({ where: { createdAt: { gte: since } } }),
    db.paymentTransaction.aggregate({ where: { result: "APPROVED" }, _sum: { amountCents: true } }),
  ]);

  const sum = (rows: { _count: { _all: number } }[]) => rows.reduce((t, r) => t + r._count._all, 0);

  return {
    users: {
      total: sum(usersByRole),
      recent: usersRecent,
      byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])) as Partial<Record<Role, number>>,
    },
    orders: {
      total: sum(ordersByStatus),
      recent: ordersRecent,
      byStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count._all])) as Partial<Record<OrderStatus, number>>,
    },
    // Cada linha é um produto dentro de um pedido (OrderItem).
    products: {
      total: items._count._all,
      recent: itemsRecent,
      units: items._sum.quantity ?? 0,
      unitsPaid: itemsPaid._sum.quantity ?? 0,
    },
    transactions: {
      total: sum(txByResult),
      recent: txRecent,
      byResult: Object.fromEntries(txByResult.map((r) => [r.result, r._count._all])) as Partial<Record<TransactionResult, number>>,
      approvedCents: approved._sum.amountCents ?? 0,
    },
    generatedAt: new Date(),
  };
}

const pageArgs = (page: number) => ({ skip: (page - 1) * MONITOR_PAGE_SIZE, take: MONITOR_PAGE_SIZE });
const pagesFor = (total: number) => Math.max(1, Math.ceil(total / MONITOR_PAGE_SIZE));

export async function listMonitorUsers(page: number) {
  const [rows, total] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lockedUntil: true,
        totpEnabled: true,
        cpfEnc: true,
        phoneEnc: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    }),
    db.user.count(),
  ]);
  const now = new Date();
  return {
    total,
    pages: pagesFor(total),
    rows: rows.map(({ cpfEnc, phoneEnc, lockedUntil, _count, ...u }) => ({
      ...u,
      cpf: safeMask(cpfEnc, "user.cpf", maskCpf),
      phone: safeMask(phoneEnc, "user.phone", maskPhone),
      locked: Boolean(lockedUntil && lockedUntil > now),
      orders: _count.orders,
    })),
  };
}

/** Produtos comprados: uma linha por item de pedido, com o produto, quem comprou e quem vendeu. */
export async function listMonitorProducts(page: number) {
  const [rows, total] = await Promise.all([
    db.orderItem.findMany({
      select: {
        id: true,
        productId: true,
        productName: true, // nome gravado no momento da compra
        quantity: true,
        unitPriceCents: true, // preço lido do banco no checkout (A06)
        product: { select: { priceCents: true, stock: true, active: true, seller: { select: { name: true, email: true } } } },
        order: {
          select: {
            id: true,
            status: true,
            shippingUf: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            paymentCard: { select: { last4: true, brand: true } },
          },
        },
      },
      orderBy: [{ order: { createdAt: "desc" } }, { id: "asc" }],
      ...pageArgs(page),
    }),
    db.orderItem.count(),
  ]);
  return {
    total,
    pages: pagesFor(total),
    rows: rows.map(({ product, order, ...i }) => ({
      ...i,
      totalCents: i.unitPriceCents * i.quantity,
      currentPriceCents: product.priceCents,
      stock: product.stock,
      productActive: product.active,
      seller: product.seller,
      orderId: order.id,
      status: order.status,
      uf: order.shippingUf,
      createdAt: order.createdAt,
      customer: order.user,
      card: `${order.paymentCard.brand} ${maskCard(order.paymentCard.last4)}`,
    })),
  };
}

export async function listMonitorTransactions(page: number) {
  const [rows, total] = await Promise.all([
    db.paymentTransaction.findMany({
      select: {
        id: true,
        eventId: true,
        orderId: true,
        gatewayStatus: true,
        amountCents: true,
        result: true,
        reason: true,
        createdAt: true,
        order: { select: { user: { select: { email: true } }, paymentCard: { select: { last4: true, brand: true } } } },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    }),
    db.paymentTransaction.count(),
  ]);
  return {
    total,
    pages: pagesFor(total),
    rows: rows.map(({ order, ...t }) => ({
      ...t,
      customer: order.user.email,
      card: `${order.paymentCard.brand} ${maskCard(order.paymentCard.last4)}`,
    })),
  };
}
