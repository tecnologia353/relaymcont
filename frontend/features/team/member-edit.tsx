"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Avatar, Button, Dialog, Field, Input, Select, Sheet, useToast } from "@/components/ui";
import { base, sizes } from "@/components/ui/button-styles";
import type { Department, Role, User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { canManageAdmins } from "@/lib/permissions";
import { RolePicker } from "./invite-form";
import { updateUser } from "./team-api";

const FORM_ID = "form-editar-membro";
const ROLES: Role[] = ["collaborator", "supervisor", "manager", "admin"];

interface MemberEditProps {
  member: User;
  actor: User;
  departments: Department[];
  /** Tarefas em aberto atribuídas à pessoa (aviso ao desativar). */
  openTasks: number;
  onClose: () => void;
  onSaved: () => void;
}

export function MemberEdit({ member, actor, departments, openTasks, onClose, onSaved }: MemberEditProps) {
  const { toast } = useToast();
  const [name, setName] = useState(member.name);
  const [position, setPosition] = useState(member.position);
  const [departmentId, setDepartmentId] = useState(member.department_id ? String(member.department_id) : "");
  const [role, setRole] = useState(member.role as Role);
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const isSelf = member.id === actor.id;
  const protectedAdmin = member.role === "admin" && !canManageAdmins(actor);
  const roleLocked = isSelf || protectedAdmin;
  const roles = ROLES.filter((item) => item !== "admin" || canManageAdmins(actor) || member.role === "admin");

  const save = async (patch: Parameters<typeof updateUser>[1], success: string) => {
    setSubmitting(true);
    try {
      await updateUser(member.id, patch);
      toast({ tone: "success", title: success, description: member.name });
      onSaved();
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível salvar", description: (error as Error).message });
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Informe o nome.");
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="name"]`)?.focus();
      return;
    }
    save(
      {
        name: name.trim(),
        position: position.trim(),
        department_id: departmentId ? Number(departmentId) : null,
        ...(roleLocked ? {} : { role }),
      },
      "Alterações salvas",
    );
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        dismissible={!submitting}
        title="Editar membro"
        description={member.email}
        footer={
          <>
            {!isSelf && !protectedAdmin && (
              <button
                type="button"
                // Ação destrutiva discreta: vermelho sem o peso do botão sólido.
                className={cn(base, sizes.md, "mr-auto", member.active ? "text-danger hover:bg-danger/10" : "text-fg-muted hover:bg-hover hover:text-fg")}
                disabled={submitting}
                onClick={() => (member.active ? setConfirmDeactivate(true) : save({ active: true }, "Acesso reativado"))}
              >
                {member.active ? "Desativar acesso" : "Reativar acesso"}
              </button>
            )}
            <Button onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
              Salvar
            </Button>
          </>
        }
      >
        <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={name || member.name} size="lg" className="h-10 w-10 text-sm" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-fg">{name || member.name}</p>
              <p className="text-fg-muted">{member.active ? "Acesso ativo" : "Acesso desativado"}</p>
            </div>
          </div>
          <Field label="Nome" error={nameError}>
            {(control) => (
              <Input
                {...control}
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Cargo">
              {(control) => <Input {...control} name="position" value={position} onChange={(e) => setPosition(e.target.value)} />}
            </Field>
            <Field label="Departamento">
              {(control) => (
                <Select {...control} name="department_id" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
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
          <div>
            <RolePicker roles={roles} value={role} onChange={setRole} disabled={roleLocked} />
            {roleLocked && (
              <p className="mt-2 text-xs text-fg-muted">
                {isSelf ? "Você não pode alterar o próprio perfil de acesso." : "Apenas administradores podem alterar o acesso de outro administrador."}
              </p>
            )}
          </div>
        </form>
      </Sheet>

      <Dialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        dismissible={!submitting}
        size="sm"
        title={`Desativar ${member.name.split(" ")[0]}?`}
        description="A pessoa deixa de conseguir entrar no Relay. O histórico de tarefas e comentários é mantido."
        footer={
          <>
            <Button onClick={() => setConfirmDeactivate(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button variant="danger" loading={submitting} onClick={() => save({ active: false }, "Acesso desativado")}>
              Desativar acesso
            </Button>
          </>
        }
      >
        {openTasks > 0 ? (
          <p className="text-sm text-fg-muted">
            {member.name.split(" ")[0]} tem <strong className="font-medium text-fg">{openTasks} {openTasks === 1 ? "tarefa em aberto" : "tarefas em aberto"}</strong>. Elas
            continuam atribuídas a {member.name.split(" ")[0]};{" "}
            <Link href={`/operacao?responsavel=${member.id}&visao=tabela`} className="font-medium text-accent hover:underline">
              reatribua na Operação
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-fg-muted">Não há tarefas em aberto atribuídas a {member.name.split(" ")[0]}.</p>
        )}
      </Dialog>
    </>
  );
}
