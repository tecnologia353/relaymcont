import { api } from "@/lib/api";
import type { Department, Invite, InviteInput, InvitePreview, User, UserPatch } from "@/lib/api";

export const fetchInvites = () => api<Invite[]>("/invites");

export const createInvite = (input: InviteInput) => api<Invite>("/invites", { method: "POST", body: JSON.stringify(input) });

/** Gera um novo link e renova o prazo; o link anterior deixa de funcionar. */
export const resendInvite = (id: number) => api<Invite>(`/invites/${id}/resend`, { method: "POST" });

export const revokeInvite = (id: number) => api<Invite>(`/invites/${id}`, { method: "DELETE" });

export const fetchInvitePreview = (token: string) => api<InvitePreview>(`/invites/token/${token}`);

export const acceptInvite = (token: string, input: { name: string; password: string }) =>
  api<{ email: string }>(`/invites/token/${token}/accept`, { method: "POST", body: JSON.stringify(input) });

export const updateUser = (id: number, patch: UserPatch) => api<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const createDepartment = (name: string) => api<Department>("/departments", { method: "POST", body: JSON.stringify({ name }) });

export const renameDepartment = (id: number, name: string) =>
  api<Department>(`/departments/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

export const deleteDepartment = (id: number) => api<Department>(`/departments/${id}`, { method: "DELETE" });

/** Link que o convidado abre para criar a conta. */
export const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;

export { canManageTeam } from "@/lib/permissions";
