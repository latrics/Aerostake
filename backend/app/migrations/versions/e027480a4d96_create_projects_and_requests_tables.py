"""create_projects_and_requests_tables

Revision ID: e027480a4d96
Revises: b0ded0de97b2
Create Date: 2026-08-27 15:48:35.518501

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e027480a4d96'
down_revision: Union[str, Sequence[str], None] = 'b0ded0de97b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create project_status_enum
    project_status_enum = postgresql.ENUM(
        'draft', 'submitted', 'planning', 'approved', 'active', 'completed', 'cancelled',
        name='project_status_enum',
        create_type=True
    )
    project_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM('draft', 'submitted', 'planning', 'approved', 'active', 'completed', 'cancelled', name='project_status_enum', create_type=False),
            nullable=False,
            server_default='draft'
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_client_id'), 'projects', ['client_id'], unique=False)
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False)

    # 3. Create request_versions table
    op.create_table(
        'request_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('survey_location', sa.String(length=255), nullable=False),
        sa.Column('survey_type', sa.String(length=100), nullable=False),
        sa.Column('target_area_sqkm', sa.Float(), nullable=True),
        sa.Column('requirements_payload', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_request_versions_id'), 'request_versions', ['id'], unique=False)
    op.create_index(op.f('ix_request_versions_project_id'), 'request_versions', ['project_id'], unique=False)
    op.create_index(op.f('ix_request_versions_version'), 'request_versions', ['version'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_request_versions_version'), table_name='request_versions')
    op.drop_index(op.f('ix_request_versions_project_id'), table_name='request_versions')
    op.drop_index(op.f('ix_request_versions_id'), table_name='request_versions')
    op.drop_table('request_versions')

    op.drop_index(op.f('ix_projects_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_client_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')

    project_status_enum = postgresql.ENUM('draft', 'submitted', 'planning', 'approved', 'active', 'completed', 'cancelled', name='project_status_enum', create_type=False)
    project_status_enum.drop(op.get_bind(), checkfirst=True)
