import type { Metadata } from "next";
import { Suspense } from "react";
import { OperationsView } from "@/features/tasks/operations-view";

export const metadata: Metadata = { title: "Operação" };

export default function OperationPage() {
  return (
    <Suspense>
      <OperationsView />
    </Suspense>
  );
}
