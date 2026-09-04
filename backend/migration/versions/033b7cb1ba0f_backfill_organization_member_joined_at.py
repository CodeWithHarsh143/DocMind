"""backfill organization member joined_at

Revision ID: 033b7cb1ba0f
Revises: 55ea64c4127b
Create Date: 2026-09-04 17:47:00.028777

"""
import textwrap
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '033b7cb1ba0f'
down_revision: Union[str, None] = '55ea64c4127b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill NULL joined_at for memberships created before the column existed.
    # Use the owning organization's creation time when available, otherwise now().
    op.execute(
        textwrap.dedent(
            """
            UPDATE organization_members AS om
            SET joined_at = COALESCE(
                (SELECT o.created_at FROM organizations o WHERE o.id = om.organization_id),
                now()
            )
            WHERE om.joined_at IS NULL
            """
        )
    )
    # Guard against future NULLs at the database level and enforce not-null.
    op.alter_column(
        "organization_members",
        "joined_at",
        existing_type=sa.DateTime(),
        nullable=False,
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    op.alter_column(
        "organization_members",
        "joined_at",
        existing_type=sa.DateTime(),
        nullable=True,
        server_default=None,
    )
