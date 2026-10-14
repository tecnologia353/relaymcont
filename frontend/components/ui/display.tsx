import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

/* ---------- Badge ---------- */

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border border-line bg-sunken text-fg-muted",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

const dotTones: Record<BadgeTone, string> = {
  neutral: "bg-fg-subtle",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotTones[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Avatar ---------- */

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const avatarSizes: Record<AvatarSize, string> = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-5 w-5 text-[9px]",
  md: "h-6 w-6 text-2xs",
  lg: "h-8 w-8 text-xs",
};

const HUES = [235, 200, 160, 30, 280, 330, 185, 260, 15, 120];

function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** Quando true, o nome é anunciado por leitores de tela (use se não houver texto do nome ao lado). */
  labelled?: boolean;
  className?: string;
}

/** Iniciais com cor estável por pessoa, legível nos dois temas. */
export function Avatar({ name, size = "md", labelled = false, className }: AvatarProps) {
  return (
    <span
      role={labelled ? "img" : undefined}
      aria-label={labelled ? name : undefined}
      aria-hidden={labelled ? undefined : true}
      title={labelled ? name : undefined}
      style={{ "--avatar-h": hueFor(name) } as CSSProperties}
      className={cn(
        "avatar-tint inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        avatarSizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Kbd ---------- */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-sunken px-1 font-sans text-2xs font-medium text-fg-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ---------- Progress ---------- */

interface ProgressProps {
  value: number;
  label: string;
  tone?: "accent" | "success";
  size?: "sm" | "md";
  className?: string;
}

export function Progress({ value, label, tone = "accent", size = "sm", className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full overflow-hidden rounded-full bg-hover", size === "sm" ? "h-1" : "h-1.5", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", tone === "success" ? "bg-success" : "bg-accent")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
