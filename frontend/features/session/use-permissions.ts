"use client";

import { useMemo } from "react";
import type { User } from "@/lib/api";
import * as rules from "@/lib/permissions";
import { useCurrentUser } from "./session-provider";

type Rules = typeof rules;
type Bound<F> = F extends (user: User, ...rest: infer A) => infer R ? (...rest: A) => R : never;
type RuleName = { [K in keyof Rules]: Rules[K] extends (user: User, ...rest: never[]) => unknown ? K : never }[keyof Rules];

export type Permissions = { [K in RuleName]: Bound<Rules[K]> } & { user: User };

/** Regras de lib/permissions.ts já aplicadas ao usuário logado: `const can = usePermissions(); can.canPlanTask(task)`. */
export function usePermissions(): Permissions {
  const user = useCurrentUser();
  return useMemo(() => {
    const bound: Record<string, unknown> = { user };
    for (const [name, value] of Object.entries(rules)) {
      if (typeof value === "function") bound[name] = (...args: unknown[]) => (value as (user: User, ...rest: unknown[]) => unknown)(user, ...args);
    }
    return bound as Permissions;
  }, [user]);
}
