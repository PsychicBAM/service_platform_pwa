"""clients and bookings tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CLIENT_SOURCE = postgresql.ENUM(
    "registered",
    "guest",
    "admin_created",
    name="client_source",
    create_type=False,
)
BOOKING_STATUS = postgresql.ENUM(
    "pending",
    "pending_payment",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
    name="booking_status",
    create_type=False,
)
CANCELLED_BY = postgresql.ENUM(
    "client",
    "admin",
    "system",
    name="cancelled_by",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    CLIENT_SOURCE.create(bind, checkfirst=True)
    BOOKING_STATUS.create(bind, checkfirst=True)
    CANCELLED_BY.create(bind, checkfirst=True)

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "source",
            CLIENT_SOURCE,
            nullable=False,
            server_default="guest",
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
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_business_id", "clients", ["business_id"])
    op.create_index("ix_clients_business_id_email", "clients", ["business_id", "email"])
    op.create_index("ix_clients_business_id_phone", "clients", ["business_id", "phone"])
    op.create_index(
        "uq_clients_business_email_not_null",
        "clients",
        ["business_id", "email"],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=20), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            BOOKING_STATUS,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("client_notes", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_by", CANCELLED_BY, nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("rescheduled_from_id", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["services.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rescheduled_from_id"],
            ["bookings.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "reference", name="uq_bookings_business_reference"),
    )
    op.create_index(
        "ix_bookings_business_id_starts_at",
        "bookings",
        ["business_id", "starts_at"],
    )
    op.create_index(
        "ix_bookings_business_id_status",
        "bookings",
        ["business_id", "status"],
    )
    op.create_index(
        "ix_bookings_business_id_starts_at_ends_at",
        "bookings",
        ["business_id", "starts_at", "ends_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_bookings_business_id_starts_at_ends_at", table_name="bookings")
    op.drop_index("ix_bookings_business_id_status", table_name="bookings")
    op.drop_index("ix_bookings_business_id_starts_at", table_name="bookings")
    op.drop_table("bookings")

    op.drop_index("uq_clients_business_email_not_null", table_name="clients")
    op.drop_index("ix_clients_business_id_phone", table_name="clients")
    op.drop_index("ix_clients_business_id_email", table_name="clients")
    op.drop_index("ix_clients_business_id", table_name="clients")
    op.drop_table("clients")

    bind = op.get_bind()
    CANCELLED_BY.drop(bind, checkfirst=True)
    BOOKING_STATUS.drop(bind, checkfirst=True)
    CLIENT_SOURCE.drop(bind, checkfirst=True)
