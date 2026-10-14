"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useEscape, useFocusTrap, useScrollLock } from "@/components/ui/layer";
import { cn } from "@/lib/cn";
import { useSession } from "@/features/session/session-provider";
import { ShellContext } from "./shell-context";
import { Sidebar } from "./sidebar";
import { Splash } from "./splash";

const COLLAPSED_KEY = "relay_sidebar_collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Área autenticada: garante a sessão antes de renderizar e monta a navegação. */
export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "unauthenticated") router.replace("/login");
  }, [session.status, router]);

  if (session.status !== "authenticated") return <Splash />;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Só monta no cliente (após a sessão), então pode ler o armazenamento local na inicialização.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!value));
      } catch {
        // Preferência não persistida; segue funcionando na sessão.
      }
      return !value;
    });
  };

  useEffect(() => setMobileOpen(false), [pathname]);

  const shell = useMemo(() => ({ openNav: () => setMobileOpen(true) }), []);

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-line bg-sunken transition-[width] duration-200 md:block",
            collapsed ? "w-14" : "w-60",
          )}
        >
          <Sidebar variant="desktop" collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>
        <main id="conteudo" className="thin-scroll relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}
    </ShellContext.Provider>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscape(true, onClose);
  useScrollLock(true);
  useFocusTrap(true, panelRef);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/30 dark:bg-black/60" aria-hidden onMouseDown={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-slide-in-left border-r border-line bg-sunken shadow-modal"
      >
        <Sidebar variant="mobile" onClose={onClose} />
      </div>
    </div>
  );
}
