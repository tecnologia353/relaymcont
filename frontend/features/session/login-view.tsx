"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Splash } from "@/features/shell/splash";
import { useSession } from "./session-provider";

/* Tela de login da versão anterior, ligada à nova sessão. Redesenho previsto para a Etapa 6. */
export function LoginView() {
  const router = useRouter();
  const { session, login } = useSession();
  const [email, setEmail] = useState("admin@relay.demo");
  const [password, setPassword] = useState("relay123");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.status === "authenticated") router.replace("/");
  }, [session.status, router]);

  if (session.status !== "unauthenticated") return <Splash />;

  return (
    <div className="grid min-h-screen place-items-center bg-panel p-6 text-ink">
      <form
        className="w-full max-w-sm rounded-lg border border-line bg-elevated p-6 shadow-[0_20px_80px_rgb(0_0_0_/_0.10)]"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await login(email, password);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="mb-8">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-ink text-surface">R</div>
          <h1 className="text-2xl font-semibold">Entrar no Relay</h1>
          <p className="mt-1 text-sm text-muted">Operação contábil em um só lugar.</p>
        </div>
        <label className="text-xs font-medium text-muted">E-mail</label>
        <input className="mb-4 mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 outline-none focus:border-accent" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-xs font-medium text-muted">Senha</label>
        <input type="password" className="mb-4 mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 outline-none focus:border-accent" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button className="h-10 w-full rounded-md bg-ink text-sm font-medium text-surface">Entrar</button>
        <p className="mt-4 text-xs text-muted">Demo: admin@relay.demo / relay123</p>
      </form>
    </div>
  );
}
