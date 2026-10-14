import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamView } from "@/features/team/team-view";

export const metadata: Metadata = { title: "Equipe" };

export default function TeamPage() {
  return (
    <Suspense>
      <TeamView />
    </Suspense>
  );
}
