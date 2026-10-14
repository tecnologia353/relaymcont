from sqlalchemy.orm import Session

from app.models.entities import ActivityLog, Notification, User


def log(db: Session, actor: User | None, entity: str, entity_id: int, action: str, detail: str | None = None, task_id: int | None = None):
    db.add(ActivityLog(
        organization_id=actor.organization_id if actor else 1,
        actor_id=actor.id if actor else None,
        entity=entity,
        entity_id=entity_id,
        action=action,
        detail=detail,
        task_id=task_id,
    ))


def notify(db: Session, user_id: int, organization_id: int, message: str, task_id: int | None = None):
    db.add(Notification(organization_id=organization_id, user_id=user_id, message=message, task_id=task_id))
