"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Avatar, Button, DropdownMenu, Input, PriorityIcon, StatusIcon, priorityOrder, statusOrder } from "@/components/ui";
import type { MenuItem } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import { activeFilterCount } from "./task-utils";
import type { TaskFilters } from "./task-utils";
import type { ReferenceData } from "./use-task-data";

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  onClear: () => void;
  reference: ReferenceData;
  resultCount: number;
  /** Em "Meu Dia" o filtro de responsável não faz sentido. */
  hideAssignee?: boolean;
}

const SEARCH_DEBOUNCE_MS = 200;

export function FilterBar({ filters, onChange, onClear, reference, resultCount, hideAssignee = false }: FilterBarProps) {
  const [query, setQuery] = useState(filters.q);
  const latest = useRef(filters);
  latest.current = filters;

  // A URL é a fonte da verdade; o campo acompanha mudanças externas (ex.: "Limpar").
  useEffect(() => setQuery(filters.q), [filters.q]);

  useEffect(() => {
    if (query === latest.current.q) return;
    const timer = window.setTimeout(() => onChange({ ...latest.current, q: query }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, onChange]);

  const toggle = <K extends "status" | "priority" | "assignee" | "client" | "department">(key: K, value: TaskFilters[K][number]) => {
    const current = latest.current[key] as TaskFilters[K][number][];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onChange({ ...latest.current, [key]: next });
  };

  const active = activeFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-6">
      <Input
        size="sm"
        type="search"
        aria-label="Buscar tarefas por título ou cliente"
        placeholder="Buscar por tarefa ou cliente"
        leadingIcon={<Search size={14} />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) setQuery("");
        }}
        className="w-full sm:w-64"
      />
      <FilterMenu
        label="Status"
        count={filters.status.length}
        items={statusOrder.map((status) => ({
          label: statusLabel[status],
          icon: <StatusIcon status={status} />,
          checked: filters.status.includes(status),
          keepOpen: true,
          onSelect: () => toggle("status", status),
        }))}
      />
      <FilterMenu
        label="Prioridade"
        count={filters.priority.length}
        items={priorityOrder.map((priority) => ({
          label: priorityLabel[priority],
          icon: <PriorityIcon priority={priority} />,
          checked: filters.priority.includes(priority),
          keepOpen: true,
          onSelect: () => toggle("priority", priority),
        }))}
      />
      {!hideAssignee && (
        <FilterMenu
          label="Responsável"
          count={filters.assignee.length}
          items={reference.users.map((user) => ({
            label: user.name,
            icon: <Avatar name={user.name} size="xs" />,
            checked: filters.assignee.includes(user.id),
            keepOpen: true,
            onSelect: () => toggle("assignee", user.id),
          }))}
        />
      )}
      <FilterMenu
        label="Cliente"
        count={filters.client.length}
        items={reference.clients.map((client) => ({
          label: client.trade_name,
          checked: filters.client.includes(client.id),
          keepOpen: true,
          onSelect: () => toggle("client", client.id),
        }))}
      />
      <FilterMenu
        label="Departamento"
        count={filters.department.length}
        items={reference.departments.map((department) => ({
          label: department.name,
          checked: filters.department.includes(department.id),
          keepOpen: true,
          onSelect: () => toggle("department", department.id),
        }))}
      />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm tabular-nums text-fg-muted" aria-live="polite">
          {resultCount} {resultCount === 1 ? "tarefa" : "tarefas"}
        </span>
        {active > 0 && (
          <Button size="sm" variant="ghost" leadingIcon={<X size={14} aria-hidden />} onClick={onClear}>
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterMenu({ label, count, items }: { label: string; count: number; items: MenuItem[] }): ReactNode {
  return (
    <DropdownMenu
      label={`Filtrar por ${label.toLowerCase()}`}
      items={items}
      trigger={(props) => (
        <Button
          {...props}
          size="sm"
          variant={count > 0 ? "soft" : "secondary"}
          trailingIcon={<ChevronDown size={13} aria-hidden className="opacity-60" />}
        >
          {label}
          {count > 0 && (
            <span className="tabular-nums">
              <span aria-hidden>· </span>
              {count}
              <span className="sr-only"> selecionados</span>
            </span>
          )}
        </Button>
      )}
    />
  );
}
