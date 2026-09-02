export interface TimelineEvent {
  id: string;
  project_id: string;
  category: string;
  action: string;
  message: string;
  metadata_payload?: Record<string, any> | null;
  actor_id?: string | null;
  timestamp: string;
}
