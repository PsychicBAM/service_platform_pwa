"""Add booking waitlist foundation

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-13

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

WAITLIST_STATUS = postgresql.ENUM(
    "waiting",
    "contacted",
    "cancelled",
    "resolved",
    name="waitlist_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    WAITLIST_STATUS.create(bind, checkfirst=True)

    op.add_column(
        "services",
        sa.Column("waitlist_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "booking_waitlist_entries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_email", sa.String(length=320), nullable=True),
        sa.Column("customer_phone", sa.String(length=50), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "status",
            WAITLIST_STATUS,
            nullable=False,
            server_default="waiting",
        ),
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
    )
    op.create_index(
        "ix_waitlist_business_id",
        "booking_waitlist_entries",
        ["business_id"],
    )
    op.create_index(
        "ix_waitlist_business_id_service_id",
        "booking_waitlist_entries",
        ["business_id", "service_id"],
    )
    op.create_index(
        "ix_waitlist_business_id_service_id_starts_at",
        "booking_waitlist_entries",
        ["business_id", "service_id", "starts_at"],
    )
    op.create_index(
        "ix_waitlist_business_id_status",
        "booking_waitlist_entries",
        ["business_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_waitlist_business_id_status", table_name="booking_waitlist_entries")
    op.drop_index(
        "ix_waitlist_business_id_service_id_starts_at",
        table_name="booking_waitlist_entries",
    )
    op.drop_index(
        "ix_waitlist_business_id_service_id",
        table_name="booking_waitlist_entries",
    )
    op.drop_index("ix_waitlist_business_id", table_name="booking_waitlist_entries")
    op.drop_table("booking_waitlist_entries")
    op.drop_column("services", "waitlist_enabled")
    op.execute("DROP TYPE IF EXISTS waitlist_status")
