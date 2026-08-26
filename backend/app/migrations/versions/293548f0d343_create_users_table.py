"""create_users_table

Revision ID: 293548f0d343
Revises: b3e15f88cb46
Create Date: 2026-08-26 17:55:56.498007

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '293548f0d343'
down_revision: Union[str, Sequence[str], None] = 'b3e15f88cb46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    role_enum = postgresql.ENUM('client', 'admin', 'operations', 'pilot', name='role_enum', create_type=True)
    role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column(
            'role',
            postgresql.ENUM('client', 'admin', 'operations', 'pilot', name='role_enum', create_type=False),
            nullable=False,
            server_default='client'
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    
    role_enum = postgresql.ENUM('client', 'admin', 'operations', 'pilot', name='role_enum', create_type=False)
    role_enum.drop(op.get_bind(), checkfirst=True)
