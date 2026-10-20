from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from finance.db.base import Base
from finance.models.constants import DESCRIPTION_MAX_LENGTH


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    category: Mapped[str] = mapped_column(String(200))
    frequency: Mapped[str] = mapped_column(String(50))
    next_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
