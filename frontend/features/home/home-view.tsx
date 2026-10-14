"use client";

import { AlertCircle, ArrowRight, CalendarCheck2, CheckCircle2, Clock3, Eye, Hourglass, Layers } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Avatar, ErrorState, PriorityIcon, Skeleton, StatusIcon } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import type { Status, Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDue, formatTime, isOverdue } from "@/lib/format";
import { PageHeader } from "@/features/shell/page-header";
import { useCurrentUser } from "@/features/session/session-provider";
import { TaskDetail } from "@/features/tasks/task-detail";
import { useReferenceData, useTaskUrlState, useTasks } from "@/features/tasks/use-task-data";
import { OPEN_STATUSES, UPCOMING_DAYS, computeHomeMetrics } from "./home-metrics";
import type { DayGroup, HomeMetrics } from "./home-metrics";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const operacao = (params: Record<string, string>) => `/operacao?${new URLSearchParams(params).toString()}`;
const openLink = (extra: Record<string, string> = {}) => operacao({ ...extra, status: OPEN_STATUSES.join(",") });

/** Home: panorama da operação do escritório e o que precisa de ação agora. */
export function HomeView() {
  const user = useCurrentUser();
  const { tasks, state, retry } = useTasks(false);
  const reference = useReferenceData();
  const { openTaskId, openTask, closeTask } = useTaskUrlState();

  const metrics = useMemo(() => computeHomeMetrics(tasks, reference.users, reference.departments), [tasks, reference]);

  return (
    <>
      <PageHeader title="Home" description="Panorama da operação do escritório." />

      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Greeting name={user.name} metrics={state === "ready" ? metrics : null} />

        {state === "loading" && <HomeSkeleton />}
        {state === "error" && <ErrorState title="Não foi possível carregar o panorama" onRetry={retry} />}
        {state === "ready" && (
          <div className="animate-fade-in space-y-6">
            <KpiRow metrics={metrics} />
            <StatusBreakdown metrics={metrics} />

            <div className="grid gap-6 lg:grid-cols-5">
              <Card
                className="lg:col-span-3"
                title="Precisa de atenção"
                description="Atrasadas e urgentes, das mais antigas para as mais recentes."
                action={metrics.attentionTotal > metrics.attention.length && <SeeAll href={openLink({ visao: "tabela" })} count={metrics.attentionTotal} />}
              >
                {metrics.attention.length ? (
                  <ul>
                    {metrics.attention.map((task) => (
                      <TaskLine key={task.id} task={task} onOpen={openTask} />
                    ))}
                  </ul>
                ) : (
                  <CardEmpty icon={<CheckCircle2 size={16} />} text="Nada atrasado ou urgente. Bom trabalho!" />
                )}
              </Card>

              <Card
                className="lg:col-span-2"
                title={`Próximos ${UPCOMING_DAYS} dias`}
                description="Prazos em aberto a partir de hoje."
                action={metrics.upcomingTotal > 0 && <SeeAll href={openLink({ visao: "tabela" })} count={metrics.upcomingTotal} />}
              >
                {metrics.upcoming.length ? (
                  metrics.upcoming.map((group) => <DaySection key={group.offset} group={group} onOpen={openTask} />)
                ) : (
                  <CardEmpty icon={<CalendarCheck2 size={16} />} text="Nenhum prazo nos próximos dias." />
                )}
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DepartmentsCard metrics={metrics} />
              <TeamCard metrics={metrics} />
            </div>
          </div>
        )}
      </div>

      <TaskDetail taskId={openTaskId} onClose={closeTask} />
    </>
  );
}

/* ---------- Saudação ---------- */

function Greeting({ name, metrics }: { name: string; metrics: HomeMetrics | null }) {
  const now = new Date();
  const hour = now.getHours();
  const salutation = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = name.split(" ")[0];

  let summary: ReactNode = <Skeleton className="mt-1 h-4 w-72" />;
  if (metrics) {
    const parts: ReactNode[] = [];
    if (metrics.overdue) parts.push(<strong key="o" className="font-medium text-danger">{plural(metrics.overdue, "tarefa atrasada", "tarefas atrasadas")}</strong>);
    if (metrics.dueToday) parts.push(<strong key="t" className="font-medium text-fg">{plural(metrics.dueToday, "vence hoje", "vencem hoje")}</strong>);
    summary = parts.length ? (
      <p className="text-sm text-fg-muted">
        O escritório tem {parts.reduce<ReactNode[]>((acc, part, index) => (index ? [...acc, " e ", part] : [part]), [])}.
      </p>
    ) : (
      <p className="text-sm text-fg-muted">Nenhum prazo vencido ou para hoje. A operação está em dia.</p>
    );
  }

  return (
    <section className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {WEEKDAYS[now.getDay()]}, {now.getDate()} de {MONTHS[now.getMonth()]}
      </p>
      <h2 className="text-2xl font-semibold text-fg">
        {salutation}, {firstName}
      </h2>
      {summary}
    </section>
  );
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/* ---------- Indicadores ---------- */

function KpiRow({ metrics }: { metrics: HomeMetrics }) {
  const tiles: { label: string; value: number; href: string; icon: ReactNode; hint: string; alert?: boolean }[] = [
    { label: "Em aberto", value: metrics.open, href: openLink(), icon: <Layers size={14} />, hint: "Ainda não concluídas" },
    { label: "Atrasadas", value: metrics.overdue, href: openLink({ visao: "tabela" }), icon: <AlertCircle size={14} />, hint: "Prazo vencido", alert: metrics.overdue > 0 },
    { label: "Vencem hoje", value: metrics.dueToday, href: openLink({ visao: "tabela" }), icon: <Clock3 size={14} />, hint: "Até o fim do dia" },
    { label: "Aguardando cliente", value: metrics.waitingClient, href: operacao({ status: "waiting_client" }), icon: <Hourglass size={14} />, hint: "Dependem de terceiros" },
    { label: "Em revisão", value: metrics.inReview, href: operacao({ status: "in_review" }), icon: <Eye size={14} />, hint: "Aguardando conferência" },
    { label: "Concluídas no mês", value: metrics.doneThisMonth, href: operacao({ status: "done", visao: "tabela" }), icon: <CheckCircle2 size={14} />, hint: MONTHS[new Date().getMonth()] },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Link
            href={tile.href}
            className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong hover:bg-hover/40"
          >
            <span className={cn("flex items-center gap-1.5 text-sm", tile.alert ? "text-danger" : "text-fg-muted")}>
              <span aria-hidden>{tile.icon}</span>
              {tile.label}
            </span>
            <span className="mt-3 text-2xl font-semibold text-fg">{tile.value}</span>
            <span className="mt-0.5 flex items-center justify-between text-xs text-fg-subtle">
              {tile.hint}
              <ArrowRight size={13} aria-hidden className="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Distribuição por status ---------- */

const statusFill: Record<Exclude<Status, "canceled">, string> = {
  todo: "bg-status-todo",
  in_progress: "bg-status-progress",
  waiting_client: "bg-status-waiting",
  in_review: "bg-status-review",
  done: "bg-status-done",
};

function StatusBreakdown({ metrics }: { metrics: HomeMetrics }) {
  const [active, setActive] = useState<Status | null>(null);
  const total = metrics.statuses.reduce((sum, slice) => sum + slice.count, 0);
  const visible = metrics.statuses.filter((slice) => slice.count > 0);
  const percent = (count: number) => Math.round((count / Math.max(total, 1)) * 100);
  const dim = (status: Status) => active !== null && active !== status;

  return (
    <Card title="Tarefas por status" description={`${total} tarefas no fluxo (sem canceladas).`}>
      <div className="px-4 py-4 md:px-5" onPointerLeave={() => setActive(null)}>
        {/* Barra empilhada com 2px de respiro entre segmentos; passar o mouse destaca o segmento e sua legenda. */}
        <div className="flex h-3 gap-[2px] overflow-hidden rounded" role="img" aria-label={visible.map((slice) => `${statusLabel[slice.status]}: ${slice.count}`).join(", ")}>
          {visible.map((slice) => (
            <Link
              key={slice.status}
              href={operacao({ status: slice.status })}
              aria-hidden
              tabIndex={-1}
              title={`${statusLabel[slice.status]}: ${slice.count} (${percent(slice.count)}%)`}
              onPointerEnter={() => setActive(slice.status)}
              className={cn("h-full min-w-[4px] transition-opacity", statusFill[slice.status as Exclude<Status, "canceled">], dim(slice.status) && "opacity-30")}
              style={{ flexGrow: slice.count, flexBasis: 0 }}
            />
          ))}
        </div>
        {/* Legenda com ícone de forma + rótulo + número: o status nunca depende só da cor. */}
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {metrics.statuses.map((slice) => (
            <li key={slice.status}>
              <Link
                href={operacao({ status: slice.status })}
                onPointerEnter={() => setActive(slice.status)}
                onFocus={() => setActive(slice.status)}
                onBlur={() => setActive(null)}
                className={cn(
                  "-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm transition-[background-color,opacity] hover:bg-hover",
                  dim(slice.status) && "opacity-50",
                )}
              >
                <StatusIcon status={slice.status} />
                <span className="text-fg-muted">{statusLabel[slice.status]}</span>
                <span className="font-medium tabular-nums text-fg">{slice.count}</span>
                <span className="tabular-nums text-fg-subtle">{percent(slice.count)}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ---------- Listas de tarefas ---------- */

function TaskLine({ task, onOpen, showTime = false }: { task: Task; onOpen: (id: number) => void; showTime?: boolean }) {
  const overdue = isOverdue(task);
  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="flex h-12 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-hover/60 focus-visible:bg-hover/60 focus-visible:outline-none md:px-5"
      >
        <span className="flex shrink-0" title={statusLabel[task.status]}>
          <StatusIcon status={task.status} />
          <span className="sr-only">{statusLabel[task.status]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{task.title}</span>
          <span className="block truncate text-xs text-fg-muted">{task.client.trade_name}</span>
        </span>
        <span className="flex shrink-0" title={`Prioridade ${priorityLabel[task.priority]}`}>
          <PriorityIcon priority={task.priority} />
          <span className="sr-only">Prioridade {priorityLabel[task.priority]}</span>
        </span>
        <time
          dateTime={task.due_date}
          title={`Prazo: ${formatDateTime(task.due_date)}`}
          className={cn("w-20 shrink-0 text-right text-xs tabular-nums", overdue ? "font-medium text-danger" : "text-fg-muted")}
        >
          {overdue && <span className="sr-only">Atrasada: </span>}
          {showTime ? formatTime(task.due_date) : formatDue(task.due_date)}
        </time>
        <Avatar name={task.assignee.name} size="sm" labelled />
      </button>
    </li>
  );
}

function DaySection({ group, onOpen }: { group: DayGroup; onOpen: (id: number) => void }) {
  const date = new Date();
  date.setDate(date.getDate() + group.offset);
  const label = group.offset === 0 ? "Hoje" : group.offset === 1 ? "Amanhã" : `${WEEKDAYS[date.getDay()].replace("-feira", "")}, ${date.getDate()}`;
  return (
    <section>
      <h4 className="flex h-8 items-center justify-between border-b border-line bg-sunken/60 px-4 text-xs font-medium text-fg-muted md:px-5">
        <span className="first-letter:uppercase">{label}</span>
        <span className="tabular-nums text-fg-subtle">{group.tasks.length}</span>
      </h4>
      <ul>
        {group.tasks.map((task) => (
          <TaskLine key={task.id} task={task} onOpen={onOpen} showTime />
        ))}
      </ul>
    </section>
  );
}

/* ---------- Departamentos e equipe ---------- */

function DepartmentsCard({ metrics }: { metrics: HomeMetrics }) {
  return (
    <Card title="Departamentos" description="Tarefas concluídas sobre o total de cada área.">
      <ul className="divide-y divide-line">
        {metrics.departments.map(({ department, total, done, open, overdue }) => {
          const value = Math.round((done / Math.max(total, 1)) * 100);
          return (
            <li key={department.id}>
              <Link href={openLink({ departamento: String(department.id) })} className="block px-4 py-3 transition-colors hover:bg-hover/60 md:px-5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-fg">{department.name}</span>
                  <span className="shrink-0 tabular-nums text-fg-muted">
                    <span className="font-medium text-fg">{value}%</span> · {done} de {total}
                  </span>
                </div>
                {/* Medidor: trilho em tom claro da mesma cor do preenchimento. */}
                <div
                  role="progressbar"
                  aria-label={`${department.name}: ${value}% concluído`}
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/15"
                >
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-fg-subtle">
                  {plural(open, "em aberto", "em aberto")}
                  {overdue > 0 && <span className="text-danger"> · {plural(overdue, "atrasada", "atrasadas")}</span>}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function TeamCard({ metrics }: { metrics: HomeMetrics }) {
  const max = Math.max(1, ...metrics.team.map((member) => member.open));
  return (
    <Card
      title="Carga da equipe"
      description="Tarefas em aberto por responsável."
      action={
        <span className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" aria-hidden />Em dia</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-danger" aria-hidden />Atrasadas</span>
        </span>
      }
    >
      <ul className="divide-y divide-line">
        {metrics.team.map(({ user, open, overdue }) => (
          <li key={user.id}>
            <Link
              href={openLink({ responsavel: String(user.id), visao: "tabela" })}
              className="flex h-11 items-center gap-3 px-4 transition-colors hover:bg-hover/60 md:px-5"
            >
              <Avatar name={user.name} size="md" />
              <span className="w-32 shrink-0 truncate text-sm text-fg sm:w-40">{user.name}</span>
              <span className="flex h-2 flex-1 items-center" aria-hidden title={`${open} em aberto · ${plural(overdue, "atrasada", "atrasadas")}`}>
                  <span className="flex h-full gap-[2px] overflow-hidden rounded-sm" style={{ width: `${(open / max) * 100}%` }}>
                    {open - overdue > 0 && <span className="h-full bg-accent" style={{ flexGrow: open - overdue, flexBasis: 0 }} />}
                    {overdue > 0 && <span className="h-full bg-danger" style={{ flexGrow: overdue, flexBasis: 0 }} />}
                  </span>
              </span>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                <span className="font-medium text-fg">{open}</span>
                {overdue > 0 && <span className="text-danger"> · {overdue}</span>}
                <span className="sr-only">
                  {" "}em aberto{overdue > 0 ? `, ${overdue} atrasadas` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Estrutura ---------- */

function Card({ title, description, action, className, children }: { title: string; description?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs", className)}>
      <header className="flex min-h-12 items-center gap-3 border-b border-line px-4 py-2.5 md:px-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {description && <p className="truncate text-xs text-fg-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function SeeAll({ href, count }: { href: string; count: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg">
      Ver todas ({count}) <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

function CardEmpty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-fg-muted">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-success/10 text-success" aria-hidden>
        {icon}
      </span>
      {text}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[6.5rem] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
