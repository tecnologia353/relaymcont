"use client";

import { Building, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Dialog, DropdownMenu, EmptyState, Field, IconButton, Input, useToast } from "@/components/ui";
import type { Department, Task, User } from "@/lib/api";
import { isOpenStatus } from "@/lib/format";
import { createDepartment, deleteDepartment, renameDepartment } from "./team-api";

interface DepartmentsListProps {
  departments: Department[];
  users: User[];
  tasks: Task[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}

type Editing = { mode: "create" } | { mode: "rename"; department: Department } | null;

export function DepartmentsList({ departments, users, tasks, canManage, onChanged }: DepartmentsListProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = (id: number) => ({
    members: users.filter((user) => user.active && user.department_id === id).length,
    open: tasks.filter((task) => task.department_id === id && isOpenStatus(task.status)).length,
    inUse: users.some((user) => user.department_id === id) || tasks.some((task) => task.department_id === id),
  });

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDepartment(deleting.id);
      toast({ tone: "success", title: "Departamento excluído", description: deleting.name });
      setDeleting(null);
      await onChanged();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível excluir", description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      {canManage && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" leadingIcon={<Plus size={14} aria-hidden />} onClick={() => setEditing({ mode: "create" })}>
            Novo departamento
          </Button>
        </div>
      )}
      {departments.length === 0 ? (
        <EmptyState icon={<Building size={18} />} title="Nenhum departamento" description="Departamentos organizam pessoas, tarefas e modelos de processo." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {departments.map((department) => {
            const { members, open, inUse } = stats(department.id);
            return (
              <li key={department.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{department.name}</p>
                  <p className="text-xs tabular-nums text-fg-muted">
                    {members} {members === 1 ? "pessoa" : "pessoas"} · {open} {open === 1 ? "tarefa em aberto" : "tarefas em aberto"}
                  </p>
                </div>
                {canManage && (
                  <DropdownMenu
                    label={`Ações de ${department.name}`}
                    align="end"
                    trigger={(props) => <IconButton {...props} size="sm" label={`Mais ações para ${department.name}`} icon={<MoreHorizontal size={15} />} />}
                    items={[
                      { label: "Renomear", icon: <Pencil size={14} />, onSelect: () => setEditing({ mode: "rename", department }) },
                      { type: "separator" },
                      // Excluir só é possível sem vínculos; o motivo aparece no próprio item.
                      { label: inUse ? "Excluir (em uso)" : "Excluir", icon: <Trash2 size={14} />, danger: true, disabled: inUse, onSelect: () => setDeleting(department) },
                    ]}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canManage && <p className="mt-3 text-xs text-fg-subtle">Departamentos com pessoas, tarefas ou modelos vinculados não podem ser excluídos; renomeie ou mova as pessoas antes.</p>}

      {editing && (
        <DepartmentDialog
          department={editing.mode === "rename" ? editing.department : undefined}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      )}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        dismissible={!busy}
        size="sm"
        title="Excluir departamento?"
        description={deleting?.name}
        footer={
          <>
            <Button onClick={() => setDeleting(null)} disabled={busy}>
              Voltar
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">Esta ação não pode ser desfeita.</p>
      </Dialog>
    </div>
  );
}

function DepartmentDialog({ department, onClose, onSaved }: { department?: Department; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(department?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do departamento.");
      return;
    }
    setBusy(true);
    try {
      const saved = department ? await renameDepartment(department.id, name.trim()) : await createDepartment(name.trim());
      toast({ tone: "success", title: department ? "Departamento renomeado" : "Departamento criado", description: saved.name });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={department ? "Renomear departamento" : "Novo departamento"}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="form-departamento" variant="primary" loading={busy}>
            {department ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <form id="form-departamento" noValidate onSubmit={submit}>
        <Field label="Nome" error={error}>
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Ex.: Legalização"
              data-autofocus
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
