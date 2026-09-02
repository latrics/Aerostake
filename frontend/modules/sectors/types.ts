export enum SectorStatus {
  PENDING = 'pending',
  ALLOCATED = 'allocated',
  IN_PROGRESS = 'in_progress',
  SURVEYED = 'surveyed',
  COMPLETED = 'completed',
  FLAGGED = 'flagged',
}

export interface Sector {
  id: string;
  project_id: string;
  plan_id: string;
  sector_code: string;
  status: SectorStatus;
  polygon_coordinates?: Record<string, any> | null;
  target_area_sqkm?: number | null;
  estimated_flight_minutes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  status: SectorStatus;
}
