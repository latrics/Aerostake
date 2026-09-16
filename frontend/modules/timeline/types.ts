export interface TimelineEvent {
  id: string;
  project_id?: string | null;
  user_id?: string | null;
  category: string;
  action: string;
  message: string;
  event_metadata?: Record<string, any> | null;
  metadata_payload?: Record<string, any> | null;
  created_at?: string | null;
  timestamp?: string | null;
  title?: string | null;
  description?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
}
