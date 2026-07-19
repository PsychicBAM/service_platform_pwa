"""Add plan_change_requests table

Revision ID: 0023
Revises: 0022
Create Date: 2026-07-19

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0023"
down_revision: str | None = "0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PLAN_CHANGE_DIRECTION = postgresql.ENUM(
    "upgrade",
    "downgrade",
    "change",
    name="plan_change_direction",
    create_type=False,
)

PLAN_CHANGE_REQUEST_STATUS = postgresql.ENUM(
    "pending",
    "approved",
    "rejected",
    "cancelled",
    name="plan_change_request_status",
    create_type=False,
)

# Reuse existing subscription_plan enum from subscriptions table.
SUBSCRIPTION_PLAN = postgresql.ENUM(
    "free",
    "starter",
    "business",
    "pro",
    name="subscription_plan",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    PLAN_CHANGE_DIRECTION.create(bind, checkfirst=True)
    PLAN_CHANGE_REQUEST_STATUS.create(bind, checkfirst=True)

    op.create_table(
        "plan_change_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("requested_by_user_id", sa.UUID(), nullable=True),
        sa.Column("current_plan", SUBSCRIPTION_PLAN, nullable=False),
        sa.Column("requested_plan", SUBSCRIPTION_PLAN, nullable=False),
        sa.Column("direction", PLAN_CHANGE_DIRECTION, nullable=False),
        sa.Column(
            "status",
            PLAN_CHANGE_REQUEST_STATUS,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_user_id", sa.UUID(), nullable=True),
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
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_plan_change_requests_business_id",
        "plan_change_requests",
        ["business_id"],
    )
    op.create_index(
        "ix_plan_change_requests_status",
        "plan_change_requests",
        ["status"],
    )
    op.create_index(
        "ix_plan_change_requests_business_id_status",
        "plan_change_requests",
        ["business_id", "status"],
    )
    op.create_index(
        "ix_plan_change_requests_created_at",
        "plan_change_requests",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_plan_change_requests_created_at", table_name="plan_change_requests")
    op.drop_index(
        "ix_plan_change_requests_business_id_status",
        table_name="plan_change_requests",
    )
    op.drop_index("ix_plan_change_requests_status", table_name="plan_change_requests")
    op.drop_index("ix_plan_change_requests_business_id", table_name="plan_change_requests")
    op.drop_table("plan_change_requests")

    bind = op.get_bind()
    PLAN_CHANGE_REQUEST_STATUS.drop(bind, checkfirst=True)
    PLAN_CHANGE_DIRECTION.drop(bind, checkfirst=True)
