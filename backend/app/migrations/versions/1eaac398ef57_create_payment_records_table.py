"""create_payment_records_table

Revision ID: 1eaac398ef57
Revises: 7284f0f76754
Create Date: 2026-08-27 18:52:53.228285

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1eaac398ef57'
down_revision: Union[str, Sequence[str], None] = '7284f0f76754'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create payment_status_enum
    payment_status_enum = postgresql.ENUM(
        'pending', 'verified', 'rejected',
        name='payment_status_enum',
        create_type=True
    )
    payment_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create payment_records table
    op.create_table(
        'payment_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('milestone_name', sa.String(length=150), nullable=False),
        sa.Column('amount_usd', sa.Float(), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM('pending', 'verified', 'rejected', name='payment_status_enum', create_type=False),
            nullable=False,
            server_default='pending'
        ),
        sa.Column('payment_method', sa.String(length=100), nullable=True),
        sa.Column('reference_code', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_payment_records_id'), 'payment_records', ['id'], unique=False)
    op.create_index(op.f('ix_payment_records_project_id'), 'payment_records', ['project_id'], unique=False)
    op.create_index(op.f('ix_payment_records_reference_code'), 'payment_records', ['reference_code'], unique=False)
    op.create_index(op.f('ix_payment_records_status'), 'payment_records', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payment_records_status'), table_name='payment_records')
    op.drop_index(op.f('ix_payment_records_reference_code'), table_name='payment_records')
    op.drop_index(op.f('ix_payment_records_project_id'), table_name='payment_records')
    op.drop_index(op.f('ix_payment_records_id'), table_name='payment_records')
    op.drop_table('payment_records')

    payment_status_enum = postgresql.ENUM('pending', 'verified', 'rejected', name='payment_status_enum', create_type=False)
    payment_status_enum.drop(op.get_bind(), checkfirst=True)
