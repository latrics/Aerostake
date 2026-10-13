export enum SectorStatus {
  PENDING = 'pending',
  ALLOCATED = 'allocated',
  IN_PROGRESS = 'in_progress',
  SURVEYED = 'surveyed',
  COMPLETED = 'completed',
  FLAGGED = 'flagged',
}

export interface SectorPlanningData {
  sector_name?: string;
  target_area_sqkm?: number;
  planned_sorties?: number;
  scanning_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  assigned_pilot?: string;
  assigned_pilot_id?: string;
  pilot_email?: string;
  pilot_phone?: string;
  is_pending_invite?: boolean;
  assigned_pilots?: any[];
  assigned_drone?: string;
  priority?: string;
  terrain_note?: string;
  planning_remarks?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface SectorDailyLog {
  id: string;
  timestamp: string;
  date: string;
  landings_today: number;
  flight_start_time?: string;
  flight_end_time?: string;
  area_covered_today?: number;
  sector_status?: string;
  weather_condition?: string;
  remarks?: string;
  logged_by?: string;
  logged_by_role?: string;
}

export interface SectorDailyLogCreate {
  date?: string;
  landings_today: number;
  flight_start_time?: string;
  flight_end_time?: string;
  area_covered_today?: number;
  sector_status?: string;
  weather_condition?: string;
  remarks?: string;
}

export interface Sector {
  id: string;
  project_id: string;
  plan_id: string;
  sector_code: string;
  name?: string;
  status: SectorStatus | string;
  polygon_coordinates?: Record<string, any> | null;
  target_area_sqkm?: number | null;
  estimated_flight_minutes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  planning?: SectorPlanningData;
  flight_logs?: SectorDailyLog[];
  progress_percent?: number;
  area_completed?: number;
}

export interface SectorCreate {
  sector_code: string;
  polygon_coordinates?: Record<string, any>;
  target_area_sqkm?: number;
  estimated_flight_minutes?: number;
}

export interface SectorBatchCreate {
  plan_id: string;
  sectors: SectorCreate[];
}

export interface SectorStatusUpdate {
  status: SectorStatus | string;
}

export interface BatchAssignPilotsPayload {
  sector_ids: string[];
  pilot_name?: string;
  pilot_id?: string;
  pilot_email?: string;
  pilot_phone?: string;
  is_pending_invite?: boolean;
  scanning_date?: string;
  sector_scanning_dates?: Record<string, string>;
}

export interface BatchScheduleDatesPayload {
  sector_ids: string[];
  scanning_date?: string;
  sector_scanning_dates?: Record<string, string>;
}

