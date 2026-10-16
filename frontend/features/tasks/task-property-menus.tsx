"use client";

import type { ReactNode } from "react";
import { DropdownMenu, PriorityIcon, StatusIcon, priorityOrder, statusOrder } from "@/components/ui";
import type { MenuTriggerProps } from "@/components/ui";
import { priorityLabel, statusLabel } from "@/lib/api";
import type { Priority, Status } from "@/lib/api";

interface MenuProps<T> {
  value: T;
  onChange: (value: T) => void;
  align?: "start" | "end";
  /** Sem permissão: o gatilho aparece, mas o menu não abre. */
  disabled?: boolean;
  trigger: (props: MenuTriggerProps) => ReactNode;
}

export function StatusMenu({ value, onChange, align, disabled, trigger }: MenuProps<Status>) {
  return (
    <DropdownMenu
      label="Alterar status"
      align={align}
      disabled={disabled}
      trigger={trigger}
      items={statusOrder.map((status) => ({
        label: statusLabel[status],
        icon: <StatusIcon status={status} />,
        checked: status === value,
        onSelect: () => status !== value && onChange(status),
      }))}
    />
  );
}

export function PriorityMenu({ value, onChange, align, disabled, trigger }: MenuProps<Priority>) {
  return (
    <DropdownMenu
      label="Alterar prioridade"
      align={align}
      disabled={disabled}
      trigger={trigger}
      items={priorityOrder.map((priority) => ({
        label: priorityLabel[priority],
        icon: <PriorityIcon priority={priority} />,
        checked: priority === value,
        onSelect: () => priority !== value && onChange(priority),
      }))}
    />
  );
}
