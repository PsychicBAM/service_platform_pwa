"""Add conversations and inbox messages.

Revision ID: 0024
Revises: 0023
Create Date: 2026-07-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0024"
down_revision: str | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONVERSATION_STATUS = postgresql.ENUM(
    "open", "archived", name="conversation_status", create_type=False
)
CONVERSATION_CONTEXT_TYPE = postgresql.ENUM(
    "general", "booking", "order", "request",
    name="conversation_context_type",
    create_type=False,
)
INBOX_MESSAGE_SENDER_TYPE = postgresql.ENUM(
    "business", "client", "system",
    name="inbox_message_sender_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    CONVERSATION_STATUS.create(bind, checkfirst=True)
    CONVERSATION_CONTEXT_TYPE.create(bind, checkfirst=True)
    INBOX_MESSAGE_SENDER_TYPE.create(bind, checkfirst=True)

    op.create_table(
        "conversations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.UUID(), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column(
            "context_type",
            CONVERSATION_CONTEXT_TYPE,
            nullable=False,
            server_default="general",
        ),
        sa.Column("context_id", sa.UUID(), nullable=True),
        sa.Column(
            "status", CONVERSATION_STATUS, nullable=False, server_default="open"
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message_preview", sa.String(length=500), nullable=True),
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
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "business_id",
            "client_id",
            "context_type",
            name="uq_conversations_business_client_context",
        ),
    )
    op.create_index("ix_conversations_business_id", "conversations", ["business_id"])
    op.create_index("ix_conversations_client_id", "conversations", ["client_id"])
    op.create_index(
        "ix_conversations_last_message_at", "conversations", ["last_message_at"]
    )

    op.create_table(
        "inbox_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("sender_type", INBOX_MESSAGE_SENDER_TYPE, nullable=False),
        sa.Column("sender_user_id", sa.UUID(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inbox_messages_conversation_id_created_at",
        "inbox_messages",
        ["conversation_id", "created_at"],
    )
    op.create_index(
        "ix_inbox_messages_business_id_created_at",
        "inbox_messages",
        ["business_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_inbox_messages_business_id_created_at", table_name="inbox_messages"
    )
    op.drop_index(
        "ix_inbox_messages_conversation_id_created_at", table_name="inbox_messages"
    )
    op.drop_table("inbox_messages")
    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_index("ix_conversations_client_id", table_name="conversations")
    op.drop_index("ix_conversations_business_id", table_name="conversations")
    op.drop_table("conversations")

    bind = op.get_bind()
    INBOX_MESSAGE_SENDER_TYPE.drop(bind, checkfirst=True)
    CONVERSATION_CONTEXT_TYPE.drop(bind, checkfirst=True)
    CONVERSATION_STATUS.drop(bind, checkfirst=True)
