from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from finance.db.base import Base
from finance.models.constants import DESCRIPTION_MAX_LENGTH

ROW_STATUS_MAX_LENGTH = 20  # raw | valid | duplicate | failed | imported

class ImportedRow(Base):
    __tablename__ = "imported_rows"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("import_jobs.id"), nullable=False)
    # nullable FK — only set once promoted to a real transaction
    transaction_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id"))

    # Raw CSV values preserved exactly as uploaded
    raw_date: Mapped[str] = mapped_column(String(50))
    raw_amount: Mapped[str] = mapped_column(String(50))
    raw_description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    raw_category: Mapped[str | None] = mapped_column(String(200))

    # Normalized/parsed values (populated during processing)
    parsed_date: Mapped[date | None] = mapped_column(Date)
    parsed_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    category: Mapped[str | None] = mapped_column(String(200))

    status: Mapped[str] = mapped_column(String(ROW_STATUS_MAX_LENGTH), default="raw")
    error_message: Mapped[str | None] = mapped_column(Text)  # validation failure reason
    row_index: Mapped[int] = mapped_column()  # original CSV row number

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["ImportJob"] = relationship(back_populates="rows")
