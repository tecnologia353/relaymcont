"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useIsClient } from "./layer";

export function Portal({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}
