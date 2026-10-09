from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


"""
Defining the constants that will determine how large each string in the database can be.
"""
NAME_MAX_LENGTH = 200
EMAIL_MAX_LENGTH = 200
PASSWORD_HASH_MAX_LENGTH = 64
DESCRIPTION_MAX_LENGTH = 500


"""
Declaring Base that will tell classes to act as SQLAlchemy databases. 
"""
class Base(DeclarativeBase):
    pass


"""
Base User Model containing:

    id: Primary key for each user.
    name: User's name.
    email: User's email used at login.
    password_hash: User's password entered through some hash function (tenative)
    created_at: When user was created.

"""
class User(Base):
    __tablename__ = "users"

    # Each of our individual columns for our table
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    email: Mapped[str] = mapped_column(String(EMAIL_MAX_LENGTH), unique=True)
    password_hash: Mapped[str] = mapped_column(String(PASSWORD_HASH_MAX_LENGTH))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


"""
Account Model Containing:

    id: Primary key for each account.
    user_id: Links the account to an user id. (Foreign Key)
    name: Name of the account.
    account_type: Type of the account.
    balance: The account balance.
    created_at: The date that the account was created on.
    updated_at: The date that the account was last updated on.

"""
class Account(Base):
    __tablename__ = "accounts"

    # Each of our individual columns for our table
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    account_type: Mapped[str] = mapped_column(String(200))
    balance: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


"""
Transaction Model Containing:

    id: Primary key for each transaction.
    account_id: Links the transaction to an account id. (Foreign Key)
    amount: The transaction amount.
    description: The description of the transaction.
    category: The category of the transaction.
    transaction_date: The date the transaction was made.
    created_at: The date the transaction model was made.'

"""
class Transaction(Base):
    __tablename__ = "transactions"

    # Each of the individual columns for our table
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    category: Mapped[str] = mapped_column(String(200))
    transaction_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
     

"""
Recurring Transactions Model Containing:

    id: Primary key for each recurring transaction.
    account_id: Links the recurring transaction to an account id. (Foreign Key)
    amount: The recurring transaction amount.
    description: The description of the recurring transaction.
    category: The category of the recurring transaction.
    frequency: The frequency of the recurring transaciton.
    next_date: The next time the transaction will occur.
    end_date: When the recurring transactions will stop.
    is_active: If the recurring transaction is still happening.
    
"""
class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    # Each of the individual columns for our table
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    category: Mapped[str] = mapped_column(String(200))
    frequency: Mapped[str] = mapped_column(String(50))
    next_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


"""
Budgets Model Containing:

    id: Primary key for each budget.
    user_id: Links the budget to an user id. (Foreign Key)
    category: The category of the budget.
    amount: The amount of the budget.
    period: The period this budget is for.
    start_date: The start date of this budget.
    end_date: The end date of this budget.
    is_recurring: If the budget is recurring or not.

"""
class Budget(Base):
    __tablename__ = "budgets"

    # Each of the individual columns for our table
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    category: Mapped[str] = mapped_column(String(200))
    period: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    end_date: Mapped[date | None] = mapped_column(Date)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=True)