import type { BadgeTone } from "@/components/ui";
import type { Process, ProcessTemplate, Task } from "@/lib/api";
import { competenceDueDate } from "@/lib/competence";
import { isOpenStatus, isOverdue } from "@/lib/format";

/** Situação derivada das etapas — não é gravada, então nunca fica desatualizada. */
export type ProcessState = "on_track" | "overdue" | "done" | "canceled";

export const processStateLabel: Record<ProcessState, string> = {
  on_track: "Em dia",
  overdue: "Atrasado",
  done: "Concluído",
  canceled: "Cancelado",
};

export const processStateTone: Record<ProcessState, BadgeTone> = {
  on_track: "info",
  overdue: "danger",
  done: "success",
  canceled: "neutral",
};

export interface ProcessSummary {
  state: ProcessState;
  done: number;
  total: number;
  /** Próxima etapa em aberto (a de prazo mais próximo). */
  next?: Task;
}

export function summarizeProcess(process: Process, now: Date = new Date()): ProcessSummary {
  const relevant = process.tasks.filter((task) => task.status !== "canceled");
  const done = relevant.filter((task) => task.status === "done").length;
  const open = process.tasks.filter((task) => isOpenStatus(task.status));
  const next = open[0];
  let state: ProcessState;
  if (process.status === "canceled") state = "canceled";
  else if (open.length === 0) state = "done";
  else if (open.some((task) => isOverdue(task, now))) state = "overdue";
  else state = "on_track";
  return { state, done, total: relevant.length, next };
}

export const dueMonthLabel: Record<0 | 1, string> = {
  0: "Mês da competência",
  1: "Mês seguinte",
};

/** Primeiro e último prazo que o modelo gera para a competência. */
export function templateDueRange(template: Pick<ProcessTemplate, "due_month_offset" | "steps">, competence: string): [Date, Date] | null {
  if (!template.steps.length) return null;
  const days = template.steps.map((step) => step.due_day);
  return [
    competenceDueDate(competence, template.due_month_offset, Math.min(...days)),
    competenceDueDate(competence, template.due_month_offset, Math.max(...days)),
  ];
}
