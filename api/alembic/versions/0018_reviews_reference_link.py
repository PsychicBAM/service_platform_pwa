"""Add booking/order reference fields to reviews

Revision ID: 0018
Revises: 0017
Create Date: 2026-07-14

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("booking_reference", sa.String(length=20), nullable=True))
    op.add_column("reviews", sa.Column("order_reference", sa.String(length=20), nullable=True))

    op.drop_constraint("ck_reviews_booking_xor_order", "reviews", type_="check")
    # Defensive cleanup: older buggy rows could exist with neither link set.
    op.execute("DELETE FROM reviews WHERE booking_reference IS NULL AND order_reference IS NULL")
    op.create_check_constraint(
        "ck_reviews_booking_xor_order",
        "reviews",
        "(booking_reference IS NOT NULL AND order_reference IS NULL) OR (booking_reference IS NULL AND order_reference IS NOT NULL)",
    )

    op.create_index(
        "uq_reviews_business_booking_reference",
        "reviews",
        ["business_id", "booking_reference"],
        unique=True,
        postgresql_where=sa.text("booking_reference IS NOT NULL"),
    )
    op.create_index(
        "uq_reviews_business_order_reference",
        "reviews",
        ["business_id", "order_reference"],
        unique=True,
        postgresql_where=sa.text("order_reference IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_reviews_business_order_reference", table_name="reviews")
    op.drop_index("uq_reviews_business_booking_reference", table_name="reviews")
    op.drop_constraint("ck_reviews_booking_xor_order", "reviews", type_="check")
    op.create_check_constraint(
        "ck_reviews_booking_xor_order",
        "reviews",
        "(booking_id IS NOT NULL AND order_id IS NULL) OR (booking_id IS NULL AND order_id IS NOT NULL)",
    )
    op.drop_column("reviews", "order_reference")
    op.drop_column("reviews", "booking_reference")

