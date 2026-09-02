"""add_device_token_to_users

Revision ID: f5a89d10e201
Revises: 1eaac398ef57
Create Date: 2026-09-01 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a89d10e201'
down_revision: Union[str, Sequence[str], None] = '1eaac398ef57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('device_token', sa.String(length=512), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('users', 'device_token')
