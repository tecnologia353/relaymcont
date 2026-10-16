/** Rótulos em português para valores internos que não estão em lib/api.ts. */

export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  supervisor: "Supervisor",
  collaborator: "Colaborador",
};

/** O que cada perfil pode fazer — exibido ao convidar e ao editar acessos. */
export const roleDescription: Record<string, string> = {
  admin: "Acesso total, inclusive à gestão da equipe e de outros administradores.",
  manager: "Gerencia equipe, clientes, processos e todas as tarefas.",
  supervisor: "Comanda o próprio departamento: cria, atribui e acompanha as tarefas e os processos dele.",
  collaborator: "Vê as tarefas do departamento e trabalha nas que são atribuídas a ele.",
};

export const clientStatusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const labelOf = (map: Record<string, string>, value: string): string => map[value] ?? value;
