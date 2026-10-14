"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { Panel, TaskRow } from "./legacy-ui";

export function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>();
  useEffect(() => {
    api<DashboardData>("/dashboard").then(setData);
  }, []);

  const header = <PageHeader title="Home" description="Como está a operação da empresa?" />;
  if (!data)
    return (
      <>
        {header}
        <PageBody>
          <div className="h-40 animate-pulse rounded-lg bg-panel" />
        </PageBody>
      </>
    );

  const cards: [string, number][] = [
    ["Tarefas no mês", data.counts.month],
    ["Concluídas", data.counts.done],
    ["Em andamento", data.counts.in_progress],
    ["Atrasadas", data.counts.overdue],
    ["Aguardando cliente", data.counts.waiting_client],
    ["Em revisão", data.counts.in_review],
  ];

  return (
    <>
      {header}
      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {cards.map(([label, value]) => (
            <button
              key={label}
              onClick={() => router.push("/tarefas")}
              className="group rounded-lg border border-line bg-elevated p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_18px_50px_rgb(0_0_0_/_0.08)]"
            >
              <div className="mb-4 h-1 w-8 rounded-full bg-accent/70 opacity-60 transition group-hover:w-12" />
              <div className="text-3xl font-semibold tabular-nums">{value}</div>
              <div className="mt-1 text-xs text-muted">{label}</div>
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_.8fr]">
          <Panel title="Atenção">
            {data.critical.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Panel>
          <Panel title="Próximos prazos">
            {data.upcoming.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Panel>
          <Panel title="Departamentos">
            {data.departments.map((department) => (
              <div key={department.id} className="py-3">
                <div className="mb-2 flex justify-between text-sm">
                  <span>{department.name}</span>
                  <span>{department.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-panel">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${department.progress}%` }} />
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Equipe">
            <table className="w-full text-sm">
              <tbody>
                {data.team.map((member) => (
                  <tr key={member.id} className="border-b border-line last:border-0">
                    <td className="py-3 font-medium">{member.name}</td>
                    <td>{member.pending} pendentes</td>
                    <td>{member.in_progress} em andamento</td>
                    <td className={member.overdue ? "text-red-600" : ""}>{member.overdue} atrasadas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
