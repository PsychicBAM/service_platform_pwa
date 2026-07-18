"""Add nullable category to services

Revision ID: 0022
Revises: 0021
Create Date: 2026-07-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("category", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_services_business_id_category",
        "services",
        ["business_id", "category"],
    )


def downgrade() -> None:
    op.drop_index("ix_services_business_id_category", table_name="services")
    op.drop_column("services", "category")
