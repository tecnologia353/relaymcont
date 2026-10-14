import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksView } from "@/features/tasks/tasks-view";

export const metadata: Metadata = { title: "Tarefas" };

export default function TasksPage() {
  return (
    <Suspense>
      <TasksView mode="all" />
    </Suspense>
  );
}
