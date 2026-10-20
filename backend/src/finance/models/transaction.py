from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from finance.db.base import Base
from finance.models.constants import DESCRIPTION_MAX_LENGTH


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    category: Mapped[str] = mapped_column(String(200))
    transaction_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
