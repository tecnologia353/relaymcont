"use client";

import { ArrowUpRight, ChevronDown, FileStack, Pencil, Play, Plus, SearchX, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Progress,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonRows,
  StatusIcon,
  useToast,
} from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import { api, statusLabel } from "@/lib/api";
import type { Client, Department, Process, ProcessTemplate, Status, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { competenceKey } from "@/lib/competence";
import { emit, useRelayEvent } from "@/lib/events";
import { formatDue, isOverdue } from "@/lib/format";
import { usePermissions } from "@/features/session/use-permissions";
import { Forbidden } from "@/features/shell/forbidden";
import { PageHeader } from "@/features/shell/page-header";
import { StatusMenu } from "@/features/tasks/task-property-menus";
import { updateTask } from "@/features/tasks/tasks-api";
import { ProcessLaunch } from "./process-launch";
import { cancelProcess, fetchProcesses, fetchTemplates } from "./processes-api";
import { dueMonthLabel, processStateLabel, processStateTone, summarizeProcess } from "./process-utils";
import type { ProcessState, ProcessSummary } from "./process-utils";
import { TemplateForm } from "./template-form";

type LoadState = "loading" | "ready" | "error";
type Tab = "andamento" | "modelos";
type StateFilter = "open" | "overdue" | "done" | "all";

const TAB_PARAM = "aba";
const PROCESS_PARAM = "processo";

const tabOptions: SegmentedOption<Tab>[] = [
  { value: "andamento", label: "Em andamento", icon: <Workflow size={14} aria-hidden /> },
  { value: "modelos", label: "Modelos", icon: <FileStack size={14} aria-hidden /> },
];

const stateMatches: Record<StateFilter, (state: ProcessState) => boolean> = {
  open: (state) => state === "on_track" || state === "overdue",
  overdue: (state) => state === "overdue",
  done: (state) => state === "done",
  all: () => true,
};

type Row = { process: Process; summary: ProcessSummary };

/** Etapas são tarefas "Etapa - Cliente"; no contexto do processo, o cliente já está no título do painel. */
const stepTitle = (title: string, client: Client) => title.replace(new RegExp(`\\s-\\s${client.trade_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");

export function ProcessesView() {
  const can = usePermissions();
  if (!can.canViewProcesses()) return <Forbidden title="Processos" />;
  return <Processes />;
}

function Processes() {
  const can = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get(TAB_PARAM) === "modelos" ? "modelos" : "andamento";
  const openProcessId = Number(searchParams.get(PROCESS_PARAM)) || null;

  const [processes, setProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [stateFilter, setStateFilter] = useState<StateFilter>("open");
  const [competence, setCompetence] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");

  const [launching, setLaunching] = useState<{ templateId?: number } | null>(null);
  const [editing, setEditing] = useState<{ template?: ProcessTemplate } | null>(null);

  const load = useCallback(async () => {
    try {
      const [processList, templateList, clientList, userList, departmentList] = await Promise.all([
        fetchProcesses(),
        fetchTemplates(),
        api<Client[]>("/clients"),
        api<User[]>("/users"),
        api<Department[]>("/departments"),
      ]);
      setProcesses(processList);
      setTemplates(templateList);
      setClients(clientList);
      setUsers(userList.filter((user) => user.active));
      setDepartments(departmentList);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRelayEvent("tasks:changed", load);

  const navigate = (update: (params: URLSearchParams) => void, mode: "push" | "replace" = "replace") => {
    const params = new URLSearchParams(window.location.search);
    update(params);
    const query = params.toString();
    router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const setTab = (next: Tab) => navigate((params) => (next === "andamento" ? params.delete(TAB_PARAM) : params.set(TAB_PARAM, next)));
  const openProcess = (id: number) => navigate((params) => params.set(PROCESS_PARAM, String(id)), "push");
  const closeProcess = () => navigate((params) => params.delete(PROCESS_PARAM));

  const rows: Row[] = useMemo(
    () =>
      processes
        .map((process) => ({ process, summary: summarizeProcess(process) }))
        .sort(
          (a, b) =>
            competenceKey(b.process.competence) - competenceKey(a.process.competence) ||
            a.process.name.localeCompare(b.process.name) ||
            a.process.client.trade_name.localeCompare(b.process.client.trade_name),
        ),
    [processes],
  );

  const competences = useMemo(
    () => [...new Set(processes.map((process) => process.competence))].sort((a, b) => competenceKey(b) - competenceKey(a)),
    [processes],
  );

  /** Linhas filtradas por competência e modelo — base das contagens do filtro de situação. */
  const scoped = rows.filter(
    ({ process }) => (!competence || process.competence === competence) && (!templateFilter || process.template_id === Number(templateFilter)),
  );
  const filtered = scoped.filter(({ summary }) => stateMatches[stateFilter](summary.state));
  const countOf = (filter: StateFilter) => scoped.filter(({ summary }) => stateMatches[filter](summary.state)).length;

  const stateOptions: SegmentedOption<StateFilter>[] = [
    { value: "open", label: `Em aberto ${countOf("open")}` },
    { value: "overdue", label: `Atrasados ${countOf("overdue")}` },
    { value: "done", label: `Concluídos ${countOf("done")}` },
    { value: "all", label: "Todos" },
  ];

  const activeByTemplate = useMemo(() => {
    const map = new Map<number, number>();
    for (const { process, summary } of rows) {
      if (stateMatches.open(summary.state)) map.set(process.template_id, (map.get(process.template_id) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const runnable = templates.filter((template) => can.canRunProcess(template));
  const canManage = can.canManageTemplates();

  const openRow = rows.find(({ process }) => process.id === openProcessId) ?? null;
  const filtersActive = Boolean(competence || templateFilter || stateFilter !== "open");

  const headerActions = (
    <>
      {tab === "modelos" && canManage && (
        <Button size="sm" leadingIcon={<Plus size={15} aria-hidden />} onClick={() => setEditing({})}>
          <span className="sr-only sm:not-sr-only">Novo modelo</span>
        </Button>
      )}
      {(state !== "ready" || runnable.length > 0) && (
        <Button variant="primary" size="sm" leadingIcon={<Play size={14} aria-hidden />} onClick={() => setLaunching({})} disabled={state !== "ready"}>
          <span className="sr-only sm:not-sr-only">Iniciar processo</span>
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader title="Processos" description="Rotinas mensais geradas a partir de modelos." actions={headerActions} />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
        <SegmentedControl label="Visualização" value={tab} options={tabOptions} onChange={setTab} />
        {tab === "andamento" && state === "ready" && processes.length > 0 && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
            <Select aria-label="Competência" value={competence} onChange={(e) => setCompetence(e.target.value)} size="sm" className="w-auto">
              <option value="">Todas as competências</option>
              {competences.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select aria-label="Modelo" value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} size="sm" className="w-auto max-w-56">
              <option value="">Todos os modelos</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <SegmentedControl label="Situação" value={stateFilter} options={stateOptions} onChange={setStateFilter} className="max-w-full overflow-x-auto" />
          </>
        )}
        {tab === "modelos" && state === "ready" && (
          <span className="ml-auto text-sm tabular-nums text-fg-muted">
            {templates.length} {templates.length === 1 ? "modelo" : "modelos"}
          </span>
        )}
      </div>

      <div className="flex-1">
        {state === "loading" && (tab === "andamento" ? <SkeletonRows rows={10} /> : <TemplatesSkeleton />)}
        {state === "error" && <ErrorState title="Não foi possível carregar os processos" onRetry={() => (setState("loading"), load())} />}

        {state === "ready" && tab === "andamento" && (
          <>
            {processes.length === 0 ? (
              <EmptyState
                icon={<Workflow size={18} />}
                title="Nenhum processo iniciado"
                description={
                  templates.length
                    ? "Inicie um processo para gerar, de uma vez, as tarefas da competência para vários clientes."
                    : "Crie um modelo com as etapas de uma rotina mensal e depois inicie o processo para os clientes."
                }
                action={
                  runnable.length ? (
                    <Button size="sm" variant="primary" leadingIcon={<Play size={14} aria-hidden />} onClick={() => setLaunching({})}>
                      Iniciar processo
                    </Button>
                  ) : (
                    canManage && (
                      <Button size="sm" leadingIcon={<Plus size={14} aria-hidden />} onClick={() => (setTab("modelos"), setEditing({}))}>
                        Criar modelo
                      </Button>
                    )
                  )
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<SearchX size={18} />}
                title="Nenhum processo encontrado"
                description="Nenhum processo corresponde aos filtros aplicados."
                action={
                  filtersActive && (
                    <Button size="sm" onClick={() => (setCompetence(""), setTemplateFilter(""), setStateFilter("all"))}>
                      Limpar filtros
                    </Button>
                  )
                }
              />
            ) : (
              <ProcessTable rows={filtered} onOpen={openProcess} />
            )}
          </>
        )}

        {state === "ready" && tab === "modelos" && (
          <TemplatesGrid
            templates={templates}
            departments={departments}
            activeByTemplate={activeByTemplate}
            onCreate={canManage ? () => setEditing({}) : undefined}
            onEdit={canManage ? (template) => setEditing({ template }) : undefined}
            onLaunch={(template) => setLaunching({ templateId: template.id })}
            canLaunch={(template) => can.canRunProcess(template)}
          />
        )}
      </div>

      <ProcessDetail row={openRow} onClose={closeProcess} onChanged={load} />

      {launching && (
        <ProcessLaunch
          templates={runnable}
          clients={clients}
          users={users}
          processes={processes}
          initialTemplateId={launching.templateId}
          onClose={() => setLaunching(null)}
          onLaunched={async (launchedCompetence) => {
            setLaunching(null);
            await load();
            setCompetence(launchedCompetence);
            setTemplateFilter("");
            setStateFilter("open");
            setTab("andamento");
          }}
        />
      )}
      {editing && (
        <TemplateForm
          template={editing.template}
          departments={departments}
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

/* ---------- Tabela de processos ---------- */

function ProcessTable({ rows, onOpen }: { rows: Row[]; onOpen: (id: number) => void }) {
  const columns = ["Cliente", "Processo", "Competência", "Responsável", "Progresso", "Próxima etapa", "Situação"];
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[64rem] table-fixed border-separate border-spacing-0 text-sm">
        {/* Cliente e Processo dividem a sobra; as demais colunas têm largura fixa. */}
        <colgroup>
          <col />
          <col />
          <col className="w-28" />
          <col className="w-44" />
          <col className="w-36" />
          <col className="w-60" />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-fg-muted">
            {columns.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={cn("h-9 border-b border-line bg-sunken/60 px-3 font-medium", index === 0 && "pl-4 md:pl-6", index === columns.length - 1 && "pr-4 md:pr-6")}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ process, summary }) => {
            const cell = "h-14 border-b border-line px-3";
            const percent = summary.total ? (summary.done / summary.total) * 100 : 0;
            return (
              <tr key={process.id} onClick={() => onOpen(process.id)} className="cursor-pointer transition-colors hover:bg-hover/60 focus-within:bg-hover/60">
                <td className={cn(cell, "pl-4 md:pl-6")}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(process.id);
                    }}
                    className="block max-w-full truncate text-left font-medium text-fg focus-visible:underline focus-visible:outline-none"
                  >
                    {process.client.trade_name}
                  </button>
                </td>
                <td className={cell}>
                  <span className="block truncate text-fg">{process.name}</span>
                  <span className="block truncate text-xs text-fg-muted">{process.department.name}</span>
                </td>
                <td className={cn(cell, "tabular-nums text-fg-muted")}>{process.competence}</td>
                <td className={cell}>
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={process.assignee.name} size="sm" />
                    <span className="truncate text-fg-muted">{process.assignee.name}</span>
                  </span>
                </td>
                <td className={cell}>
                  <span className="flex items-center gap-2">
                    <Progress value={percent} label={`${summary.done} de ${summary.total} etapas concluídas`} tone={summary.state === "done" ? "success" : "accent"} className="w-20" />
                    <span className="text-xs tabular-nums text-fg-muted">
                      {summary.done}/{summary.total}
                    </span>
                  </span>
                </td>
                <td className={cell}>
                  {summary.next ? (
                    <span className="block min-w-0">
                      <span className="block truncate text-fg">{stepTitle(summary.next.title, process.client)}</span>
                      <span className={cn("block text-xs tabular-nums", isOverdue(summary.next) ? "font-medium text-danger" : "text-fg-muted")}>
                        {formatDue(summary.next.due_date)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
                <td className={cn(cell, "pr-4 md:pr-6")}>
                  <Badge tone={processStateTone[summary.state]} dot>
                    {processStateLabel[summary.state]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Detalhe do processo ---------- */

function ProcessDetail({ row, onClose, onChanged }: { row: Row | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const process = row?.process;
  const summary = row?.summary;

  const changeStatus = async (taskId: number, status: Status) => {
    try {
      await updateTask(taskId, { status });
      emit("tasks:changed");
      await onChanged();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível alterar o status", description: (error as Error).message });
    }
  };

  const cancel = async () => {
    if (!process) return;
    setCanceling(true);
    try {
      await cancelProcess(process.id);
      toast({ tone: "success", title: "Processo cancelado", description: `${process.name} · ${process.client.trade_name}` });
      emit("tasks:changed");
      setConfirmCancel(false);
      await onChanged();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível cancelar o processo", description: (error as Error).message });
    } finally {
      setCanceling(false);
    }
  };

  const can = usePermissions();
  const cancellable = summary && process && (summary.state === "on_track" || summary.state === "overdue") && can.canRunProcess({ department_id: process.department.id });

  return (
    <>
      <Sheet
        open={Boolean(row)}
        onClose={onClose}
        size="lg"
        title={process?.name ?? ""}
        description={process ? `${process.client.trade_name} · Competência ${process.competence}` : undefined}
        footer={
          cancellable ? (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancelar processo
            </Button>
          ) : undefined
        }
      >
        {process && summary && (
          <div className="space-y-6">
            <dl className="divide-y divide-line rounded-lg border border-line">
              <InfoRow label="Situação">
                <Badge tone={processStateTone[summary.state]} dot>
                  {processStateLabel[summary.state]}
                </Badge>
              </InfoRow>
              <InfoRow label="Progresso">
                <span className="flex items-center justify-end gap-2">
                  <Progress
                    value={summary.total ? (summary.done / summary.total) * 100 : 0}
                    label={`${summary.done} de ${summary.total} etapas concluídas`}
                    tone={summary.state === "done" ? "success" : "accent"}
                    className="w-24"
                  />
                  <span className="tabular-nums">
                    {summary.done} de {summary.total} etapas
                  </span>
                </span>
              </InfoRow>
              <InfoRow label="Departamento">{process.department.name}</InfoRow>
              <InfoRow label="Responsável">
                <span className="flex items-center justify-end gap-2">
                  <Avatar name={process.assignee.name} size="sm" />
                  {process.assignee.name}
                </span>
              </InfoRow>
            </dl>

            <section aria-labelledby="etapas-titulo">
              <h3 id="etapas-titulo" className="mb-2 text-sm font-semibold text-fg">
                Etapas
              </h3>
              <ol className="relative space-y-px">
                {process.tasks.map((task, index) => {
                  const overdue = isOverdue(task);
                  return (
                    <li key={task.id} className="group flex min-h-11 items-center gap-2 rounded-md px-1 transition-colors hover:bg-hover/60">
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-fg-subtle">{index + 1}</span>
                      <StatusMenu
                        value={task.status}
                        disabled={!can.canWorkOnTask(task)}
                        onChange={(status) => changeStatus(task.id, status)}
                        trigger={(props) => (
                          <StepStatusButton {...props} aria-label={`Status: ${statusLabel[task.status]}. Alterar`}>
                            <StatusIcon status={task.status} />
                          </StepStatusButton>
                        )}
                      />
                      <span className={cn("min-w-0 flex-1 truncate text-sm", task.status === "done" || task.status === "canceled" ? "text-fg-muted" : "text-fg")}>
                        {stepTitle(task.title, process.client)}
                      </span>
                      <span className={cn("shrink-0 text-xs tabular-nums", overdue ? "font-medium text-danger" : "text-fg-muted")}>{formatDue(task.due_date)}</span>
                      <Link
                        href={`/tarefas?tarefa=${task.id}`}
                        aria-label={`Abrir tarefa ${stepTitle(task.title, process.client)}`}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
                      >
                        <ArrowUpRight size={14} aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {process.tasks.length === 0 && (
                <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-fg-muted">Este processo não tem etapas.</p>
              )}
            </section>
          </div>
        )}
      </Sheet>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        dismissible={!canceling}
        size="sm"
        title="Cancelar processo?"
        description="As etapas em aberto serão canceladas. As concluídas continuam no histórico."
        footer={
          <>
            <Button onClick={() => setConfirmCancel(false)} disabled={canceling}>
              Voltar
            </Button>
            <Button variant="danger" loading={canceling} onClick={cancel}>
              Cancelar processo
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {process?.name} · {process?.client.trade_name} · {process?.competence}
        </p>
      </Dialog>
    </>
  );
}

function StepStatusButton({ children, ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button type="button" {...props} className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1 transition-colors hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent">
      {children}
      <ChevronDown size={11} className="text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </button>
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

/* ---------- Modelos ---------- */

interface TemplatesGridProps {
  templates: ProcessTemplate[];
  departments: Department[];
  activeByTemplate: Map<number, number>;
  /** Ausentes para quem não pode criar ou editar modelos. */
  onCreate?: () => void;
  onEdit?: (template: ProcessTemplate) => void;
  onLaunch: (template: ProcessTemplate) => void;
  canLaunch: (template: ProcessTemplate) => boolean;
}

function TemplatesGrid({ templates, departments, activeByTemplate, onCreate, onEdit, onLaunch, canLaunch }: TemplatesGridProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<FileStack size={18} />}
        title="Nenhum modelo cadastrado"
        description="Um modelo descreve as etapas de uma rotina mensal, como o fechamento fiscal ou a folha de pagamento."
        action={
          onCreate && (
            <Button size="sm" variant="primary" leadingIcon={<Plus size={14} aria-hidden />} onClick={onCreate}>
              Criar modelo
            </Button>
          )
        }
      />
    );
  }
  const departmentName = (id: number) => departments.find((department) => department.id === id)?.name ?? "—";
  return (
    <ul className="grid gap-3 px-4 py-6 sm:grid-cols-2 md:px-6 xl:grid-cols-3">
      {templates.map((template) => {
        const active = activeByTemplate.get(template.id) ?? 0;
        return (
          <li key={template.id} className="flex flex-col rounded-lg border border-line bg-surface">
            <div className="flex-1 px-4 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-fg">{template.name}</h3>
                <Badge className="shrink-0">{departmentName(template.department_id)}</Badge>
              </div>
              {template.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{template.description}</p>}
              <ol className="mt-3 space-y-1">
                {template.steps.slice(0, 5).map((step) => (
                  <li key={step.id} className="flex items-center gap-2 text-sm">
                    <span className="w-12 shrink-0 text-xs tabular-nums text-fg-subtle">Dia {step.due_day}</span>
                    <span className="truncate text-fg">{step.title}</span>
                  </li>
                ))}
                {template.steps.length > 5 && <li className="pl-14 text-xs text-fg-muted">+{template.steps.length - 5} etapas</li>}
              </ol>
            </div>
            <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate px-2 text-xs text-fg-muted" title={`Prazos: ${dueMonthLabel[template.due_month_offset].toLowerCase()}`}>
                {template.steps.length} {template.steps.length === 1 ? "etapa" : "etapas"} · {active} em aberto
              </span>
              {onEdit && (
                <Button size="sm" variant="ghost" leadingIcon={<Pencil size={13} aria-hidden />} onClick={() => onEdit(template)}>
                  Editar
                </Button>
              )}
              {canLaunch(template) && (
                <Button size="sm" variant="ghost" leadingIcon={<Play size={13} aria-hidden />} onClick={() => onLaunch(template)}>
                  Iniciar
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="grid gap-3 px-4 py-6 sm:grid-cols-2 md:px-6 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-lg" />
      ))}
    </div>
  );
}
