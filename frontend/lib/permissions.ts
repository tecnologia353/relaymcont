/**
 * Hierarquia de acesso do Relay — fonte única das regras.
 * Usada pelo mock da API (lib/api.ts), que bloqueia de fato, e pelas telas, que escondem ou desabilitam ações.
 * Quando o backend existir, as mesmas regras precisam ser aplicadas nas rotas do FastAPI.
 *
 *   Administrador  tudo, inclusive outros administradores e dados do escritório
 *   Gestor         toda a operação e a equipe (exceto administradores)
 *   Supervisor     comanda o próprio departamento
 *   Colaborador    vê o próprio departamento e trabalha nas tarefas atribuídas a ele
 */
import type { Role, User } from "@/lib/api";

type Scoped = { department_id?: number | null };
type TaskLike = Scoped & { assignee_id: number; reviewer_id?: number | null };

export const roleOrder: Role[] = ["admin", "manager", "supervisor", "collaborator"];

/** Administrador e Gestor: alcance de escritório inteiro. */
export const isManager = (user: User) => user.role === "admin" || user.role === "manager";
export const isSupervisor = (user: User) => user.role === "supervisor";

const sameDepartment = (user: User, item: Scoped) => user.department_id != null && item.department_id === user.department_id;

/* ---------- Tarefas ---------- */

/** Gestores veem tudo; os demais, o próprio departamento e o que estiver atribuído a eles. */
export const canSeeTask = (user: User, task: TaskLike) =>
  isManager(user) || sameDepartment(user, task) || task.assignee_id === user.id || task.reviewer_id === user.id;

/** Andamento (status e checklist): gestores em tudo, supervisor no departamento, todos nas próprias tarefas. */
export const canWorkOnTask = (user: User, task: TaskLike) =>
  isManager(user) || (isSupervisor(user) && sameDepartment(user, task)) || task.assignee_id === user.id || task.reviewer_id === user.id;

/** Planejamento (prioridade, prazo, responsável): só quem comanda a área. */
export const canPlanTask = (user: User, task: TaskLike) => isManager(user) || (isSupervisor(user) && sameDepartment(user, task));

export const canCreateTasks = (user: User) => isManager(user) || isSupervisor(user);

/** Departamentos em que a pessoa pode criar tarefas (undefined = todos). */
export const taskDepartmentScope = (user: User): number[] | undefined =>
  isManager(user) ? undefined : isSupervisor(user) && user.department_id != null ? [user.department_id] : [];

/** Supervisor só atribui a supervisores e colaboradores do departamento dele (não ao gestor). */
export const canAssignTo = (user: User, assignee: User) =>
  isManager(user) || (isSupervisor(user) && sameDepartment(user, assignee) && !isManager(assignee));

export const canViewOperations = (user: User) => user.role !== "collaborator";

/* ---------- Clientes ---------- */

export const canManageClients = (user: User) => isManager(user);

/* ---------- Processos ---------- */

export const canViewProcesses = (user: User) => user.role !== "collaborator";
export const canManageTemplates = (user: User) => isManager(user);
/** Iniciar ou cancelar processos de um modelo (o departamento do modelo define o alcance). */
export const canRunProcess = (user: User, template: Scoped) => isManager(user) || (isSupervisor(user) && sameDepartment(user, template));
export const canSeeProcess = (user: User, process: Scoped) => isManager(user) || sameDepartment(user, process);

/* ---------- Equipe e escritório ---------- */

export const canManageTeam = (user: User) => isManager(user);
/** Só administradores convidam, promovem ou alteram outros administradores. */
export const canManageAdmins = (user: User) => user.role === "admin";
export const canResetOfficeData = (user: User) => user.role === "admin";

/* ---------- Quadro de perfis (exibido em Equipe › Perfis de acesso) ---------- */

/** true = pode; false = não pode; texto = pode, com alcance limitado. */
export type Access = boolean | string;

export interface PermissionRow {
  action: string;
  access: Record<Role, Access>;
}

export interface PermissionArea {
  area: string;
  rows: PermissionRow[];
}

const all = (value: Access = true): Record<Role, Access> => ({ admin: value, manager: value, supervisor: value, collaborator: value });

export const permissionMatrix: PermissionArea[] = [
  {
    area: "Tarefas",
    rows: [
      { action: "Ver tarefas", access: { admin: "Escritório", manager: "Escritório", supervisor: "Departamento", collaborator: "Departamento" } },
      { action: "Criar e atribuir tarefas", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: false } },
      { action: "Alterar status e checklist", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: "Próprias" } },
      { action: "Alterar prioridade", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: false } },
      { action: "Comentar", access: all("Tarefas que vê") },
      { action: "Operação (quadro e tabela)", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: false } },
    ],
  },
  {
    area: "Processos",
    rows: [
      { action: "Ver processos", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: false } },
      { action: "Iniciar e cancelar processos", access: { admin: true, manager: true, supervisor: "Departamento", collaborator: false } },
      { action: "Criar e editar modelos", access: { admin: true, manager: true, supervisor: false, collaborator: false } },
    ],
  },
  {
    area: "Clientes",
    rows: [
      { action: "Ver clientes", access: all() },
      { action: "Cadastrar clientes", access: { admin: true, manager: true, supervisor: false, collaborator: false } },
    ],
  },
  {
    area: "Equipe e escritório",
    rows: [
      { action: "Ver equipe e departamentos", access: all() },
      { action: "Convidar e editar membros", access: { admin: true, manager: "Exceto administradores", supervisor: false, collaborator: false } },
      { action: "Criar e editar departamentos", access: { admin: true, manager: true, supervisor: false, collaborator: false } },
      { action: "Restaurar dados do escritório", access: { admin: true, manager: false, supervisor: false, collaborator: false } },
    ],
  },
];

export const permissionDenied = "Seu perfil de acesso não permite esta ação.";
