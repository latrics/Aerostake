export enum ProjectStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PLANNING = 'planning',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ProjectCreate {
  title: string;
  description?: string;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  client_id: string;
  status: ProjectStatus;
  created_at: string;
  updated_at?: string | null;
}
