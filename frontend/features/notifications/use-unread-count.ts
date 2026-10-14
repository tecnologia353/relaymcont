"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/api";
import { useRelayEvent } from "@/lib/events";

/** Notificações não lidas do usuário atual; atualiza ao navegar e quando o Inbox muda. */
export function useUnreadCount(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api<Notification[]>("/notifications")
      .then((items) => setCount(items.filter((item) => !item.read).length))
      .catch(() => setCount(0));
  }, []);

  useEffect(refresh, [refresh, pathname]);
  useRelayEvent("notifications:changed", refresh);

  return count;
}
