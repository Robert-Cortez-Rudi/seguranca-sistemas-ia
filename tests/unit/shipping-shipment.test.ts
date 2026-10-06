import { describe, expect, it } from "vitest";
import { canTransition, nextShipmentStatus } from "@/lib/shipment";
import { calcShippingCents, FREE_SHIPPING_FROM_CENTS } from "@/lib/shipping";

describe("frete (A06)", () => {
  it("por região e grátis a partir de R$ 500", () => {
    expect(calcShippingCents("SP", 1000)).toBe(1500);
    expect(calcShippingCents("RS", 1000)).toBe(2500);
    expect(calcShippingCents("AM", 1000)).toBe(3500);
    expect(calcShippingCents("AM", 50000)).toBe(0);
  });

  it("o limite do frete grátis é exato", () => {
    expect(calcShippingCents("SP", FREE_SHIPPING_FROM_CENTS - 1)).toBe(1500);
    expect(calcShippingCents("SP", FREE_SHIPPING_FROM_CENTS)).toBe(0);
  });

  it("UF desconhecida paga a faixa mais cara, nunca frete zero", () => {
    expect(calcShippingCents("XX", 1000)).toBe(3500);
  });
});

describe("fluxo de entrega (A06)", () => {
  it("transições: só o próximo passo", () => {
    expect(canTransition("PAGO", "SEPARANDO")).toBe(true);
    expect(canTransition("SEPARANDO", "ENVIADO")).toBe(true);
    expect(canTransition("ENVIADO", "ENTREGUE")).toBe(true);
    expect(canTransition("PAGO", "ENTREGUE")).toBe(false);
    expect(canTransition("ENVIADO", "PAGO")).toBe(false);
    expect(canTransition("ENTREGUE", "ENTREGUE")).toBe(false);
  });

  it("próximo status segue PAGO → SEPARANDO → ENVIADO → ENTREGUE e termina", () => {
    expect(nextShipmentStatus("PAGO")).toBe("SEPARANDO");
    expect(nextShipmentStatus("SEPARANDO")).toBe("ENVIADO");
    expect(nextShipmentStatus("ENVIADO")).toBe("ENTREGUE");
    expect(nextShipmentStatus("ENTREGUE")).toBeNull();
  });
});
