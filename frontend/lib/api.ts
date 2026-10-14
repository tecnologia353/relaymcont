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
  client: Client;
  department: Department;
  assignee: User;
  reviewer?: User;
  creator: User;
  checklist: Checklist[];
  comments?: Comment[];
  activity?: Activity[];
};

type StoredTask = Omit<Task, "client" | "department" | "assignee" | "reviewer" | "creator">;
type Store = { users: User[]; departments: Department[]; clients: Client[]; tasks: StoredTask[]; notifications: Notification[]; nextId: number };

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
  return { users, departments, clients, tasks, notifications, nextId: 5000 };
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
  let tasks = store.tasks.map((task) => hydrateTask(store, task));
  if (url.searchParams.get("mine") === "true") tasks = tasks.filter((task) => task.assignee_id === user.id);
  const status = url.searchParams.get("status");
  if (status) tasks = tasks.filter((task) => task.status === status);
  const query = url.searchParams.get("q")?.toLowerCase();
  if (query) tasks = tasks.filter((task) => `${task.title} ${task.client.trade_name} ${task.client.legal_name}`.toLowerCase().includes(query));
  return tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
}

function dashboard(store: Store) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tasks = store.tasks.map((task) => hydrateTask(store, task));
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
    const user = store.users.find((item) => item.email === body.email && item.password === body.password && item.active);
    if (!user) throw new Error("E-mail ou senha inválidos");
    localStorage.setItem(SESSION_KEY, String(user.id));
    return { access_token: `local-${user.id}`, token_type: "local", user: withoutPassword(user) } as T;
  }

  const user = currentUser(store);
  if (path === "/me") return user as T;
  if (path === "/dashboard") return dashboard(store) as T;
  if (path === "/users") return store.users.map(withoutPassword) as T;
  if (path === "/departments") return store.departments as T;

  if (path.startsWith("/clients")) {
    if (method === "POST") {
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
    if (!task) throw new Error("Tarefa não encontrada");
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
    if (!task) throw new Error("Tarefa não encontrada");
    if (method === "PATCH") {
      const body = parseBody(options);
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

  if (path.startsWith("/checklists/") && method === "PATCH") {
    const url = new URL(path, "http://local");
    const itemId = Number(path.split("/")[2].split("?")[0]);
    for (const task of store.tasks) {
      const item = task.checklist.find((entry) => entry.id === itemId);
      if (item) {
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
