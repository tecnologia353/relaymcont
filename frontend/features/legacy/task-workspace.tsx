"use client";

import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate, priorityLabel, statusLabel } from "@/lib/api";
import type { Client, Department, Priority, Status, Task, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { emit } from "@/lib/events";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { Empty, Info, LegacyField, LegacyPick, LegacySelect, Panel, TaskRow } from "./legacy-ui";

/** Parâmetro de URL que abre o detalhe de uma tarefa (ex.: /tarefas?tarefa=12). */
export const TASK_PARAM = "tarefa";

export function TaskWorkspace({ title, description, mine = false, dense = false }: { title: string; description: string; mine?: boolean; dense?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get(TASK_PARAM)) || null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => api<Task[]>(`/tasks?${mine ? "mine=true&" : ""}${query ? `q=${query}&` : ""}${status ? `status=${status}` : ""}`).then(setTasks);

  const loadSelected = useCallback(() => {
    if (!selectedId) return setSelected(null);
    api<Task>(`/tasks/${selectedId}`).then(setSelected).catch(() => setSelected(null));
  }, [selectedId]);

  useEffect(() => {
    load();
    api<User[]>("/users").then(setUsers).catch(() => setUsers([]));
    api<Client[]>("/clients").then(setClients);
    api<Department[]>("/departments").then(setDepartments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(loadSelected, [loadSelected]);

  const openTask = (id: number) => router.push(`${pathname}?${TASK_PARAM}=${id}`, { scroll: false });
  const closeTask = () => router.push(pathname, { scroll: false });

  const groups = useMemo<Record<string, Task[]>>(() => (mine ? groupToday(tasks) : { Todas: tasks }), [tasks, mine]);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <button onClick={() => setCreating(true)} className="flex h-8 items-center gap-2 rounded-md bg-ink px-3 text-sm text-surface shadow-sm">
            <Plus size={16} /> Nova tarefa
          </button>
        }
      />
      <PageBody>
        <div className="mb-5 flex gap-2">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-md border border-line bg-elevated px-3">
            <Search size={16} className="text-muted" />
            <input className="w-full bg-transparent outline-none" placeholder="Pesquisar por tarefa ou cliente" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <select className="rounded-md border border-line bg-elevated px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button className="rounded-md border border-line bg-elevated px-4 hover:border-accent/60" onClick={load}>
            Filtrar
          </button>
        </div>
        <div className={cn("grid gap-6", selected && "xl:grid-cols-[1fr_440px]")}>
          <div className="space-y-6">
            {Object.entries(groups).map(([label, items]) => (
              <Panel key={label} title={label}>
                <div className={dense ? "overflow-x-auto" : ""}>
                  {items.length ? (
                    items.map((task) => (
                      <button key={task.id} onClick={() => openTask(task.id)} className="block w-full border-b border-line py-3 text-left transition last:border-0 hover:bg-panel/70">
                        <TaskRow task={task} />
                      </button>
                    ))
                  ) : (
                    <Empty text="Nada por aqui." />
                  )}
                </div>
              </Panel>
            ))}
          </div>
          {selected && (
            <TaskDetail
              task={selected}
              onClose={closeTask}
              onChanged={() => {
                load();
                loadSelected();
              }}
            />
          )}
        </div>
        {creating && (
          <TaskModal
            users={users}
            clients={clients}
            departments={departments}
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              load();
              emit("notifications:changed");
            }}
          />
        )}
      </PageBody>
    </>
  );
}

function TaskDetail({ task, onClose, onChanged }: { task: Task; onClose: () => void; onChanged: () => void }) {
  const [comment, setComment] = useState("");
  async function patch(body: Partial<Pick<Task, "status" | "priority">>) {
    await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
    onChanged();
  }
  return (
    <aside className="sticky top-16 self-start rounded-lg border border-line bg-elevated p-5 shadow-[0_18px_60px_rgb(0_0_0_/_0.10)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {task.client.trade_name} · {task.department.name} · Competência {task.competence}
          </p>
        </div>
        <button onClick={onClose} className="text-muted" aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <LegacySelect label="Status" value={task.status} onChange={(value) => patch({ status: value as Status })} options={statusLabel} />
        <LegacySelect label="Prioridade" value={task.priority} onChange={(value) => patch({ priority: value as Priority })} options={priorityLabel} />
        <Info label="Responsável" value={task.assignee.name} />
        <Info label="Prazo" value={formatDate(task.due_date)} />
      </div>
      <h3 className="mt-6 text-sm font-semibold">Checklist</h3>
      <div className="mt-2 space-y-2">
        {task.checklist.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.done} onChange={(e) => api(`/checklists/${item.id}?done=${e.target.checked}`, { method: "PATCH" }).then(onChanged)} />
            {item.title}
          </label>
        ))}
      </div>
      <h3 className="mt-6 text-sm font-semibold">Comentários</h3>
      <div className="mt-2 space-y-3">
        {task.comments?.map((item) => (
          <div key={item.id} className="rounded-md bg-panel p-3 text-sm">
            <b>{item.author.name}</b>
            <p>{item.body}</p>
            <span className="text-xs text-muted">{formatDate(item.created_at)}</span>
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          await api(`/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) });
          setComment("");
          onChanged();
          emit("notifications:changed");
        }}
      >
        <input className="h-10 flex-1 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adicionar comentário ou @menção" />
        <button className="rounded-md bg-ink px-3 text-sm text-surface">Enviar</button>
      </form>
      <h3 className="mt-6 text-sm font-semibold">Histórico</h3>
      <div className="mt-2 space-y-2">
        {task.activity?.map((entry) => (
          <div key={entry.id} className="text-xs text-muted">
            {formatDate(entry.created_at)} · {entry.actor?.name || "Sistema"} · {entry.action} {entry.detail}
          </div>
        ))}
      </div>
    </aside>
  );
}

interface TaskForm {
  title: string;
  description: string;
  competence: string;
  priority: Priority;
  status: Status;
  client_id: string;
  department_id: string;
  assignee_id: string;
  reviewer_id: string;
  due_date: string;
  checklist: string;
}

function TaskModal({ users, clients, departments, onClose, onCreated }: { users: User[]; clients: Client[]; departments: Department[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<TaskForm>({
    title: "",
    description: "",
    competence: "10/2026",
    priority: "normal",
    status: "todo",
    client_id: "",
    department_id: "",
    assignee_id: "",
    reviewer_id: "",
    due_date: "",
    checklist: "Receber documentos\nConferir informações\nExecutar\nRevisar\nEnviar",
  });
  const set = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => setForm({ ...form, [key]: value });
  const textFields: [keyof Pick<TaskForm, "title" | "description" | "competence">, string][] = [
    ["title", "Título"],
    ["description", "Descrição"],
    ["competence", "Competência"],
  ];
  return (
    <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm">
      <form
        className="ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-line bg-elevated p-6 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/tasks", {
            method: "POST",
            body: JSON.stringify({
              ...form,
              client_id: Number(form.client_id),
              department_id: Number(form.department_id),
              assignee_id: Number(form.assignee_id),
              reviewer_id: form.reviewer_id ? Number(form.reviewer_id) : null,
              due_date: new Date(form.due_date).toISOString(),
              checklist: form.checklist.split("\n").filter(Boolean).map((title) => ({ title })),
            }),
          });
          onCreated();
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nova tarefa</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {textFields.map(([key, label]) => (
          <LegacyField key={key} label={label} value={form[key]} onChange={(value) => set(key, value)} />
        ))}
        <div className="grid grid-cols-2 gap-3">
          <LegacyPick label="Cliente" value={form.client_id} set={(value) => set("client_id", value)} items={clients} name={(item) => item.trade_name} />
          <LegacyPick label="Departamento" value={form.department_id} set={(value) => set("department_id", value)} items={departments} name={(item) => item.name} />
          <LegacyPick label="Responsável" value={form.assignee_id} set={(value) => set("assignee_id", value)} items={users} name={(item) => item.name} />
          <LegacyPick label="Revisor" value={form.reviewer_id} set={(value) => set("reviewer_id", value)} items={users} name={(item) => item.name} optional />
        </div>
        <label className="mt-3 block text-xs font-medium text-muted">Prazo</label>
        <input type="datetime-local" required className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3" onChange={(e) => set("due_date", e.target.value)} />
        <label className="mt-3 block text-xs font-medium text-muted">Checklist</label>
        <textarea className="mt-1 h-32 w-full rounded-md border border-line bg-surface p-3 text-sm" value={form.checklist} onChange={(e) => set("checklist", e.target.value)} />
        <button className="mt-5 h-10 rounded-md bg-ink px-4 text-sm text-surface">Criar tarefa</button>
      </form>
    </div>
  );
}

function groupToday(tasks: Task[]): Record<string, Task[]> {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    Atrasadas: tasks.filter((t) => new Date(t.due_date) < now && t.status !== "done"),
    "Para hoje": tasks.filter((t) => new Date(t.due_date) >= now && new Date(t.due_date) <= end && t.status !== "done"),
    Próximas: tasks.filter((t) => new Date(t.due_date) > end && t.status !== "done"),
    "Aguardando cliente": tasks.filter((t) => t.status === "waiting_client"),
    "Em revisão": tasks.filter((t) => t.status === "in_review"),
    "Concluídas hoje": tasks.filter((t) => t.status === "done" && t.completed_at && new Date(t.completed_at).toDateString() === now.toDateString()),
  };
}
