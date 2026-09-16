"""add_company_profile_to_users

Revision ID: c7d8e9f0a1b2
Revises: e1f2a3b4c5d6
Create Date: 2026-09-09 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch/direct alter table to safely add column if not exists
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('users')]
    if 'company_profile' not in columns:
        op.add_column(
            'users',
            sa.Column('company_profile', sa.JSON(), nullable=True)
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('users')]
    if 'company_profile' in columns:
        op.drop_column('users', 'company_profile')
