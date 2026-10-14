"use client";

import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button, Field, IconButton, Input } from "@/components/ui";
import { Splash } from "@/features/shell/splash";
import { useSession } from "./session-provider";

const DEMO = { email: "admin@relay.demo", password: "relay123" };

export function LoginView() {
  const router = useRouter();
  const { session, login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session.status === "authenticated") router.replace("/");
  }, [session.status, router]);

  if (session.status !== "unauthenticated") return <Splash />;

  const submit = async (event: FormEvent, credentials = { email, password }) => {
    event.preventDefault();
    if (!credentials.email.trim() || !credentials.password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(credentials.email.trim(), credentials.password);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={40} className="mb-4" />
          <h1 className="text-xl font-semibold text-fg">Entrar no Relay</h1>
          <p className="mt-1 text-sm text-fg-muted">Operação contábil em um só lugar.</p>
        </div>

        <form noValidate onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-xs">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </div>
          )}
          <Field label="E-mail">
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@escritorio.com.br"
                invalid={Boolean(error)}
                autoFocus
              />
            )}
          </Field>
          <Field label="Senha">
            {(control) => (
              <div className="relative">
                <Input
                  {...control}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  invalid={Boolean(error)}
                  className="pr-10"
                />
                <IconButton
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tooltip={false}
                  icon={showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  onClick={() => setShowPassword((value) => !value)}
                />
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting} leadingIcon={<LogIn size={15} aria-hidden />}>
            Entrar
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-line px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-fg">Conta de demonstração</p>
            <p className="truncate text-xs text-fg-muted">
              {DEMO.email} · {DEMO.password}
            </p>
          </div>
          <Button
            size="sm"
            disabled={submitting}
            onClick={(event) => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
              submit(event, DEMO);
            }}
          >
            Usar demo
          </Button>
        </div>
      </div>
    </main>
  );
}
