"use client";

import { ArrowRight, Building, Mail, MailPlus, MoreHorizontal, Pencil, Search, SearchX, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, DropdownMenu, EmptyState, ErrorState, IconButton, Input, SegmentedControl, Select, Skeleton } from "@/components/ui";
import type { BadgeTone, SegmentedOption } from "@/components/ui";
import { api } from "@/lib/api";
import type { Department, Invite, Task, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isOpenStatus, isOverdue } from "@/lib/format";
import { labelOf, roleLabel } from "@/lib/labels";
import { useCurrentUser } from "@/features/session/session-provider";
import { PageHeader } from "@/features/shell/page-header";
import { fetchTasks } from "@/features/tasks/tasks-api";
import { DepartmentsList } from "./departments-list";
import { InviteForm } from "./invite-form";
import { InvitesList } from "./invites-list";
import { MemberEdit } from "./member-edit";
import { RoleMatrix } from "./role-matrix";
import { canManageTeam, fetchInvites } from "./team-api";

type LoadState = "loading" | "ready" | "error";
type Tab = "membros" | "convites" | "departamentos" | "perfis";

const TAB_PARAM = "aba";

const roleTone: Record<string, BadgeTone> = {
  admin: "accent",
  manager: "info",
  supervisor: "neutral",
  collaborator: "neutral",
};

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Load {
  open: number;
  overdue: number;
  inReview: number;
}

/** Equipe: quem é quem, por departamento, e a carga atual de cada pessoa. Gestores também convidam e administram acessos. */
export function TeamView() {
  const actor = useCurrentUser();
  const canManage = canManageTeam(actor);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get(TAB_PARAM);
  const tab: Tab = requestedTab === "departamentos" || requestedTab === "perfis" || (requestedTab === "convites" && canManage) ? requestedTab : "membros";

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      const [userList, departmentList, taskList, inviteList] = await Promise.all([
        api<User[]>("/users"),
        api<Department[]>("/departments"),
        fetchTasks(false),
        canManage ? fetchInvites() : Promise.resolve([]),
      ]);
      setUsers(userList);
      setDepartments(departmentList);
      setTasks(taskList);
      setInvites(inviteList);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [canManage]);

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(window.location.search);
    if (next === "membros") params.delete(TAB_PARAM);
    else params.set(TAB_PARAM, next);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  const pendingInvites = invites.filter((invite) => invite.status === "pending").length;
  const tabOptions: SegmentedOption<Tab>[] = [
    { value: "membros", label: "Membros", icon: <Users size={14} aria-hidden /> },
    ...(canManage ? [{ value: "convites" as const, label: pendingInvites ? `Convites ${pendingInvites}` : "Convites", icon: <MailPlus size={14} aria-hidden /> }] : []),
    { value: "departamentos", label: "Departamentos", icon: <Building size={14} aria-hidden /> },
    { value: "perfis", label: "Perfis de acesso", icon: <ShieldCheck size={14} aria-hidden /> },
  ];

  useEffect(() => {
    load();
  }, [load]);

  const loads = useMemo(() => {
    const map = new Map<number, Load>();
    for (const task of tasks) {
      if (!isOpenStatus(task.status)) continue;
      const entry = map.get(task.assignee_id) ?? { open: 0, overdue: 0, inReview: 0 };
      entry.open += 1;
      if (isOverdue(task)) entry.overdue += 1;
      if (task.status === "in_review") entry.inReview += 1;
      map.set(task.assignee_id, entry);
    }
    return map;
  }, [tasks]);

  const maxOpen = Math.max(1, ...Array.from(loads.values(), (entry) => entry.open));

  const groups = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const matches = users.filter((user) => {
      if (department && String(user.department_id) !== department) return false;
      if (!terms.length) return true;
      const haystack = normalize(`${user.name} ${user.email} ${user.position} ${labelOf(roleLabel, user.role)}`);
      return terms.every((term) => haystack.includes(term));
    });
    const byName = (a: User, b: User) => a.name.localeCompare(b.name, "pt-BR");
    const active = matches.filter((user) => user.active);
    const sections = departments
      .map((item) => ({ id: String(item.id), label: item.name, users: active.filter((user) => user.department_id === item.id).sort(byName) }))
      .filter((section) => section.users.length);
    const unassigned = active.filter((user) => !departments.some((item) => item.id === user.department_id)).sort(byName);
    if (unassigned.length) sections.push({ id: "none", label: "Sem departamento", users: unassigned });
    // Inativos ficam juntos no fim, para não se misturar com quem está trabalhando.
    const inactive = matches.filter((user) => !user.active).sort(byName);
    if (inactive.length) sections.push({ id: "inactive", label: "Acesso desativado", users: inactive });
    return sections;
  }, [users, departments, query, department]);

  const shown = groups.reduce((total, group) => total + group.users.length, 0);

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Pessoas, cargos e carga de trabalho atual."
        actions={
          canManage && (
            <Button variant="primary" size="sm" leadingIcon={<MailPlus size={15} aria-hidden />} onClick={() => setInviting(true)}>
              <span className="sr-only sm:not-sr-only">Convidar membro</span>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
        <SegmentedControl label="Seção" value={tab} options={tabOptions} onChange={setTab} className="max-w-full overflow-x-auto" />
        {tab === "membros" && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-line lg:block" aria-hidden />
            <Input
              size="sm"
              type="search"
              aria-label="Buscar pessoas"
              placeholder="Buscar por nome, e-mail ou cargo"
              leadingIcon={<Search size={14} />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setQuery("")}
              className="w-full sm:w-72"
            />
            <Select size="sm" aria-label="Filtrar por departamento" value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full sm:w-56">
              <option value="">Todos os departamentos</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <span className="ml-auto text-sm tabular-nums text-fg-muted" aria-live="polite">
              {shown} {shown === 1 ? "pessoa" : "pessoas"}
            </span>
          </>
        )}
      </div>

      {state === "ready" && tab === "perfis" && <RoleMatrix user={actor} users={users} />}
      {state === "ready" && tab === "convites" && <InvitesList invites={invites} onChanged={load} onInvite={() => setInviting(true)} />}
      {state === "ready" && tab === "departamentos" && (
        <DepartmentsList departments={departments} users={users} tasks={tasks} canManage={canManage} onChanged={load} />
      )}

      <div className={cn("flex-1 px-4 py-6 md:px-6", state === "ready" && tab !== "membros" && "hidden")}>
        {state === "loading" && (
          <div role="status" aria-label="Carregando" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        )}
        {state === "error" && <ErrorState title="Não foi possível carregar a equipe" onRetry={() => (setState("loading"), load())} />}
        {state === "ready" && users.length === 0 && <EmptyState icon={<Users size={18} />} title="Nenhuma pessoa cadastrada" />}
        {state === "ready" && users.length > 0 && shown === 0 && (
          <EmptyState
            icon={<SearchX size={18} />}
            title="Ninguém encontrado"
            description="Tente outro termo de busca ou departamento."
            action={
              <Button size="sm" onClick={() => (setQuery(""), setDepartment(""))}>
                Limpar busca
              </Button>
            }
          />
        )}
        {state === "ready" && shown > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`dep-${group.id}`}>
                <h2 id={`dep-${group.id}`} className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-fg">
                  {group.label}
                  <span className="font-normal tabular-nums text-fg-subtle">{group.users.length}</span>
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.users.map((user) => (
                    <li key={user.id}>
                      <MemberCard
                        user={user}
                        load={loads.get(user.id) ?? { open: 0, overdue: 0, inReview: 0 }}
                        maxOpen={maxOpen}
                        isSelf={user.id === actor.id}
                        onEdit={canManage ? () => setEditing(user) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {inviting && <InviteForm actor={actor} departments={departments} onClose={() => setInviting(false)} onCreated={() => load()} />}
      {editing && (
        <MemberEdit
          member={editing}
          actor={actor}
          departments={departments}
          openTasks={loads.get(editing.id)?.open ?? 0}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

interface MemberCardProps {
  user: User;
  load: Load;
  maxOpen: number;
  isSelf: boolean;
  /** Presente para quem pode administrar a equipe. */
  onEdit?: () => void;
}

function MemberCard({ user, load, maxOpen, isSelf, onEdit }: MemberCardProps) {
  const onTime = load.open - load.overdue;
  return (
    <article className={cn("flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-xs", !user.active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size="lg" className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{user.name}</p>
          <p className="truncate text-sm text-fg-muted">{user.position}</p>
        </div>
        <Badge tone={user.active ? roleTone[user.role] ?? "neutral" : "neutral"}>{user.active ? labelOf(roleLabel, user.role) : "Inativo"}</Badge>
        {onEdit && (
          <DropdownMenu
            label={`Ações para ${user.name}`}
            align="end"
            trigger={(props) => <IconButton {...props} size="sm" className="-mr-1.5 -mt-1" label={`Mais ações para ${user.name}`} icon={<MoreHorizontal size={15} />} />}
            items={[{ label: isSelf ? "Editar meus dados" : "Editar acesso", icon: <Pencil size={14} />, onSelect: onEdit }]}
          />
        )}
      </div>

      <a href={`mailto:${user.email}`} className="mt-3 inline-flex min-w-0 items-center gap-1.5 self-start text-sm text-fg-muted transition-colors hover:text-accent">
        <Mail size={13} aria-hidden className="shrink-0" />
        <span className="truncate">{user.email}</span>
      </a>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-fg-muted">Em aberto</span>
          <span className="tabular-nums">
            <span className="font-medium text-fg">{load.open}</span>
            {load.overdue > 0 && <span className="text-danger"> · {load.overdue} atrasada{load.overdue > 1 ? "s" : ""}</span>}
          </span>
        </div>
        {/* Carga relativa à pessoa mais ocupada; o trecho vermelho são as atrasadas. */}
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden>
          <div className="flex h-full gap-[2px]" style={{ width: `${(load.open / maxOpen) * 100}%` }}>
            {onTime > 0 && <span className="h-full rounded-l-full bg-accent" style={{ flexGrow: onTime, flexBasis: 0 }} />}
            {load.overdue > 0 && <span className="h-full bg-danger" style={{ flexGrow: load.overdue, flexBasis: 0 }} />}
          </div>
        </div>
        <Link
          href={`/operacao?responsavel=${user.id}&visao=tabela`}
          className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Ver tarefas
          <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
