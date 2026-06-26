"""services table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SERVICE_TYPE = postgresql.ENUM(
    "booking",
    "order",
    name="service_type",
    create_type=False,
)
PRICE_TYPE = postgresql.ENUM(
    "fixed",
    "free",
    "quote",
    name="price_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    SERVICE_TYPE.create(bind, checkfirst=True)
    PRICE_TYPE.create(bind, checkfirst=True)

    op.create_table(
        "services",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", SERVICE_TYPE, nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=True),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
            server_default="USD",
        ),
        sa.Column(
            "price_type",
            PRICE_TYPE,
            nullable=False,
            server_default="fixed",
        ),
        sa.Column(
            "require_payment",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_services_business_id", "services", ["business_id"])
    op.create_index(
        "ix_services_business_id_type",
        "services",
        ["business_id", "type"],
    )
    op.create_index(
        "ix_services_business_id_is_active",
        "services",
        ["business_id", "is_active"],
    )
    op.create_index(
        "ix_services_business_id_sort_order",
        "services",
        ["business_id", "sort_order"],
    )


def downgrade() -> None:
    op.drop_index("ix_services_business_id_sort_order", table_name="services")
    op.drop_index("ix_services_business_id_is_active", table_name="services")
    op.drop_index("ix_services_business_id_type", table_name="services")
    op.drop_index("ix_services_business_id", table_name="services")
    op.drop_table("services")

    bind = op.get_bind()
    PRICE_TYPE.drop(bind, checkfirst=True)
    SERVICE_TYPE.drop(bind, checkfirst=True)
