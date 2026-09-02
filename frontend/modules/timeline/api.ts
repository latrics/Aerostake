import { apiClient } from '@/lib/api-client';
import { TimelineEvent } from './types';

export const timelineApi = {
  async getProjectTimeline(projectId: string, category?: string, limit = 100): Promise<TimelineEvent[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (limit !== 100) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiClient.get<TimelineEvent[]>(`/timeline/${projectId}${query}`);
  },
};
