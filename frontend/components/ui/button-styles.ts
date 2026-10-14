import { cn } from "@/lib/cn";

/* Estilos de botão sem dependências de cliente: podem ser usados em Server Components. */

/** soft = estado selecionado/ativo (ex.: filtro aplicado). */
export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export const base =
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

export const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent-solid text-accent-fg shadow-xs hover:bg-accent-solid-hover",
  secondary: "border border-line bg-surface text-fg shadow-xs hover:border-line-strong hover:bg-hover",
  soft: "border border-accent/30 bg-accent/10 text-accent hover:bg-accent/15",
  ghost: "text-fg-muted hover:bg-hover hover:text-fg",
  danger: "bg-danger-solid text-white shadow-xs hover:bg-danger-solid/90",
};

export const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-sm",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-base",
};

export const iconSizes: Record<ButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/** Classes de botão para elementos que não são <button> (ex.: <Link>). */
export function buttonClasses({ variant = "secondary", size = "md" }: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  return cn(base, variants[variant], sizes[size]);
}
