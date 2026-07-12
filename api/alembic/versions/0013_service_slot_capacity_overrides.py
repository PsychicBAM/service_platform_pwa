"""Add service_slot_capacity_overrides table

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-13

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_slot_capacity_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "business_id",
            "service_id",
            "starts_at",
            name="uq_service_slot_capacity_overrides_business_service_starts_at",
        ),
    )
    op.create_index(
        "ix_service_slot_capacity_overrides_business_id",
        "service_slot_capacity_overrides",
        ["business_id"],
    )
    op.create_index(
        "ix_service_slot_capacity_overrides_service_id",
        "service_slot_capacity_overrides",
        ["service_id"],
    )
    op.create_index(
        "ix_service_slot_capacity_overrides_starts_at",
        "service_slot_capacity_overrides",
        ["starts_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_service_slot_capacity_overrides_starts_at",
        table_name="service_slot_capacity_overrides",
    )
    op.drop_index(
        "ix_service_slot_capacity_overrides_service_id",
        table_name="service_slot_capacity_overrides",
    )
    op.drop_index(
        "ix_service_slot_capacity_overrides_business_id",
        table_name="service_slot_capacity_overrides",
    )
    op.drop_table("service_slot_capacity_overrides")
