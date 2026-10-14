"use client";

import { Inbox, ListTodo, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, EmptyState, ErrorState, SkeletonRows, buttonClasses } from "@/components/ui";
import { PageHeader } from "@/features/shell/page-header";
import { FilterBar } from "./task-filters";
import { TaskCreate } from "./task-create";
import { TaskDetail } from "./task-detail";
import { TaskList } from "./task-list";
import { activeFilterCount, applyFilters, groupByStatus, groupMyDay } from "./task-utils";
import { useReferenceData, useStatusChange, useTaskUrlState, useTasks } from "./use-task-data";

interface TasksViewProps {
  /** "mine" = Meu Dia: só tarefas do usuário, agrupadas por urgência. */
  mode: "all" | "mine";
}

const copy = {
  all: { title: "Tarefas", description: "Todas as tarefas do escritório." },
  mine: { title: "Meu Dia", description: "O que precisa da sua atenção, por ordem de urgência." },
};

export function TasksView({ mode }: TasksViewProps) {
  const mine = mode === "mine";
  const { tasks, setTasks, state, retry } = useTasks(mine);
  const reference = useReferenceData();
  const { filters, setFilters, clearFilters, openTaskId, openTask, closeTask } = useTaskUrlState();
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);
  const groups = useMemo(() => (mine ? groupMyDay(filtered) : groupByStatus(filtered)), [filtered, mine]);
  const shownCount = groups.reduce((total, group) => total + group.tasks.length, 0);

  const changeStatus = useStatusChange(setTasks);

  const newTaskButton = (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={15} aria-hidden />} onClick={() => setCreating(true)}>
      <span className="sr-only sm:not-sr-only">Nova tarefa</span>
    </Button>
  );

  return (
    <>
      <PageHeader title={copy[mode].title} description={copy[mode].description} actions={newTaskButton} />

      <FilterBar filters={filters} onChange={setFilters} onClear={clearFilters} reference={reference} resultCount={shownCount} hideAssignee={mine} />

      <div className="flex-1">
        {state === "loading" && <SkeletonRows rows={10} />}
        {state === "error" && <ErrorState title="Não foi possível carregar as tarefas" onRetry={retry} />}
        {state === "ready" && tasks.length === 0 && (
          mine ? (
            <EmptyState
              icon={<Inbox size={18} />}
              title="Nenhuma tarefa atribuída a você"
              description="Quando alguém atribuir uma tarefa a você, ela aparece aqui organizada por prazo."
              action={
                <Link href="/tarefas" className={buttonClasses({ size: "sm" })}>
                  Ver todas as tarefas
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<ListTodo size={18} />}
              title="Nenhuma tarefa cadastrada"
              description="Crie a primeira tarefa para começar a acompanhar a operação do escritório."
              action={newTaskButton}
            />
          )
        )}
        {state === "ready" && tasks.length > 0 && shownCount === 0 && (
          <EmptyState
            icon={<SearchX size={18} />}
            title="Nenhuma tarefa encontrada"
            description={activeFilterCount(filters) ? "Nenhuma tarefa corresponde aos filtros aplicados." : "Não há tarefas para exibir."}
            action={
              activeFilterCount(filters) > 0 && (
                <Button size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )
            }
          />
        )}
        {state === "ready" && shownCount > 0 && <TaskList groups={groups} onOpen={(task) => openTask(task.id)} onStatusChange={changeStatus} />}
      </div>

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
    </>
  );
}
