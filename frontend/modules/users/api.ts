import { apiClient } from '@/lib/api-client';
import { UserProfile, UserCreatePayload } from './types';

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
};
