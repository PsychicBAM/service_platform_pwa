"""Add booking cutoff/window fields to services

Revision ID: 0014
Revises: 0013
Create Date: 2026-07-13

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("booking_min_notice_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "services",
        sa.Column("booking_window_days", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("services", "booking_window_days")
    op.drop_column("services", "booking_min_notice_minutes")
