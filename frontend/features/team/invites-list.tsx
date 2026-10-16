"use client";

import { Copy, MailPlus, MoreHorizontal, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Dialog, DropdownMenu, EmptyState, IconButton, useToast } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import type { Invite } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayDiff, formatRelativeTime, formatShortDate } from "@/lib/format";
import { labelOf, roleLabel } from "@/lib/labels";
import { copyText } from "./invite-form";
import { inviteLink, resendInvite, revokeInvite } from "./team-api";

type InviteState = "pending" | "expired" | "accepted" | "revoked";

const stateOf = (invite: Invite): InviteState => (invite.expired ? "expired" : invite.status);

const stateBadge: Record<InviteState, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pendente", tone: "warning" },
  expired: { label: "Expirado", tone: "danger" },
  accepted: { label: "Aceito", tone: "success" },
  revoked: { label: "Cancelado", tone: "neutral" },
};

function expiryText(invite: Invite): string {
  const days = dayDiff(invite.expires_at);
  if (invite.expired) return `Expirou em ${formatShortDate(invite.expires_at)}`;
  if (days <= 0) return "Expira hoje";
  return days === 1 ? "Expira amanhã" : `Expira em ${days} dias`;
}

interface InvitesListProps {
  invites: Invite[];
  onChanged: () => Promise<void>;
  onInvite: () => void;
}

export function InvitesList({ invites, onChanged, onInvite }: InvitesListProps) {
  const { toast } = useToast();
  const [revoking, setRevoking] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);

  const open = invites.filter((invite) => invite.status === "pending");
  const history = invites.filter((invite) => invite.status !== "pending");

  const copy = async (invite: Invite) => {
    const ok = await copyText(inviteLink(invite.token));
    toast(ok ? { tone: "success", title: "Link copiado", description: `Convite de ${invite.name}` } : { tone: "error", title: "Não foi possível copiar o link" });
  };

  const resend = async (invite: Invite) => {
    try {
      const updated = await resendInvite(invite.id);
      await copyText(inviteLink(updated.token));
      toast({ tone: "success", title: "Novo link gerado e copiado", description: `Válido até ${formatShortDate(updated.expires_at)}. O link anterior não funciona mais.` });
      await onChanged();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível reenviar", description: (error as Error).message });
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeInvite(revoking.id);
      toast({ tone: "success", title: "Convite cancelado", description: revoking.email });
      setRevoking(null);
      await onChanged();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível cancelar", description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (invites.length === 0) {
    return (
      <EmptyState
        icon={<MailPlus size={18} />}
        title="Nenhum convite enviado"
        description="Convide pessoas pelo e-mail. Elas criam a própria senha pelo link do convite."
        action={
          <Button size="sm" variant="primary" leadingIcon={<MailPlus size={14} aria-hidden />} onClick={onInvite}>
            Convidar membro
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 md:px-6">
      <section aria-labelledby="convites-abertos">
        <h2 id="convites-abertos" className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-fg">
          Aguardando aceite <span className="font-normal tabular-nums text-fg-subtle">{open.length}</span>
        </h2>
        {open.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {open.map((invite) => {
              const state = stateOf(invite);
              return (
                <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <InviteIdentity invite={invite} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto">
                    <span className={cn("whitespace-nowrap text-xs tabular-nums", invite.expired ? "text-danger" : "text-fg-muted")}>{expiryText(invite)}</span>
                    <Badge tone={stateBadge[state].tone} dot>
                      {stateBadge[state].label}
                    </Badge>
                    {invite.expired ? (
                      <Button size="sm" leadingIcon={<RefreshCw size={13} aria-hidden />} onClick={() => resend(invite)}>
                        Gerar novo link
                      </Button>
                    ) : (
                      <Button size="sm" leadingIcon={<Copy size={13} aria-hidden />} onClick={() => copy(invite)}>
                        Copiar link
                      </Button>
                    )}
                    <DropdownMenu
                      label={`Ações do convite de ${invite.name}`}
                      align="end"
                      trigger={(props) => <IconButton {...props} size="sm" label={`Mais ações para ${invite.name}`} icon={<MoreHorizontal size={15} />} />}
                      items={[
                        { label: "Gerar novo link", icon: <RefreshCw size={14} />, onSelect: () => resend(invite) },
                        { type: "separator" },
                        { label: "Cancelar convite", icon: <XCircle size={14} />, danger: true, onSelect: () => setRevoking(invite) },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-fg-muted">Nenhum convite aguardando aceite.</p>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="convites-historico">
          <h2 id="convites-historico" className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-fg">
            Histórico <span className="font-normal tabular-nums text-fg-subtle">{history.length}</span>
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {history.map((invite) => {
              const state = stateOf(invite);
              return (
                <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <InviteIdentity invite={invite} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto">
                    {invite.accepted_at && <span className="text-xs text-fg-muted">Aceito {formatRelativeTime(invite.accepted_at)}</span>}
                    <Badge tone={stateBadge[state].tone} dot>
                      {stateBadge[state].label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Dialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        dismissible={!busy}
        size="sm"
        title="Cancelar convite?"
        description={revoking ? `O link enviado para ${revoking.email} deixa de funcionar.` : undefined}
        footer={
          <>
            <Button onClick={() => setRevoking(null)} disabled={busy}>
              Voltar
            </Button>
            <Button variant="danger" loading={busy} onClick={revoke}>
              Cancelar convite
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">Se precisar, você pode convidar a pessoa novamente depois.</p>
      </Dialog>
    </div>
  );
}

function InviteIdentity({ invite }: { invite: Invite }) {
  return (
    <div className="min-w-0 flex-1 basis-60">
      <p className="truncate text-sm font-medium text-fg">
        {invite.name} <span className="font-normal text-fg-muted">· {invite.email}</span>
      </p>
      <p className="truncate text-xs text-fg-muted">
        {labelOf(roleLabel, invite.role)}
        {invite.department && ` · ${invite.department.name}`} · convidado por {invite.inviter.name} {formatRelativeTime(invite.created_at)}
      </p>
    </div>
  );
}
