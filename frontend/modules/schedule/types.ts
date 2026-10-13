export interface AssignedSectorMission {
  id: string;
  project_id: string;
  project_title: string;
  project_code: string;
  survey_location: string;
  client_name?: string;
  sector_code: string;
  status: string;
  target_area_sqkm?: number | null;
  estimated_flight_minutes?: number | null;
  polygon_coordinates?: any;
  planning?: any;
  scanning_date?: string | null;
  assigned_pilot?: string | null;
  assigned_pilot_id?: string | null;
  pilot_email?: string | null;
}

export type TimeframeFilter = 'this_month' | 'this_week' | 'today' | 'upcoming' | 'all';
export type StatusFilter = 'all' | 'scheduled' | 'in_progress' | 'completed';
export type ViewMode = 'calendar' | 'list';

export interface CalendarDayCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  missions: AssignedSectorMission[];
}
