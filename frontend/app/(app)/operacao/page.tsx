import type { Metadata } from "next";
import { Suspense } from "react";
import { TaskWorkspace } from "@/features/legacy/task-workspace";

export const metadata: Metadata = { title: "Operação" };

export default function OperationPage() {
  return (
    <Suspense>
      <TaskWorkspace title="Operação" description="Gerenciamento de tarefas, filtros e execução." dense />
    </Suspense>
  );
}
