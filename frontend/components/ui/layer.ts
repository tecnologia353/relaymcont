"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/** true no cliente (inclusive no primeiro render após a hidratação), false no servidor. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* Pilha de camadas: só a camada do topo responde ao Esc (ex.: menu aberto dentro de um Sheet). */
const escapeStack: number[] = [];
let layerSeq = 0;

export function useEscape(active: boolean, onEscape: () => void): void {
  const callback = useRef(onEscape);
  useEffect(() => {
    callback.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const id = ++layerSeq;
    escapeStack.push(id);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && escapeStack[escapeStack.length - 1] === id) {
        event.preventDefault();
        callback.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = escapeStack.indexOf(id);
      if (index >= 0) escapeStack.splice(index, 1);
    };
  }, [active]);
}

let scrollLocks = 0;
let previousOverflow = "";

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (scrollLocks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks++;
    return () => {
      scrollLocks--;
      if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest("[inert]"));
}

/**
 * Prende o foco dentro do container enquanto ativo e o devolve ao elemento anterior ao fechar.
 * Foco inicial: [data-autofocus] → primeiro focável em [data-layer-body] → primeiro focável → container.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const body = container.querySelector<HTMLElement>("[data-layer-body]");
    const initial =
      container.querySelector<HTMLElement>("[data-autofocus]") ??
      (body ? getFocusable(body)[0] : undefined) ??
      getFocusable(container)[0] ??
      container;
    initial.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusable(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, containerRef]);
}
