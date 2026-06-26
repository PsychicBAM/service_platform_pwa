"""core tenant models

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

USER_ROLE = postgresql.ENUM(
    "client",
    "business_admin",
    "superadmin",
    name="user_role",
    create_type=False,
)
BUSINESS_STATUS = postgresql.ENUM(
    "active",
    "suspended",
    "pending_setup",
    name="business_status",
    create_type=False,
)
OPERATING_MODE = postgresql.ENUM(
    "booking_only",
    "orders_only",
    "both",
    name="operating_mode",
    create_type=False,
)
BUSINESS_MEMBER_ROLE = postgresql.ENUM(
    "owner",
    "admin",
    "staff",
    name="business_member_role",
    create_type=False,
)
SUBSCRIPTION_PLAN = postgresql.ENUM(
    "free",
    "starter",
    "business",
    "pro",
    name="subscription_plan",
    create_type=False,
)
SUBSCRIPTION_STATUS = postgresql.ENUM(
    "active",
    "past_due",
    "cancelled",
    "trialing",
    name="subscription_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    USER_ROLE.create(bind, checkfirst=True)
    BUSINESS_STATUS.create(bind, checkfirst=True)
    OPERATING_MODE.create(bind, checkfirst=True)
    BUSINESS_MEMBER_ROLE.create(bind, checkfirst=True)
    SUBSCRIPTION_PLAN.create(bind, checkfirst=True)
    SUBSCRIPTION_STATUS.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column(
            "role",
            USER_ROLE,
            nullable=False,
            server_default="client",
        ),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "businesses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("timezone", sa.String(length=50), server_default="UTC", nullable=False),
        sa.Column(
            "operating_mode",
            OPERATING_MODE,
            nullable=False,
            server_default="booking_only",
        ),
        sa.Column(
            "status",
            BUSINESS_STATUS,
            nullable=False,
            server_default="pending_setup",
        ),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("stripe_account_id", sa.String(length=255), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "business_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "role",
            BUSINESS_MEMBER_ROLE,
            nullable=False,
            server_default="owner",
        ),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "user_id", name="uq_business_members_business_user"),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "plan",
            SUBSCRIPTION_PLAN,
            nullable=False,
            server_default="free",
        ),
        sa.Column(
            "status",
            SUBSCRIPTION_STATUS,
            nullable=False,
            server_default="active",
        ),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usage_bookings_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("usage_orders_count", sa.Integer(), server_default="0", nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id"),
    )


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("business_members")
    op.drop_table("businesses")
    op.drop_table("users")

    bind = op.get_bind()
    SUBSCRIPTION_STATUS.drop(bind, checkfirst=True)
    SUBSCRIPTION_PLAN.drop(bind, checkfirst=True)
    BUSINESS_MEMBER_ROLE.drop(bind, checkfirst=True)
    OPERATING_MODE.drop(bind, checkfirst=True)
    BUSINESS_STATUS.drop(bind, checkfirst=True)
    USER_ROLE.drop(bind, checkfirst=True)
