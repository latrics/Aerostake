"""create_sectors_and_allocations_tables

Revision ID: 7284f0f76754
Revises: 8f33be3d97a1
Create Date: 2026-08-27 18:45:16.229623

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7284f0f76754'
down_revision: Union[str, Sequence[str], None] = '8f33be3d97a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sector_status_enum
    sector_status_enum = postgresql.ENUM(
        'pending', 'in_progress', 'surveyed', 'flagged', 'verified',
        name='sector_status_enum',
        create_type=True
    )
    sector_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create allocation_status_enum
    allocation_status_enum = postgresql.ENUM(
        'assigned', 'accepted', 'in_flight', 'completed', 'reassigned',
        name='allocation_status_enum',
        create_type=True
    )
    allocation_status_enum.create(op.get_bind(), checkfirst=True)

    # 3. Create sectors table
    op.create_table(
        'sectors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('operational_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sector_code', sa.String(length=50), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM('pending', 'in_progress', 'surveyed', 'flagged', 'verified', name='sector_status_enum', create_type=False),
            nullable=False,
            server_default='pending'
        ),
        sa.Column('polygon_coordinates', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('target_area_sqkm', sa.Float(), nullable=True),
        sa.Column('estimated_flight_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_sectors_id'), 'sectors', ['id'], unique=False)
    op.create_index(op.f('ix_sectors_project_id'), 'sectors', ['project_id'], unique=False)
    op.create_index(op.f('ix_sectors_plan_id'), 'sectors', ['plan_id'], unique=False)
    op.create_index(op.f('ix_sectors_sector_code'), 'sectors', ['sector_code'], unique=False)
    op.create_index(op.f('ix_sectors_status'), 'sectors', ['status'], unique=False)

    # 4. Create sector_allocations table
    op.create_table(
        'sector_allocations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('sector_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sectors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pilot_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('drone_model', sa.String(length=100), nullable=False),
        sa.Column('drone_serial_number', sa.String(length=100), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM('assigned', 'accepted', 'in_flight', 'completed', 'reassigned', name='allocation_status_enum', create_type=False),
            nullable=False,
            server_default='assigned'
        ),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('allocated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_sector_allocations_id'), 'sector_allocations', ['id'], unique=False)
    op.create_index(op.f('ix_sector_allocations_sector_id'), 'sector_allocations', ['sector_id'], unique=False)
    op.create_index(op.f('ix_sector_allocations_project_id'), 'sector_allocations', ['project_id'], unique=False)
    op.create_index(op.f('ix_sector_allocations_pilot_id'), 'sector_allocations', ['pilot_id'], unique=False)
    op.create_index(op.f('ix_sector_allocations_status'), 'sector_allocations', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sector_allocations_status'), table_name='sector_allocations')
    op.drop_index(op.f('ix_sector_allocations_pilot_id'), table_name='sector_allocations')
    op.drop_index(op.f('ix_sector_allocations_project_id'), table_name='sector_allocations')
    op.drop_index(op.f('ix_sector_allocations_sector_id'), table_name='sector_allocations')
    op.drop_index(op.f('ix_sector_allocations_id'), table_name='sector_allocations')
    op.drop_table('sector_allocations')

    op.drop_index(op.f('ix_sectors_status'), table_name='sectors')
    op.drop_index(op.f('ix_sectors_sector_code'), table_name='sectors')
    op.drop_index(op.f('ix_sectors_plan_id'), table_name='sectors')
    op.drop_index(op.f('ix_sectors_project_id'), table_name='sectors')
    op.drop_index(op.f('ix_sectors_id'), table_name='sectors')
    op.drop_table('sectors')

    allocation_status_enum = postgresql.ENUM('assigned', 'accepted', 'in_flight', 'completed', 'reassigned', name='allocation_status_enum', create_type=False)
    allocation_status_enum.drop(op.get_bind(), checkfirst=True)

    sector_status_enum = postgresql.ENUM('pending', 'in_progress', 'surveyed', 'flagged', 'verified', name='sector_status_enum', create_type=False)
    sector_status_enum.drop(op.get_bind(), checkfirst=True)
