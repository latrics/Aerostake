export type ClientFilterCategory =
  | 'all'
  | 'active'
  | 'capturing'
  | 'planning'
  | 'pending_payment'
  | 'issues';

export interface ClientProjectSummary {
  id: string;
  title: string;
  status: 'planning' | 'approved' | 'active' | 'completed' | 'draft';
  sectors_count: number;
  completed_sectors_count: number;
  landings: number;
  target_area_sqkm?: number;
  location?: string;
}

export interface ClientCompany {
  id: string;
  name: string;
  active_since: string; // e.g. "Active since Sep 2026"
  category: 'active' | 'capturing' | 'planning' | 'pending_payment' | 'issues';
  projects_count: number;
  landings_count: number;
  landings_max: number; // default 1000 for gauge
  projects_completed: string; // e.g. "0/2"
  sectors_count: number;
  finished_sectors: string; // e.g. "0/0"
  pending_payment: number;
  pending_payment_formatted: string; // e.g. "₹0.0L"
  issues_count: string; // e.g. "1"
  rating: number; // e.g. 4.8
  last_activity: string; // e.g. "Just now"
  remarks: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  projects?: ClientProjectSummary[];
  is_database_client?: boolean;
  tenure_days_left?: number;
  tenure_total_days?: number;
  requests_count?: number;
  converted_requests_count?: number;
  requests_converted?: string;
}

export interface ClientKPIStats {
  total_companies: number;
  completed_projects: number;
  total_projects: number;
  total_landings: number;
  total_sectors: number;
  pending_payments_formatted: string;
  pending_payments_amount?: number;
  open_issues: number;
  total_requests?: number;
  converted_requests?: number;
}

export interface ClientFilterCounts {
  all: number;
  active: number;
  capturing: number;
  planning: number;
  pending_payment: number;
  issues: number;
}

export interface ClientsOverviewResponse {
  companies: ClientCompany[];
  stats: ClientKPIStats;
  counts: ClientFilterCounts;
}
