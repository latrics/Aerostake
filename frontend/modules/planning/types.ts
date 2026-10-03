export enum PlanStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  APPROVED = 'approved',
  SUPERSEDED = 'superseded',
}

export interface OperationalPlan {
  id: string;
  project_id: string;
  request_version_id: string;
  status: PlanStatus;
  estimated_flight_hours: number;
  required_pilots_count: number;
  required_drones_count: number;
  estimated_cost_usd: number;
  flight_strategy_notes?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at?: string | null;
}

export interface OperationalPlanCreate {
  estimated_flight_hours: number;
  required_pilots_count: number;
  required_drones_count: number;
  estimated_cost_usd: number;
  flight_strategy_notes?: string;
}

export interface PlanRevisionRequest {
  feedback_notes: string;
}

export interface PlanningFormVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_code: string;
  sender: 'ops' | 'client' | string;
  sender_name?: string | null;
  form_data?: Record<string, any> | null;
  stage_threads?: Record<string, any> | null;
  clarification_threads?: any[] | null;
  attachments?: any[] | null;
  status?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface PlanningFormVersionCreate {
  sender?: 'ops' | 'client';
  sender_name?: string;
  form_data?: Record<string, any>;
  stage_threads?: Record<string, any>;
  clarification_threads?: any[];
  attachments?: any[];
  status?: string;
}

