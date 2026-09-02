import { apiClient } from '@/lib/api-client';
import { Project, ProjectCreate, ProjectUpdate, ProjectStatus } from './types';

export const projectApi = {
  async listProjects(status?: ProjectStatus | string, skip = 0, limit = 50): Promise<Project[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 50) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiClient.get<Project[]>(`/projects${query}`);
  },

  async getProject(id: string): Promise<Project> {
    return await apiClient.get<Project>(`/projects/${id}`);
  },

  async createProject(data: ProjectCreate): Promise<Project> {
    return await apiClient.post<Project>('/projects', data);
  },

  async updateProject(id: string, data: ProjectUpdate): Promise<Project> {
    return await apiClient.patch<Project>(`/projects/${id}`, data);
  },
};
