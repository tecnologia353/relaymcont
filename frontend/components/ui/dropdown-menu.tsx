"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useEscape } from "./layer";
import { Portal } from "./portal";

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      /** Quando definido, o item vira opção marcável (role="menuitemcheckbox"). */
      checked?: boolean;
      /** Mantém o menu aberto após selecionar (seleção múltipla). */
      keepOpen?: boolean;
    }
  | { type: "separator" }
  | { type: "label"; label: string };

export interface MenuTriggerProps {
  ref: (element: HTMLButtonElement | null) => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
}

interface DropdownMenuProps {
  /** Renderiza o gatilho; espalhe as props recebidas em um <button> ou <Button>. */
  trigger: (props: MenuTriggerProps) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label?: string;
  className?: string;
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 320;

export function DropdownMenu({ trigger, items, align = "start", label, className }: DropdownMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]:not([disabled])") ?? []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEscape(open, () => close());

  // Posiciona antes da pintura, abrindo para cima quando não há espaço abaixo.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const openUp = rect.bottom + MENU_MAX_HEIGHT > window.innerHeight && rect.top > MENU_MAX_HEIGHT;
    const next: CSSProperties = openUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP };
    if (align === "end") next.right = window.innerWidth - rect.right;
    else next.left = rect.left;
    setStyle(next);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    enabledItems()[0]?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    const onViewportChange = () => close(false);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  const focusItem = (direction: 1 | -1 | "first" | "last") => {
    const enabled = enabledItems();
    if (enabled.length === 0) return;
    if (direction === "first") return enabled[0].focus();
    if (direction === "last") return enabled[enabled.length - 1].focus();
    const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
    enabled[(current + direction + enabled.length) % enabled.length].focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusItem(1),
      ArrowUp: () => focusItem(-1),
      Home: () => focusItem("first"),
      End: () => focusItem("last"),
      Tab: () => close(false),
    };
    const action = keys[event.key];
    if (!action) return;
    if (event.key !== "Tab") event.preventDefault();
    action();
  };

  const triggerProps: MenuTriggerProps = {
    ref: (element) => {
      triggerRef.current = element;
    },
    onClick: () => setOpen((value) => !value),
    onKeyDown: (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
      }
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
  };

  return (
    <>
      {trigger(triggerProps)}
      {open && (
        <Portal>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={{ ...style, maxHeight: MENU_MAX_HEIGHT }}
            onKeyDown={onMenuKeyDown}
            className={cn(
              "thin-scroll fixed z-[60] min-w-[200px] max-w-[320px] animate-scale-in overflow-y-auto rounded-lg bg-surface p-1 shadow-popover",
              className,
            )}
          >
            {items.map((item, index) => {
              if (item.type === "separator") return <div key={`sep-${index}`} role="separator" className="-mx-1 my-1 h-px bg-line" />;
              if (item.type === "label")
                return (
                  <div key={`label-${index}`} className="px-2 pb-1 pt-1.5 text-xs font-medium text-fg-subtle">
                    {item.label}
                  </div>
                );
              const checkable = item.checked !== undefined;
              return (
                <button
                  key={`${item.label}-${index}`}
                  data-menu-item
                  type="button"
                  role={checkable ? "menuitemcheckbox" : "menuitem"}
                  aria-checked={checkable ? item.checked : undefined}
                  disabled={item.disabled}
                  tabIndex={-1}
                  onClick={() => {
                    if (!item.keepOpen) close();
                    item.onSelect();
                  }}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                    item.danger ? "text-danger focus:bg-danger/10 hover:bg-danger/10" : "text-fg focus:bg-hover hover:bg-hover",
                  )}
                >
                  {item.icon && <span className={cn("flex shrink-0", !item.danger && "text-fg-muted")} aria-hidden>{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && <span className="text-xs text-fg-subtle">{item.shortcut}</span>}
                  {checkable && <Check size={14} className={cn("shrink-0 text-accent", !item.checked && "invisible")} aria-hidden />}
                </button>
              );
            })}
          </div>
        </Portal>
      )}
    </>
  );
}
