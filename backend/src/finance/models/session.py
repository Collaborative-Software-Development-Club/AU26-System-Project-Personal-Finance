from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from finance.db.base import Base
from finance.models.constants import SESSION_TOKEN_HASH_LENGTH


class UserSession(Base):
    __tablename__ = "sessions"

    # ID will identify different login sessions
    id: Mapped[int] = mapped_column(primary_key=True)

    # Links it to an exisiting user
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    # Allows us to lookup a session using the hash of the presented token
    token_hash: Mapped[str] = mapped_column(
        String(SESSION_TOKEN_HASH_LENGTH),
        unique=True,
        index=True,
    )

    # Records when we inserted this session into our DB
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Records when authentication through this session expires
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )