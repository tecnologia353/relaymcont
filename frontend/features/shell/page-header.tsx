"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useShell } from "./shell-context";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Barra superior compacta e fixa de cada página. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { openNav } = useShell();
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur-md md:px-6">
      <IconButton className="-ml-1 md:hidden" label="Abrir menu" tooltip={false} icon={<Menu size={16} />} onClick={openNav} />
      <h1 className="truncate text-base font-semibold text-fg">{title}</h1>
      {description && <p className="hidden truncate border-l border-line pl-2 text-sm text-fg-muted lg:block">{description}</p>}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Área de conteúdo com respiro padrão abaixo do PageHeader. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex-1 px-4 py-6 md:px-6", className)}>{children}</div>;
}
