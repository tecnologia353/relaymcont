/*
 * Componentes da interface anterior, preservados durante a migração.
 * Serão substituídos pelo kit em components/ui nas Etapas 4–6 e este arquivo será removido.
 */
import type { ReactNode } from "react";
import { formatDate, priorityLabel, statusLabel } from "@/lib/api";
import type { Task } from "@/lib/api";
import { cn } from "@/lib/cn";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="rounded-lg border border-line bg-elevated p-4 shadow-sm">{children}</div>
    </div>
  );
}

export function TaskRow({ task }: { task: Task }) {
  return (
    <div className="grid gap-2 text-sm md:grid-cols-[1fr_160px_130px_120px]">
      <div>
        <div className="font-medium">{task.title}</div>
        <div className="text-xs text-muted">
          {task.client.trade_name} · {task.assignee.name}
        </div>
      </div>
      <span>{formatDate(task.due_date)}</span>
      <LegacyBadge tone={task.status}>{statusLabel[task.status]}</LegacyBadge>
      <LegacyBadge tone={task.priority}>{priorityLabel[task.priority]}</LegacyBadge>
    </div>
  );
}

function LegacyBadge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "w-fit rounded-md px-2 py-1 text-xs",
        tone === "urgent" || tone === "high" || tone === "todo"
          ? "bg-red-50 text-red-700"
          : tone === "done"
            ? "bg-green-50 text-green-700"
            : "bg-panel text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-muted">{text}</div>;
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export function LegacySelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Record<string, string> }) {
  return (
    <label className="text-xs text-muted">
      {label}
      <select className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink" value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LegacyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block text-xs font-medium text-muted">
      {label}
      <input
        required
        className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function LegacyPick<T extends { id: number }>({ label, value, set, items, name, optional = false }: {
  label: string;
  value: string;
  set: (value: string) => void;
  items: T[];
  name: (item: T) => string;
  optional?: boolean;
}) {
  return (
    <label className="mt-3 block text-xs font-medium text-muted">
      {label}
      <select required={!optional} className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">Selecione</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {name(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
