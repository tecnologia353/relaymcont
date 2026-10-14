import { LogoMark } from "@/components/brand/logo";

/** Tela neutra enquanto a sessão é verificada — evita o flash da tela de login. */
export function Splash() {
  return (
    <div role="status" aria-label="Carregando o Relay" className="grid h-dvh place-items-center bg-canvas">
      <LogoMark size={32} className="animate-pulse" />
    </div>
  );
}
