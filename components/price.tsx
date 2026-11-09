import { formatMoney } from "@/lib/format";

// Preço no formato de etiqueta de loja: "R$ 159" grande e os centavos pequenos no alto.
// O leitor de tela recebe o valor inteiro ("R$ 159,00"), não as partes.
export function Price({ cents, className = "" }: { cents: number; className?: string }) {
  const full = formatMoney(cents);
  const i = full.lastIndexOf(",");
  return (
    <span className={`price ${className}`}>
      <span className="sr-only">{full}</span>
      <span aria-hidden="true">
        {full.slice(0, i)}
        <span className="cents">,{full.slice(i + 1)}</span>
      </span>
    </span>
  );
}
