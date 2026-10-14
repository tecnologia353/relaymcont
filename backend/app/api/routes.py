from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import current_user, require_manager
from app.core.db import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import (
    ActivityLog, Client, Department, Notification, Priority, Role, Task, TaskChecklist,
    TaskComment, TaskStatus, User,
)
from app.schemas.api import (
    AuthOut, ChecklistOut, ClientCreate, ClientOut, CommentIn, CommentOut, DepartmentCreate,
    DepartmentOut, LoginIn, NotificationOut, TaskCreate, TaskDetail, TaskSummary, TaskUpdate,
    UserCreate, UserOut,
)
from app.services.audit import log, notify

router = APIRouter(prefix="/api")


def task_query(db: Session, org_id: int):
    return db.scalars(
        select(Task)
        .where(Task.organization_id == org_id)
        .options(
            selectinload(Task.client),
            selectinload(Task.department),
            selectinload(Task.assignee),
            selectinload(Task.reviewer),
            selectinload(Task.creator),
            selectinload(Task.checklist),
        )
        .order_by(Task.due_date.asc())
    )


@router.post("/auth/login", response_model=AuthOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    return AuthOut(access_token=create_access_token(str(user.id)), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.get("/users", response_model=list[UserOut])
def users(db: Session = Depends(get_db), user: User = Depends(require_manager)):
    return db.scalars(select(User).where(User.organization_id == user.organization_id).order_by(User.name)).all()


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    created = User(organization_id=user.organization_id, password_hash=hash_password(payload.password), **payload.model_dump(exclude={"password"}))
    db.add(created)
    db.commit()
    db.refresh(created)
    return created


@router.get("/departments", response_model=list[DepartmentOut])
def departments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Department).where(Department.organization_id == user.organization_id).order_by(Department.name)).all()


@router.post("/departments", response_model=DepartmentOut)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    dept = Department(organization_id=user.organization_id, name=payload.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/clients", response_model=list[ClientOut])
def clients(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    stmt = select(Client).where(Client.organization_id == user.organization_id)
    if q:
        stmt = stmt.where(or_(Client.legal_name.ilike(f"%{q}%"), Client.trade_name.ilike(f"%{q}%"), Client.cnpj.ilike(f"%{q}%")))
    return db.scalars(stmt.order_by(Client.trade_name)).all()


@router.post("/clients", response_model=ClientOut)
def create_client(payload: ClientCreate, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    client = Client(organization_id=user.organization_id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/tasks", response_model=list[TaskSummary])
def tasks(
    mine: bool = False,
    status: TaskStatus | None = None,
    priority: Priority | None = None,
    client_id: int | None = None,
    department_id: int | None = None,
    assignee_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    stmt = select(Task).where(Task.organization_id == user.organization_id)
    if mine:
        stmt = stmt.where(Task.assignee_id == user.id)
    if status:
        stmt = stmt.where(Task.status == status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if client_id:
        stmt = stmt.where(Task.client_id == client_id)
    if department_id:
        stmt = stmt.where(Task.department_id == department_id)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if q:
        stmt = stmt.join(Client).where(or_(Task.title.ilike(f"%{q}%"), Client.trade_name.ilike(f"%{q}%"), Client.legal_name.ilike(f"%{q}%")))
    stmt = stmt.options(selectinload(Task.client), selectinload(Task.department), selectinload(Task.assignee), selectinload(Task.reviewer), selectinload(Task.creator), selectinload(Task.checklist)).order_by(Task.due_date.asc())
    return db.scalars(stmt).all()


@router.post("/tasks", response_model=TaskSummary)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user: User = Depends(require_manager)):
    data = payload.model_dump(exclude={"checklist"})
    task = Task(organization_id=user.organization_id, creator_id=user.id, **data)
    task.checklist = [TaskChecklist(**item.model_dump()) for item in payload.checklist]
    db.add(task)
    db.flush()
    log(db, user, "task", task.id, "created", "Tarefa criada", task.id)
    notify(db, task.assignee_id, user.organization_id, f"{user.name} atribuiu uma tarefa a você: {task.title}", task.id)
    db.commit()
    db.refresh(task)
    return db.scalar(select(Task).where(Task.id == task.id).options(selectinload(Task.client), selectinload(Task.department), selectinload(Task.assignee), selectinload(Task.reviewer), selectinload(Task.creator), selectinload(Task.checklist)))


@router.get("/tasks/{task_id}", response_model=TaskDetail)
def task_detail(task_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    task = db.scalar(select(Task).where(and_(Task.id == task_id, Task.organization_id == user.organization_id)).options(selectinload(Task.client), selectinload(Task.department), selectinload(Task.assignee), selectinload(Task.reviewer), selectinload(Task.creator), selectinload(Task.checklist), selectinload(Task.comments).selectinload(TaskComment.author)))
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    task.activity = db.scalars(select(ActivityLog).where(ActivityLog.task_id == task.id).options(selectinload(ActivityLog.actor)).order_by(ActivityLog.created_at.desc())).all()
    return task


@router.patch("/tasks/{task_id}", response_model=TaskSummary)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    task = db.get(Task, task_id)
    if not task or task.organization_id != user.organization_id:
        raise HTTPException(404, "Tarefa não encontrada")
    if user.role == Role.collaborator and task.assignee_id != user.id:
        raise HTTPException(403, "Você só pode atualizar suas tarefas")
    changes = []
    for field, value in payload.model_dump(exclude_unset=True).items():
        old = getattr(task, field)
        if value != old:
            setattr(task, field, value)
            changes.append(f"{field}: {old} -> {value}")
    if payload.status == TaskStatus.done and not task.completed_at:
        task.completed_at = datetime.utcnow()
    if changes:
        log(db, user, "task", task.id, "updated", "; ".join(changes), task.id)
    db.commit()
    return db.scalar(select(Task).where(Task.id == task.id).options(selectinload(Task.client), selectinload(Task.department), selectinload(Task.assignee), selectinload(Task.reviewer), selectinload(Task.creator), selectinload(Task.checklist)))


@router.patch("/checklists/{item_id}", response_model=ChecklistOut)
def update_checklist(item_id: int, done: bool, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.get(TaskChecklist, item_id)
    if not item:
        raise HTTPException(404, "Item não encontrado")
    task = db.get(Task, item.task_id)
    if task.organization_id != user.organization_id:
        raise HTTPException(404, "Item não encontrado")
    item.done = done
    log(db, user, "task", task.id, "checklist_updated", item.title, task.id)
    db.commit()
    db.refresh(item)
    return item


@router.post("/tasks/{task_id}/comments", response_model=CommentOut)
def add_comment(task_id: int, payload: CommentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    task = db.get(Task, task_id)
    if not task or task.organization_id != user.organization_id:
        raise HTTPException(404, "Tarefa não encontrada")
    comment = TaskComment(task_id=task.id, author_id=user.id, body=payload.body)
    db.add(comment)
    log(db, user, "task", task.id, "commented", payload.body[:180], task.id)
    if "@" in payload.body and task.assignee_id != user.id:
        notify(db, task.assignee_id, user.organization_id, f"{user.name} mencionou você em {task.title}", task.id)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())).all()


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def read_notification(notification_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(404, "Notificação não encontrada")
    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    now = datetime.utcnow()
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    all_tasks = task_query(db, user.organization_id).all()
    month_tasks = [t for t in all_tasks if t.created_at >= start_month]
    critical = [t for t in all_tasks if t.status != TaskStatus.done and (t.due_date < now or t.priority in {Priority.high, Priority.urgent})][:8]
    upcoming = [t for t in all_tasks if t.status != TaskStatus.done and now <= t.due_date <= now + timedelta(days=7)][:8]
    team = []
    for member in db.scalars(select(User).where(User.organization_id == user.organization_id, User.active == True).order_by(User.name)).all():
        mine = [t for t in all_tasks if t.assignee_id == member.id and t.status != TaskStatus.done]
        team.append({"id": member.id, "name": member.name, "pending": len(mine), "in_progress": len([t for t in mine if t.status == TaskStatus.in_progress]), "overdue": len([t for t in mine if t.due_date < now])})
    departments = []
    for dept in db.scalars(select(Department).where(Department.organization_id == user.organization_id)).all():
        dept_tasks = [t for t in all_tasks if t.department_id == dept.id]
        done = len([t for t in dept_tasks if t.status == TaskStatus.done])
        departments.append({"id": dept.id, "name": dept.name, "progress": round(done / max(len(dept_tasks), 1) * 100)})
    return {
        "counts": {
            "month": len(month_tasks),
            "done": len([t for t in all_tasks if t.status == TaskStatus.done]),
            "in_progress": len([t for t in all_tasks if t.status == TaskStatus.in_progress]),
            "overdue": len([t for t in all_tasks if t.status != TaskStatus.done and t.due_date < now]),
            "waiting_client": len([t for t in all_tasks if t.status == TaskStatus.waiting_client]),
            "in_review": len([t for t in all_tasks if t.status == TaskStatus.in_review]),
        },
        "critical": critical,
        "upcoming": upcoming,
        "departments": departments,
        "team": team,
    }
