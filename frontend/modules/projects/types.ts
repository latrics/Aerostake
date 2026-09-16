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
  status?: ProjectStatus;
  is_draft?: boolean;
  survey_location?: string;
  survey_type?: string;
  target_area_sqkm?: number;
  requirements_payload?: Record<string, any>;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  requirements_payload?: Record<string, any>;
  survey_location?: string;
  survey_type?: string;
  target_area_sqkm?: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  client_id: string;
  organization_id?: string | null;
  created_by?: string | null;
  status: ProjectStatus;
  survey_location?: string | null;
  city?: string | null;
  state?: string | null;
  payload?: string | null;
  survey_type?: string | null;
  target_area_sqkm?: number | null;
  requirements_payload?: Record<string, any> | null;
  latest_request?: any | null;
  client_email?: string | null;
  client_name?: string | null;
  client_company?: string | null;
  creator_name?: string | null;
  creator_role?: string | null;
  creator_email?: string | null;
  sectors_count?: number;
  completed_sectors_count?: number;
  progress_pct?: number;
  overall_progress_pct?: number;
  created_at: string;
  updated_at?: string | null;
}
