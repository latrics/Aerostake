import { apiClient } from '@/lib/api-client';
import { UserProfile, UserProfileUpdate, UserCreatePayload, ChangePasswordPayload } from './types';

export const usersApi = {
  async listUsers(role?: string): Promise<UserProfile[]> {
    const url = role ? `/users?role=${encodeURIComponent(role)}` : '/users';
    return await apiClient.get<UserProfile[]>(url);
  },

  async createUser(payload: UserCreatePayload): Promise<UserProfile> {
    return await apiClient.post<UserProfile>('/users', payload);
  },

  async getMe(): Promise<UserProfile> {
    return await apiClient.get<UserProfile>('/users/me');
  },

  async updateProfile(payload: UserProfileUpdate): Promise<UserProfile> {
    return await apiClient.patch<UserProfile>('/users/me', payload);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ status: string; message: string }> {
    return await apiClient.post<{ status: string; message: string }>('/users/me/change-password', payload);
  },

  async getOrganizationMembers(): Promise<UserProfile[]> {
    return await apiClient.get<UserProfile[]>('/users/organization-members');
  },

  async deleteUser(userId: string, soft: boolean = false): Promise<{ status: string; message: string }> {
    return await apiClient.delete<{ status: string; message: string }>(`/users/${userId}?soft=${soft}`);
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserProfile> {
    return await apiClient.patch<UserProfile>(`/users/${userId}/status`, { is_active: isActive });
  },

  async leaveOrganization(): Promise<UserProfile> {
    return await apiClient.post<UserProfile>('/users/me/leave-organization');
  },

  async deleteMyAccount(): Promise<{ status: string; message: string }> {
    return await apiClient.delete<{ status: string; message: string }>('/users/me');
  },
};

