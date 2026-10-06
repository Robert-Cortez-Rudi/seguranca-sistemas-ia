import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/services/admin";
import { updateUserAction } from "../actions";

const ROLE_BADGE = { CUSTOMER: "bg-paper", SELLER: "bg-bubble", ADMIN: "bg-sun" } as const;

// A01 — Gestão de usuários (ADMIN). Sem CPF, telefone ou hash de senha na listagem.
export default async function UsersPage() {
  const admin = await requireUser(["ADMIN"]);
  const users = await listUsers();
  const now = new Date();
  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-10">
      <div className="space-y-3">
        <Link href="/admin" className="link text-sm">← Auditoria</Link>
        <h1 className="page-title">Usuários</h1>
      </div>
      <div className="table-wrap">
        <table className="table-pop min-w-[760px] text-sm">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Desde</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = u.lockedUntil && u.lockedUntil > now;
              const self = u.id === admin.id;
              return (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}{u.totpEnabled ? " · 2FA" : ""}</span>
                  </td>
                  <td>
                    <span className={`badge ${!u.active ? "bg-coral" : locked ? "bg-sun" : "bg-mint"}`}>
                      {!u.active ? "Desativado" : locked ? "Bloqueado" : "Ativo"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td>
                    {self ? (
                      <span className="text-muted">você</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button name="intent" value={u.active ? "deactivate" : "activate"} className="btn btn-sm">
                            {u.active ? "Desativar" : "Reativar"}
                          </button>
                        </form>
                        {locked && (
                          <form action={updateUserAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button name="intent" value="unlock" className="btn btn-sm btn-sun">Desbloquear</button>
                          </form>
                        )}
                        <form action={updateUserAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="intent" value="role" />
                          <select name="role" defaultValue={u.role} aria-label="Perfil" className="input w-auto px-2 py-1 text-xs">
                            <option>CUSTOMER</option>
                            <option>SELLER</option>
                            <option>ADMIN</option>
                          </select>
                          <button className="btn btn-sm btn-blue">Salvar</button>
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
