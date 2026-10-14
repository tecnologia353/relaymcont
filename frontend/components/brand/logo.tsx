import { cn } from "@/lib/cn";

/** Marca do Relay (mesmo desenho de app/icon.svg), na cor de acento do tema. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("shrink-0 text-accent", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M11 23V9h6a4.5 4.5 0 0 1 0 9h-6m6 0 5 5"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
