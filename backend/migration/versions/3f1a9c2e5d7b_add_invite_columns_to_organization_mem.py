"""add invite columns to organization_members

Revision ID: 3f1a9c2e5d7b
Revises: 8724cc0c50b0
Create Date: 2026-09-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f1a9c2e5d7b'
down_revision: Union[str, None] = '8724cc0c50b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'organization_members', sa.Column('invite_token', sa.String(), unique=True, nullable=True)
    )
    op.add_column(
        'organization_members', sa.Column('invited_by', sa.Integer(), nullable=True)
    )
    op.add_column(
        'organization_members', sa.Column('invited_at', sa.DateTime(), nullable=True)
    )
    op.create_foreign_key(
        'fk_organization_members_invited_by', 'organization_members', 'users', ['invited_by'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_organization_members_invited_by', 'organization_members', type_='foreignkey')
    op.drop_column('organization_members', 'invited_at')
    op.drop_column('organization_members', 'invited_by')
    op.drop_column('organization_members', 'invite_token')