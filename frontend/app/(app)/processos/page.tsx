import type { Metadata } from "next";
import { Suspense } from "react";
import { ProcessesView } from "@/features/processes/processes-view";

export const metadata: Metadata = { title: "Processos" };

export default function ProcessesPage() {
  return (
    <Suspense>
      <ProcessesView />
    </Suspense>
  );
}
