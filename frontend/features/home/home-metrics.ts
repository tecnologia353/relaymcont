import type { Department, Status, Task, User } from "@/lib/api";
import { statusOrder } from "@/components/ui/status";
import { dayDiff, isOpenStatus, isOverdue } from "@/lib/format";

/* Indicadores da Home, calculados a partir da lista de tarefas (mesma fonte das demais telas). */

const byDue = (a: Task, b: Task) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

export const UPCOMING_DAYS = 7;
export const LIST_LIMIT = 7;

export interface StatusSlice {
  status: Status;
  count: number;
}

export interface DepartmentLoad {
  department: Department;
  total: number;
  done: number;
  open: number;
  overdue: number;
}

export interface MemberLoad {
  user: User;
  open: number;
  overdue: number;
}

export interface DayGroup {
  /** Dias a partir de hoje (0 = hoje). */
  offset: number;
  tasks: Task[];
}

export interface HomeMetrics {
  open: number;
  overdue: number;
  dueToday: number;
  waitingClient: number;
  inReview: number;
  doneThisMonth: number;
  /** Distribuição por status, sem canceladas (não fazem parte do fluxo). */
  statuses: StatusSlice[];
  /** Atrasadas (mais antigas primeiro) seguidas das urgentes em dia. */
  attention: Task[];
  attentionTotal: number;
  upcoming: DayGroup[];
  upcomingTotal: number;
  departments: DepartmentLoad[];
  team: MemberLoad[];
}

export function computeHomeMetrics(tasks: Task[], users: User[], departments: Department[], now: Date = new Date()): HomeMetrics {
  const open = tasks.filter((task) => isOpenStatus(task.status));
  const overdue = open.filter((task) => isOverdue(task, now)).sort(byDue);
  const notOverdue = open.filter((task) => !isOverdue(task, now));

  const urgent = notOverdue.filter((task) => task.priority === "urgent").sort(byDue);
  const attention = [...overdue, ...urgent];

  const soon = notOverdue.filter((task) => dayDiff(task.due_date, now) < UPCOMING_DAYS).sort(byDue);
  const upcoming: DayGroup[] = [];
  for (const task of soon.slice(0, LIST_LIMIT)) {
    const offset = dayDiff(task.due_date, now);
    const group = upcoming.find((item) => item.offset === offset);
    if (group) group.tasks.push(task);
    else upcoming.push({ offset, tasks: [task] });
  }

  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    open: open.length,
    overdue: overdue.length,
    dueToday: notOverdue.filter((task) => dayDiff(task.due_date, now) === 0).length,
    waitingClient: open.filter((task) => task.status === "waiting_client").length,
    inReview: open.filter((task) => task.status === "in_review").length,
    doneThisMonth: tasks.filter((task) => {
      if (task.status !== "done" || !task.completed_at) return false;
      const completed = new Date(task.completed_at);
      return completed.getMonth() === month && completed.getFullYear() === year;
    }).length,
    statuses: statusOrder
      .filter((status) => status !== "canceled")
      .map((status) => ({ status, count: tasks.filter((task) => task.status === status).length })),
    attention: attention.slice(0, LIST_LIMIT),
    attentionTotal: attention.length,
    upcoming,
    upcomingTotal: soon.length,
    departments: departments.map((department) => {
      const own = tasks.filter((task) => task.department_id === department.id && task.status !== "canceled");
      const ownOpen = own.filter((task) => isOpenStatus(task.status));
      return {
        department,
        total: own.length,
        done: own.length - ownOpen.length,
        open: ownOpen.length,
        overdue: ownOpen.filter((task) => isOverdue(task, now)).length,
      };
    }),
    team: users
      .map((user) => {
        const assigned = open.filter((task) => task.assignee_id === user.id);
        return { user, open: assigned.length, overdue: assigned.filter((task) => isOverdue(task, now)).length };
      })
      .sort((a, b) => b.open - a.open || b.overdue - a.overdue || a.user.name.localeCompare(b.user.name, "pt-BR")),
  };
}

/** Status em andamento, usados nos links "em aberto" para a Operação. */
export const OPEN_STATUSES = statusOrder.filter(isOpenStatus);
