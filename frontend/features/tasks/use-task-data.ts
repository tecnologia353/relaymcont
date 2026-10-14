"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Client, Department, Task, User } from "@/lib/api";
import { useRelayEvent } from "@/lib/events";
import { fetchTasks } from "./tasks-api";
import { emptyFilters, parseFilters, writeFilters } from "./task-utils";
import type { TaskFilters } from "./task-utils";

export type LoadState = "loading" | "ready" | "error";

export function useTasks(mine: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const reload = useCallback(async () => {
    try {
      setTasks(await fetchTasks(mine));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [mine]);

  useEffect(() => {
    reload();
  }, [reload]);
  useRelayEvent("tasks:changed", reload);

  const retry = useCallback(() => {
    setState("loading");
    reload();
  }, [reload]);

  return { tasks, setTasks, state, reload, retry };
}

export interface ReferenceData {
  users: User[];
  clients: Client[];
  departments: Department[];
}

/** Listas de apoio para filtros e formulários. */
export function useReferenceData(): ReferenceData {
  const [data, setData] = useState<ReferenceData>({ users: [], clients: [], departments: [] });
  useEffect(() => {
    Promise.all([api<User[]>("/users"), api<Client[]>("/clients"), api<Department[]>("/departments")])
      .then(([users, clients, departments]) => setData({ users: users.filter((user) => user.active), clients, departments }))
      .catch(() => setData({ users: [], clients: [], departments: [] }));
  }, []);
  return data;
}

export const TASK_PARAM = "tarefa";

/** Filtros e tarefa aberta, sincronizados com a URL (compartilháveis e preservados no F5). */
export function useTaskUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const openTaskId = Number(searchParams.get(TASK_PARAM)) || null;

  const navigate = useCallback(
    (params: URLSearchParams, mode: "push" | "replace") => {
      const query = params.toString();
      router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setFilters = useCallback(
    (next: TaskFilters) => navigate(writeFilters(new URLSearchParams(window.location.search), next), "replace"),
    [navigate],
  );

  const clearFilters = useCallback(() => setFilters(emptyFilters), [setFilters]);

  const openTask = useCallback(
    (id: number) => {
      const params = new URLSearchParams(window.location.search);
      params.set(TASK_PARAM, String(id));
      navigate(params, "push");
    },
    [navigate],
  );

  const closeTask = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete(TASK_PARAM);
    navigate(params, "replace");
  }, [navigate]);

  return { filters, setFilters, clearFilters, openTaskId, openTask, closeTask };
}
