import { PinIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { listAddresses } from "@/lib/services/account";
import { deleteAddressAction } from "../actions";
import { AddressForm } from "./address-form";

// A01/A04 — Endereços do próprio cliente (cifrados no banco).
export default async function AddressesPage() {
  const user = await requireUser(["CUSTOMER"]);
  const addresses = await listAddresses(user.id);
  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Endereços</h1>
        <p className="mt-1 text-sm text-muted">Onde entregar suas compras. Os endereços ficam cifrados no banco.</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="card flex flex-col gap-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">
                <span className="inline-block text-ink">
                  <PinIcon className="size-4" />
                </span>
                {a.label}
              </span>
              <span className="badge bg-paper">{a.uf}</span>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold">{a.recipient}</p>
              <p>
                {a.street}, {a.number} {a.complement}
              </p>
              <p className="text-muted">
                {a.district}, {a.city}/{a.uf} — CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </p>
            </div>
            <form action={deleteAddressAction} className="mt-auto flex justify-end border-t border-line pt-3">
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" className="btn btn-danger btn-sm">Remover</button>
            </form>
          </li>
        ))}
        {addresses.length === 0 && (
          <li className="card flex flex-col items-center gap-2 p-8 text-center sm:col-span-2">
            <PinIcon className="size-8 text-muted" />
            <p className="font-semibold">Nenhum endereço cadastrado</p>
            <p className="text-sm text-muted">Cadastre um endereço abaixo para receber suas compras.</p>
          </li>
        )}
      </ul>

      <section className="card">
        <div className="card-header">
          <h2 className="section-title">Novo endereço</h2>
        </div>
        <div className="p-5 sm:p-6">
          <AddressForm />
        </div>
      </section>
    </main>
  );
}
