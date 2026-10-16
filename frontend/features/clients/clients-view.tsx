"use client";

import { ArrowRight, Building2, Mail, Phone, Plus, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SegmentedControl,
  Select,
  Sheet,
  SkeletonRows,
  StatusIcon,
  Textarea,
  buttonClasses,
  useToast,
} from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import { api } from "@/lib/api";
import type { Client, Task, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDue, isOpenStatus, isOverdue } from "@/lib/format";
import { clientStatusLabel, labelOf } from "@/lib/labels";
import { usePermissions } from "@/features/session/use-permissions";
import { PageHeader } from "@/features/shell/page-header";
import { fetchTasks } from "@/features/tasks/tasks-api";

type LoadState = "loading" | "ready" | "error";
type StatusFilter = "active" | "inactive" | "all";

const TAX_REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"];
const CLIENT_PARAM = "cliente";

const statusOptions: SegmentedOption<StatusFilter>[] = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "all", label: "Todos" },
];

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");

/** 12345678000190 → 12.345.678/0001-90, formatando enquanto digita. */
function maskCnpj(value: string): string {
  const d = digits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

interface ClientStats {
  open: number;
  overdue: number;
}

export function ClientsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get(CLIENT_PARAM)) || null;

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [clientList, userList, taskList] = await Promise.all([api<Client[]>("/clients"), api<User[]>("/users"), fetchTasks(false)]);
      setClients(clientList);
      setUsers(userList);
      setTasks(taskList);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const map = new Map<number, ClientStats>();
    for (const task of tasks) {
      if (!isOpenStatus(task.status)) continue;
      const entry = map.get(task.client_id) ?? { open: 0, overdue: 0 };
      entry.open += 1;
      if (isOverdue(task)) entry.overdue += 1;
      map.set(task.client_id, entry);
    }
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return clients.filter((client) => {
      if (status !== "all" && client.status !== status) return false;
      if (!terms.length) return true;
      const haystack = normalize(`${client.trade_name} ${client.legal_name} ${client.cnpj} ${digits(client.cnpj)} ${client.tax_regime}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [clients, query, status]);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const selected = clients.find((client) => client.id === selectedId) ?? null;

  const select = (id: number | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set(CLIENT_PARAM, String(id));
    else params.delete(CLIENT_PARAM);
    const search = params.toString();
    router[id ? "push" : "replace"](search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  const canCreate = usePermissions().canManageClients();
  const newClientButton = canCreate && (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={15} aria-hidden />} onClick={() => setCreating(true)}>
      <span className="sr-only sm:not-sr-only">Novo cliente</span>
    </Button>
  );

  return (
    <>
      <PageHeader title="Clientes" description="Empresas atendidas pelo escritório." actions={newClientButton} />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
        <Input
          size="sm"
          type="search"
          aria-label="Buscar clientes"
          placeholder="Buscar por nome, CNPJ ou regime"
          leadingIcon={<Search size={14} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setQuery("")}
          className="w-full sm:w-72"
        />
        <SegmentedControl label="Situação" value={status} options={statusOptions} onChange={setStatus} />
        <span className="ml-auto text-sm tabular-nums text-fg-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      <div className="flex-1">
        {state === "loading" && <SkeletonRows rows={10} />}
        {state === "error" && <ErrorState title="Não foi possível carregar os clientes" onRetry={() => (setState("loading"), load())} />}
        {state === "ready" && clients.length === 0 && (
          <EmptyState
            icon={<Building2 size={18} />}
            title="Nenhum cliente cadastrado"
            description="Cadastre as empresas atendidas para vincular tarefas a elas."
            action={newClientButton}
          />
        )}
        {state === "ready" && clients.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={<SearchX size={18} />}
            title="Nenhum cliente encontrado"
            description="Tente outro termo de busca ou altere a situação."
            action={
              <Button size="sm" onClick={() => (setQuery(""), setStatus("all"))}>
                Limpar busca
              </Button>
            }
          />
        )}
        {state === "ready" && filtered.length > 0 && (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-muted">
                  {["Cliente", "CNPJ", "Regime", "Responsável interno", "Tarefas em aberto", "Situação"].map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={cn("h-9 border-b border-line bg-sunken/60 px-3 font-medium", index === 0 && "pl-4 md:pl-6", index === 5 && "pr-4 md:pr-6")}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const owner = client.internal_owner_id ? usersById.get(client.internal_owner_id) : undefined;
                  const clientStats = stats.get(client.id);
                  const cell = "h-14 border-b border-line px-3";
                  return (
                    <tr key={client.id} onClick={() => select(client.id)} className="cursor-pointer transition-colors hover:bg-hover/60 focus-within:bg-hover/60">
                      <td className={cn(cell, "max-w-0 pl-4 md:pl-6")}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            select(client.id);
                          }}
                          className="block max-w-full text-left focus-visible:outline-none focus-visible:[&>span:first-child]:underline"
                        >
                          <span className="block truncate font-medium text-fg">{client.trade_name}</span>
                          <span className="block truncate text-xs text-fg-muted">{client.legal_name}</span>
                        </button>
                      </td>
                      <td className={cn(cell, "w-48 font-mono text-xs tabular-nums text-fg-muted")}>{client.cnpj}</td>
                      <td className={cn(cell, "w-40")}>
                        <Badge>{client.tax_regime}</Badge>
                      </td>
                      <td className={cn(cell, "w-48")}>
                        {owner ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar name={owner.name} size="sm" />
                            <span className="truncate text-fg-muted">{owner.name}</span>
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className={cn(cell, "w-36 tabular-nums")}>
                        <span className="font-medium text-fg">{clientStats?.open ?? 0}</span>
                        {clientStats?.overdue ? <span className="text-danger"> · {clientStats.overdue} atrasada{clientStats.overdue > 1 ? "s" : ""}</span> : null}
                      </td>
                      <td className={cn(cell, "w-28 pr-4 md:pr-6")}>
                        <Badge tone={client.status === "active" ? "success" : "neutral"} dot>
                          {labelOf(clientStatusLabel, client.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientDetail
        client={selected}
        owner={selected?.internal_owner_id ? usersById.get(selected.internal_owner_id) : undefined}
        tasks={selected ? tasks.filter((task) => task.client_id === selected.id && isOpenStatus(task.status)) : []}
        onClose={() => select(null)}
      />
      {creating && (
        <ClientCreate
          users={users.filter((user) => user.active)}
          onClose={() => setCreating(false)}
          onCreated={async (client) => {
            setCreating(false);
            await load();
            setStatus("active");
            select(client.id);
          }}
        />
      )}
    </>
  );
}

/* ---------- Detalhe ---------- */

function ClientDetail({ client, owner, tasks, onClose }: { client: Client | null; owner?: User; tasks: Task[]; onClose: () => void }) {
  const sorted = [...tasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return (
    <Sheet open={Boolean(client)} onClose={onClose} title={client?.trade_name ?? ""} description={client?.legal_name}>
      {client && (
        <div className="space-y-6">
          <dl className="divide-y divide-line rounded-lg border border-line">
            <InfoRow label="CNPJ">
              <span className="font-mono text-xs tabular-nums">{client.cnpj}</span>
            </InfoRow>
            <InfoRow label="Regime tributário">{client.tax_regime}</InfoRow>
            <InfoRow label="Situação">
              <Badge tone={client.status === "active" ? "success" : "neutral"} dot>
                {labelOf(clientStatusLabel, client.status)}
              </Badge>
            </InfoRow>
            <InfoRow label="Responsável interno">
              {owner ? (
                <span className="flex items-center gap-2">
                  <Avatar name={owner.name} size="sm" />
                  {owner.name}
                </span>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow label="Telefone">
              {client.phone ? (
                <a href={`tel:${digits(client.phone)}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                  <Phone size={13} aria-hidden /> {client.phone}
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow label="E-mail">
              {client.email ? (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                  <Mail size={13} aria-hidden /> {client.email}
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
          </dl>

          {client.notes && (
            <section>
              <h3 className="mb-1.5 text-sm font-semibold text-fg">Observações</h3>
              <p className="whitespace-pre-line text-sm text-fg-muted">{client.notes}</p>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                Tarefas em aberto <span className="font-normal tabular-nums text-fg-subtle">{tasks.length}</span>
              </h3>
              <Link href={`/operacao?cliente=${client.id}&visao=tabela`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Ver na Operação <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
            {sorted.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {sorted.map((task) => (
                  <li key={task.id}>
                    <Link href={`/tarefas?tarefa=${task.id}`} className="flex h-11 items-center gap-2.5 px-3 text-sm transition-colors hover:bg-hover/60">
                      <StatusIcon status={task.status} />
                      <span className="min-w-0 flex-1 truncate text-fg">{task.title}</span>
                      <span className={cn("shrink-0 text-xs tabular-nums", isOverdue(task) ? "font-medium text-danger" : "text-fg-muted")}>
                        {formatDue(task.due_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-fg-muted">Nenhuma tarefa em aberto para este cliente.</p>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-fg">{children}</dd>
    </div>
  );
}

/* ---------- Cadastro ---------- */

interface ClientForm {
  trade_name: string;
  legal_name: string;
  cnpj: string;
  tax_regime: string;
  internal_owner_id: string;
  phone: string;
  email: string;
  notes: string;
}

type Errors = Partial<Record<keyof ClientForm, string>>;
const FORM_ID = "novo-cliente";

function validate(form: ClientForm): Errors {
  const errors: Errors = {};
  if (!form.trade_name.trim()) errors.trade_name = "Informe o nome fantasia.";
  if (!form.legal_name.trim()) errors.legal_name = "Informe a razão social.";
  if (digits(form.cnpj).length !== 14) errors.cnpj = "O CNPJ deve ter 14 dígitos.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Informe um e-mail válido.";
  return errors;
}

function ClientCreate({ users, onClose, onCreated }: { users: User[]; onClose: () => void; onCreated: (client: Client) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm>({ trade_name: "", legal_name: "", cnpj: "", tax_regime: TAX_REGIMES[0], internal_owner_id: "", phone: "", email: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof ClientForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="${firstInvalid}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const client = await api<Client>("/clients", {
        method: "POST",
        body: JSON.stringify({
          trade_name: form.trade_name.trim(),
          legal_name: form.legal_name.trim(),
          cnpj: form.cnpj,
          tax_regime: form.tax_regime,
          internal_owner_id: form.internal_owner_id ? Number(form.internal_owner_id) : undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast({ tone: "success", title: "Cliente cadastrado", description: client.trade_name });
      onCreated(client);
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível cadastrar o cliente", description: (error as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!submitting}
      title="Novo cliente"
      description="Campos sem a marcação “Opcional” são obrigatórios."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
            Cadastrar cliente
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
        <Field label="Nome fantasia" error={errors.trade_name}>
          {(control) => <Input {...control} name="trade_name" value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} data-autofocus />}
        </Field>
        <Field label="Razão social" error={errors.legal_name}>
          {(control) => <Input {...control} name="legal_name" value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} placeholder="Ex.: Empresa ABC Ltda." />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="CNPJ" error={errors.cnpj}>
            {(control) => (
              <Input
                {...control}
                name="cnpj"
                inputMode="numeric"
                value={form.cnpj}
                onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="font-mono tabular-nums"
              />
            )}
          </Field>
          <Field label="Regime tributário">
            {(control) => (
              <Select {...control} name="tax_regime" value={form.tax_regime} onChange={(e) => set("tax_regime", e.target.value)}>
                {TAX_REGIMES.map((regime) => (
                  <option key={regime}>{regime}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Responsável interno" optional>
          {(control) => (
            <Select {...control} name="internal_owner_id" value={form.internal_owner_id} onChange={(e) => set("internal_owner_id", e.target.value)}>
              <option value="">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Telefone" optional>
            {(control) => <Input {...control} name="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 90000-0000" />}
          </Field>
          <Field label="E-mail" optional error={errors.email}>
            {(control) => <Input {...control} name="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contato@empresa.com.br" />}
          </Field>
        </div>
        <Field label="Observações" optional>
          {(control) => <Textarea {...control} name="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />}
        </Field>
      </form>
    </Sheet>
  );
}
