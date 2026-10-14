"use client";

import { createContext, useContext } from "react";

interface ShellContextValue {
  /** Abre a navegação em gaveta (telas pequenas). */
  openNav: () => void;
}

export const ShellContext = createContext<ShellContextValue>({ openNav: () => {} });

export const useShell = () => useContext(ShellContext);
