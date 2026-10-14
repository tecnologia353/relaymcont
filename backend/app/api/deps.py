from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_token
from app.models.entities import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    subject = decode_token(token)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.get(User, int(subject))
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou inexistente")
    return user


def require_manager(user: User = Depends(current_user)) -> User:
    if user.role not in {Role.admin, Role.manager, Role.supervisor}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso insuficiente")
    return user
