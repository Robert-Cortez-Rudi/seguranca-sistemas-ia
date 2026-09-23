const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatMoney = (cents: number) => brl.format(cents / 100);

export const formatDate = (d: Date) =>
  d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export const ORDER_STATUS_LABEL = { PENDING_PAYMENT: "Aguardando pagamento", PAID: "Pago", CANCELED: "Cancelado" } as const;
export const SHIPMENT_STATUS_LABEL = { PAGO: "Pago", SEPARANDO: "Separando", ENVIADO: "Enviado", ENTREGUE: "Entregue" } as const;
