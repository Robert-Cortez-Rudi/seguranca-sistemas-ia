import { requireUser } from "@/lib/auth";
import { listAddresses } from "@/lib/services/account";
import { deleteAddressAction } from "../actions";
import { AddressForm } from "./address-form";

// A01/A04 — Endereços do próprio cliente (cifrados no banco).
export default async function AddressesPage() {
  const user = await requireUser(["CUSTOMER"]);
  const addresses = await listAddresses(user.id);
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <h1 className="page-title">Endereços</h1>
      <ul className="stagger space-y-4">
        {addresses.map((a) => (
          <li key={a.id} className="card flex items-start justify-between gap-4 p-5 text-sm">
            <div className="space-y-1">
              <p className="badge bg-bubble">{a.label}</p>
              <p className="font-semibold">
                {a.recipient} — {a.street}, {a.number} {a.complement}
              </p>
              <p className="text-muted">
                {a.district}, {a.city}/{a.uf} — CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </p>
            </div>
            <form action={deleteAddressAction}>
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" className="link link-danger cursor-pointer text-xs">Remover</button>
            </form>
          </li>
        ))}
        {addresses.length === 0 && <li className="text-sm text-muted">Nenhum endereço cadastrado.</li>}
      </ul>
      <section className="card p-6">
        <h2 className="section-title mb-5">Novo endereço</h2>
        <AddressForm />
      </section>
    </main>
  );
}
