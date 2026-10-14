import enum
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Role(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    supervisor = "supervisor"
    collaborator = "collaborator"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    waiting_client = "waiting_client"
    in_review = "in_review"
    done = "done"
    canceled = "canceled"


class Priority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String(120))


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.collaborator)
    position: Mapped[str] = mapped_column(String(120), default="Colaborador")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    department: Mapped[Department | None] = relationship()


class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    internal_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    legal_name: Mapped[str] = mapped_column(String(180))
    trade_name: Mapped[str] = mapped_column(String(160))
    cnpj: Mapped[str] = mapped_column(String(24))
    tax_regime: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(180), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[User | None] = relationship()


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(220))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime)
    competence: Mapped[str] = mapped_column(String(20))
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.normal)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.todo)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    client: Mapped[Client] = relationship()
    department: Mapped[Department] = relationship()
    assignee: Mapped[User] = relationship(foreign_keys=[assignee_id])
    reviewer: Mapped[User | None] = relationship(foreign_keys=[reviewer_id])
    creator: Mapped[User] = relationship(foreign_keys=[creator_id])
    checklist: Mapped[list["TaskChecklist"]] = relationship(cascade="all, delete-orphan", order_by="TaskChecklist.id")
    comments: Mapped[list["TaskComment"]] = relationship(cascade="all, delete-orphan", order_by="TaskComment.created_at")


class TaskChecklist(Base):
    __tablename__ = "task_checklists"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    title: Mapped[str] = mapped_column(String(180))
    done: Mapped[bool] = mapped_column(Boolean, default=False)


class TaskComment(Base):
    __tablename__ = "task_comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    author: Mapped[User] = relationship()


class TaskAttachment(Base):
    __tablename__ = "task_attachments"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    filename: Mapped[str] = mapped_column(String(180))
    storage_key: Mapped[str] = mapped_column(String(255))


class ProcessTemplate(Base):
    __tablename__ = "process_templates"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    name: Mapped[str] = mapped_column(String(180))
    steps: Mapped[list["ProcessTemplateStep"]] = relationship(cascade="all, delete-orphan", order_by="ProcessTemplateStep.position")


class ProcessTemplateStep(Base):
    __tablename__ = "process_template_steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("process_templates.id"))
    title: Mapped[str] = mapped_column(String(180))
    position: Mapped[int] = mapped_column(Integer)


class Process(Base):
    __tablename__ = "processes"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    template_id: Mapped[int | None] = mapped_column(ForeignKey("process_templates.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(180))
    competence: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(40), default="active")


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    message: Mapped[str] = mapped_column(String(255))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    entity: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    actor: Mapped[User | None] = relationship()
