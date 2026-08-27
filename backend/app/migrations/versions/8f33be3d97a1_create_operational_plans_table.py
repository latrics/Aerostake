"""create_operational_plans_table

Revision ID: 8f33be3d97a1
Revises: e027480a4d96
Create Date: 2026-08-27 16:46:29.275725

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8f33be3d97a1'
down_revision: Union[str, Sequence[str], None] = 'e027480a4d96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create plan_status_enum
    plan_status_enum = postgresql.ENUM(
        'draft', 'published', 'superseded',
        name='plan_status_enum',
        create_type=True
    )
    plan_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create operational_plans table
    op.create_table(
        'operational_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('request_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('request_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM('draft', 'published', 'superseded', name='plan_status_enum', create_type=False),
            nullable=False,
            server_default='draft'
        ),
        sa.Column('estimated_flight_hours', sa.Float(), nullable=False),
        sa.Column('required_pilots_count', sa.Integer(), nullable=False),
        sa.Column('required_drones_count', sa.Integer(), nullable=False),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=False),
        sa.Column('flight_strategy_notes', sa.Text(), nullable=True),
        sa.Column('published_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_operational_plans_id'), 'operational_plans', ['id'], unique=False)
    op.create_index(op.f('ix_operational_plans_project_id'), 'operational_plans', ['project_id'], unique=False)
    op.create_index(op.f('ix_operational_plans_request_version_id'), 'operational_plans', ['request_version_id'], unique=False)
    op.create_index(op.f('ix_operational_plans_status'), 'operational_plans', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_operational_plans_status'), table_name='operational_plans')
    op.drop_index(op.f('ix_operational_plans_request_version_id'), table_name='operational_plans')
    op.drop_index(op.f('ix_operational_plans_project_id'), table_name='operational_plans')
    op.drop_index(op.f('ix_operational_plans_id'), table_name='operational_plans')
    op.drop_table('operational_plans')

    plan_status_enum = postgresql.ENUM('draft', 'published', 'superseded', name='plan_status_enum', create_type=False)
    plan_status_enum.drop(op.get_bind(), checkfirst=True)
