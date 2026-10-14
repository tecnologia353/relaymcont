"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { SessionProvider } from "@/features/session/session-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
