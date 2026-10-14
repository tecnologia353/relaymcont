"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, PriorityTag, StatusIcon, priorityOrder, statusOrder } from "@/components/ui";
import { statusLabel } from "@/lib/api";
import type { Status, Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayDiff, formatDateTime, formatDue, isOpenStatus, isOverdue } from "@/lib/format";
import { StatusMenu } from "./task-property-menus";
import { checklistProgress } from "./task-utils";

interface TaskTableProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
}

type SortKey = "title" | "client" | "assignee" | "due" | "status" | "priority";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const text = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

const comparators: Record<SortKey, (a: Task, b: Task) => number> = {
  title: (a, b) => text(a.title, b.title),
  client: (a, b) => text(a.client.trade_name, b.client.trade_name),
  assignee: (a, b) => text(a.assignee.name, b.assignee.name),
  due: (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  status: (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  priority: (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
};

/** Tabela densa com colunas ordenáveis; o prazo desempata as demais ordenações. */
export function TaskTable({ tasks, onOpen, onStatusChange }: TaskTableProps) {
  const [sort, setSort] = useState<Sort>({ key: "due", dir: "asc" });

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => comparators[sort.key](a, b) * direction || comparators.due(a, b));
  }, [tasks, sort]);

  const header = (key: SortKey, label: string, className?: string) => (
    <SortHeader
      label={label}
      sort={sort.key === key ? sort.dir : null}
      onSort={() => setSort((current) => ({ key, dir: current.key === key && current.dir === "asc" ? "desc" : "asc" }))}
      className={className}
    />
  );

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {header("title", "Tarefa", "pl-4 md:pl-6")}
            {header("client", "Cliente", "w-48")}
            {header("assignee", "Responsável", "w-44")}
            {header("due", "Prazo", "w-32")}
            {header("status", "Status", "w-44")}
            {header("priority", "Prioridade", "w-32 pr-4 md:pr-6")}
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => (
            <Row key={task.id} task={task} onOpen={onOpen} onStatusChange={onStatusChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({ label, sort, onSort, className }: { label: string; sort: "asc" | "desc" | null; onSort: () => void; className?: string }) {
  const Icon = sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
      className={cn("sticky top-0 z-10 h-9 border-b border-line bg-sunken/95 px-3 text-left font-normal backdrop-blur-md", className)}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "-mx-1.5 inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs font-medium transition-colors hover:bg-hover hover:text-fg",
          sort ? "text-fg" : "text-fg-muted",
        )}
      >
        {label}
        <Icon size={12} aria-hidden className={sort ? "opacity-100" : "opacity-40"} />
      </button>
    </th>
  );
}

function Row({ task, onOpen, onStatusChange }: { task: Task; onOpen: (task: Task) => void; onStatusChange: (task: Task, status: Status) => void }) {
  const overdue = isOverdue(task);
  const dueToday = !overdue && isOpenStatus(task.status) && dayDiff(task.due_date) === 0;
  const progress = checklistProgress(task);
  const cell = "h-11 border-b border-line px-3";

  return (
    <tr onClick={() => onOpen(task)} className="group cursor-pointer transition-colors hover:bg-hover/60 focus-within:bg-hover/60">
      <td className={cn(cell, "max-w-0 pl-4 md:pl-6")}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(task);
            }}
            className="min-w-0 truncate text-left font-medium text-fg focus-visible:underline focus-visible:outline-none"
          >
            <span className={cn(!isOpenStatus(task.status) && "text-fg-muted")}>{task.title}</span>
          </button>
          {progress.total > 0 && (
            <span className={cn("shrink-0 text-xs tabular-nums", progress.done === progress.total ? "text-success" : "text-fg-subtle")}>
              {progress.done}/{progress.total}
              <span className="sr-only"> itens do checklist concluídos</span>
            </span>
          )}
        </div>
      </td>
      <td className={cn(cell, "max-w-0 truncate text-fg-muted")}>{task.client.trade_name}</td>
      <td className={cell}>
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={task.assignee.name} size="sm" />
          <span className="truncate text-fg-muted">{task.assignee.name}</span>
        </span>
      </td>
      <td className={cell}>
        <time
          dateTime={task.due_date}
          title={`Prazo: ${formatDateTime(task.due_date)}`}
          className={cn("tabular-nums", overdue ? "font-medium text-danger" : dueToday ? "font-medium text-fg" : "text-fg-muted")}
        >
          {overdue && <span className="sr-only">Atrasada: </span>}
          {formatDue(task.due_date)}
        </time>
      </td>
      <td className={cell} onClick={(event) => event.stopPropagation()}>
        <StatusMenu
          value={task.status}
          onChange={(status) => onStatusChange(task, status)}
          trigger={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Status: ${statusLabel[task.status]}. Alterar status`}
              className="-ml-1.5 inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-1.5 text-fg transition-colors hover:bg-hover"
            >
              <StatusIcon status={task.status} />
              <span className="truncate">{statusLabel[task.status]}</span>
            </button>
          )}
        />
      </td>
      <td className={cn(cell, "pr-4 md:pr-6")}>
        <PriorityTag priority={task.priority} />
      </td>
    </tr>
  );
}

