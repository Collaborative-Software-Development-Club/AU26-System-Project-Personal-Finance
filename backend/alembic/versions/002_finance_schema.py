"""finance schema: users, accounts, transactions, budgets

Revision ID: 002
Revises: 001
Create Date: 2026-10-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("account_type", sa.String(length=200), nullable=False),
        sa.Column("balance", sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column("category", sa.String(length=200), nullable=False),
        sa.Column("period", sa.String(length=50), nullable=False),
        sa.Column(
            "start_date",
            sa.Date(),
            server_default=sa.text("CURRENT_DATE"),
            nullable=False,
        ),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "recurring_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=200), nullable=False),
        sa.Column("frequency", sa.String(length=50), nullable=False),
        sa.Column("next_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=200), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("recurring_transactions")
    op.drop_table("budgets")
    op.drop_table("accounts")
    op.drop_table("users")

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
