"""Add reviews foundation

Revision ID: 0016
Revises: 0015
Create Date: 2026-07-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


REVIEW_STATUS = postgresql.ENUM(
    "published",
    "hidden",
    name="review_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    REVIEW_STATUS.create(bind, checkfirst=True)

    op.create_table(
        "reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=True),
        sa.Column("booking_id", sa.UUID(), nullable=True),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "status",
            REVIEW_STATUS,
            nullable=False,
            server_default="published",
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
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id", name="uq_reviews_booking_id"),
        sa.UniqueConstraint("order_id", name="uq_reviews_order_id"),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        sa.CheckConstraint(
            "(booking_id IS NOT NULL) <> (order_id IS NOT NULL)",
            name="ck_reviews_booking_xor_order",
        ),
    )

    op.create_index("ix_reviews_business_id", "reviews", ["business_id"])
    op.create_index("ix_reviews_business_id_status", "reviews", ["business_id", "status"])
    op.create_index("ix_reviews_business_id_created_at", "reviews", ["business_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_reviews_business_id_created_at", table_name="reviews")
    op.drop_index("ix_reviews_business_id_status", table_name="reviews")
    op.drop_index("ix_reviews_business_id", table_name="reviews")
    op.drop_table("reviews")
    op.execute("DROP TYPE IF EXISTS review_status")

