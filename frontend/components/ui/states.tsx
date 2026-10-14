"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-hover", className)} aria-hidden />;
}

/** Linhas de lista em carregamento, no mesmo ritmo das linhas reais. */
export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className={cn("divide-y divide-line", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-11 items-center gap-3 px-4">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="hidden h-3 w-20 sm:block" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-1 px-4 py-6" : "gap-2 px-6 py-14", className)}>
      {icon && (
        <div className={cn("mb-1 grid place-items-center rounded-lg border border-line bg-sunken text-fg-muted", compact ? "h-8 w-8" : "h-10 w-10")}>
          {icon}
        </div>
      )}
      <p className={cn("font-medium text-fg", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Não foi possível carregar",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
  retrying = false,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-1 px-4 py-6" : "gap-2 px-6 py-14", className)}>
      <div className="mb-1 grid h-10 w-10 place-items-center rounded-lg bg-danger/10 text-danger">
        <AlertTriangle size={18} aria-hidden />
      </div>
      <p className="text-base font-medium text-fg">{title}</p>
      <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      {onRetry && (
        <Button className="mt-2" size="sm" onClick={onRetry} loading={retrying} leadingIcon={<RotateCw size={14} aria-hidden />}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
