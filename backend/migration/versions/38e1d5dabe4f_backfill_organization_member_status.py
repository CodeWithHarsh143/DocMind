"""backfill organization member status

Revision ID: 38e1d5dabe4f
Revises: 033b7cb1ba0f
Create Date: 2026-09-04 19:00:37.271592

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38e1d5dabe4f'
down_revision: Union[str, None] = '033b7cb1ba0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill memberships created before the status column existed.
    # NULL means "has always been a member", so default them to active.
    op.execute("UPDATE organization_members SET status = 'active' WHERE status IS NULL")
    op.alter_column(
        "organization_members",
        "status",
        existing_type=sa.String(),
        nullable=False,
        server_default="active",
    )


def downgrade() -> None:
    op.alter_column(
        "organization_members",
        "status",
        existing_type=sa.String(),
        nullable=True,
        server_default=None,
    )
