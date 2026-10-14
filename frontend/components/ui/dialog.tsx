"use client";

import { X } from "lucide-react";
import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { useEscape, useFocusTrap, useScrollLock } from "./layer";
import { Portal } from "./portal";

interface LayerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Ações extras no cabeçalho, à esquerda do botão fechar. */
  headerActions?: ReactNode;
  /**
   * Rodapé fixo. Para enviar um formulário do corpo, dê um `id` ao <form>
   * e use `<Button type="submit" form="id">` aqui.
   */
  footer?: ReactNode;
  children: ReactNode;
  /** Bloqueia Esc e clique fora (ex.: durante o envio). */
  dismissible?: boolean;
}

function useLayer(open: boolean, onClose: () => void, dismissible: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEscape(open, () => dismissible && onClose());
  useScrollLock(open);
  useFocusTrap(open, panelRef);
  return { panelRef, titleId, descriptionId };
}

function Header({ titleId, descriptionId, title, description, headerActions, onClose, dismissible }: {
  titleId: string;
  descriptionId: string;
  title: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
  dismissible: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 id={titleId} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-fg-muted">
            {description}
          </p>
        )}
      </div>
      <div className="-mr-1.5 -mt-0.5 flex shrink-0 items-center gap-1">
        {headerActions}
        <IconButton label="Fechar" shortcut="Esc" icon={<X size={16} />} onClick={onClose} disabled={!dismissible} />
      </div>
    </div>
  );
}

const overlayClass = "fixed inset-0 bg-black/30 animate-fade-in dark:bg-black/60";

interface DialogProps extends LayerProps {
  size?: "sm" | "md" | "lg";
}

const dialogSizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Modal centralizado para confirmações e formulários curtos. */
export function Dialog({ open, onClose, title, description, headerActions, footer, children, size = "md", dismissible = true }: DialogProps) {
  const { panelRef, titleId, descriptionId } = useLayer(open, onClose, dismissible);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-start sm:p-4 sm:pt-[12vh]">
        <div className={overlayClass} aria-hidden onMouseDown={() => dismissible && onClose()} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            "relative flex max-h-[90vh] w-full animate-scale-in flex-col rounded-t-xl bg-surface shadow-modal sm:max-h-[76vh] sm:rounded-xl",
            dialogSizes[size],
          )}
        >
          <Header {...{ titleId, descriptionId, title, description, headerActions, onClose, dismissible }} />
          <div data-layer-body className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

interface SheetProps extends LayerProps {
  size?: "sm" | "md" | "lg";
}

const sheetSizes = { sm: "sm:max-w-sm", md: "sm:max-w-[480px]", lg: "sm:max-w-[640px]" } as const;

/** Painel lateral à direita para formulários longos e detalhes; ocupa a tela toda no celular. */
export function Sheet({ open, onClose, title, description, headerActions, footer, children, size = "md", dismissible = true }: SheetProps) {
  const { panelRef, titleId, descriptionId } = useLayer(open, onClose, dismissible);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className={overlayClass} aria-hidden onMouseDown={() => dismissible && onClose()} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col bg-surface shadow-modal sm:border-l sm:border-line",
            sheetSizes[size],
          )}
        >
          <Header {...{ titleId, descriptionId, title, description, headerActions, onClose, dismissible }} />
          <div data-layer-body className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
