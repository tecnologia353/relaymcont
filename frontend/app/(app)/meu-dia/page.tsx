import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksView } from "@/features/tasks/tasks-view";

export const metadata: Metadata = { title: "Meu Dia" };

export default function MyDayPage() {
  return (
    <Suspense>
      <TasksView mode="mine" />
    </Suspense>
  );
}
