import { apiClient } from '@/lib/api-client';
import { InvitationCreatePayload, InvitationOut, OrganizationInfo } from './types';

export const invitationsApi = {
  async createInvitation(payload: InvitationCreatePayload): Promise<InvitationOut> {
    return await apiClient.post<InvitationOut>('/invitations', payload);
  },

  async verifyToken(token: string): Promise<InvitationOut> {
    return await apiClient.get<InvitationOut>(`/invitations/${encodeURIComponent(token)}`);
  },

  async listOrganizations(): Promise<OrganizationInfo[]> {
    return await apiClient.get<OrganizationInfo[]>('/organizations');
  },
};
