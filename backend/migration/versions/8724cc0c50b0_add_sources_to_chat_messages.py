"""add sources to chat messages

Revision ID: 8724cc0c50b0
Revises: 38e1d5dabe4f
Create Date: 2026-09-04 19:22:24.093252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8724cc0c50b0'
down_revision: Union[str, None] = '38e1d5dabe4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('sources', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'sources')
