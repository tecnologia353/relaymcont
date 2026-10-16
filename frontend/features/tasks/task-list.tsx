"use client";

import { ChevronRight, ListChecks } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Avatar, PriorityIcon, StatusIcon, Tooltip } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import type { Status, Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayDiff, formatDateTime, formatDue, isOverdue } from "@/lib/format";
import { usePermissions } from "@/features/session/use-permissions";
import { StatusMenu } from "./task-property-menus";
import { checklistProgress } from "./task-utils";
import type { TaskGroup } from "./task-utils";

interface TaskListProps {
  groups: TaskGroup[];
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
}

/** Lista agrupada e densa. ↑/↓ percorre as tarefas visíveis; Enter abre. */
export function TaskList({ groups, onOpen, onStatusChange }: TaskListProps) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const visible = groups.filter((group) => group.tasks.length > 0);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-task-row]"));
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1 && !rows.length) return;
    event.preventDefault();
    const next = index === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)));
    rows[next]?.focus();
    rows[next]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div onKeyDown={onKeyDown}>
      {visible.map((group) => {
        const collapsed = toggled[group.id] ?? Boolean(group.collapsed);
        const panelId = `grupo-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={`${panelId}-titulo`}>
            <h2 id={`${panelId}-titulo`} className="sticky top-12 z-10">
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={panelId}
                onClick={() => setToggled((state) => ({ ...state, [group.id]: !collapsed }))}
                className="flex h-9 w-full items-center gap-2 border-b border-line bg-sunken/90 px-4 text-left text-sm font-medium backdrop-blur-md transition-colors hover:bg-hover md:px-6"
              >
                <ChevronRight size={14} aria-hidden className={cn("text-fg-subtle transition-transform", !collapsed && "rotate-90")} />
                {group.status && <StatusIcon status={group.status} />}
                <span className={cn(group.tone === "danger" ? "text-danger" : "text-fg")}>{group.label}</span>
                <span className="tabular-nums text-fg-subtle">{group.tasks.length}</span>
              </button>
            </h2>
            {!collapsed && (
              <ul id={panelId}>
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={onOpen} onStatusChange={onStatusChange} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({ task, onOpen, onStatusChange }: { task: Task; onOpen: (task: Task) => void; onStatusChange: (task: Task, status: Status) => void }) {
  const editable = usePermissions().canWorkOnTask(task);
  const overdue = isOverdue(task);
  const dueToday = !overdue && dayDiff(task.due_date) === 0 && task.status !== "done";
  const progress = checklistProgress(task);

  return (
    <li className="group flex h-11 items-center gap-1 border-b border-line pl-2.5 pr-4 transition-colors focus-within:bg-hover/60 hover:bg-hover/60 md:pl-4 md:pr-6">
      <StatusMenu
        value={task.status}
        disabled={!editable}
        onChange={(status) => onStatusChange(task, status)}
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label={`Status: ${statusLabel[task.status]}. Alterar status`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
          >
            <StatusIcon status={task.status} />
          </button>
        )}
      />
      <button
        type="button"
        data-task-row
        onClick={() => onOpen(task)}
        className="flex h-full min-w-0 flex-1 items-center gap-3 pl-1 text-left focus-visible:outline-none"
      >
        <span className="flex shrink-0" title={`Prioridade ${priorityLabel[task.priority]}`}>
          <PriorityIcon priority={task.priority} />
          <span className="sr-only">Prioridade {priorityLabel[task.priority]}</span>
        </span>
        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", task.status === "done" || task.status === "canceled" ? "text-fg-muted" : "text-fg")}>
          {task.title}
        </span>
        <span className="hidden w-40 shrink-0 truncate text-sm text-fg-muted xl:block">{task.client.trade_name}</span>
        {progress.total > 0 && (
          <span
            className={cn(
              "hidden w-12 shrink-0 items-center gap-1 text-xs tabular-nums sm:flex",
              progress.done === progress.total ? "text-success" : "text-fg-subtle",
            )}
          >
            <ListChecks size={13} aria-hidden />
            {progress.done}/{progress.total}
            <span className="sr-only"> itens do checklist concluídos</span>
          </span>
        )}
        <time
          dateTime={task.due_date}
          title={`Prazo: ${formatDateTime(task.due_date)}`}
          className={cn(
            "w-[5.5rem] shrink-0 text-right text-xs tabular-nums sm:w-24 sm:text-sm",
            overdue ? "font-medium text-danger" : dueToday ? "font-medium text-fg" : "text-fg-muted",
          )}
        >
          {overdue && <span className="sr-only">Atrasada: </span>}
          {formatDue(task.due_date)}
        </time>
      </button>
      <Tooltip content={task.assignee.name}>
        <span className="ml-2 flex shrink-0">
          <Avatar name={task.assignee.name} size="sm" labelled />
        </span>
      </Tooltip>
    </li>
  );
}
