from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from finance.db.base import Base

# Status lifecycle: pending → processing → completed | partial | failed
IMPORT_STATUS_MAX_LENGTH = 20
FILENAME_MAX_LENGTH = 500
IDEMPOTENCY_KEY_MAX_LENGTH = 100

class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(
        String(IDEMPOTENCY_KEY_MAX_LENGTH), unique=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(FILENAME_MAX_LENGTH))
    status: Mapped[str] = mapped_column(
        String(IMPORT_STATUS_MAX_LENGTH), default="pending"
    )
    # Counters populated after processing
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    rows: Mapped[list["ImportedRow"]] = relationship(back_populates="job")
