import type { Metadata } from "next";
import { Team } from "@/features/legacy/directory";

export const metadata: Metadata = { title: "Equipe" };

export default function TeamPage() {
  return <Team />;
}
