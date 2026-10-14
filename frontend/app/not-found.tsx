import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <LogoMark size={32} className="mb-3" />
        <p className="text-sm font-medium text-fg-muted">Erro 404</p>
        <h1 className="text-xl font-semibold text-fg">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-fg-muted">O endereço pode ter mudado ou não existe mais.</p>
        <Link href="/" className={cn(buttonClasses({ variant: "primary" }), "mt-4")}>
          Voltar para a Home
        </Link>
      </div>
    </main>
  );
}
