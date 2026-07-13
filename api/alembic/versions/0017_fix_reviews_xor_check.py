"""Fix reviews booking/order XOR check

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-14

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_reviews_booking_xor_order", "reviews", type_="check")
    op.create_check_constraint(
        "ck_reviews_booking_xor_order",
        "reviews",
        "(booking_id IS NOT NULL AND order_id IS NULL) OR (booking_id IS NULL AND order_id IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_reviews_booking_xor_order", "reviews", type_="check")
    op.create_check_constraint(
        "ck_reviews_booking_xor_order",
        "reviews",
        "(booking_id IS NOT NULL) <> (order_id IS NOT NULL)",
    )

