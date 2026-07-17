"""Add review request email tracking on bookings and orders

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-17

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("review_request_email_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("review_request_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("review_request_email_last_error", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_bookings_review_request_email_due",
        "bookings",
        ["review_request_email_due_at"],
    )

    op.add_column(
        "orders",
        sa.Column("review_request_email_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("review_request_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("review_request_email_last_error", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_orders_review_request_email_due",
        "orders",
        ["review_request_email_due_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_orders_review_request_email_due", table_name="orders")
    op.drop_column("orders", "review_request_email_last_error")
    op.drop_column("orders", "review_request_email_sent_at")
    op.drop_column("orders", "review_request_email_due_at")
    op.drop_index("ix_bookings_review_request_email_due", table_name="bookings")
    op.drop_column("bookings", "review_request_email_last_error")
    op.drop_column("bookings", "review_request_email_sent_at")
    op.drop_column("bookings", "review_request_email_due_at")
