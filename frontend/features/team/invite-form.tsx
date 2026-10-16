"use client";

import { Check, Copy, MailCheck, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button, Field, Input, Select, Sheet, useToast } from "@/components/ui";
import type { Department, Invite, Role, User } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { labelOf, roleDescription, roleLabel } from "@/lib/labels";
import { canManageAdmins } from "@/lib/permissions";
import { createInvite, inviteLink } from "./team-api";

const FORM_ID = "form-convite";
const ROLES: Role[] = ["collaborator", "supervisor", "manager", "admin"];

interface FormState {
  name: string;
  email: string;
  position: string;
  role: Role;
  department_id: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const emptyForm = (): FormState => ({ name: "", email: "", position: "", role: "collaborator", department_id: "" });

/** Copia para a área de transferência; em contextos sem a API, seleciona o texto do campo. */
export async function copyText(text: string, fallbackInput?: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    fallbackInput?.select();
    return false;
  }
}

export function CopyLinkField({ link, label = "Link do convite" }: { link: string; label?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = async () => {
    if (await copyText(link, inputRef.current)) {
      setCopied(true);
      toast({ tone: "success", title: "Link copiado", description: "Envie para a pessoa por e-mail ou WhatsApp." });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ tone: "error", title: "Não foi possível copiar", description: "O link foi selecionado; copie com Ctrl+C." });
    }
  };
  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        readOnly
        aria-label={label}
        value={link}
        onFocus={(event) => event.target.select()}
        className="min-w-0 flex-1 font-mono text-xs text-fg-muted"
      />
      <Button onClick={copy} leadingIcon={copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} className="h-9 shrink-0">
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

interface InviteFormProps {
  actor: User;
  departments: Department[];
  onClose: () => void;
  /** Chamado a cada convite criado (a lista de convites recarrega). */
  onCreated: (invite: Invite) => void;
}

export function InviteForm({ actor, departments, onClose, onCreated }: InviteFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<Invite | null>(null);

  const roles = ROLES.filter((role) => role !== "admin" || canManageAdmins(actor));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {};
    if (!form.name.trim()) found.name = "Informe o nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = "Informe um e-mail válido.";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const invite = await createInvite({
        name: form.name.trim(),
        email: form.email.trim(),
        position: form.position.trim(),
        role: form.role,
        department_id: form.department_id ? Number(form.department_id) : null,
      });
      setSent(invite);
      onCreated(invite);
    } catch (error) {
      const message = (error as Error).message;
      // Erros de e-mail (duplicado, convite pendente) ficam junto do campo.
      if (/e-mail/i.test(message)) setErrors({ email: message });
      else toast({ tone: "error", title: "Não foi possível enviar o convite", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Convite criado"
        description={`${sent.name} · ${sent.email}`}
        footer={
          <>
            <Button
              leadingIcon={<UserPlus size={14} aria-hidden />}
              onClick={() => {
                setSent(null);
                setForm(emptyForm());
              }}
            >
              Convidar outra pessoa
            </Button>
            <Button variant="primary" onClick={onClose}>
              Concluir
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-sunken/60 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
              <MailCheck size={18} aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-medium text-fg">Envie o link abaixo para {sent.name.split(" ")[0]}</p>
              <p className="mt-0.5 text-fg-muted">
                Pelo link, a pessoa cria a própria senha e entra como <strong className="font-medium text-fg">{labelOf(roleLabel, sent.role)}</strong>
                {sent.department && <> em {sent.department.name}</>}. O convite vale até {formatShortDate(sent.expires_at)}.
              </p>
            </div>
          </div>
          <CopyLinkField link={inviteLink(sent.token)} />
          <p className="text-xs text-fg-subtle">
            Quando o envio de e-mails estiver ativo, o convite chega automaticamente em {sent.email}. Você recebe um aviso no Inbox quando ele for aceito.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!submitting}
      title="Convidar membro"
      description="A pessoa recebe um link para criar a senha e entrar no Relay."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
            Criar convite
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
        <Field label="Nome" error={errors.name}>
          {(control) => <Input {...control} name="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Lucas Ferreira" data-autofocus />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(control) => (
            <Input {...control} name="email" type="email" autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="pessoa@escritorio.com.br" />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cargo" optional>
            {(control) => <Input {...control} name="position" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Ex.: Analista Fiscal" />}
          </Field>
          <Field label="Departamento" optional>
            {(control) => (
              <Select {...control} name="department_id" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                <option value="">Sem departamento</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <RolePicker roles={roles} value={form.role} onChange={(role) => set("role", role)} />
      </form>
    </Sheet>
  );
}

/** Perfis como opções com descrição: deixa claro o que cada acesso permite. */
export function RolePicker({ roles, value, onChange, disabled }: { roles: Role[]; value: Role; onChange: (role: Role) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-fg">Perfil de acesso</legend>
      <div className="space-y-2">
        {roles.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-hover/50 has-[:checked]:border-accent/60 has-[:checked]:bg-accent/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          >
            <input type="radio" name="role" value={role} checked={value === role} onChange={() => onChange(role)} className="mt-0.5 accent-[rgb(var(--accent-solid))]" />
            <span className="text-sm">
              <span className="block font-medium text-fg">{labelOf(roleLabel, role)}</span>
              <span className="block text-fg-muted">{roleDescription[role]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
