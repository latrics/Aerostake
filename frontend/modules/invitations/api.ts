import { apiClient } from '@/lib/api-client';
import { InvitationCreatePayload, InvitationOut, OrganizationInfo } from './types';

export const invitationsApi = {
  async listAllInvitations(status?: string): Promise<InvitationOut[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return await apiClient.get<InvitationOut[]>(`/invitations${query}`);
  },

  async createInvitation(payload: InvitationCreatePayload): Promise<InvitationOut> {
    return await apiClient.post<InvitationOut>('/invitations', payload);
  },

  async revokeInvitation(invitationId: string): Promise<{ status: string; message: string; user_removed?: boolean }> {
    return await apiClient.post<{ status: string; message: string; user_removed?: boolean }>(
      `/invitations/${encodeURIComponent(invitationId)}/revoke`,
      {}
    );
  },

  async verifyToken(token: string): Promise<InvitationOut> {
    return await apiClient.get<InvitationOut>(`/invitations/${encodeURIComponent(token)}`);
  },

  async listOrganizations(): Promise<OrganizationInfo[]> {
    return await apiClient.get<OrganizationInfo[]>('/organizations');
  },

  async getOrganizationInvitations(): Promise<InvitationOut[]> {
    return await apiClient.get<InvitationOut[]>('/invitations/organization-invites');
  },

  async resendOrganizationInvitation(email: string): Promise<InvitationOut> {
    return await apiClient.post<InvitationOut>('/invitations/organization-invites/resend', { email });
  },
};
