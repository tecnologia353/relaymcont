import type { Metadata } from "next";
import { Dashboard } from "@/features/legacy/dashboard";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <Dashboard />;
}
