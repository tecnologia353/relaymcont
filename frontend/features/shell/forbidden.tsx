"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { EmptyState, buttonClasses } from "@/components/ui";
import { labelOf, roleLabel } from "@/lib/labels";
import { useCurrentUser } from "@/features/session/session-provider";
import { PageHeader } from "./page-header";

/** Página aberta pela URL por quem não tem acesso a ela (o menu já a esconde). */
export function Forbidden({ title }: { title: string }) {
  const user = useCurrentUser();
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={<ShieldOff size={18} />}
        title="Você não tem acesso a esta página"
        description={`O perfil ${labelOf(roleLabel, user.role)} não inclui ${title}. Se precisar, fale com um gestor do escritório.`}
        action={
          <div className="flex gap-2">
            <Link href="/meu-dia" className={buttonClasses({ size: "sm", variant: "primary" })}>
              Ir para Meu Dia
            </Link>
            <Link href="/equipe?aba=perfis" className={buttonClasses({ size: "sm" })}>
              Ver perfis de acesso
            </Link>
          </div>
        }
      />
    </>
  );
}
