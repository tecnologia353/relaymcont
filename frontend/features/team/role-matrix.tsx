import { Check, Minus } from "lucide-react";
import type { Role, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { labelOf, roleDescription, roleLabel } from "@/lib/labels";
import { permissionMatrix, roleOrder } from "@/lib/permissions";
import type { Access } from "@/lib/permissions";

/** Quadro "quem pode o quê", gerado de lib/permissions.ts — muda junto com as regras. */
export function RoleMatrix({ user, users }: { user: User; users: User[] }) {
  const count = (role: Role) => users.filter((item) => item.active && item.role === role).length;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roleOrder.map((role) => (
          <li key={role} className={cn("rounded-lg border bg-surface p-4", user.role === role ? "border-accent/60 ring-1 ring-accent/30" : "border-line")}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg">{labelOf(roleLabel, role)}</h3>
              <span className="text-xs tabular-nums text-fg-subtle">
                {count(role)} {count(role) === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">{roleDescription[role]}</p>
            {user.role === role && <p className="mt-2 text-xs font-medium text-accent">Seu perfil</p>}
          </li>
        ))}
      </ul>

      <div className="thin-scroll overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-muted">
              <th scope="col" className="h-9 border-b border-line bg-sunken/60 px-4 font-medium">
                Ação
              </th>
              {roleOrder.map((role) => (
                <th key={role} scope="col" className={cn("h-9 w-36 border-b border-line bg-sunken/60 px-3 text-center font-medium", user.role === role && "text-accent")}>
                  {labelOf(roleLabel, role)}
                </th>
              ))}
            </tr>
          </thead>
          {permissionMatrix.map((area) => (
            <tbody key={area.area}>
              <tr>
                <th colSpan={roleOrder.length + 1} scope="colgroup" className="border-b border-line px-4 pb-1.5 pt-4 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  {area.area}
                </th>
              </tr>
              {area.rows.map((row) => (
                <tr key={row.action}>
                  <th scope="row" className="h-10 border-b border-line px-4 text-left font-normal text-fg">
                    {row.action}
                  </th>
                  {roleOrder.map((role) => (
                    <td key={role} className={cn("h-10 border-b border-line px-3 text-center", user.role === role && "bg-accent/5")}>
                      <AccessCell access={row.access[role]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="text-xs text-fg-subtle">
        “Departamento” vale para o departamento da própria pessoa. Quem não tem departamento vê apenas as tarefas atribuídas a si.
      </p>
    </div>
  );
}

function AccessCell({ access }: { access: Access }) {
  if (access === true) {
    return (
      <span className="inline-flex text-success" title="Pode">
        <Check size={16} aria-hidden />
        <span className="sr-only">Pode</span>
      </span>
    );
  }
  if (access === false) {
    return (
      <span className="inline-flex text-fg-subtle" title="Não pode">
        <Minus size={16} aria-hidden />
        <span className="sr-only">Não pode</span>
      </span>
    );
  }
  return <span className="inline-flex h-5 items-center rounded bg-hover px-1.5 text-xs font-medium text-fg-muted">{access}</span>;
}
