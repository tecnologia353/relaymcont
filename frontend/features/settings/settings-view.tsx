"use client";

import { LogOut, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Avatar, Button, Dialog, SegmentedControl } from "@/components/ui";
import type { SegmentedOption } from "@/components/ui";
import { api } from "@/lib/api";
import type { Department } from "@/lib/api";
import Link from "next/link";
import { labelOf, roleLabel } from "@/lib/labels";
import { canResetOfficeData } from "@/lib/permissions";
import { useCurrentUser, useSession } from "@/features/session/session-provider";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { themeLabel, useTheme } from "@/features/theme/theme";
import type { ThemePreference } from "@/features/theme/theme";

const themeOptions: SegmentedOption<ThemePreference>[] = [
  { value: "light", label: themeLabel.light, icon: <Sun size={14} aria-hidden /> },
  { value: "dark", label: themeLabel.dark, icon: <Moon size={14} aria-hidden /> },
  { value: "system", label: themeLabel.system, icon: <Monitor size={14} aria-hidden /> },
];

/** Chaves de dados locais da aplicação (lib/api.ts versiona a base como relay_local_store_vN). */
function clearLocalData(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("relay_local_store") || key === "relay_token" || key === "relay_user_id")
    .forEach((key) => localStorage.removeItem(key));
}

export function SettingsView() {
  const user = useCurrentUser();
  const { logout } = useSession();
  const { theme, setTheme } = useTheme();
  const [department, setDepartment] = useState<string>();
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    api<Department[]>("/departments")
      .then((items) => setDepartment(items.find((item) => item.id === user.department_id)?.name))
      .catch(() => setDepartment(undefined));
  }, [user.department_id]);

  return (
    <>
      <PageHeader title="Configurações" />
      <PageBody className="mx-auto w-full max-w-3xl space-y-10 md:py-10">
        <Section title="Perfil" description="Seus dados de acesso ao Relay.">
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar name={user.name} size="lg" className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-fg">{user.name}</p>
              <p className="truncate text-sm text-fg-muted">{user.position}</p>
            </div>
          </div>
          <Row label="E-mail">{user.email}</Row>
          <Row label="Perfil de acesso">
            <span className="inline-flex items-center gap-3">
              {labelOf(roleLabel, user.role)}
              <Link href="/equipe?aba=perfis" className="text-sm font-medium text-accent hover:underline">
                O que meu perfil permite?
              </Link>
            </span>
          </Row>
          <Row label="Departamento">{department ?? "—"}</Row>
        </Section>

        <Section title="Aparência" description="Ajuste o Relay ao seu ambiente de trabalho.">
          <Row label="Tema" description="“Sistema” acompanha a configuração do seu computador.">
            <SegmentedControl label="Tema" value={theme} options={themeOptions} onChange={setTheme} />
          </Row>
        </Section>

        <Section title="Sessão">
          <Row label="Sair do Relay" description="Encerra a sessão neste navegador.">
            <Button leadingIcon={<LogOut size={14} aria-hidden />} onClick={logout}>
              Sair
            </Button>
          </Row>
        </Section>

        {canResetOfficeData(user) && (
          <Section title="Dados locais" description="Nesta versão, os dados do escritório ficam salvos apenas neste navegador.">
            <Row label="Restaurar dados de demonstração" description="Apaga tarefas, clientes e comentários salvos neste navegador e recria os dados iniciais.">
              <Button variant="danger" leadingIcon={<RotateCcw size={14} aria-hidden />} onClick={() => setConfirmReset(true)}>
                Restaurar
              </Button>
            </Row>
          </Section>
        )}
      </PageBody>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="Restaurar dados de demonstração?"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)} data-autofocus>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearLocalData();
                window.location.assign("/login");
              }}
            >
              Restaurar dados
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Todas as alterações feitas neste navegador serão perdidas e você precisará entrar novamente. Esta ação não pode ser desfeita.
        </p>
      </Dialog>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="divide-y divide-line rounded-lg border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="shrink-0 text-sm text-fg-muted">{children}</div>
    </div>
  );
}
