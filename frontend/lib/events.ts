"use client";

import { useEffect, useRef } from "react";

/** Eventos de app para sincronizar áreas independentes (ex.: contador do Inbox no menu). */
export type RelayEvent = "notifications:changed" | "tasks:changed";

export function emit(event: RelayEvent): void {
  window.dispatchEvent(new Event(`relay:${event}`));
}

export function useRelayEvent(event: RelayEvent, handler: () => void): void {
  const callback = useRef(handler);
  useEffect(() => {
    callback.current = handler;
  });
  useEffect(() => {
    const listener = () => callback.current();
    window.addEventListener(`relay:${event}`, listener);
    return () => window.removeEventListener(`relay:${event}`, listener);
  }, [event]);
}
