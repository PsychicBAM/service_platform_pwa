"""Add follow-up email consent on bookings and orders

Revision ID: 0020
Revises: 0019
Create Date: 2026-07-17

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column(
            "follow_up_email_consent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "bookings",
        sa.Column("follow_up_email_consent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column(
            "follow_up_email_consent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "orders",
        sa.Column("follow_up_email_consent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "follow_up_email_consent_at")
    op.drop_column("orders", "follow_up_email_consent")
    op.drop_column("bookings", "follow_up_email_consent_at")
    op.drop_column("bookings", "follow_up_email_consent")
