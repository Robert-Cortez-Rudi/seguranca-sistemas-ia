import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/services/admin";
import { updateUserAction } from "../actions";

// A01 — Gestão de usuários (ADMIN). Sem CPF, telefone ou hash de senha na listagem.
export default async function UsersPage() {
  const admin = await requireUser(["ADMIN"]);
  const users = await listUsers();
  const now = new Date();
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Usuários</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] rounded-lg bg-white text-sm shadow-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">Perfil</th><th className="p-2">Situação</th><th className="p-2">Desde</th><th className="p-2">Ações</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = u.lockedUntil && u.lockedUntil > now;
              const self = u.id === admin.id;
              return (
                <tr key={u.id} className="border-t align-top">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}{u.totpEnabled ? " · 2FA" : ""}</td>
                  <td className="p-2">{!u.active ? "Desativado" : locked ? "Bloqueado" : "Ativo"}</td>
                  <td className="p-2">{formatDate(u.createdAt)}</td>
                  <td className="p-2">
                    {self ? (
                      <span className="text-slate-400">você</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <form action={updateUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button name="intent" value={u.active ? "deactivate" : "activate"} className="text-indigo-600 hover:underline">
                            {u.active ? "Desativar" : "Reativar"}
                          </button>
                        </form>
                        {locked && (
                          <form action={updateUserAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button name="intent" value="unlock" className="text-indigo-600 hover:underline">Desbloquear</button>
                          </form>
                        )}
                        <form action={updateUserAction} className="flex gap-1">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="intent" value="role" />
                          <select name="role" defaultValue={u.role} aria-label="Perfil" className="rounded border border-slate-300 text-xs">
                            <option>CUSTOMER</option>
                            <option>SELLER</option>
                            <option>ADMIN</option>
                          </select>
                          <button className="text-indigo-600 hover:underline">Salvar</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
