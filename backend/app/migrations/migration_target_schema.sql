-- ============================================================================
-- AEROSTAKE: Target Schema Alignment Migration
-- Description: Closes all schema discrepancies identified during schema audit.
-- ============================================================================

BEGIN;

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_organizations_id ON organizations(id);
CREATE INDEX IF NOT EXISTS ix_organizations_name ON organizations(name);

-- 2. Update role_enum values
ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'client_primary';
ALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'client_sub';

-- 3. Create invitation_status_enum
DO $$ BEGIN
    CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Alter users table with organization_id and invited_by foreign keys
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS ix_users_invited_by ON users(invited_by);

-- 5. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role role_enum NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status invitation_status_enum NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_invitations_id ON invitations(id);
CREATE INDEX IF NOT EXISTS ix_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS ix_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS ix_invitations_status ON invitations(status);

-- 6. Alter projects table with organization_id and created_by foreign keys
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ix_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS ix_projects_created_by ON projects(created_by);

-- 7. Create project_status_history table for full lifecycle audit
CREATE TABLE IF NOT EXISTS project_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_status project_status_enum,
    to_status project_status_enum NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_project_status_history_id ON project_status_history(id);
CREATE INDEX IF NOT EXISTS ix_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS ix_project_status_history_to_status ON project_status_history(to_status);

-- 8. Add foreign key constraints to timeline_events
DO $$ BEGIN
    ALTER TABLE timeline_events 
    ADD CONSTRAINT fk_timeline_events_project_id 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE timeline_events 
    ADD CONSTRAINT fk_timeline_events_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMIT;
