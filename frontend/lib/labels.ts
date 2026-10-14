/** Rótulos em português para valores internos que não estão em lib/api.ts. */

export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  supervisor: "Supervisor",
  collaborator: "Colaborador",
};

export const clientStatusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const labelOf = (map: Record<string, string>, value: string): string => map[value] ?? value;
