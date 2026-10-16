import { Building2, CalendarDays, Columns3, Home, Inbox, ListTodo, SunMedium, Users, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { User } from "@/lib/api";
import { canViewOperations, canViewProcesses } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Módulo ainda não disponível: exibido como "Em breve", sem link. */
  soon?: boolean;
  /** Mostra o contador de notificações não lidas. */
  unreadBadge?: boolean;
  /** Regra de acesso (lib/permissions.ts); sem ela, todos veem. */
  visible?: (user: User) => boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/meu-dia", label: "Meu Dia", icon: SunMedium },
      { href: "/inbox", label: "Inbox", icon: Inbox, unreadBadge: true },
    ],
  },
  {
    label: "Escritório",
    items: [
      { href: "/tarefas", label: "Tarefas", icon: ListTodo },
      { href: "/operacao", label: "Operação", icon: Columns3, visible: canViewOperations },
      { href: "/processos", label: "Processos", icon: Workflow, visible: canViewProcesses },
      { href: "/calendario", label: "Calendário", icon: CalendarDays },
      { href: "/clientes", label: "Clientes", icon: Building2 },
      { href: "/equipe", label: "Equipe", icon: Users },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
