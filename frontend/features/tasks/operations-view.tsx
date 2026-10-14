"use client";

import { Columns3, ListTodo, Plus, Rows3, SearchX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, EmptyState, ErrorState, SegmentedControl, Skeleton, SkeletonRows } from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import { PageHeader } from "@/features/shell/page-header";
import { FilterBar } from "./task-filters";
import { TaskBoard } from "./task-board";
import { TaskCreate } from "./task-create";
import { TaskDetail } from "./task-detail";
import { TaskTable } from "./task-table";
import { activeFilterCount, applyFilters } from "./task-utils";
import { useReferenceData, useStatusChange, useTaskUrlState, useTasks } from "./use-task-data";

type View = "quadro" | "tabela";

/** Parâmetro de URL da visualização (ex.: /operacao?visao=tabela). Sem ele, abre o quadro. */
const VIEW_PARAM = "visao";

const viewOptions: SegmentedOption<View>[] = [
  { value: "quadro", label: "Quadro", icon: <Columns3 size={14} aria-hidden /> },
  { value: "tabela", label: "Tabela", icon: <Rows3 size={14} aria-hidden /> },
];

/** Operação: todas as tarefas do escritório em quadro por status ou em tabela ordenável. */
export function OperationsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: View = searchParams.get(VIEW_PARAM) === "tabela" ? "tabela" : "quadro";

  const { tasks, setTasks, state, retry } = useTasks(false);
  const reference = useReferenceData();
  const { filters, setFilters, clearFilters, openTaskId, openTask, closeTask } = useTaskUrlState();
  const changeStatus = useStatusChange(setTasks);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  const setView = (next: View) => {
    const params = new URLSearchParams(window.location.search);
    if (next === "quadro") params.delete(VIEW_PARAM);
    else params.set(VIEW_PARAM, next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const newTaskButton = (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={15} aria-hidden />} onClick={() => setCreating(true)}>
      <span className="sr-only sm:not-sr-only">Nova tarefa</span>
    </Button>
  );

  return (
    // Altura fixa na viewport: quadro e tabela rolam por dentro, mantendo cabeçalho e filtros visíveis.
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Operação"
        description="Acompanhe e mova as tarefas do escritório por etapa."
        actions={
          <>
            <SegmentedControl label="Visualização" value={view} options={viewOptions} onChange={setView} />
            {newTaskButton}
          </>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} onClear={clearFilters} reference={reference} resultCount={filtered.length} />

      {state === "loading" && (view === "quadro" ? <BoardSkeleton /> : <SkeletonRows rows={12} className="px-2" />)}
      {state === "error" && <ErrorState title="Não foi possível carregar as tarefas" onRetry={retry} />}
      {state === "ready" && tasks.length === 0 && (
        <EmptyState
          icon={<ListTodo size={18} />}
          title="Nenhuma tarefa cadastrada"
          description="Crie a primeira tarefa para começar a acompanhar a operação do escritório."
          action={newTaskButton}
        />
      )}
      {state === "ready" && tasks.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<SearchX size={18} />}
          title="Nenhuma tarefa encontrada"
          description="Nenhuma tarefa corresponde aos filtros aplicados."
          action={
            activeFilterCount(filters) > 0 && (
              <Button size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )
          }
        />
      )}
      {state === "ready" && filtered.length > 0 && (
        <div key={view} className="flex min-h-0 flex-1 animate-fade-in flex-col">
          {view === "quadro" ? (
            <TaskBoard tasks={filtered} onOpen={(task) => openTask(task.id)} onStatusChange={changeStatus} />
          ) : (
            <TaskTable tasks={filtered} onOpen={(task) => openTask(task.id)} onStatusChange={changeStatus} />
          )}
        </div>
      )}

      <TaskDetail taskId={openTaskId} onClose={closeTask} />
      <TaskCreate
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          openTask(id);
        }}
        reference={reference}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="flex min-h-0 flex-1 gap-3 overflow-hidden px-4 py-4 md:px-6">
      {[4, 3, 2, 3].map((cards, column) => (
        <div key={column} className="flex w-[17.5rem] shrink-0 flex-col gap-2 rounded-xl border border-line bg-sunken p-2">
          <Skeleton className="m-1 h-4 w-28" />
          {Array.from({ length: cards }, (_, index) => (
            <Skeleton key={index} className="h-[5.5rem] rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
