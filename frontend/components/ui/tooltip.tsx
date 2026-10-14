"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Portal } from "./portal";

type Side = "top" | "bottom" | "left" | "right";

const GAP = 6;

const FLIP_MARGIN = 32;
/** Distância da borda lateral a partir da qual o tooltip deixa de ser centralizado. */
const EDGE_MARGIN = 80;

function position(rect: DOMRect, preferred: Side): CSSProperties {
  // Inverte o lado quando não há espaço (ex.: botão no topo da tela).
  let side = preferred;
  if (side === "top" && rect.top < FLIP_MARGIN) side = "bottom";
  else if (side === "bottom" && rect.bottom > window.innerHeight - FLIP_MARGIN) side = "top";
  else if (side === "left" && rect.left < 160) side = "right";
  else if (side === "right" && rect.right > window.innerWidth - 160) side = "left";

  if (side === "left") return { top: rect.top + rect.height / 2, left: rect.left - GAP, transform: "translate(-100%, -50%)" };
  if (side === "right") return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: "translateY(-50%)" };

  // Acima/abaixo: centraliza, mas alinha pela borda do elemento quando perto da lateral da tela.
  const vertical: CSSProperties = side === "bottom" ? { top: rect.bottom + GAP } : { top: rect.top - GAP };
  const lift = side === "top" ? "translateY(-100%)" : "";
  const center = rect.left + rect.width / 2;
  if (center > window.innerWidth - EDGE_MARGIN) return { ...vertical, right: window.innerWidth - rect.right, transform: lift || undefined };
  if (center < EDGE_MARGIN) return { ...vertical, left: rect.left, transform: lift || undefined };
  return { ...vertical, left: center, transform: `translateX(-50%) ${lift}`.trim() };
}

interface TooltipProps {
  content: ReactNode;
  /** Atalho exibido ao lado do texto, ex.: "C" ou "⌘K". */
  shortcut?: string;
  side?: Side;
  delay?: number;
  disabled?: boolean;
  children: ReactNode;
}

/** Dica exibida no hover e no foco por teclado. Complementa — nunca substitui — o nome acessível do elemento. */
export function Tooltip({ content, shortcut, side = "top", delay = 400, disabled = false, children }: TooltipProps) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const hide = () => {
    window.clearTimeout(timer.current);
    setStyle(null);
  };

  const show = (immediate: boolean) => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        if (anchor.current) setStyle(position(anchor.current.getBoundingClientRect(), side));
      },
      immediate ? 0 : delay,
    );
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!style) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [style]);

  return (
    <span
      ref={anchor}
      className="inline-flex"
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(event) => event.target.matches(":focus-visible") && show(true)}
      onBlur={hide}
      onKeyDown={(event) => event.key === "Escape" && style && hide()}
    >
      {children}
      {style && (
        <Portal>
          <span
            id={id}
            role="tooltip"
            style={style}
            className="pointer-events-none fixed z-[70] flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs font-medium text-canvas shadow-xs"
          >
            {content}
            {shortcut && <span className="font-normal opacity-60">{shortcut}</span>}
          </span>
        </Portal>
      )}
    </span>
  );
}
