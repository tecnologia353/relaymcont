"use client";

import { AlertCircle, Eye, EyeOff, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button, Field, IconButton, Input, buttonClasses } from "@/components/ui";
import type { InvitePreview } from "@/lib/api";
import { labelOf, roleLabel } from "@/lib/labels";
import { Splash } from "@/features/shell/splash";
import { acceptInvite, fetchInvitePreview } from "@/features/team/team-api";
import { useSession } from "./session-provider";

type PageState = { status: "loading" } | { status: "not_found" } | { status: "ready"; invite: InvitePreview };

const MIN_PASSWORD = 8;

/** Página pública do convite: a pessoa confirma o nome, cria a senha e entra. */
export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter();
  const { session, login, logout } = useSession();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; password?: string; confirm?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvitePreview(token)
      .then((invite) => {
        setState({ status: "ready", invite });
        setName(invite.name);
      })
      .catch(() => setState({ status: "not_found" }));
  }, [token]);

  if (state.status === "loading" || session.status === "loading") return <Splash />;

  if (state.status === "not_found") {
    return (
      <Notice title="Convite não encontrado" icon={<LinkIcon size={18} />}>
        O link pode estar incompleto ou ter sido substituído por um novo. Peça ao administrador do escritório para reenviar o convite.
      </Notice>
    );
  }

  const { invite } = state;

  if (invite.status === "accepted") {
    return (
      <Notice title="Convite já aceito">
        A conta de {invite.email} já foi criada. Entre com seu e-mail e senha.
      </Notice>
    );
  }
  if (invite.status === "revoked" || invite.expired) {
    return (
      <Notice title={invite.expired ? "Convite expirado" : "Convite cancelado"} icon={<AlertCircle size={18} />}>
        {invite.expired ? "Este convite passou do prazo de 7 dias." : "Este convite foi cancelado pelo escritório."} Peça a {invite.inviter} um novo convite.
      </Notice>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Informe seu nome.";
    if (password.length < MIN_PASSWORD) found.password = `Use pelo menos ${MIN_PASSWORD} caracteres.`;
    else if (confirm !== password) found.confirm = "As senhas não coincidem.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      await acceptInvite(token, { name: name.trim(), password });
      // Quem estava conectado neste navegador sai; entra a conta nova.
      if (session.status === "authenticated") logout();
      await login(invite.email, password);
      router.replace("/meu-dia");
    } catch (error) {
      setErrors({ form: (error as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={40} className="mb-4" />
          <h1 className="text-xl font-semibold text-fg">Você foi convidado para o Relay</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {invite.inviter} convidou você para entrar como <span className="font-medium text-fg">{invite.position}</span>
            {invite.department && <> em {invite.department}</>}.
          </p>
        </div>

        <form noValidate onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-xs">
          {errors.form && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {errors.form}
            </div>
          )}
          <Field label="E-mail" hint={`Perfil de acesso: ${labelOf(roleLabel, invite.role)}`}>
            {(control) => <Input {...control} type="email" value={invite.email} readOnly autoComplete="username" className="text-fg-muted" />}
          </Field>
          <Field label="Seu nome" error={errors.name}>
            {(control) => (
              <Input
                {...control}
                value={name}
                autoComplete="name"
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
              />
            )}
          </Field>
          <Field label="Crie uma senha" hint={errors.password ? undefined : `Mínimo de ${MIN_PASSWORD} caracteres.`} error={errors.password}>
            {(control) => (
              <div className="relative">
                <Input
                  {...control}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((current) => ({ ...current, password: undefined }));
                  }}
                  className="pr-10"
                  autoFocus
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
          <Field label="Confirme a senha" error={errors.confirm}>
            {(control) => (
              <Input
                {...control}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setErrors((current) => ({ ...current, confirm: undefined }));
                }}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting}>
            Criar conta e entrar
          </Button>
          {session.status === "authenticated" && (
            <p className="text-center text-xs text-fg-muted">
              Você está conectado como {session.user.name}. Ao criar a conta, a sessão muda para {invite.email}.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

function Notice({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm animate-slide-up text-center">
        <LogoMark size={40} className="mx-auto mb-4" />
        <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
          {icon && <span className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-full bg-hover text-fg-muted">{icon}</span>}
          <h1 className="text-lg font-semibold text-fg">{title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{children}</p>
          <Link href="/login" className={buttonClasses({ variant: "secondary", size: "md" }) + " mt-5 w-full"}>
            Ir para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
