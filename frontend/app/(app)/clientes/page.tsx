import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsView } from "@/features/clients/clients-view";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsView />
    </Suspense>
  );
}
