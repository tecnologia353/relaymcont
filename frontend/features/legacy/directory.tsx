"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import type { Client, Notification, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { emit } from "@/lib/events";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { LegacyField, Panel } from "./legacy-ui";

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    api<Client[]>("/clients").then(setClients);
  }, []);
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Empresas atendidas pelo escritório."
        actions={
          <button onClick={() => setOpen(true)} className="h-8 rounded-md bg-ink px-3 text-sm text-surface">
            Novo cliente
          </button>
        }
      />
      <PageBody>
        <Panel title="Carteira">
          {clients.map((client) => (
            <div key={client.id} className="grid grid-cols-5 border-b border-line py-3 text-sm last:border-0">
              <b>{client.trade_name}</b>
              <span>{client.legal_name}</span>
              <span>{client.cnpj}</span>
              <span>{client.tax_regime}</span>
              <span>{client.status}</span>
            </div>
          ))}
        </Panel>
        {open && (
          <ClientModal
            onClose={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              api<Client[]>("/clients").then(setClients);
            }}
          />
        )}
      </PageBody>
    </>
  );
}

type ClientForm = Record<"legal_name" | "trade_name" | "cnpj" | "phone" | "email" | "notes" | "tax_regime" | "status", string>;

function ClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<ClientForm>({ legal_name: "", trade_name: "", cnpj: "", phone: "", email: "", notes: "", status: "active", tax_regime: "Simples Nacional" });
  const fields: [keyof ClientForm, string][] = [
    ["legal_name", "Razão social"],
    ["trade_name", "Nome fantasia"],
    ["cnpj", "CNPJ"],
    ["phone", "Telefone"],
    ["email", "E-mail"],
    ["notes", "Observações"],
    ["tax_regime", "Regime tributário"],
  ];
  return (
    <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm">
      <form
        className="ml-auto h-full w-full max-w-md border-l border-line bg-elevated p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/clients", { method: "POST", body: JSON.stringify(form) });
          onCreated();
        }}
      >
        <div className="mb-5 flex justify-between">
          <h2 className="text-xl font-semibold">Novo cliente</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {fields.map(([key, label]) => (
          <LegacyField key={key} label={label} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} />
        ))}
        <button className="mt-4 h-10 rounded-md bg-ink px-4 text-surface">Cadastrar</button>
      </form>
    </div>
  );
}

export function Team() {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    api<User[]>("/users").then(setUsers);
  }, []);
  return (
    <>
      <PageHeader title="Equipe" description="Funcionários, cargos e perfis de acesso." />
      <PageBody>
        <Panel title="Funcionários">
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-4 border-b border-line py-3 text-sm last:border-0">
              <b>{user.name}</b>
              <span>{user.email}</span>
              <span>{user.position}</span>
              <span>{user.role}</span>
            </div>
          ))}
        </Panel>
      </PageBody>
    </>
  );
}

export function InboxView() {
  const [items, setItems] = useState<Notification[]>([]);
  const load = () => api<Notification[]>("/notifications").then(setItems);
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader title="Inbox" description="Atribuições, menções e alertas operacionais." />
      <PageBody>
        <Panel title="Notificações">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                api(`/notifications/${item.id}/read`, { method: "PATCH" })
                  .then(load)
                  .then(() => emit("notifications:changed"))
              }
              className={cn("block w-full border-b border-line py-3 text-left text-sm last:border-0", !item.read && "font-semibold")}
            >
              <Bell className="mr-2 inline" size={15} />
              {item.message}
              <span className="ml-2 text-xs text-muted">{formatDate(item.created_at)}</span>
            </button>
          ))}
        </Panel>
      </PageBody>
    </>
  );
}
