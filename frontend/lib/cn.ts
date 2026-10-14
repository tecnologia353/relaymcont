export type ClassValue = string | number | false | null | undefined;

/** Junta classes condicionais, ignorando valores falsos. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
