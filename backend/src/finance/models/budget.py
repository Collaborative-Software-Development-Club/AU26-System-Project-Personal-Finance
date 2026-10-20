from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from finance.db.base import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    category: Mapped[str] = mapped_column(String(200))
    period: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    end_date: Mapped[date | None] = mapped_column(Date)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=True)
