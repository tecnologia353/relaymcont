"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Portal } from "./portal";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Duração em ms; padrão 4s (erros: 7s). */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone" | "duration">> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((item) => item.id !== id)), []);

  const toast = useCallback((input: ToastInput) => {
    const tone = input.tone ?? "info";
    const item: ToastItem = {
      id: ++seq.current,
      title: input.title,
      description: input.description,
      tone,
      duration: input.duration ?? (tone === "error" ? 7000 : 4000),
    };
    setToasts((list) => [...list, item].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Portal>
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:left-auto sm:w-[360px]">
          {toasts.map((item) => (
            <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return context;
}

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-success" aria-hidden />,
  error: <AlertCircle size={16} className="text-danger" aria-hidden />,
  info: <Info size={16} className="text-accent" aria-hidden />,
};

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);

  // Pausa o tempo enquanto o cursor ou o foco estão sobre o toast.
  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, onDismiss]);

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      aria-live={item.tone === "error" ? "assertive" : "polite"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full animate-slide-up items-start gap-3 rounded-lg bg-surface p-3 pr-2 shadow-popover"
    >
      <span className="mt-0.5 flex">{toneIcon[item.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{item.title}</p>
        {item.description && <p className={cn("mt-0.5 text-sm text-fg-muted")}>{item.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={onDismiss}
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
