import type { Metadata } from "next";
import { Clients } from "@/features/legacy/directory";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientsPage() {
  return <Clients />;
}
