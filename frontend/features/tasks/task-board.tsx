"use client";

import { CalendarClock, ListChecks } from "lucide-react";
import { useState } from "react";
import type { DragEvent } from "react";
import { Avatar, PriorityIcon, StatusIcon, statusOrder } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import type { Status, Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayDiff, formatDateTime, formatDue, isOpenStatus, isOverdue } from "@/lib/format";
import { usePermissions } from "@/features/session/use-permissions";
import { StatusMenu } from "./task-property-menus";
import { checklistProgress } from "./task-utils";

interface TaskBoardProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
}

const DRAG_TYPE = "application/x-relay-task";
const byDue = (a: Task, b: Task) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

/** Quadro por status. Arrastar um cartão para outra coluna muda o status; pelo teclado, use o ícone de status do cartão. */
export function TaskBoard({ tasks, onOpen, onStatusChange }: TaskBoardProps) {
  const [dragging, setDragging] = useState<Task | null>(null);
  const [over, setOver] = useState<Status | null>(null);

  const drop = (status: Status) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    const id = Number(event.dataTransfer.getData(DRAG_TYPE));
    const task = tasks.find((item) => item.id === id);
    if (task && task.status !== status) onStatusChange(task, status);
  };

  return (
    <div className="thin-scroll flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto px-4 py-4 md:px-6">
      {statusOrder.map((status) => {
        const items = tasks.filter((task) => task.status === status).sort(byDue);
        const overdue = items.filter((task) => isOverdue(task)).length;
        const target = dragging !== null && dragging.status !== status;
        return (
          <section
            key={status}
            aria-labelledby={`coluna-${status}`}
            onDragOver={(event) => {
              if (!target) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (over !== status) setOver(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null);
            }}
            onDrop={drop(status)}
            className={cn(
              "flex w-[17.5rem] shrink-0 snap-start flex-col rounded-xl border bg-sunken transition-colors",
              over === status ? "border-accent/60 bg-accent/5" : "border-line",
            )}
          >
            <header className="flex h-10 shrink-0 items-center gap-2 px-3">
              <StatusIcon status={status} />
              <h2 id={`coluna-${status}`} className="truncate text-sm font-medium text-fg">
                {statusLabel[status]}
              </h2>
              <span className="tabular-nums text-sm text-fg-subtle">{items.length}</span>
              {overdue > 0 && (
                <span className="ml-auto text-xs font-medium tabular-nums text-danger">
                  {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
                </span>
              )}
            </header>
            <ul className="thin-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {items.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  dimmed={dragging?.id === task.id}
                  onOpen={onOpen}
                  onStatusChange={onStatusChange}
                  onDragStart={() => setDragging(task)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                />
              ))}
              {items.length === 0 && (
                <li
                  className={cn(
                    "grid h-20 place-items-center rounded-lg border border-dashed text-xs text-fg-subtle",
                    target ? "border-accent/50 text-accent" : "border-line",
                  )}
                >
                  {target ? "Soltar aqui" : "Nenhuma tarefa"}
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

interface BoardCardProps {
  task: Task;
  dimmed: boolean;
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function BoardCard({ task, dimmed, onOpen, onStatusChange, onDragStart, onDragEnd }: BoardCardProps) {
  const overdue = isOverdue(task);
  const dueToday = !overdue && isOpenStatus(task.status) && dayDiff(task.due_date) === 0;
  const progress = checklistProgress(task);
  const closed = !isOpenStatus(task.status);
  const editable = usePermissions().canWorkOnTask(task);

  return (
    <li
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, String(task.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative rounded-lg border border-line bg-surface p-3 shadow-xs transition-[border-color,box-shadow,opacity] hover:border-line-strong focus-within:border-line-strong",
        editable && "cursor-grab active:cursor-grabbing",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <StatusMenu
          value={task.status}
          disabled={!editable}
          onChange={(status) => onStatusChange(task, status)}
          trigger={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Status: ${statusLabel[task.status]}. Alterar status`}
              className="relative z-10 -ml-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
            >
              <StatusIcon status={task.status} />
            </button>
          )}
        />
        {/* O botão cobre o cartão inteiro (::after) para abrir o detalhe; os controles ficam acima dele. */}
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent"
        >
          <span className={cn("line-clamp-2 text-sm font-medium", closed ? "text-fg-muted line-through decoration-fg-subtle/60" : "text-fg")}>
            {task.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">{task.client.trade_name}</span>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 pl-6 text-xs">
        <span className="flex shrink-0" title={`Prioridade ${priorityLabel[task.priority]}`}>
          <PriorityIcon priority={task.priority} size={13} />
          <span className="sr-only">Prioridade {priorityLabel[task.priority]}</span>
        </span>
        <time
          dateTime={task.due_date}
          title={`Prazo: ${formatDateTime(task.due_date)}`}
          className={cn(
            "flex items-center gap-1 tabular-nums",
            overdue ? "font-medium text-danger" : dueToday ? "font-medium text-fg" : "text-fg-muted",
          )}
        >
          <CalendarClock size={13} aria-hidden />
          {overdue && <span className="sr-only">Atrasada: </span>}
          {formatDue(task.due_date)}
        </time>
        {progress.total > 0 && (
          <span className={cn("flex items-center gap-1 tabular-nums", progress.done === progress.total ? "text-success" : "text-fg-subtle")}>
            <ListChecks size={13} aria-hidden />
            {progress.done}/{progress.total}
            <span className="sr-only"> itens do checklist concluídos</span>
          </span>
        )}
        <span className="ml-auto flex shrink-0">
          <Avatar name={task.assignee.name} size="sm" labelled />
        </span>
      </div>
    </li>
  );
}
