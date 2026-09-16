"""add_profile_fields_to_users

Revision ID: a6b7c8d9e0f1
Revises: f5a89d10e201
Create Date: 2026-09-02 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6b7c8d9e0f1'
down_revision: Union[str, Sequence[str], None] = 'f5a89d10e201'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('full_name', sa.String(length=255), nullable=True)
    )
    op.add_column(
        'users',
        sa.Column('company_name', sa.String(length=255), nullable=True)
    )
    op.add_column(
        'users',
        sa.Column('phone_number', sa.String(length=50), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'company_name')
    op.drop_column('users', 'full_name')
