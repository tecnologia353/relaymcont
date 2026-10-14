import type { Task } from "@/lib/api";

/** Formato retornado por api("/dashboard") (ver dashboard() em lib/api.ts). */
export interface DashboardData {
  counts: {
    month: number;
    done: number;
    in_progress: number;
    overdue: number;
    waiting_client: number;
    in_review: number;
  };
  critical: Task[];
  upcoming: Task[];
  departments: { id: number; name: string; progress: number }[];
  team: { id: number; name: string; pending: number; in_progress: number; overdue: number }[];
}
