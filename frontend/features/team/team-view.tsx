"use client";

import { ArrowRight, Mail, Search, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, Select, Skeleton } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { api } from "@/lib/api";
import type { Department, Task, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isOpenStatus, isOverdue } from "@/lib/format";
import { labelOf, roleLabel } from "@/lib/labels";
import { PageHeader } from "@/features/shell/page-header";
import { fetchTasks } from "@/features/tasks/tasks-api";

type LoadState = "loading" | "ready" | "error";

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

/** Equipe: quem é quem, por departamento, e a carga atual de cada pessoa. */
export function TeamView() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");

  const load = useCallback(async () => {
    try {
      const [userList, departmentList, taskList] = await Promise.all([api<User[]>("/users"), api<Department[]>("/departments"), fetchTasks(false)]);
      setUsers(userList);
      setDepartments(departmentList);
      setTasks(taskList);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

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
    const sections = departments
      .map((item) => ({ id: String(item.id), label: item.name, users: matches.filter((user) => user.department_id === item.id).sort(byName) }))
      .filter((section) => section.users.length);
    const unassigned = matches.filter((user) => !departments.some((item) => item.id === user.department_id)).sort(byName);
    if (unassigned.length) sections.push({ id: "none", label: "Sem departamento", users: unassigned });
    return sections;
  }, [users, departments, query, department]);

  const shown = groups.reduce((total, group) => total + group.users.length, 0);

  return (
    <>
      <PageHeader title="Equipe" description="Pessoas, cargos e carga de trabalho atual." />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
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
        <Select aria-label="Filtrar por departamento" value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full sm:w-56 [&_select]:h-8 [&_select]:text-sm">
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
      </div>

      <div className="flex-1 px-4 py-6 md:px-6">
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
                      <MemberCard user={user} load={loads.get(user.id) ?? { open: 0, overdue: 0, inReview: 0 }} maxOpen={maxOpen} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MemberCard({ user, load, maxOpen }: { user: User; load: Load; maxOpen: number }) {
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
