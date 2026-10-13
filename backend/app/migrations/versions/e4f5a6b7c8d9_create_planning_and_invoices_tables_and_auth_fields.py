"""create_planning_and_invoices_tables_and_auth_fields

Revision ID: e4f5a6b7c8d9
Revises: c7d8e9f0a1b2
Create Date: 2026-10-13 16:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = insp.get_table_names()

    # 1. Create planning_form_versions table if not exists
    if 'planning_form_versions' not in existing_tables:
        op.create_table(
            'planning_form_versions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
            sa.Column('version_number', sa.Integer(), nullable=False),
            sa.Column('version_code', sa.String(length=100), nullable=False),
            sa.Column('sender', sa.String(length=20), nullable=False, server_default='ops'),
            sa.Column('sender_name', sa.String(length=255), nullable=True),
            sa.Column('form_data', sa.JSON(), nullable=True),
            sa.Column('stage_threads', sa.JSON(), nullable=True),
            sa.Column('clarification_threads', sa.JSON(), nullable=True),
            sa.Column('attachments', sa.JSON(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=True, server_default='under_review'),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_planning_form_versions_id'), 'planning_form_versions', ['id'], unique=False)
        op.create_index(op.f('ix_planning_form_versions_project_id'), 'planning_form_versions', ['project_id'], unique=False)
        op.create_index(op.f('ix_planning_form_versions_version_number'), 'planning_form_versions', ['version_number'], unique=False)
        op.create_index(op.f('ix_planning_form_versions_version_code'), 'planning_form_versions', ['version_code'], unique=False)

    # 2. Create planning_drafts table if not exists
    if 'planning_drafts' not in existing_tables:
        op.create_table(
            'planning_drafts',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('form_data', sa.JSON(), nullable=True),
            sa.Column('stage_threads', sa.JSON(), nullable=True),
            sa.Column('clarification_threads', sa.JSON(), nullable=True),
            sa.Column('stage_draft_saved', sa.JSON(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=True, server_default='under_review'),
            sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_planning_drafts_id'), 'planning_drafts', ['id'], unique=False)
        op.create_index(op.f('ix_planning_drafts_project_id'), 'planning_drafts', ['project_id'], unique=True)

    # 3. Create invoices table if not exists
    if 'invoices' not in existing_tables:
        op.create_table(
            'invoices',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('invoice_number', sa.String(length=60), nullable=False, unique=True),
            sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
            sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('sector_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sectors.id', ondelete='SET NULL'), nullable=True),
            sa.Column('sector_code', sa.String(length=50), nullable=True),
            sa.Column('title', sa.String(length=200), nullable=False, server_default='Project Service Bill'),
            sa.Column('bill_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('items', sa.JSON(), nullable=False),
            sa.Column('subtotal_amount', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('total_amount', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='issued'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
        op.create_index(op.f('ix_invoices_invoice_number'), 'invoices', ['invoice_number'], unique=True)
        op.create_index(op.f('ix_invoices_project_id'), 'invoices', ['project_id'], unique=False)
        op.create_index(op.f('ix_invoices_client_id'), 'invoices', ['client_id'], unique=False)
        op.create_index(op.f('ix_invoices_sector_id'), 'invoices', ['sector_id'], unique=False)
        op.create_index(op.f('ix_invoices_sector_code'), 'invoices', ['sector_code'], unique=False)
        op.create_index(op.f('ix_invoices_status'), 'invoices', ['status'], unique=False)

    # 4. User model auth decoupling fields
    user_columns = [c['name'] for c in insp.get_columns('users')]
    if 'auth_provider' not in user_columns:
        op.add_column('users', sa.Column('auth_provider', sa.String(length=50), nullable=False, server_default='local'))
    if 'external_auth_id' not in user_columns:
        op.add_column('users', sa.Column('external_auth_id', sa.String(length=255), nullable=True))
        op.create_index(op.f('ix_users_external_auth_id'), 'users', ['external_auth_id'], unique=True)

    # Alter hashed_password to nullable for external auth provider flexibility
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = insp.get_table_names()

    # Revert user auth fields
    user_columns = [c['name'] for c in insp.get_columns('users')]
    if 'external_auth_id' in user_columns:
        op.drop_index(op.f('ix_users_external_auth_id'), table_name='users')
        op.drop_column('users', 'external_auth_id')
    if 'auth_provider' in user_columns:
        op.drop_column('users', 'auth_provider')

    # Drop invoices
    if 'invoices' in existing_tables:
        op.drop_table('invoices')

    # Drop planning_drafts
    if 'planning_drafts' in existing_tables:
        op.drop_table('planning_drafts')

    # Drop planning_form_versions
    if 'planning_form_versions' in existing_tables:
        op.drop_table('planning_form_versions')
