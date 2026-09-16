export interface InvitationCreatePayload {
  email: string;
  role: string;
  company_name?: string;
  organization_id?: string;
}

export interface InvitationOut {
  id: string;
  email: string;
  role: string;
  organization_id?: string | null;
  token: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  subordinate_count: number;
  max_subordinates: number;
  created_at?: string;
}
