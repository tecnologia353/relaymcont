"use client";

import { AtSign, Bell, CheckCheck, Inbox, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, EmptyState, ErrorState, SegmentedControl, SkeletonRows, useToast } from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/api";
import { cn } from "@/lib/cn";
import { emit } from "@/lib/events";
import { dayDiff, formatDateTime, formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/features/shell/page-header";

type LoadState = "loading" | "ready" | "error";
type Filter = "unread" | "all";

const filterOptions: SegmentedOption<Filter>[] = [
  { value: "unread", label: "Não lidas" },
  { value: "all", label: "Todas" },
];

/** O tipo vem do texto gerado em lib/api.ts ("mencionou você", "atribuiu uma tarefa"). */
function kindOf(message: string): { icon: ReactNode; label: string } {
  if (message.includes("mencionou")) return { icon: <AtSign size={14} />, label: "Menção" };
  if (message.includes("atribuiu")) return { icon: <UserPlus size={14} />, label: "Atribuição" };
  return { icon: <Bell size={14} />, label: "Alerta" };
}

function groupLabel(value: string): string {
  const diff = -dayDiff(value);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return "Esta semana";
  return "Anteriores";
}

export function InboxView() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [filter, setFilter] = useState<Filter>("unread");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api<Notification[]>("/notifications"));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((item) => !item.read).length;
  const visible = filter === "unread" ? items.filter((item) => !item.read) : items;

  const groups = useMemo(() => {
    const result: { label: string; items: Notification[] }[] = [];
    for (const item of visible) {
      const label = groupLabel(item.created_at);
      const group = result.find((entry) => entry.label === label);
      if (group) group.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [visible]);

  const markRead = async (ids: number[]) => {
    setItems((list) => list.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)));
    await Promise.all(ids.map((id) => api(`/notifications/${id}/read`, { method: "PATCH" })));
    emit("notifications:changed");
  };

  const open = async (item: Notification) => {
    if (!item.read) markRead([item.id]).catch(() => load());
    if (item.task_id) router.push(`/tarefas?tarefa=${item.task_id}`);
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await markRead(items.filter((item) => !item.read).map((item) => item.id));
      toast({ tone: "success", title: "Tudo em dia", description: "Todas as notificações foram marcadas como lidas." });
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível marcar como lidas", description: (error as Error).message });
      load();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Atribuições, menções e alertas para você."
        actions={
          unread > 0 && (
            <Button size="sm" leadingIcon={<CheckCheck size={14} aria-hidden />} loading={markingAll} onClick={markAll}>
              <span className="sr-only sm:not-sr-only">Marcar todas como lidas</span>
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2 border-b border-line px-4 py-2 md:px-6">
        <SegmentedControl label="Mostrar" value={filter} options={filterOptions} onChange={setFilter} />
        <span className="ml-auto text-sm tabular-nums text-fg-muted" aria-live="polite">
          {unread} {unread === 1 ? "não lida" : "não lidas"}
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1">
        {state === "loading" && <SkeletonRows rows={8} />}
        {state === "error" && <ErrorState title="Não foi possível carregar o Inbox" onRetry={() => (setState("loading"), load())} />}
        {state === "ready" && visible.length === 0 && (
          <EmptyState
            icon={<Inbox size={18} />}
            title={filter === "unread" && items.length ? "Você está em dia" : "Nenhuma notificação"}
            description={
              filter === "unread" && items.length
                ? "Não há notificações não lidas."
                : "Quando alguém atribuir uma tarefa a você ou mencionar você em um comentário, o aviso aparece aqui."
            }
            action={
              filter === "unread" &&
              items.length > 0 && (
                <Button size="sm" onClick={() => setFilter("all")}>
                  Ver todas
                </Button>
              )
            }
          />
        )}
        {state === "ready" &&
          groups.map((group) => (
            <section key={group.label} aria-labelledby={`grupo-${group.label}`}>
              <h2 id={`grupo-${group.label}`} className="px-4 pb-1 pt-5 text-xs font-medium text-fg-subtle md:px-6">
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => {
                  const kind = kindOf(item.message);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hover/60 focus-visible:bg-hover/60 focus-visible:outline-none md:px-6"
                      >
                        <span
                          className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line", item.read ? "bg-sunken text-fg-subtle" : "bg-accent/10 text-accent")}
                          aria-hidden
                        >
                          {kind.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm", item.read ? "text-fg-muted" : "font-medium text-fg")}>{item.message}</span>
                          <span className="mt-0.5 block text-xs text-fg-subtle">
                            {kind.label} · <time dateTime={item.created_at} title={formatDateTime(item.created_at)}>{formatRelativeTime(item.created_at)}</time>
                            {item.task_id && <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"> · Abrir tarefa</span>}
                          </span>
                        </span>
                        {!item.read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent">
                            <span className="sr-only">Não lida</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}
