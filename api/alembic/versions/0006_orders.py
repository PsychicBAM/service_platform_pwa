"""orders and order_messages tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ORDER_STATUS = postgresql.ENUM(
    "submitted",
    "pending_payment",
    "accepted",
    "in_progress",
    "completed",
    "declined",
    "cancelled",
    name="order_status",
    create_type=False,
)
ORDER_MESSAGE_SENDER_TYPE = postgresql.ENUM(
    "client",
    "admin",
    name="order_message_sender_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    ORDER_STATUS.create(bind, checkfirst=True)
    ORDER_MESSAGE_SENDER_TYPE.create(bind, checkfirst=True)

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=20), nullable=False),
        sa.Column(
            "status",
            ORDER_STATUS,
            nullable=False,
            server_default="submitted",
        ),
        sa.Column(
            "form_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("quoted_price_cents", sa.Integer(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "reference", name="uq_orders_business_reference"),
    )
    op.create_index("ix_orders_business_id", "orders", ["business_id"])
    op.create_index("ix_orders_business_id_status", "orders", ["business_id", "status"])
    op.create_index(
        "ix_orders_business_id_created_at",
        "orders",
        ["business_id", "created_at"],
    )
    op.create_index("ix_orders_client_id", "orders", ["client_id"])

    op.create_table(
        "order_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_type", ORDER_MESSAGE_SENDER_TYPE, nullable=False),
        sa.Column("sender_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sender_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_order_messages_order_id_created_at",
        "order_messages",
        ["order_id", "created_at"],
    )
    op.create_index(
        "ix_order_messages_business_id_created_at",
        "order_messages",
        ["business_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_order_messages_business_id_created_at", table_name="order_messages")
    op.drop_index("ix_order_messages_order_id_created_at", table_name="order_messages")
    op.drop_table("order_messages")

    op.drop_index("ix_orders_client_id", table_name="orders")
    op.drop_index("ix_orders_business_id_created_at", table_name="orders")
    op.drop_index("ix_orders_business_id_status", table_name="orders")
    op.drop_index("ix_orders_business_id", table_name="orders")
    op.drop_table("orders")

    bind = op.get_bind()
    ORDER_MESSAGE_SENDER_TYPE.drop(bind, checkfirst=True)
    ORDER_STATUS.drop(bind, checkfirst=True)
