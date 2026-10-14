from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.entities import Priority, Role, TaskStatus


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    position: str
    active: bool
    department_id: int | None = None

    class Config:
        from_attributes = True


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = Role.collaborator
    position: str = "Colaborador"
    department_id: int | None = None
    active: bool = True


class DepartmentOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str


class ClientCreate(BaseModel):
    legal_name: str
    trade_name: str
    cnpj: str
    tax_regime: str
    internal_owner_id: int | None = None
    phone: str | None = None
    email: EmailStr | None = None
    status: str = "active"
    notes: str | None = None


class ClientOut(ClientCreate):
    id: int

    class Config:
        from_attributes = True


class ChecklistIn(BaseModel):
    title: str
    done: bool = False


class ChecklistOut(ChecklistIn):
    id: int

    class Config:
        from_attributes = True


class CommentIn(BaseModel):
    body: str


class CommentOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    author: UserOut

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    client_id: int
    department_id: int
    assignee_id: int
    reviewer_id: int | None = None
    due_date: datetime
    priority: Priority = Priority.normal
    status: TaskStatus = TaskStatus.todo
    competence: str
    checklist: list[ChecklistIn] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    client_id: int | None = None
    department_id: int | None = None
    assignee_id: int | None = None
    reviewer_id: int | None = None
    due_date: datetime | None = None
    priority: Priority | None = None
    status: TaskStatus | None = None
    competence: str | None = None


class TaskSummary(BaseModel):
    id: int
    title: str
    description: str | None
    due_date: datetime
    competence: str
    priority: Priority
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    client: ClientOut
    department: DepartmentOut
    assignee: UserOut
    reviewer: UserOut | None = None
    creator: UserOut
    checklist: list[ChecklistOut] = []

    class Config:
        from_attributes = True


class TaskDetail(TaskSummary):
    comments: list[CommentOut] = []
    activity: list["ActivityOut"] = []


class NotificationOut(BaseModel):
    id: int
    message: str
    read: bool
    task_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityOut(BaseModel):
    id: int
    action: str
    detail: str | None
    created_at: datetime
    actor: UserOut | None = None

    class Config:
        from_attributes = True
