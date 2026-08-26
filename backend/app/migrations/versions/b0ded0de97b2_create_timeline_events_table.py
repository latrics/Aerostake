"""create_timeline_events_table

Revision ID: b0ded0de97b2
Revises: 293548f0d343
Create Date: 2026-08-26 18:46:56.072039

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b0ded0de97b2'
down_revision: Union[str, Sequence[str], None] = '293548f0d343'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'timeline_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('event_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_timeline_events_id'), 'timeline_events', ['id'], unique=False)
    op.create_index(op.f('ix_timeline_events_project_id'), 'timeline_events', ['project_id'], unique=False)
    op.create_index(op.f('ix_timeline_events_user_id'), 'timeline_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_timeline_events_category'), 'timeline_events', ['category'], unique=False)
    op.create_index(op.f('ix_timeline_events_created_at'), 'timeline_events', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_timeline_events_created_at'), table_name='timeline_events')
    op.drop_index(op.f('ix_timeline_events_category'), table_name='timeline_events')
    op.drop_index(op.f('ix_timeline_events_user_id'), table_name='timeline_events')
    op.drop_index(op.f('ix_timeline_events_project_id'), table_name='timeline_events')
    op.drop_index(op.f('ix_timeline_events_id'), table_name='timeline_events')
    op.drop_table('timeline_events')
