"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, PanelLeft, Settings, Sun, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, Badge, DropdownMenu, IconButton, Tooltip } from "@/components/ui";
import type { MenuItem } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useUnreadCount } from "@/features/notifications/use-unread-count";
import { useCurrentUser, useSession } from "@/features/session/session-provider";
import { themeLabel, useTheme } from "@/features/theme/theme";
import type { ThemePreference } from "@/features/theme/theme";
import { isActive, navGroups } from "./nav";
import type { NavItem } from "./nav";

interface SidebarProps {
  variant: "desktop" | "mobile";
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
}

export function Sidebar({ variant, collapsed = false, onToggleCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const unread = useUnreadCount();
  const compact = variant === "desktop" && collapsed;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-12 shrink-0 items-center gap-2", compact ? "justify-center px-2" : "px-3")}>
        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md" aria-label="Relay — Home">
          <LogoMark size={22} />
          {!compact && <span className="truncate text-base font-semibold tracking-tight text-fg">Relay</span>}
        </Link>
        {variant === "desktop" && !compact && (
          <IconButton
            className="ml-auto"
            size="sm"
            label="Recolher menu"
            tooltipSide="right"
            icon={<PanelLeft size={15} />}
            onClick={onToggleCollapsed}
          />
        )}
        {variant === "mobile" && (
          <IconButton className="ml-auto" size="sm" label="Fechar menu" tooltip={false} icon={<X size={16} />} onClick={onClose} data-autofocus />
        )}
      </div>

      <nav aria-label="Principal" className="thin-scroll flex-1 overflow-y-auto px-2 pb-3">
        {navGroups.map((group, index) => {
          const items = group.items.filter((item) => (!compact || !item.soon) && (!item.visible || item.visible(user)));
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? index} className={cn(index > 0 && "mt-4")}>
              {group.label && !compact && <div className="mb-1 px-2 text-xs font-medium text-fg-subtle">{group.label}</div>}
              {group.label && compact && <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />}
              <ul className="space-y-px">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavEntry item={item} active={isActive(pathname, item.href)} compact={compact} count={item.unreadBadge ? unread : 0} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-px border-t border-line p-2">
        {compact && (
          <div className="flex justify-center pb-1">
            <IconButton size="md" label="Expandir menu" tooltipSide="right" icon={<PanelLeft size={16} />} onClick={onToggleCollapsed} />
          </div>
        )}
        <NavEntry
          item={{ href: "/configuracoes", label: "Configurações", icon: Settings }}
          active={isActive(pathname, "/configuracoes")}
          compact={compact}
          count={0}
        />
        <UserMenu compact={compact} />
      </div>
    </div>
  );
}

function NavEntry({ item, active, compact, count }: { item: NavItem; active: boolean; compact: boolean; count: number }) {
  const Icon = item.icon;

  if (item.soon) {
    return (
      <div className="flex h-8 cursor-default items-center gap-2.5 px-2 text-sm text-fg-subtle">
        <Icon size={16} aria-hidden />
        <span className="flex-1 truncate">{item.label}</span>
        <Badge className="h-[18px] px-1 text-2xs">Em breve</Badge>
      </div>
    );
  }

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? (count ? `${item.label}, ${count} não lidas` : item.label) : undefined}
      className={cn(
        "group relative flex h-8 items-center rounded-md text-sm font-medium transition-colors",
        compact ? "w-8 justify-center" : "gap-2.5 px-2",
        active ? "bg-hover text-fg" : "text-fg-muted hover:bg-hover/60 hover:text-fg",
      )}
    >
      <Icon size={16} aria-hidden className={cn(active ? "text-fg" : "text-fg-muted group-hover:text-fg")} />
      {!compact && <span className="flex-1 truncate">{item.label}</span>}
      {count > 0 &&
        (compact ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        ) : (
          <span className="min-w-5 rounded-full bg-accent/10 px-1.5 text-center text-xs font-semibold tabular-nums text-accent">
            {count}
            <span className="sr-only"> não lidas</span>
          </span>
        ))}
    </Link>
  );

  return compact ? (
    <div className="flex justify-center">
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    </div>
  ) : (
    link
  );
}

const themeIcons: Record<ThemePreference, ReactNode> = {
  light: <Sun size={15} />,
  dark: <Moon size={15} />,
  system: <Monitor size={15} />,
};

function UserMenu({ compact }: { compact: boolean }) {
  const user = useCurrentUser();
  const { logout } = useSession();
  const { theme, setTheme } = useTheme();

  const items: MenuItem[] = [
    { type: "label", label: user.email },
    { type: "separator" },
    { type: "label", label: "Tema" },
    ...(Object.keys(themeLabel) as ThemePreference[]).map((value) => ({
      label: themeLabel[value],
      icon: themeIcons[value],
      checked: theme === value,
      onSelect: () => setTheme(value),
    })),
    { type: "separator" },
    { label: "Sair", icon: <LogOut size={15} />, danger: true, onSelect: logout },
  ];

  return (
    <DropdownMenu
      label="Menu do usuário"
      items={items}
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={compact ? `Menu do usuário: ${user.name}` : undefined}
          className={cn(
            "flex w-full items-center rounded-md text-left transition-colors hover:bg-hover/60",
            compact ? "h-8 justify-center" : "h-11 gap-2.5 px-2",
          )}
        >
          <Avatar name={user.name} size={compact ? "md" : "lg"} />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
                <span className="block truncate text-xs text-fg-muted">{user.position}</span>
              </span>
              <ChevronsUpDown size={14} className="shrink-0 text-fg-subtle" aria-hidden />
            </>
          )}
        </button>
      )}
    />
  );
}
