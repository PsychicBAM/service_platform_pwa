"""legal_consent_records table

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-03

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "legal_consent_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "legal_consent_version",
            sa.String(length=100),
            nullable=False,
            server_default="draft-placeholder-v1",
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_legal_consent_records_business_id",
        "legal_consent_records",
        ["business_id"],
    )
    op.create_index(
        "ix_legal_consent_records_user_id",
        "legal_consent_records",
        ["user_id"],
    )
    op.create_index(
        "ix_legal_consent_records_client_id",
        "legal_consent_records",
        ["client_id"],
    )
    op.create_index(
        "ix_legal_consent_records_source",
        "legal_consent_records",
        ["source"],
    )
    op.create_index(
        "ix_legal_consent_records_entity_type_entity_id",
        "legal_consent_records",
        ["entity_type", "entity_id"],
    )
    op.create_index(
        "ix_legal_consent_records_accepted_at",
        "legal_consent_records",
        ["accepted_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_legal_consent_records_accepted_at",
        table_name="legal_consent_records",
    )
    op.drop_index(
        "ix_legal_consent_records_entity_type_entity_id",
        table_name="legal_consent_records",
    )
    op.drop_index(
        "ix_legal_consent_records_source",
        table_name="legal_consent_records",
    )
    op.drop_index(
        "ix_legal_consent_records_client_id",
        table_name="legal_consent_records",
    )
    op.drop_index(
        "ix_legal_consent_records_user_id",
        table_name="legal_consent_records",
    )
    op.drop_index(
        "ix_legal_consent_records_business_id",
        table_name="legal_consent_records",
    )
    op.drop_table("legal_consent_records")
