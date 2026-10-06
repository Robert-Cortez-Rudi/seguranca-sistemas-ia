const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatMoney = (cents: number) => brl.format(cents / 100);

export const formatDate = (d: Date) =>
  d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export const ORDER_STATUS_LABEL = { PENDING_PAYMENT: "Aguardando pagamento", PAID: "Pago", CANCELED: "Cancelado" } as const;
export const SHIPMENT_STATUS_LABEL = { PAGO: "Pago", SEPARANDO: "Separando", ENVIADO: "Enviado", ENTREGUE: "Entregue" } as const;

// Cor do bloco que representa o produto (classes .swatch-0 a .swatch-4), estável por id.
export const swatchClass = (id: string) => `swatch-${[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5}`;

export const ORDER_STATUS_BADGE = { PENDING_PAYMENT: "bg-sun", PAID: "bg-mint", CANCELED: "bg-coral" } as const;
