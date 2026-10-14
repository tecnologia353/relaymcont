import { api } from "@/lib/api";
import type { Checklist, Comment, Priority, Status, Task } from "@/lib/api";

/* Chamadas usadas pelas telas de tarefas — mesmas rotas e formatos da versão anterior. */

export const fetchTasks = (mine: boolean) => api<Task[]>(mine ? "/tasks?mine=true" : "/tasks");

export const fetchTask = (id: number) => api<Task>(`/tasks/${id}`);

export type TaskPatch = Partial<{ status: Status; priority: Priority }>;

export const updateTask = (id: number, patch: TaskPatch) =>
  api<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const setChecklistItem = (itemId: number, done: boolean) =>
  api<Checklist>(`/checklists/${itemId}?done=${done}`, { method: "PATCH" });

export const addComment = (taskId: number, body: string) =>
  api<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ body }) });

export interface NewTaskInput {
  title: string;
  description: string;
  competence: string;
  priority: Priority;
  status: Status;
  client_id: number;
  department_id: number;
  assignee_id: number;
  reviewer_id: number | null;
  due_date: string;
  checklist: { title: string }[];
}

export const createTask = (input: NewTaskInput) => api<Task>("/tasks", { method: "POST", body: JSON.stringify(input) });
