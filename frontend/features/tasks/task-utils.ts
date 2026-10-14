import { priorityLabel, statusLabel } from "@/lib/api";
import type { Activity, Priority, Status, Task } from "@/lib/api";
import { dayDiff, isOpenStatus, isOverdue } from "@/lib/format";
import { statusOrder } from "@/components/ui/status";

/* ---------- Filtros (estado vive na URL) ---------- */

export interface TaskFilters {
  q: string;
  status: Status[];
  priority: Priority[];
  assignee: number[];
  client: number[];
  department: number[];
}

export const emptyFilters: TaskFilters = { q: "", status: [], priority: [], assignee: [], client: [], department: [] };

/** Nomes dos parâmetros na URL (em português, como as rotas). */
export const filterParams: Record<keyof TaskFilters, string> = {
  q: "q",
  status: "status",
  priority: "prioridade",
  assignee: "responsavel",
  client: "cliente",
  department: "departamento",
};

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);
const ids = (value: string | null) => list(value).map(Number).filter(Number.isFinite);

export function parseFilters(params: URLSearchParams): TaskFilters {
  return {
    q: params.get(filterParams.q) ?? "",
    status: list(params.get(filterParams.status)).filter((value): value is Status => value in statusLabel),
    priority: list(params.get(filterParams.priority)).filter((value): value is Priority => value in priorityLabel),
    assignee: ids(params.get(filterParams.assignee)),
    client: ids(params.get(filterParams.client)),
    department: ids(params.get(filterParams.department)),
  };
}

/** Grava os filtros nos parâmetros, preservando os demais (ex.: ?tarefa=). */
export function writeFilters(params: URLSearchParams, filters: TaskFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  (Object.keys(filterParams) as (keyof TaskFilters)[]).forEach((key) => {
    const value = filters[key];
    const serialized = Array.isArray(value) ? value.join(",") : value.trim();
    if (serialized) next.set(filterParams[key], serialized);
    else next.delete(filterParams[key]);
  });
  return next;
}

export function activeFilterCount(filters: TaskFilters): number {
  return (filters.q.trim() ? 1 : 0) + filters.status.length + filters.priority.length + filters.assignee.length + filters.client.length + filters.department.length;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca sem acento e sem diferenciar maiúsculas, por título e cliente (mesmos campos da API). */
export function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  const terms = normalize(filters.q).split(/\s+/).filter(Boolean);
  return tasks.filter((task) => {
    if (filters.status.length && !filters.status.includes(task.status)) return false;
    if (filters.priority.length && !filters.priority.includes(task.priority)) return false;
    if (filters.assignee.length && !filters.assignee.includes(task.assignee_id)) return false;
    if (filters.client.length && !filters.client.includes(task.client_id)) return false;
    if (filters.department.length && !filters.department.includes(task.department_id)) return false;
    if (terms.length) {
      const haystack = normalize(`${task.title} ${task.client.trade_name} ${task.client.legal_name}`);
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

/* ---------- Agrupamentos ---------- */

export interface TaskGroup {
  id: string;
  label: string;
  tasks: Task[];
  status?: Status;
  tone?: "danger";
  /** Grupo começa recolhido (ex.: concluídas). */
  collapsed?: boolean;
}

const byDue = (a: Task, b: Task) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

export function groupByStatus(tasks: Task[]): TaskGroup[] {
  return statusOrder.map((status) => ({
    id: status,
    label: statusLabel[status],
    status,
    tasks: tasks.filter((task) => task.status === status).sort(byDue),
    collapsed: !isOpenStatus(status),
  }));
}

/**
 * Meu Dia: cada tarefa aparece em um único grupo.
 * Tarefas em execução (a fazer / em andamento) são separadas por prazo; as que dependem
 * de terceiros (cliente, revisão) ficam em grupos próprios.
 */
export function groupMyDay(tasks: Task[], now: Date = new Date()): TaskGroup[] {
  const actionable = tasks.filter((task) => task.status === "todo" || task.status === "in_progress").sort(byDue);
  return [
    { id: "overdue", label: "Atrasadas", tone: "danger", tasks: actionable.filter((task) => isOverdue(task, now)) },
    { id: "today", label: "Para hoje", tasks: actionable.filter((task) => !isOverdue(task, now) && dayDiff(task.due_date, now) === 0) },
    { id: "upcoming", label: "Próximas", tasks: actionable.filter((task) => dayDiff(task.due_date, now) > 0) },
    { id: "waiting_client", label: "Aguardando cliente", status: "waiting_client", tasks: tasks.filter((task) => task.status === "waiting_client").sort(byDue) },
    { id: "in_review", label: "Em revisão", status: "in_review", tasks: tasks.filter((task) => task.status === "in_review").sort(byDue) },
    {
      id: "done_today",
      label: "Concluídas hoje",
      status: "done",
      collapsed: true,
      tasks: tasks.filter((task) => task.status === "done" && task.completed_at && dayDiff(task.completed_at, now) === 0),
    },
  ];
}

/* ---------- Formulário ---------- */

/** Competência no formato usado pelo escritório: "MM/AAAA" do mês corrente. */
export function currentCompetence(now: Date = new Date()): string {
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export const COMPETENCE_PATTERN = /^(0[1-9]|1[0-2])\/\d{4}$/;

export const defaultChecklist = ["Receber documentos", "Conferir informações", "Executar", "Revisar", "Enviar"];

/* ---------- Histórico legível ---------- */

const fieldLabel: Record<string, string> = { status: "o status", priority: "a prioridade" };

function valueLabel(field: string, value: string): string {
  if (field === "status" && value in statusLabel) return statusLabel[value as Status];
  if (field === "priority" && value in priorityLabel) return priorityLabel[value as Priority];
  return value;
}

/** Converte um registro de atividade da API em frases, ex.: "alterou o status de A fazer para Concluído". */
export function describeActivity(activity: Activity): string[] {
  switch (activity.action) {
    case "created":
      return ["criou a tarefa"];
    case "commented":
      return ["comentou"];
    case "checklist_updated":
      return [activity.detail ? `atualizou o item “${activity.detail}” do checklist` : "atualizou o checklist"];
    case "updated": {
      // Formato gerado por lib/api.ts: "campo: antigo -> novo; campo: antigo -> novo"
      const changes = (activity.detail ?? "").split(";").map((part) => part.trim()).filter(Boolean);
      const sentences = changes.map((change) => {
        const match = change.match(/^(\w+): (.*) -> (.*)$/);
        if (!match) return `atualizou a tarefa (${change})`;
        const [, field, from, to] = match;
        if (!(field in fieldLabel)) return `alterou ${field}`;
        return `alterou ${fieldLabel[field]} de ${valueLabel(field, from)} para ${valueLabel(field, to)}`;
      });
      return sentences.length ? sentences : ["atualizou a tarefa"];
    }
    default:
      return [activity.detail ? `${activity.action}: ${activity.detail}` : activity.action];
  }
}

export function checklistProgress(task: Pick<Task, "checklist">): { done: number; total: number } {
  return { done: task.checklist.filter((item) => item.done).length, total: task.checklist.length };
}
