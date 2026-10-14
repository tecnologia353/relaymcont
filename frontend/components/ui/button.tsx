"use client";

import { Loader2 } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { base, iconSizes, sizes, variants } from "./button-styles";
import type { ButtonSize, ButtonVariant } from "./button-styles";
import { Tooltip } from "./tooltip";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  type = "button",
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export interface IconButtonProps extends Omit<ComponentPropsWithRef<"button">, "children" | "aria-label"> {
  /** Nome acessível, também usado como tooltip. */
  label: string;
  icon: ReactNode;
  variant?: Extract<ButtonVariant, "ghost" | "secondary">;
  size?: ButtonSize;
  shortcut?: string;
  tooltip?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  shortcut,
  tooltip = true,
  tooltipSide = "top",
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(base, variants[variant], iconSizes[size], className)}
      {...props}
    >
      {icon}
    </button>
  );
  return tooltip ? (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
