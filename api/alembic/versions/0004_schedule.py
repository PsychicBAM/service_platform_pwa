"""schedule tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "working_hours",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("is_open", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("opens_at", sa.Time(), nullable=True),
        sa.Column("closes_at", sa.Time(), nullable=True),
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
        sa.CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_working_hours_day",
        ),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "day_of_week", name="uq_working_hours_business_day"),
    )
    op.create_index("ix_working_hours_business_id", "working_hours", ["business_id"])
    op.create_index(
        "ix_working_hours_business_id_day",
        "working_hours",
        ["business_id", "day_of_week"],
    )

    op.create_table(
        "working_breaks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=True),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=True),
        sa.Column("starts_at", sa.Time(), nullable=False),
        sa.Column("ends_at", sa.Time(), nullable=False),
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
        sa.CheckConstraint(
            "day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)",
            name="ck_working_breaks_day",
        ),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_working_breaks_business_id", "working_breaks", ["business_id"])
    op.create_index(
        "ix_working_breaks_business_id_day",
        "working_breaks",
        ["business_id", "day_of_week"],
    )

    op.create_table(
        "unavailable_times",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_unavailable_times_business_id",
        "unavailable_times",
        ["business_id"],
    )
    op.create_index(
        "ix_unavailable_times_starts_at",
        "unavailable_times",
        ["starts_at"],
    )
    op.create_index(
        "ix_unavailable_times_ends_at",
        "unavailable_times",
        ["ends_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_unavailable_times_ends_at", table_name="unavailable_times")
    op.drop_index("ix_unavailable_times_starts_at", table_name="unavailable_times")
    op.drop_index("ix_unavailable_times_business_id", table_name="unavailable_times")
    op.drop_table("unavailable_times")

    op.drop_index("ix_working_breaks_business_id_day", table_name="working_breaks")
    op.drop_index("ix_working_breaks_business_id", table_name="working_breaks")
    op.drop_table("working_breaks")

    op.drop_index("ix_working_hours_business_id_day", table_name="working_hours")
    op.drop_index("ix_working_hours_business_id", table_name="working_hours")
    op.drop_table("working_hours")
