export enum AllocationStatusEnum {
  ASSIGNED = 'assigned',
  IN_FLIGHT = 'in_flight',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
}

export interface SectorAllocation {
  id: string;
  sector_id: string;
  pilot_id: string;
  drone_identifier: string;
  status: AllocationStatusEnum;
  assigned_at: string;
  flight_started_at: string | null;
  flight_completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllocationCreate {
  pilot_id: string;
  drone_identifier: string;
  notes?: string;
}

export interface AllocationStatusUpdate {
  status: AllocationStatusEnum;
  notes?: string;
}
