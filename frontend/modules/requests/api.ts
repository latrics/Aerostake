import { apiClient } from '@/lib/api-client';
import { RequestVersion, RequestVersionCreate } from './types';

export const requestApi = {
  async submitRequest(projectId: string, data: RequestVersionCreate): Promise<RequestVersion> {
    return await apiClient.post<RequestVersion>(`/projects/${projectId}/requests`, data);
  },

  async listProjectRequests(projectId: string): Promise<RequestVersion[]> {
    return await apiClient.get<RequestVersion[]>(`/projects/${projectId}/requests`);
  },

  async getRequestByVersion(projectId: string, version: number): Promise<RequestVersion> {
    return await apiClient.get<RequestVersion>(`/projects/${projectId}/requests/${version}`);
  },
};
