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
