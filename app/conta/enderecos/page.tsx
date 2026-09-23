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
      <h1 className="text-2xl font-bold">Endereços</h1>
      <ul className="space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between rounded-lg bg-white p-4 text-sm shadow-sm">
            <div>
              <p className="font-semibold">{a.label}</p>
              <p>
                {a.recipient} — {a.street}, {a.number} {a.complement}
              </p>
              <p>
                {a.district}, {a.city}/{a.uf} — CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </p>
            </div>
            <form action={deleteAddressAction}>
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" className="text-red-600 hover:underline">Remover</button>
            </form>
          </li>
        ))}
        {addresses.length === 0 && <li className="text-sm text-slate-500">Nenhum endereço cadastrado.</li>}
      </ul>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Novo endereço</h2>
        <AddressForm />
      </section>
    </main>
  );
}
