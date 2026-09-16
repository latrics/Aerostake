export type SurveyType = 'thermal' | 'topography' | 'multispectral' | 'inspection' | string;

export interface RequestVersionCreate {
  survey_location: string;
  survey_type: SurveyType;
  target_area_sqkm?: number | null;
  requirements_payload?: Record<string, any>;
}

export interface RequestVersion {
  id: string;
  project_id: string;
  version: number;
  survey_location: string;
  survey_type: string;
  target_area_sqkm?: number | null;
  requirements_payload?: Record<string, any> | null;
  created_by?: string | null;
  created_at: string;
  project_title?: string | null;
  project_status?: string | null;
  client_email?: string | null;
  client_name?: string | null;
  client_company?: string | null;
}
