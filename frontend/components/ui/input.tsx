"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-line bg-surface text-base text-fg shadow-xs transition-colors " +
  "hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/20 focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";

export interface InputProps extends Omit<ComponentPropsWithRef<"input">, "size"> {
  leadingIcon?: ReactNode;
  /** sm = 32px (barras de ferramentas); md = 36px (formulários). */
  size?: "sm" | "md";
  invalid?: boolean;
}

export function Input({ leadingIcon, invalid, size = "md", className, "aria-invalid": ariaInvalid, ...props }: InputProps) {
  const input = (
    <input
      className={cn(control, size === "sm" ? "h-8 px-2.5 text-sm" : "h-9 px-2.5", leadingIcon ? "pl-8" : "", !leadingIcon && className)}
      {...props}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  );
  if (!leadingIcon) return input;
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-fg-subtle" aria-hidden>
        {leadingIcon}
      </span>
      {input}
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, "aria-invalid": ariaInvalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(control, "min-h-[80px] resize-y px-2.5 py-2", className)}
      {...props}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  );
}

export interface SelectProps extends Omit<ComponentPropsWithRef<"select">, "size"> {
  invalid?: boolean;
  /** sm = 32px (barras de ferramentas); md = 36px (formulários). */
  size?: "sm" | "md";
  /** Classes do contêiner (largura, margem). */
  className?: string;
}

/** Select nativo estilizado: mantém acessibilidade e o teclado/seletor do sistema no celular. */
export function Select({ invalid, size = "md", className, children, "aria-invalid": ariaInvalid, ...props }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(control, "cursor-pointer appearance-none pl-2.5 pr-8", size === "sm" ? "h-8 text-sm" : "h-9")}
        {...props}
        aria-invalid={invalid || ariaInvalid || undefined}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
    </div>
  );
}

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  /** Recebe id e atributos ARIA para ligar o controle ao rótulo, à dica e ao erro. */
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({ label, hint, error, optional = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-fg">
        {label}
        {optional && <span className="text-xs font-normal text-fg-subtle">Opcional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  label?: ReactNode;
}

export function Checkbox({ label, className, disabled, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-base",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          disabled={disabled}
          className="peer h-4 w-4 cursor-[inherit] appearance-none rounded-[4px] border border-line-strong bg-surface transition-colors checked:border-accent-solid checked:bg-accent-solid hover:border-fg-subtle checked:hover:border-accent-solid-hover checked:hover:bg-accent-solid-hover"
          {...props}
        />
        <Check
          size={12}
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 m-auto text-accent-fg opacity-0 transition-opacity peer-checked:opacity-100"
          aria-hidden
        />
      </span>
      {label}
    </label>
  );
}
