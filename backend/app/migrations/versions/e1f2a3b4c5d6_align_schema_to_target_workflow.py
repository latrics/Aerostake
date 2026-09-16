"""align_schema_to_target_workflow

Revision ID: e1f2a3b4c5d6
Revises: a6b7c8d9e0f1
Create Date: 2026-09-07 11:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'a6b7c8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=True)

    # 2. Update role_enum values with client_primary and client_sub
    op.execute("ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'client_primary'")
    op.execute("ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'client_sub'")

    # 3. Create invitation_status_enum
    invitation_status_enum = postgresql.ENUM('pending', 'accepted', 'expired', 'revoked', name='invitation_status_enum')
    invitation_status_enum.create(op.get_bind(), checkfirst=True)

    # 4. Alter users table to add organization_id and invited_by
    op.add_column('users', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_users_organization_id', 'users', 'organizations', ['organization_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)

    op.add_column('users', sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_users_invited_by', 'users', 'users', ['invited_by'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_users_invited_by'), 'users', ['invited_by'], unique=False)

    # 5. Create invitations table
    op.create_table(
        'invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', postgresql.ENUM('admin', 'operations', 'pilot', 'client_primary', 'client_sub', 'client', name='role_enum', create_type=False), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'accepted', 'expired', 'revoked', name='invitation_status_enum', create_type=False), server_default='pending', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_invitations_id'), 'invitations', ['id'], unique=False)
    op.create_index(op.f('ix_invitations_email'), 'invitations', ['email'], unique=False)
    op.create_index(op.f('ix_invitations_token'), 'invitations', ['token'], unique=True)
    op.create_index(op.f('ix_invitations_status'), 'invitations', ['status'], unique=False)

    # 6. Alter projects table
    op.add_column('projects', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('projects', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_projects_organization_id', 'projects', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_projects_created_by', 'projects', 'users', ['created_by'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_projects_organization_id'), 'projects', ['organization_id'], unique=False)
    op.create_index(op.f('ix_projects_created_by'), 'projects', ['created_by'], unique=False)

    # 7. Create project_status_history table
    op.create_table(
        'project_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_status', postgresql.ENUM('draft', 'submitted', 'planning', 'approved', 'active', 'completed', 'cancelled', name='project_status_enum', create_type=False), nullable=True),
        sa.Column('to_status', postgresql.ENUM('draft', 'submitted', 'planning', 'approved', 'active', 'completed', 'cancelled', name='project_status_enum', create_type=False), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_project_status_history_id'), 'project_status_history', ['id'], unique=False)
    op.create_index(op.f('ix_project_status_history_project_id'), 'project_status_history', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_status_history_to_status'), 'project_status_history', ['to_status'], unique=False)

    # 8. Add foreign key constraints to timeline_events
    op.create_foreign_key('fk_timeline_events_project_id', 'timeline_events', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_timeline_events_user_id', 'timeline_events', 'users', ['user_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_timeline_events_user_id', 'timeline_events', type_='foreignkey')
    op.drop_constraint('fk_timeline_events_project_id', 'timeline_events', type_='foreignkey')
    op.drop_table('project_status_history')
    op.drop_constraint('fk_projects_created_by', 'projects', type_='foreignkey')
    op.drop_constraint('fk_projects_organization_id', 'projects', type_='foreignkey')
    op.drop_column('projects', 'created_by')
    op.drop_column('projects', 'organization_id')
    op.drop_table('invitations')
    op.drop_constraint('fk_users_invited_by', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_organization_id', 'users', type_='foreignkey')
    op.drop_column('users', 'invited_by')
    op.drop_column('users', 'organization_id')
    op.execute("DROP TYPE IF EXISTS invitation_status_enum")
    op.drop_table('organizations')
