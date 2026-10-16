import { competenceDueDate, previousCompetence } from "@/lib/competence";
import {
  canAssignTo,
  canCreateTasks,
  canManageAdmins,
  canManageClients,
  canManageTeam,
  canManageTemplates,
  canPlanTask,
  canRunProcess,
  canSeeProcess,
  canSeeTask,
  canWorkOnTask,
  permissionDenied,
  taskDepartmentScope,
} from "@/lib/permissions";

export type Status = "todo" | "in_progress" | "waiting_client" | "in_review" | "done" | "canceled";
export type Priority = "low" | "normal" | "high" | "urgent";

export const statusLabel: Record<Status, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  in_review: "Em revisão",
  done: "Concluído",
  canceled: "Cancelado",
};

export const priorityLabel: Record<Priority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export type User = { id: number; name: string; email: string; password?: string; role: string; position: string; department_id?: number; active: boolean };
export type Department = { id: number; name: string };
export type Client = { id: number; legal_name: string; trade_name: string; cnpj: string; tax_regime: string; internal_owner_id?: number; phone?: string; email?: string; status: string; notes?: string };
export type Checklist = { id: number; title: string; done: boolean };
export type Comment = { id: number; body: string; created_at: string; author: User };
export type Activity = { id: number; action: string; detail?: string; created_at: string; actor?: User };
export type Notification = { id: number; message: string; read: boolean; task_id?: number; created_at: string; user_id: number };

export type Task = {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  competence: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  client_id: number;
  department_id: number;
  assignee_id: number;
  reviewer_id?: number | null;
  creator_id: number;
  /** Processo que gerou a tarefa (uma tarefa por etapa). */
  process_id?: number | null;
  client: Client;
  department: Department;
  assignee: User;
  reviewer?: User;
  creator: User;
  checklist: Checklist[];
  comments?: Comment[];
  activity?: Activity[];
};

/** Etapa de um modelo: vira uma tarefa com prazo no dia `due_day`. */
export type ProcessStep = { id: number; title: string; due_day: number };

export type ProcessTemplate = {
  id: number;
  name: string;
  description?: string;
  department_id: number;
  /** 0 = prazos no mês da competência; 1 = no mês seguinte (o comum para obrigações mensais). */
  due_month_offset: 0 | 1;
  steps: ProcessStep[];
  created_at: string;
};

export type ProcessStatus = "active" | "canceled";

type StoredProcess = {
  id: number;
  template_id: number;
  client_id: number;
  assignee_id: number;
  creator_id: number;
  name: string;
  competence: string;
  status: ProcessStatus;
  created_at: string;
};

export type Process = StoredProcess & { client: Client; assignee: User; department: Department; tasks: Task[] };

export type ProcessTemplateInput = {
  name: string;
  description?: string;
  department_id: number;
  due_month_offset: 0 | 1;
  steps: { id?: number; title: string; due_day: number }[];
};

export type ProcessLaunchInput = {
  template_id: number;
  competence: string;
  client_ids: number[];
  /** Vazio = responsável interno de cada cliente. */
  assignee_id?: number | null;
};

export type ProcessLaunchResult = { created: Process[]; skipped: number };

export type Role = "admin" | "manager" | "supervisor" | "collaborator";

/** Convite gravado; `expired` é derivado de `expires_at` na leitura. */
export type InviteStatus = "pending" | "accepted" | "revoked";

type StoredInvite = {
  id: number;
  token: string;
  email: string;
  name: string;
  position: string;
  role: Role;
  department_id?: number | null;
  invited_by: number;
  created_at: string;
  expires_at: string;
  status: InviteStatus;
  accepted_at?: string;
  user_id?: number;
};

export type Invite = StoredInvite & { inviter: User; department?: Department; expired: boolean };

export type InviteInput = { name: string; email: string; position: string; role: Role; department_id?: number | null };

/** Dados públicos do convite, exibidos a quem abre o link (sem login). */
export type InvitePreview = {
  email: string;
  name: string;
  position: string;
  role: Role;
  department?: string;
  inviter: string;
  status: InviteStatus;
  expired: boolean;
};

export type UserPatch = Partial<{ name: string; position: string; role: Role; department_id: number | null; active: boolean }>;

type StoredTask = Omit<Task, "client" | "department" | "assignee" | "reviewer" | "creator">;
type Store = {
  users: User[];
  departments: Department[];
  clients: Client[];
  tasks: StoredTask[];
  notifications: Notification[];
  templates: ProcessTemplate[];
  processes: StoredProcess[];
  invites: StoredInvite[];
  nextId: number;
};

const STORE_KEY = "relay_local_store_v3";
const SESSION_KEY = "relay_user_id";
const nowIso = () => new Date().toISOString();

function withoutPassword(user: User): User {
  const { password, ...safe } = user;
  return safe;
}

function initialStore(): Store {
  const departments: Department[] = [
    { id: 1, name: "Fiscal" },
    { id: 2, name: "Contábil" },
    { id: 3, name: "Departamento Pessoal" },
    { id: 4, name: "Societário" },
  ];
  const users: User[] = [
    { id: 1, name: "Carlos Mendes", email: "admin@relay.demo", password: "relay123", role: "admin", position: "Administrador", department_id: 2, active: true },
    { id: 2, name: "Marina Rocha", email: "marina@relay.demo", password: "relay123", role: "manager", position: "Gestora Operacional", department_id: 1, active: true },
    { id: 3, name: "João Lima", email: "joao@relay.demo", password: "relay123", role: "supervisor", position: "Supervisor Fiscal", department_id: 1, active: true },
    { id: 4, name: "Vitor Alves", email: "vitor@relay.demo", password: "relay123", role: "collaborator", position: "Analista Fiscal", department_id: 1, active: true },
    { id: 5, name: "Ana Souza", email: "ana@relay.demo", password: "relay123", role: "collaborator", position: "Analista Contábil", department_id: 2, active: true },
    { id: 6, name: "Paula Nunes", email: "paula@relay.demo", password: "relay123", role: "supervisor", position: "Supervisora DP", department_id: 3, active: true },
    { id: 7, name: "Rafael Costa", email: "rafael@relay.demo", password: "relay123", role: "collaborator", position: "Assistente DP", department_id: 3, active: true },
    { id: 8, name: "Bianca Prado", email: "bianca@relay.demo", password: "relay123", role: "collaborator", position: "Analista Societário", department_id: 4, active: true },
  ];
  const names = ["Empresa ABC", "Mercado Horizonte", "Clínica São Bento", "Alfa Transportes", "Padaria Central", "Moura Tech", "Grupo Aurora", "Oficina União", "Beta Serviços", "Casa Verde", "Norte Foods", "Lumen Energia"];
  const regimes = ["Simples Nacional", "Lucro Presumido", "Lucro Real"];
  const clients: Client[] = names.map((name, index) => ({
    id: index + 1,
    legal_name: `${name} Ltda.`,
    trade_name: name,
    cnpj: `12.345.${String(index + 1).padStart(3, "0")}/0001-${index + 11}`,
    tax_regime: regimes[index % regimes.length],
    internal_owner_id: users[(index % 7) + 1].id,
    phone: `(11) 9${2100 + index}-${4300 + index}`,
    email: `contato${index + 1}@cliente.demo`,
    status: "active",
    notes: "Cliente ativo com rotinas mensais.",
  }));
  const titles = ["Apuração ICMS", "Emitir DAS", "Fechamento contábil", "Folha de pagamento", "Admissão de funcionário", "Alteração contratual", "Entrega DCTFWeb", "Conciliação bancária", "Envio eSocial", "Revisão de notas fiscais"];
  const statuses: Status[] = ["todo", "in_progress", "waiting_client", "in_review", "done"];
  const priorities: Priority[] = ["low", "normal", "high", "urgent"];
  const base = new Date();
  const tasks: StoredTask[] = Array.from({ length: 44 }, (_, i) => {
    const due = new Date(base);
    due.setDate(base.getDate() + ((i % 19) - 6));
    due.setHours([9, 14, 17][i % 3], 0, 0, 0);
    const status = statuses[i % statuses.length];
    return {
      id: i + 1,
      title: `${titles[i % titles.length]} - ${names[i % names.length]}`,
      description: "Rotina operacional do escritório com prazo e responsável definidos.",
      due_date: due.toISOString(),
      competence: "10/2026",
      priority: priorities[i % priorities.length],
      status,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: status === "done" ? nowIso() : undefined,
      client_id: clients[i % clients.length].id,
      department_id: departments[i % departments.length].id,
      assignee_id: users[(i % 7) + 1].id,
      reviewer_id: users[(i + 2) % users.length].id,
      creator_id: 1,
      checklist: ["Receber documentos", "Conferir informações", "Executar", "Revisar", "Enviar"].map((title, idx) => ({ id: 1000 + i * 10 + idx, title, done: idx < (i % 5) })),
      comments: [{ id: 2000 + i, body: i % 3 === 0 ? "@Vitor chegaram os documentos restantes." : "Documentos recebidos e conferidos.", created_at: nowIso(), author: withoutPassword(users[(i % 7) + 1]) }],
      activity: [{ id: 3000 + i, action: "created", detail: "Tarefa criada nos dados locais", created_at: nowIso(), actor: withoutPassword(users[0]) }],
    };
  });
  const notifications: Notification[] = tasks.slice(0, 18).map((task, index) => ({
    id: index + 1,
    user_id: task.assignee_id,
    task_id: task.id,
    message: `Carlos atribuiu uma tarefa a você: ${task.title}`,
    read: index % 4 === 0,
    created_at: nowIso(),
  }));
  const store: Store = { users, departments, clients, tasks, notifications, templates: [], processes: [], invites: [], nextId: 5000 };
  seedProcessData(store);
  seedInvites(store);
  return store;
}

function saveStore(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function loadStore(): Store {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const store = JSON.parse(raw) as Store;
      if (store.users?.length && store.departments?.length && store.clients?.length && store.tasks?.length) {
        // Bases criadas antes do módulo de Processos: acrescenta modelos e processos sem apagar o resto.
        if (!store.templates || !store.processes) {
          store.templates = [];
          store.processes = [];
          seedProcessData(store);
          saveStore(store);
        }
        if (!store.invites) {
          store.invites = [];
          seedInvites(store);
          saveStore(store);
        }
        return store;
      }
    } catch {
      localStorage.removeItem(STORE_KEY);
    }
  }
  const seeded = initialStore();
  saveStore(seeded);
  return seeded;
}

function currentUser(store: Store): User {
  const id = Number(localStorage.getItem(SESSION_KEY) || "1");
  const user = store.users.find((item) => item.id === id && item.active);
  if (!user) throw new Error("Sessão inválida");
  return withoutPassword(user);
}

function hydrateTask(store: Store, task: StoredTask): Task {
  const client = store.clients.find((item) => item.id === task.client_id) ?? store.clients[0];
  const department = store.departments.find((item) => item.id === task.department_id) ?? store.departments[0];
  const assignee = withoutPassword(store.users.find((item) => item.id === task.assignee_id) ?? store.users[0]);
  const creator = withoutPassword(store.users.find((item) => item.id === task.creator_id) ?? store.users[0]);
  const reviewerSource = task.reviewer_id ? store.users.find((item) => item.id === task.reviewer_id) : undefined;
  return { ...task, client, department, assignee, creator, reviewer: reviewerSource ? withoutPassword(reviewerSource) : undefined };
}

function parseBody(options: RequestInit) {
  return options.body ? JSON.parse(String(options.body)) : {};
}

function filteredTasks(store: Store, path: string, user: User) {
  const url = new URL(path, "http://local");
  let tasks = store.tasks.filter((task) => canSeeTask(user, task)).map((task) => hydrateTask(store, task));
  if (url.searchParams.get("mine") === "true") tasks = tasks.filter((task) => task.assignee_id === user.id);
  const status = url.searchParams.get("status");
  if (status) tasks = tasks.filter((task) => task.status === status);
  const query = url.searchParams.get("q")?.toLowerCase();
  if (query) tasks = tasks.filter((task) => `${task.title} ${task.client.trade_name} ${task.client.legal_name}`.toLowerCase().includes(query));
  return tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
}

/* ---------- Processos ---------- */

function hydrateProcess(store: Store, process: StoredProcess): Process {
  const template = store.templates.find((item) => item.id === process.template_id);
  const client = store.clients.find((item) => item.id === process.client_id) ?? store.clients[0];
  const assignee = withoutPassword(store.users.find((item) => item.id === process.assignee_id) ?? store.users[0]);
  const department = store.departments.find((item) => item.id === template?.department_id) ?? store.departments[0];
  const tasks = store.tasks
    .filter((task) => task.process_id === process.id)
    .map((task) => hydrateTask(store, task))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return { ...process, client, assignee, department, tasks };
}

function saveTemplate(store: Store, input: ProcessTemplateInput, existing?: ProcessTemplate): ProcessTemplate {
  if (!input.name?.trim()) throw new Error("Informe o nome do modelo.");
  if (!store.departments.some((item) => item.id === input.department_id)) throw new Error("Departamento inválido.");
  if (!input.steps?.length) throw new Error("Inclua pelo menos uma etapa.");
  const steps = input.steps
    .map((step) => ({ id: step.id ?? store.nextId++, title: step.title.trim(), due_day: Math.min(31, Math.max(1, Math.round(step.due_day))) }))
    .sort((a, b) => a.due_day - b.due_day);
  const template: ProcessTemplate = {
    id: existing?.id ?? store.nextId++,
    created_at: existing?.created_at ?? nowIso(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    department_id: input.department_id,
    due_month_offset: input.due_month_offset === 0 ? 0 : 1,
    steps,
  };
  if (existing) Object.assign(existing, template);
  else store.templates.push(template);
  return existing ?? template;
}

/** Cria um processo por cliente e uma tarefa por etapa. Ignora clientes que já têm o processo na competência. */
function launchProcesses(store: Store, actor: User, input: ProcessLaunchInput, notify = true): { created: StoredProcess[]; skipped: number } {
  const template = store.templates.find((item) => item.id === input.template_id);
  if (!template) throw new Error("Modelo não encontrado.");
  if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(input.competence)) throw new Error("Competência inválida.");
  const created: StoredProcess[] = [];
  let skipped = 0;
  for (const clientId of input.client_ids) {
    const client = store.clients.find((item) => item.id === clientId);
    if (!client) continue;
    const duplicate = store.processes.some(
      (item) => item.template_id === template.id && item.client_id === clientId && item.competence === input.competence && item.status !== "canceled",
    );
    if (duplicate) {
      skipped += 1;
      continue;
    }
    const assigneeId = input.assignee_id || client.internal_owner_id || actor.id;
    const process: StoredProcess = {
      id: store.nextId++,
      template_id: template.id,
      client_id: client.id,
      assignee_id: assigneeId,
      creator_id: actor.id,
      name: template.name,
      competence: input.competence,
      status: "active",
      created_at: nowIso(),
    };
    store.processes.push(process);
    created.push(process);
    let firstTaskId: number | undefined;
    template.steps.forEach((step, index) => {
      const id = store.nextId++;
      firstTaskId ??= id;
      store.tasks.push({
        id,
        title: `${step.title} - ${client.trade_name}`,
        description: `Etapa ${index + 1} de ${template.steps.length} do processo “${template.name}”.`,
        due_date: competenceDueDate(input.competence, template.due_month_offset, step.due_day).toISOString(),
        competence: input.competence,
        priority: "normal",
        status: "todo",
        created_at: nowIso(),
        updated_at: nowIso(),
        client_id: client.id,
        department_id: template.department_id,
        assignee_id: assigneeId,
        reviewer_id: null,
        creator_id: actor.id,
        process_id: process.id,
        checklist: [],
        comments: [],
        activity: [{ id: store.nextId++, action: "created", detail: `Tarefa gerada pelo processo ${template.name}`, created_at: nowIso(), actor }],
      });
    });
    if (notify) {
      store.notifications.push({
        id: store.nextId++,
        user_id: assigneeId,
        task_id: firstTaskId,
        message: `${actor.name} iniciou ${template.name} (${input.competence}) para ${client.trade_name}: ${template.steps.length} etapas atribuídas a você`,
        read: false,
        created_at: nowIso(),
      });
    }
  }
  return { created, skipped };
}

/** Modelos de exemplo e processos da competência anterior em andamento. */
function seedProcessData(store: Store) {
  const actor = withoutPassword(store.users[0]);
  const departmentId = (name: string) => store.departments.find((item) => item.name === name)?.id ?? store.departments[0].id;
  const steps = (list: [string, number][]) => list.map(([title, due_day]) => ({ title, due_day }));
  const fiscal = saveTemplate(store, {
    name: "Fechamento fiscal mensal",
    description: "Escrituração, apuração e entrega das obrigações fiscais de empresas do Lucro Presumido e Real.",
    department_id: departmentId("Fiscal"),
    due_month_offset: 1,
    steps: steps([["Importar XMLs de notas", 3], ["Escriturar entradas e saídas", 8], ["Apurar ICMS, PIS e COFINS", 12], ["Emitir guias de impostos", 15], ["Transmitir SPED Fiscal", 20]]),
  });
  const das = saveTemplate(store, {
    name: "Apuração do Simples Nacional",
    description: "Cálculo do faturamento e emissão do DAS.",
    department_id: departmentId("Fiscal"),
    due_month_offset: 1,
    steps: steps([["Conferir faturamento do mês", 10], ["Gerar DAS no PGDAS-D", 15], ["Enviar guia ao cliente", 17]]),
  });
  const payroll = saveTemplate(store, {
    name: "Folha de pagamento",
    description: "Do recebimento das variáveis à transmissão do eSocial e da DCTFWeb.",
    department_id: departmentId("Departamento Pessoal"),
    due_month_offset: 1,
    steps: steps([["Receber variáveis da folha", 2], ["Calcular folha e encargos", 4], ["Enviar holerites", 5], ["Transmitir eSocial", 15], ["Emitir DCTFWeb e guias", 20]]),
  });
  saveTemplate(store, {
    name: "Fechamento contábil",
    description: "Conciliações, lançamentos e balancete mensal.",
    department_id: departmentId("Contábil"),
    due_month_offset: 1,
    steps: steps([["Conciliação bancária", 10], ["Lançamentos contábeis", 15], ["Emitir balancete", 25]]),
  });

  const competence = previousCompetence();
  const active = store.clients.filter((client) => client.status === "active");
  const simples = active.filter((client) => client.tax_regime === "Simples Nacional").map((client) => client.id);
  const others = active.filter((client) => client.tax_regime !== "Simples Nacional").map((client) => client.id);
  const launched = [
    ...launchProcesses(store, actor, { template_id: fiscal.id, competence, client_ids: others.slice(0, 6) }, false).created,
    ...launchProcesses(store, actor, { template_id: das.id, competence, client_ids: simples.slice(0, 4) }, false).created,
    ...launchProcesses(store, actor, { template_id: payroll.id, competence, client_ids: active.slice(0, 5).map((client) => client.id) }, false).created,
  ];

  // Andamento plausível: etapas vencidas concluídas e a próxima em andamento; um a cada quatro processos fica com atraso.
  const now = Date.now();
  launched.forEach((process, index) => {
    const tasks = store.tasks.filter((task) => task.process_id === process.id);
    const firstPast = tasks.findIndex((task) => new Date(task.due_date).getTime() < now);
    tasks.forEach((task, step) => {
      const due = new Date(task.due_date).getTime();
      const lagging = index % 4 === 1 && step === firstPast;
      if (due < now && !lagging) {
        task.status = "done";
        task.completed_at = task.due_date;
      } else if (lagging || due - now < 4 * 86_400_000) {
        task.status = index % 3 === 0 ? "waiting_client" : "in_progress";
      }
    });
  });
}

/* ---------- Equipe: convites, perfis e departamentos ---------- */

const INVITE_DAYS = 7;
const roleNames: Record<Role, string> = { admin: "Administrador", manager: "Gestor", supervisor: "Supervisor", collaborator: "Colaborador" };

const newToken = () => crypto.randomUUID().replace(/-/g, "");
const inviteExpiry = (from = Date.now()) => new Date(from + INVITE_DAYS * 86_400_000).toISOString();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Administradores e gestores administram a equipe. */
function requireManager(user: User) {
  if (!canManageTeam(user)) throw new Error("Apenas administradores e gestores podem gerenciar a equipe.");
}

function allow(condition: boolean) {
  if (!condition) throw new Error(permissionDenied);
}

function validDepartmentName(store: Store, name: unknown, ignoreId?: number): string {
  const value = String(name ?? "").trim();
  if (!value) throw new Error("Informe o nome do departamento.");
  if (store.departments.some((item) => item.id !== ignoreId && item.name.toLowerCase() === value.toLowerCase())) throw new Error("Já existe um departamento com esse nome.");
  return value;
}

function hydrateInvite(store: Store, invite: StoredInvite): Invite {
  const inviter = withoutPassword(store.users.find((item) => item.id === invite.invited_by) ?? store.users[0]);
  const department = store.departments.find((item) => item.id === invite.department_id);
  return { ...invite, inviter, department, expired: invite.status === "pending" && new Date(invite.expires_at).getTime() < Date.now() };
}

function previewInvite(store: Store, invite: StoredInvite): InvitePreview {
  const full = hydrateInvite(store, invite);
  return {
    email: invite.email,
    name: invite.name,
    position: invite.position,
    role: invite.role,
    department: full.department?.name,
    inviter: full.inviter.name,
    status: invite.status,
    expired: full.expired,
  };
}

function createInvite(store: Store, actor: User, input: InviteInput): StoredInvite {
  const email = normalizeEmail(input.email ?? "");
  if (!input.name?.trim()) throw new Error("Informe o nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  if (!(input.role in roleNames)) throw new Error("Perfil de acesso inválido.");
  if (input.role === "admin" && !canManageAdmins(actor)) throw new Error("Apenas administradores podem convidar outro administrador.");
  if (store.users.some((item) => item.email.toLowerCase() === email)) throw new Error("Já existe uma pessoa com esse e-mail na equipe.");
  const pending = store.invites.find((item) => item.email === email && item.status === "pending" && new Date(item.expires_at).getTime() >= Date.now());
  if (pending) throw new Error("Já existe um convite pendente para esse e-mail. Reenvie o convite na aba Convites.");
  const invite: StoredInvite = {
    id: store.nextId++,
    token: newToken(),
    email,
    name: input.name.trim(),
    position: input.position?.trim() || roleNames[input.role],
    role: input.role,
    department_id: input.department_id || null,
    invited_by: actor.id,
    created_at: nowIso(),
    expires_at: inviteExpiry(),
    status: "pending",
  };
  store.invites.push(invite);
  return invite;
}

function acceptInvite(store: Store, invite: StoredInvite, body: { name?: string; password?: string }) {
  if (invite.status === "accepted") throw new Error("Este convite já foi aceito. Entre com seu e-mail e senha.");
  if (invite.status === "revoked") throw new Error("Este convite foi cancelado pelo escritório.");
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Este convite expirou. Peça um novo convite ao administrador.");
  if (!body.name?.trim()) throw new Error("Informe seu nome.");
  if (!body.password || body.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  if (store.users.some((item) => item.email.toLowerCase() === invite.email)) throw new Error("Já existe uma conta com esse e-mail.");

  const created: User = {
    id: store.nextId++,
    name: body.name.trim(),
    email: invite.email,
    password: body.password,
    role: invite.role,
    position: invite.position,
    department_id: invite.department_id ?? undefined,
    active: true,
  };
  store.users.push(created);
  invite.status = "accepted";
  invite.accepted_at = nowIso();
  invite.user_id = created.id;

  const notify = (userId: number, message: string) =>
    store.notifications.push({ id: store.nextId++, user_id: userId, message, read: false, created_at: nowIso() });
  const department = store.departments.find((item) => item.id === invite.department_id);
  notify(invite.invited_by, `${created.name} aceitou seu convite e entrou no Relay`);
  // Supervisores e gestores do departamento ficam sabendo de quem chegou.
  store.users
    .filter((item) => item.active && item.id !== invite.invited_by && item.id !== created.id && department && item.department_id === department.id && (item.role === "supervisor" || item.role === "manager"))
    .forEach((item) => notify(item.id, `${created.name} entrou na equipe de ${department!.name} como ${created.position}`));
  const inviter = store.users.find((item) => item.id === invite.invited_by);
  notify(created.id, `Boas-vindas ao Relay, ${created.name.split(" ")[0]}! ${inviter?.name ?? "O escritório"} convidou você. Suas tarefas vão aparecer em Meu Dia.`);

  return { email: created.email };
}

function updateUser(store: Store, actor: User, id: number, patch: UserPatch): User {
  requireManager(actor);
  const target = store.users.find((item) => item.id === id);
  if (!target) throw new Error("Pessoa não encontrada");
  const isSelf = target.id === actor.id;
  if (isSelf && ((patch.role && patch.role !== target.role) || patch.active === false)) throw new Error("Você não pode alterar o próprio perfil nem desativar a própria conta.");
  if ((target.role === "admin" || patch.role === "admin") && !canManageAdmins(actor) && !isSelf) throw new Error("Apenas administradores podem alterar o acesso de administradores.");
  if (patch.role && !(patch.role in roleNames)) throw new Error("Perfil de acesso inválido.");
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("Informe o nome.");

  const next = { ...target, ...patch, name: patch.name?.trim() ?? target.name, position: patch.position?.trim() || target.position };
  if (patch.department_id === null) next.department_id = undefined;
  const activeAdmins = store.users.filter((item) => (item.id === target.id ? next : item).active && (item.id === target.id ? next : item).role === "admin");
  if (activeAdmins.length === 0) throw new Error("O escritório precisa de pelo menos um administrador ativo.");
  Object.assign(target, next);
  return withoutPassword(target);
}

/** Um convite pendente e um expirado, para a aba Convites não começar vazia. */
function seedInvites(store: Store) {
  const admin = store.users[0];
  const fiscal = store.departments.find((item) => item.name === "Fiscal");
  const pessoal = store.departments.find((item) => item.name === "Departamento Pessoal");
  const daysAgo = (days: number) => Date.now() - days * 86_400_000;
  store.invites.push(
    {
      id: store.nextId++,
      token: newToken(),
      email: "lucas.ferreira@relay.demo",
      name: "Lucas Ferreira",
      position: "Analista Fiscal",
      role: "collaborator",
      department_id: fiscal?.id ?? null,
      invited_by: admin.id,
      created_at: new Date(daysAgo(2)).toISOString(),
      expires_at: inviteExpiry(daysAgo(2)),
      status: "pending",
    },
    {
      id: store.nextId++,
      token: newToken(),
      email: "julia.martins@relay.demo",
      name: "Júlia Martins",
      position: "Assistente DP",
      role: "collaborator",
      department_id: pessoal?.id ?? null,
      invited_by: admin.id,
      created_at: new Date(daysAgo(12)).toISOString(),
      expires_at: inviteExpiry(daysAgo(12)),
      status: "pending",
    },
  );
}

function dashboard(store: Store, user: User) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tasks = store.tasks.filter((task) => canSeeTask(user, task)).map((task) => hydrateTask(store, task));
  const open = tasks.filter((task) => task.status !== "done" && task.status !== "canceled");
  return {
    counts: {
      month: tasks.filter((task) => new Date(task.created_at) >= startMonth).length,
      done: tasks.filter((task) => task.status === "done").length,
      in_progress: tasks.filter((task) => task.status === "in_progress").length,
      overdue: open.filter((task) => new Date(task.due_date) < now).length,
      waiting_client: tasks.filter((task) => task.status === "waiting_client").length,
      in_review: tasks.filter((task) => task.status === "in_review").length,
    },
    critical: open.filter((task) => new Date(task.due_date) < now || task.priority === "urgent" || task.priority === "high").slice(0, 8),
    upcoming: open.filter((task) => new Date(task.due_date) >= now).slice(0, 8),
    departments: store.departments.map((department) => {
      const deptTasks = tasks.filter((task) => task.department_id === department.id);
      return { id: department.id, name: department.name, progress: Math.round((deptTasks.filter((task) => task.status === "done").length / Math.max(deptTasks.length, 1)) * 100) };
    }),
    team: store.users.filter((item) => item.active).map((member) => {
      const assigned = open.filter((task) => task.assignee_id === member.id);
      return { id: member.id, name: member.name, pending: assigned.length, in_progress: assigned.filter((task) => task.status === "in_progress").length, overdue: assigned.filter((task) => new Date(task.due_date) < now).length };
    }),
  };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const method = (options.method || "GET").toUpperCase();
  const store = loadStore();

  if (path === "/auth/login" && method === "POST") {
    const body = parseBody(options);
    const user = store.users.find((item) => item.email.toLowerCase() === String(body.email).trim().toLowerCase() && item.password === body.password && item.active);
    if (!user) throw new Error("E-mail ou senha inválidos");
    localStorage.setItem(SESSION_KEY, String(user.id));
    return { access_token: `local-${user.id}`, token_type: "local", user: withoutPassword(user) } as T;
  }

  if (path.startsWith("/invites/token/")) {
    const [, , , token, action] = path.split("/");
    const invite = store.invites.find((item) => item.token === token);
    if (!invite) throw new Error("Convite não encontrado");
    if (action === "accept" && method === "POST") {
      const result = acceptInvite(store, invite, parseBody(options));
      saveStore(store);
      return result as T;
    }
    return previewInvite(store, invite) as T;
  }

  const user = currentUser(store);
  if (path === "/me") return user as T;
  if (path === "/dashboard") return dashboard(store, user) as T;
  if (path === "/users") return store.users.map(withoutPassword) as T;

  if (path.startsWith("/users/") && method === "PATCH") {
    const updated = updateUser(store, user, Number(path.split("/")[2]), parseBody(options));
    saveStore(store);
    return updated as T;
  }

  if (path === "/departments") {
    if (method === "POST") {
      requireManager(user);
      const department = { id: store.nextId++, name: validDepartmentName(store, parseBody(options).name) };
      store.departments.push(department);
      saveStore(store);
      return department as T;
    }
    return [...store.departments].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) as T;
  }

  if (path.startsWith("/departments/")) {
    requireManager(user);
    const department = store.departments.find((item) => item.id === Number(path.split("/")[2]));
    if (!department) throw new Error("Departamento não encontrado");
    if (method === "PATCH") {
      department.name = validDepartmentName(store, parseBody(options).name, department.id);
      saveStore(store);
      return department as T;
    }
    if (method === "DELETE") {
      const inUse =
        store.users.some((item) => item.department_id === department.id) ||
        store.tasks.some((item) => item.department_id === department.id) ||
        store.templates.some((item) => item.department_id === department.id);
      if (inUse) throw new Error("O departamento tem pessoas, tarefas ou modelos vinculados.");
      store.departments = store.departments.filter((item) => item.id !== department.id);
      saveStore(store);
      return department as T;
    }
  }

  if (path === "/invites") {
    requireManager(user);
    if (method === "POST") {
      const invite = createInvite(store, user, parseBody(options));
      saveStore(store);
      return hydrateInvite(store, invite) as T;
    }
    return store.invites.map((invite) => hydrateInvite(store, invite)).sort((a, b) => b.created_at.localeCompare(a.created_at)) as T;
  }

  if (path.startsWith("/invites/")) {
    requireManager(user);
    const [, , id, action] = path.split("/");
    const invite = store.invites.find((item) => item.id === Number(id));
    if (!invite) throw new Error("Convite não encontrado");
    if (invite.status !== "pending") throw new Error("Este convite não está mais pendente.");
    if (action === "resend" && method === "POST") {
      // Novo link e novo prazo; o link anterior deixa de funcionar.
      invite.token = newToken();
      invite.expires_at = inviteExpiry();
    } else if (method === "DELETE") {
      invite.status = "revoked";
    }
    saveStore(store);
    return hydrateInvite(store, invite) as T;
  }

  if (path.startsWith("/clients")) {
    if (method === "POST") {
      allow(canManageClients(user));
      const client = { id: store.nextId++, status: "active", ...parseBody(options) };
      store.clients.push(client);
      saveStore(store);
      return client as T;
    }
    return store.clients.sort((a, b) => a.trade_name.localeCompare(b.trade_name)) as T;
  }

  if (path.startsWith("/tasks/") && path.endsWith("/comments") && method === "POST") {
    const taskId = Number(path.split("/")[2]);
    const task = store.tasks.find((item) => item.id === taskId);
    if (!task || !canSeeTask(user, task)) throw new Error("Tarefa não encontrada");
    const comment = { id: store.nextId++, body: parseBody(options).body, created_at: nowIso(), author: user };
    task.comments = [...(task.comments || []), comment];
    task.activity = [{ id: store.nextId++, action: "commented", detail: comment.body, created_at: nowIso(), actor: user }, ...(task.activity || [])];
    if (comment.body.includes("@")) {
      store.notifications.push({ id: store.nextId++, user_id: task.assignee_id, task_id: task.id, message: `${user.name} mencionou você em ${task.title}`, read: false, created_at: nowIso() });
    }
    saveStore(store);
    return comment as T;
  }

  if (path.startsWith("/tasks/")) {
    const taskId = Number(path.split("/")[2]);
    const task = store.tasks.find((item) => item.id === taskId);
    if (!task || !canSeeTask(user, task)) throw new Error("Tarefa não encontrada");
    if (method === "PATCH") {
      const body = parseBody(options);
      // Status é andamento; qualquer outro campo é planejamento.
      const planning = Object.keys(body).some((key) => key !== "status");
      allow(planning ? canPlanTask(user, task) : canWorkOnTask(user, task));
      const changes = Object.entries(body).map(([key, value]) => `${key}: ${String((task as any)[key])} -> ${String(value)}`);
      Object.assign(task, body, { updated_at: nowIso() });
      if (body.status === "done" && !task.completed_at) task.completed_at = nowIso();
      task.activity = [{ id: store.nextId++, action: "updated", detail: changes.join("; "), created_at: nowIso(), actor: user }, ...(task.activity || [])];
      saveStore(store);
    }
    return hydrateTask(store, task) as T;
  }

  if (path.startsWith("/tasks")) {
    if (method === "POST") {
      const body = parseBody(options);
      const assignee = store.users.find((item) => item.id === body.assignee_id);
      const scope = taskDepartmentScope(user);
      allow(canCreateTasks(user) && (!scope || scope.includes(body.department_id)) && Boolean(assignee && canAssignTo(user, assignee)));
      const task: StoredTask = {
        ...body,
        id: store.nextId++,
        creator_id: user.id,
        created_at: nowIso(),
        updated_at: nowIso(),
        checklist: body.checklist.map((item: { title: string; done?: boolean }) => ({ id: store.nextId++, title: item.title, done: Boolean(item.done) })),
        comments: [],
        activity: [{ id: store.nextId++, action: "created", detail: "Tarefa criada", created_at: nowIso(), actor: user }],
      };
      store.tasks.push(task);
      store.notifications.push({ id: store.nextId++, user_id: task.assignee_id, task_id: task.id, message: `${user.name} atribuiu uma tarefa a você: ${task.title}`, read: false, created_at: nowIso() });
      saveStore(store);
      return hydrateTask(store, task) as T;
    }
    return filteredTasks(store, path, user) as T;
  }

  if (path === "/process-templates") {
    if (method === "POST") {
      allow(canManageTemplates(user));
      const template = saveTemplate(store, parseBody(options));
      saveStore(store);
      return template as T;
    }
    return [...store.templates].sort((a, b) => a.name.localeCompare(b.name)) as T;
  }

  if (path.startsWith("/process-templates/") && method === "PATCH") {
    const template = store.templates.find((item) => item.id === Number(path.split("/")[2]));
    if (!template) throw new Error("Modelo não encontrado");
    allow(canManageTemplates(user));
    saveTemplate(store, parseBody(options), template);
    saveStore(store);
    return template as T;
  }

  if (path === "/processes") {
    if (method === "POST") {
      const input = parseBody(options) as ProcessLaunchInput;
      const template = store.templates.find((item) => item.id === input.template_id);
      allow(Boolean(template && canRunProcess(user, template)));
      const { created, skipped } = launchProcesses(store, user, input);
      saveStore(store);
      return { created: created.map((process) => hydrateProcess(store, process)), skipped } as T;
    }
    return store.processes
      .map((process) => hydrateProcess(store, process))
      .filter((process) => canSeeProcess(user, { department_id: process.department.id })) as T;
  }

  if (path.startsWith("/processes/") && method === "PATCH") {
    const process = store.processes.find((item) => item.id === Number(path.split("/")[2]));
    if (!process) throw new Error("Processo não encontrado");
    const processTemplate = store.templates.find((item) => item.id === process.template_id);
    allow(Boolean(processTemplate && canRunProcess(user, processTemplate)));
    // Cancelar o processo cancela as etapas ainda em aberto; as concluídas ficam no histórico.
    if (parseBody(options).status === "canceled" && process.status !== "canceled") {
      process.status = "canceled";
      for (const task of store.tasks) {
        if (task.process_id !== process.id || task.status === "done" || task.status === "canceled") continue;
        task.activity = [{ id: store.nextId++, action: "updated", detail: `status: ${task.status} -> canceled`, created_at: nowIso(), actor: user }, ...(task.activity || [])];
        task.status = "canceled";
        task.updated_at = nowIso();
      }
      saveStore(store);
    }
    return hydrateProcess(store, process) as T;
  }

  if (path.startsWith("/checklists/") && method === "PATCH") {
    const url = new URL(path, "http://local");
    const itemId = Number(path.split("/")[2].split("?")[0]);
    for (const task of store.tasks) {
      const item = task.checklist.find((entry) => entry.id === itemId);
      if (item) {
        allow(canWorkOnTask(user, task));
        item.done = url.searchParams.get("done") === "true";
        task.updated_at = nowIso();
        task.activity = [{ id: store.nextId++, action: "checklist_updated", detail: item.title, created_at: nowIso(), actor: user }, ...(task.activity || [])];
        saveStore(store);
        return item as T;
      }
    }
    throw new Error("Item não encontrado");
  }

  if (path === "/notifications") {
    return store.notifications.filter((item) => item.user_id === user.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as T;
  }

  if (path.startsWith("/notifications/") && method === "PATCH") {
    const id = Number(path.split("/")[2]);
    const notification = store.notifications.find((item) => item.id === id && item.user_id === user.id);
    if (!notification) throw new Error("Notificação não encontrada");
    notification.read = true;
    saveStore(store);
    return notification as T;
  }

  throw new Error(`Rota local não implementada: ${path}`);
}

export const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
