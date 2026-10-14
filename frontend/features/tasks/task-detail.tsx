"use client";

import { ChevronDown, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Avatar, Badge, Button, Checkbox, ErrorState, Kbd, PriorityIcon, Progress, Sheet, Skeleton, StatusIcon, Textarea, useToast } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import type { Priority, Status, Task } from "@/lib/api";
import { cn } from "@/lib/cn";
import { emit, useRelayEvent } from "@/lib/events";
import { formatDateTime, formatDue, formatRelativeTime, isOverdue } from "@/lib/format";
import { PriorityMenu, StatusMenu } from "./task-property-menus";
import { addComment, fetchTask, setChecklistItem, updateTask } from "./tasks-api";
import type { TaskPatch } from "./tasks-api";
import { checklistProgress, describeActivity } from "./task-utils";

type DetailState = { status: "loading" } | { status: "ready"; task: Task } | { status: "error" };

interface TaskDetailProps {
  taskId: number | null;
  onClose: () => void;
}

/** Painel lateral com propriedades, checklist, comentários e histórico. Aberto via ?tarefa=ID. */
export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { toast } = useToast();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  const load = useCallback(async () => {
    if (!taskId) return;
    try {
      setState({ status: "ready", task: await fetchTask(taskId) });
    } catch {
      setState({ status: "error" });
    }
  }, [taskId]);

  useEffect(() => {
    setState({ status: "loading" });
    load();
  }, [load]);
  useRelayEvent("tasks:changed", load);

  const task = state.status === "ready" ? state.task : null;

  /** Atualização otimista: aplica na tela, chama a API e desfaz em caso de erro. */
  const mutate = async (optimistic: (task: Task) => Task, request: () => Promise<unknown>, errorTitle: string) => {
    if (!task) return;
    const previous = task;
    setState({ status: "ready", task: optimistic(task) });
    try {
      await request();
      emit("tasks:changed");
    } catch (error) {
      setState({ status: "ready", task: previous });
      toast({ tone: "error", title: errorTitle, description: (error as Error).message });
    }
  };

  const patch = (changes: TaskPatch) => {
    if (!task) return;
    mutate((current) => ({ ...current, ...changes }), () => updateTask(task.id, changes), "Não foi possível atualizar a tarefa");
  };

  return (
    <Sheet
      open={taskId !== null}
      onClose={onClose}
      size="lg"
      title={task ? task.title : state.status === "error" ? "Tarefa indisponível" : "Carregando tarefa…"}
      description={task ? `${task.client.trade_name} · ${task.department.name} · Competência ${task.competence}` : undefined}
    >
      {state.status === "loading" && <DetailSkeleton />}
      {state.status === "error" && (
        <ErrorState title="Não foi possível abrir a tarefa" description="Ela pode ter sido removida ou o link está incorreto." onRetry={load} />
      )}
      {task && (
        <div className="space-y-8">
          <Properties task={task} onPatch={patch} />

          {task.description && <p className="whitespace-pre-line text-base leading-relaxed text-fg">{task.description}</p>}

          <ChecklistSection
            task={task}
            onToggle={(itemId, done) =>
              mutate(
                (current) => ({ ...current, checklist: current.checklist.map((item) => (item.id === itemId ? { ...item, done } : item)) }),
                () => setChecklistItem(itemId, done),
                "Não foi possível atualizar o checklist",
              )
            }
          />

          <CommentsSection task={task} />

          <ActivitySection task={task} />
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Propriedades ---------- */

function Properties({ task, onPatch }: { task: Task; onPatch: (patch: TaskPatch) => void }) {
  const overdue = isOverdue(task);
  return (
    <dl className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
      <Property label="Status">
        <StatusMenu
          value={task.status}
          onChange={(status: Status) => onPatch({ status })}
          trigger={(props) => (
            <PropertyButton {...props} aria-label={`Status: ${statusLabel[task.status]}. Alterar`}>
              <StatusIcon status={task.status} />
              {statusLabel[task.status]}
            </PropertyButton>
          )}
        />
      </Property>
      <Property label="Prioridade">
        <PriorityMenu
          value={task.priority}
          onChange={(priority: Priority) => onPatch({ priority })}
          trigger={(props) => (
            <PropertyButton {...props} aria-label={`Prioridade: ${priorityLabel[task.priority]}. Alterar`}>
              <PriorityIcon priority={task.priority} />
              {priorityLabel[task.priority]}
            </PropertyButton>
          )}
        />
      </Property>
      <Property label="Prazo">
        <span className="flex h-7 items-center gap-2">
          <span className={cn(overdue && "font-medium text-danger")}>{formatDateTime(task.due_date)}</span>
          {overdue && <Badge tone="danger">Atrasada · {formatDue(task.due_date).toLowerCase()}</Badge>}
        </span>
      </Property>
      <Property label="Responsável">
        <Person name={task.assignee.name} />
      </Property>
      <Property label="Revisor">{task.reviewer ? <Person name={task.reviewer.name} /> : <span className="text-fg-subtle">Sem revisor</span>}</Property>
      <Property label="Cliente">
        <span className="flex h-7 items-center truncate">{task.client.trade_name}</span>
      </Property>
      <Property label="Criada por">
        <span className="flex h-7 items-center gap-2 text-fg-muted">
          <Avatar name={task.creator.name} size="xs" />
          {task.creator.name}
          <span className="text-fg-subtle">· {formatRelativeTime(task.created_at)}</span>
        </span>
      </Property>
    </dl>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-fg">{children}</dd>
    </>
  );
}

function PropertyButton({ children, ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      {...props}
      className="-ml-2 inline-flex h-7 items-center gap-2 rounded-md px-2 font-medium transition-colors hover:bg-hover"
    >
      {children}
      <ChevronDown size={13} className="text-fg-subtle" aria-hidden />
    </button>
  );
}

function Person({ name }: { name: string }) {
  return (
    <span className="flex h-7 items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/* ---------- Checklist ---------- */

function ChecklistSection({ task, onToggle }: { task: Task; onToggle: (itemId: number, done: boolean) => void }) {
  const { done, total } = checklistProgress(task);
  if (total === 0) return null;
  return (
    <section aria-labelledby="checklist-titulo">
      <div className="mb-3 flex items-center gap-3">
        <h3 id="checklist-titulo" className="text-sm font-semibold text-fg">
          Checklist
        </h3>
        <span className="text-sm tabular-nums text-fg-muted">
          {done}/{total}
        </span>
        <Progress value={(done / total) * 100} label="Progresso do checklist" tone={done === total ? "success" : "accent"} className="max-w-40" />
      </div>
      <ul className="space-y-0.5">
        {task.checklist.map((item) => (
          <li key={item.id}>
            <Checkbox
              checked={item.done}
              onChange={(event) => onToggle(item.id, event.target.checked)}
              label={<span className={cn("text-sm", item.done ? "text-fg-muted line-through decoration-fg-subtle" : "text-fg")}>{item.title}</span>}
              className="-mx-2 flex w-[calc(100%+1rem)] rounded-md px-2 py-1.5 transition-colors hover:bg-hover/60"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Comentários ---------- */

/** Destaca menções (@nome) no texto do comentário. */
function CommentBody({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-line break-words text-sm leading-relaxed text-fg">
      {body.split(/(@[\p{L}\p{N}_.]+)/u).map((part, index) =>
        part.startsWith("@") ? (
          <span key={index} className="rounded bg-accent/10 px-0.5 font-medium text-accent">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function CommentsSection({ task }: { task: Task }) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const comments = task.comments ?? [];

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addComment(task.id, text);
      setBody("");
      emit("tasks:changed");
      if (text.includes("@")) emit("notifications:changed");
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível enviar o comentário", description: (error as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby="comentarios-titulo">
      <h3 id="comentarios-titulo" className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        Comentários
        {comments.length > 0 && <span className="font-normal tabular-nums text-fg-muted">{comments.length}</span>}
      </h3>
      {comments.length === 0 ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-fg-muted">
          <MessageSquare size={14} aria-hidden /> Nenhum comentário ainda.
        </p>
      ) : (
        <ul className="mb-4 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={comment.author.name} size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-fg">{comment.author.name}</span>
                  <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)} className="text-xs text-fg-subtle">
                    {formatRelativeTime(comment.created_at)}
                  </time>
                </p>
                <CommentBody body={comment.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="rounded-lg border border-line bg-surface shadow-xs transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
      >
        <label htmlFor="novo-comentario" className="sr-only">
          Novo comentário
        </label>
        <Textarea
          id="novo-comentario"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Escreva um comentário… Use @ para mencionar o responsável."
          className="min-h-[72px] resize-none border-0 bg-transparent shadow-none focus:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
          <span className="hidden items-center gap-1 text-xs text-fg-subtle sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd> para enviar
          </span>
          <Button type="submit" size="sm" variant="primary" loading={sending} disabled={!body.trim()} className="ml-auto">
            Comentar
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ---------- Histórico ---------- */

const ACTIVITY_PREVIEW = 8;

function ActivitySection({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const activity = task.activity ?? [];
  if (activity.length === 0) return null;
  const visible = expanded ? activity : activity.slice(0, ACTIVITY_PREVIEW);

  return (
    <section aria-labelledby="historico-titulo">
      <h3 id="historico-titulo" className="mb-3 text-sm font-semibold text-fg">
        Histórico
      </h3>
      <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[7px] before:top-1 before:w-px before:bg-line">
        {visible.map((entry) => (
          <li key={entry.id} className="relative flex gap-3 text-sm">
            <span className="relative z-[1] mt-0.5 flex rounded-full ring-4 ring-surface">
              <Avatar name={entry.actor?.name ?? "Sistema"} size="xs" />
            </span>
            <p className="min-w-0 flex-1 text-fg-muted">
              <span className="font-medium text-fg">{entry.actor?.name ?? "Sistema"}</span> {describeActivity(entry).join("; ")}
              <time dateTime={entry.created_at} title={formatDateTime(entry.created_at)} className="text-fg-subtle">
                {" "}
                · {formatRelativeTime(entry.created_at)}
              </time>
            </p>
          </li>
        ))}
      </ol>
      {activity.length > ACTIVITY_PREVIEW && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Mostrar menos" : `Mostrar todo o histórico (${activity.length})`}
        </Button>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="contents">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
