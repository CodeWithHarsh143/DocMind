"""add chat sessions/messages and sync user/org/member columns

Revision ID: 35e28ce04d69
Revises: aef1307a8ae0
Create Date: 2026-09-03 22:29:39.152254

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35e28ce04d69'
down_revision: Union[str, None] = 'aef1307a8ae0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- user / organization / member column sync (previously applied via create_all) ---
    op.add_column('organization_members', sa.Column('joined_at', sa.DateTime(), nullable=True))
    op.drop_column('organization_members', 'description')
    op.add_column('organizations', sa.Column('description', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('logo_url', sa.String(), nullable=True))
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=True)

    # --- chat tables ---
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['workspace_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_chat_sessions_id'), 'chat_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_chat_sessions_workspace_id'), 'chat_sessions', ['workspace_id'], unique=False)
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_chat_messages_id'), 'chat_messages', ['id'], unique=False)
    op.create_index(op.f('ix_chat_messages_session_id'), 'chat_messages', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_messages_session_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_chat_sessions_workspace_id'), table_name='chat_sessions')
    op.drop_index(op.f('ix_chat_sessions_id'), table_name='chat_sessions')
    op.drop_table('chat_sessions')
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_column('organizations', 'logo_url')
    op.drop_column('organizations', 'description')
    op.add_column('organization_members', sa.Column('description', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('organization_members', 'joined_at')
