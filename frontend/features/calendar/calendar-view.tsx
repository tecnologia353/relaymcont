"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Avatar, Button, ErrorState, IconButton, SegmentedControl, Select, Skeleton, StatusIcon } from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import type { Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTime, isOverdue } from "@/lib/format";
import { isManager } from "@/lib/permissions";
import { useCurrentUser } from "@/features/session/session-provider";
import { PageHeader } from "@/features/shell/page-header";
import { TaskDetail } from "@/features/tasks/task-detail";
import { useReferenceData, useTaskUrlState, useTasks } from "@/features/tasks/use-task-data";

type Scope = "all" | "mine";


const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Tarefas visíveis por dia na grade antes do "+N". */
const MAX_CHIPS = 3;

const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const monthTitle = (date: Date) => capitalize(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date));
const dayTitle = (date: Date) => capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date));
const dayLabel = (date: Date) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date);

/** Semanas completas (domingo a sábado) que cobrem o mês. */
function monthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

/** Calendário de prazos: todas as tarefas pela data de vencimento, com a agenda do dia ao lado. */
export function CalendarView() {
  const user = useCurrentUser();
  const { tasks, state, retry } = useTasks(false);
  const { departments } = useReferenceData();
  const { openTaskId, openTask, closeTask } = useTaskUrlState();

  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [scope, setScope] = useState<Scope>("all");
  const [department, setDepartment] = useState("");
  // Quem não é gestor já recebe só o próprio departamento.
  const scopeOptions: SegmentedOption<Scope>[] = [
    { value: "all", label: isManager(user) ? "Escritório" : "Departamento" },
    { value: "mine", label: "Minhas" },
  ];

  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusPending = useRef(false);

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== "canceled" && (scope === "all" || task.assignee_id === user.id) && (!department || task.department_id === Number(department)),
      ),
    [tasks, scope, department, user.id],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of visibleTasks) {
      const key = dayKey(new Date(task.due_date));
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    // Atrasadas primeiro, concluídas por último: a grade só mostra as primeiras de cada dia.
    const rank = (task: Task) => (isOverdue(task) ? 0 : task.status === "done" ? 2 : 1);
    map.forEach((list) => list.sort((a, b) => rank(a) - rank(b) || new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    return map;
  }, [visibleTasks]);

  const days = useMemo(() => monthGrid(month), [month]);
  const monthTasks = visibleTasks.filter((task) => sameMonth(new Date(task.due_date), month));
  const monthOverdue = monthTasks.filter((task) => isOverdue(task)).length;
  const selectedTasks = byDay.get(dayKey(selected)) ?? [];

  /** Seleciona um dia; se ele cair fora do mês exibido, troca o mês junto. */
  const selectDay = (date: Date, focus = false) => {
    setSelected(date);
    if (!sameMonth(date, month)) setMonth(startOfMonth(date));
    focusPending.current = focus;
  };

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    dayRefs.current.get(dayKey(selected))?.focus();
  }, [selected, month]);

  const goToMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(sameMonth(next, today) ? today : next);
  };

  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in delta) {
      event.preventDefault();
      selectDay(addDays(date, delta[event.key]), true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectDay(addDays(date, -date.getDay()), true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectDay(addDays(date, 6 - date.getDay()), true);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const target = new Date(date.getFullYear(), date.getMonth() + (event.key === "PageUp" ? -1 : 1), 1);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      selectDay(new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay)), true);
    }
  };

  const todayKey = dayKey(today);
  const selectedKey = dayKey(selected);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Calendário" description="Prazos das tarefas do escritório." />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
        <div className="flex items-center gap-1">
          <IconButton size="sm" label="Mês anterior" icon={<ChevronLeft size={16} />} onClick={() => goToMonth(-1)} />
          <IconButton size="sm" label="Próximo mês" icon={<ChevronRight size={16} />} onClick={() => goToMonth(1)} />
        </div>
        <h2 className="min-w-[9.5rem] text-base font-semibold text-fg" aria-live="polite">
          {monthTitle(month)}
        </h2>
        <Button size="sm" onClick={() => selectDay(today)} disabled={sameMonth(month, today) && selectedKey === todayKey}>
          Hoje
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
        <SegmentedControl label="Tarefas exibidas" value={scope} options={scopeOptions} onChange={setScope} />
        <Select size="sm" aria-label="Departamento" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-auto">
          <option value="">Todos os departamentos</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        {state === "ready" && (
          <span className="ml-auto text-sm tabular-nums text-fg-muted">
            {monthTasks.length} {monthTasks.length === 1 ? "prazo" : "prazos"} no mês
            {monthOverdue > 0 && <span className="text-danger"> · {monthOverdue} {monthOverdue === 1 ? "atrasado" : "atrasados"}</span>}
          </span>
        )}
      </div>

      {state === "error" ? (
        <ErrorState title="Não foi possível carregar o calendário" onRetry={retry} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Grade do mês */}
          <div className="min-w-0 px-2 py-3 sm:px-4 md:px-6 lg:flex-1">
            <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line bg-surface">
              {WEEKDAYS.map((weekday, index) => (
                <div
                  key={weekday}
                  className={cn("border-b border-line px-2 py-1.5 text-center text-xs font-medium text-fg-muted sm:text-left", index > 0 && "border-l")}
                  aria-hidden
                >
                  {weekday}
                </div>
              ))}
              {days.map((date, index) => {
                const key = dayKey(date);
                const list = byDay.get(key) ?? [];
                const inMonth = sameMonth(date, month);
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const overdueCount = list.filter((task) => isOverdue(task)).length;
                const weekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={key}
                    onClick={() => selectDay(date)}
                    className={cn(
                      "relative min-h-14 cursor-pointer border-line p-1 transition-colors sm:min-h-28 sm:p-1.5",
                      index % 7 > 0 && "border-l",
                      index >= 7 && "border-t",
                      weekend && "bg-sunken/50",
                      !inMonth && "bg-sunken/70",
                      isSelected ? "bg-accent/5 ring-1 ring-inset ring-accent/50" : "hover:bg-hover/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        ref={(element) => {
                          if (element) dayRefs.current.set(key, element);
                          else dayRefs.current.delete(key);
                        }}
                        tabIndex={isSelected ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${dayLabel(date)}${list.length ? `, ${list.length} ${list.length === 1 ? "prazo" : "prazos"}` : ", sem prazos"}${overdueCount ? `, ${overdueCount} atrasado${overdueCount > 1 ? "s" : ""}` : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectDay(date);
                        }}
                        onKeyDown={(event) => onDayKeyDown(event, date)}
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums transition-colors",
                          isToday ? "bg-accent-solid text-accent-fg" : inMonth ? "text-fg hover:bg-hover" : "text-fg-subtle hover:bg-hover",
                        )}
                      >
                        {date.getDate()}
                      </button>
                      {list.length > 0 && (
                        <span className={cn("hidden text-2xs tabular-nums sm:inline", overdueCount ? "font-medium text-danger" : "text-fg-subtle")} aria-hidden>
                          {list.length}
                        </span>
                      )}
                    </div>

                    {state === "loading" ? (
                      inMonth && index % 3 === 0 && <Skeleton className="mt-1.5 hidden h-5 sm:block" />
                    ) : (
                      <>
                        {/* Celular: pontos */}
                        {list.length > 0 && (
                          <div className="mt-1 flex justify-center gap-0.5 sm:hidden" aria-hidden>
                            {list.slice(0, MAX_CHIPS).map((task) => (
                              <span
                                key={task.id}
                                className={cn("h-1.5 w-1.5 rounded-full", isOverdue(task) ? "bg-danger" : task.status === "done" ? "bg-fg-subtle" : "bg-accent")}
                              />
                            ))}
                          </div>
                        )}
                        {/* Telas maiores: título das tarefas */}
                        <ul className="mt-1 hidden space-y-px sm:block">
                          {list.slice(0, MAX_CHIPS).map((task) => (
                            <li key={task.id}>
                              <button
                                type="button"
                                tabIndex={isSelected ? 0 : -1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelected(date);
                                  openTask(task.id);
                                }}
                                title={task.title}
                                className={cn(
                                  "flex h-5 w-full items-center gap-1 rounded px-1 text-left text-2xs transition-colors hover:bg-hover",
                                  isOverdue(task) ? "font-medium text-danger" : task.status === "done" ? "text-fg-subtle line-through" : "text-fg",
                                )}
                              >
                                <StatusIcon status={task.status} size={10} />
                                <span className="truncate">{task.title}</span>
                              </button>
                            </li>
                          ))}
                          {list.length > MAX_CHIPS && (
                            <li>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectDay(date);
                                }}
                                className="h-5 rounded px-1 text-2xs font-medium text-fg-muted hover:bg-hover hover:text-fg"
                              >
                                +{list.length - MAX_CHIPS} mais
                              </button>
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 hidden text-xs text-fg-subtle sm:block">Use as setas do teclado para navegar entre os dias e Page Up/Page Down para trocar de mês.</p>
          </div>

          {/* Agenda do dia */}
          <aside aria-labelledby="agenda-titulo" className="shrink-0 border-t border-line lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
            <div className="lg:sticky lg:top-12">
              <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-4 md:px-6 lg:px-4">
                <h2 id="agenda-titulo" className="text-sm font-semibold text-fg">
                  {dayTitle(selected)}
                </h2>
                <span className="text-xs tabular-nums text-fg-muted">
                  {selectedTasks.length} {selectedTasks.length === 1 ? "prazo" : "prazos"}
                </span>
              </div>
              {state === "loading" ? (
                <div className="space-y-2 px-4 pb-4 md:px-6 lg:px-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : selectedTasks.length === 0 ? (
                <div className="mx-4 mb-4 flex flex-col items-center rounded-lg border border-dashed border-line px-4 py-8 text-center md:mx-6 lg:mx-4">
                  <CalendarDays size={18} className="mb-2 text-fg-subtle" aria-hidden />
                  <p className="text-sm text-fg-muted">Nenhum prazo neste dia.</p>
                </div>
              ) : (
                <ul className="thin-scroll space-y-px px-2 pb-4 md:px-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:px-2">
                  {selectedTasks.map((task) => {
                    const overdue = isOverdue(task);
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => openTask(task.id)}
                          className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-hover/60"
                        >
                          <StatusIcon status={task.status} className="mt-0.5" />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm", task.status === "done" ? "text-fg-muted line-through" : "text-fg")}>{task.title}</span>
                            <span className="block truncate text-xs text-fg-muted">
                              {task.client.trade_name} · {task.department.name}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className={cn("text-xs tabular-nums", overdue ? "font-medium text-danger" : "text-fg-muted")}>{overdue ? "Atrasada" : formatTime(task.due_date)}</span>
                            <Avatar name={task.assignee.name} size="xs" labelled />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      <TaskDetail taskId={openTaskId} onClose={closeTask} />
    </div>
  );
}
