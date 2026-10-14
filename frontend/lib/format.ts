import type { Status } from "@/lib/api";

const DAY_MS = 86_400_000;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "Carlos Mendes" → "CM"; "Ana" → "AN". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? "");
  return (first + second).toUpperCase();
}

/** Diferença em dias de calendário entre a data e hoje (negativo = passado). */
export function dayDiff(value: string | Date, now: Date = new Date()): number {
  return Math.round((startOfDay(new Date(value)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function formatTime(value: string | Date): string {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "14 out" no ano corrente; "14 out 2025" fora dele. */
export function formatShortDate(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

/** "14 out, 09:00" */
export function formatDateTime(value: string | Date, now: Date = new Date()): string {
  return `${formatShortDate(value, now)}, ${formatTime(value)}`;
}

/** Prazo em linguagem natural: "Hoje, 14:00", "Amanhã, 09:00", "Em 3 dias", "Há 2 dias", "21 out". */
export function formatDue(value: string, now: Date = new Date()): string {
  const diff = dayDiff(value, now);
  if (diff === 0) return `Hoje, ${formatTime(value)}`;
  if (diff === 1) return `Amanhã, ${formatTime(value)}`;
  if (diff === -1) return "Ontem";
  if (diff > 1 && diff < 7) return `Em ${diff} dias`;
  if (diff < -1 && diff > -7) return `Há ${-diff} dias`;
  return formatShortDate(value, now);
}

/** Tempo decorrido para eventos passados: "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias", "2 out". */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const days = -dayDiff(value, now);
  if (days === 0) return `há ${hours} h`;
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatShortDate(value, now);
}

export function isOpenStatus(status: Status): boolean {
  return status !== "done" && status !== "canceled";
}

export function isOverdue(task: { due_date: string; status: Status }, now: Date = new Date()): boolean {
  return isOpenStatus(task.status) && new Date(task.due_date) < now;
}
