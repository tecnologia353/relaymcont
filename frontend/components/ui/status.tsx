import type { ReactNode } from "react";
import type { Priority, Status } from "@/lib/api";
import { priorityLabel, statusLabel } from "@/lib/api";
import { cn } from "@/lib/cn";

const statusColor: Record<Status, string> = {
  todo: "text-status-todo",
  in_progress: "text-status-progress",
  waiting_client: "text-status-waiting",
  in_review: "text-status-review",
  done: "text-status-done",
  canceled: "text-status-canceled",
};

/** Ordem de exibição dos status em listas agrupadas e no Kanban. */
export const statusOrder: Status[] = ["todo", "in_progress", "waiting_client", "in_review", "done", "canceled"];
export const priorityOrder: Priority[] = ["urgent", "high", "normal", "low"];

/** Fatia de pizza a partir do topo, em sentido horário. */
function pie(fraction: number, radius = 3.5): string {
  const angle = fraction * 2 * Math.PI;
  const x = 7 + radius * Math.sin(angle);
  const y = 7 - radius * Math.cos(angle);
  return `M7 7 L7 ${7 - radius} A${radius} ${radius} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
}

interface StatusIconProps {
  status: Status;
  size?: number;
  className?: string;
}

/** Ícone de status: a forma diferencia os estados mesmo sem cor (daltonismo, impressão). */
export function StatusIcon({ status, size = 14, className }: StatusIconProps) {
  const ring = <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />;
  let inner: ReactNode = null;

  switch (status) {
    case "in_progress":
      inner = <path d={pie(0.5)} fill="currentColor" />;
      break;
    case "in_review":
      inner = <path d={pie(0.75)} fill="currentColor" />;
      break;
    case "waiting_client":
      inner = (
        <>
          <rect x="4.9" y="4.5" width="1.4" height="5" rx="0.6" fill="currentColor" />
          <rect x="7.7" y="4.5" width="1.4" height="5" rx="0.6" fill="currentColor" />
        </>
      );
      break;
    case "done":
      return (
        <svg viewBox="0 0 14 14" width={size} height={size} className={cn("shrink-0", statusColor[status], className)} aria-hidden>
          <circle cx="7" cy="7" r="7" fill="currentColor" />
          <path d="M4.3 7.2 6.2 9.1 9.8 5.3" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "canceled":
      return (
        <svg viewBox="0 0 14 14" width={size} height={size} className={cn("shrink-0", statusColor[status], className)} aria-hidden>
          <circle cx="7" cy="7" r="7" fill="currentColor" />
          <path d="M4.9 4.9 9.1 9.1M9.1 4.9 4.9 9.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }

  return (
    <svg viewBox="0 0 14 14" width={size} height={size} className={cn("shrink-0", statusColor[status], className)} aria-hidden>
      {ring}
      {inner}
    </svg>
  );
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-2 text-xs font-medium text-fg",
        className,
      )}
    >
      <StatusIcon status={status} size={12} />
      {statusLabel[status]}
    </span>
  );
}

interface PriorityIconProps {
  priority: Priority;
  size?: number;
  className?: string;
}

/** Barras de sinal (baixa → alta) e marcador destacado para urgente. */
export function PriorityIcon({ priority, size = 14, className }: PriorityIconProps) {
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 14 14" width={size} height={size} className={cn("shrink-0 text-danger", className)} aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" />
        <path d="M7 3.8v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="10.1" r="0.95" fill="white" />
      </svg>
    );
  }
  const level = { low: 1, normal: 2, high: 3 }[priority];
  const bars = [
    { x: 1.5, y: 8, h: 4 },
    { x: 5.75, y: 5, h: 7 },
    { x: 10, y: 2, h: 10 },
  ];
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} className={cn("shrink-0 text-fg-muted", className)} aria-hidden>
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={bar.y}
          width="2.5"
          height={bar.h}
          rx="0.8"
          fill="currentColor"
          opacity={index < level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

/** Ícone + rótulo; use `showLabel={false}` em listas densas (o rótulo vira texto acessível). */
export function PriorityTag({ priority, showLabel = true, className }: { priority: Priority; showLabel?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-fg-muted", className)} title={showLabel ? undefined : priorityLabel[priority]}>
      <PriorityIcon priority={priority} />
      {showLabel ? priorityLabel[priority] : <span className="sr-only">Prioridade {priorityLabel[priority]}</span>}
    </span>
  );
}
