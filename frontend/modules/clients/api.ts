import { apiClient } from '@/lib/api-client';
import { ClientCompany, ClientKPIStats, ClientFilterCounts, ClientsOverviewResponse } from './types';
import { EMPTY_CLIENT_KPIS, EMPTY_FILTER_COUNTS } from './data';

export const clientsApi = {
  async getClientsAndStats(): Promise<ClientsOverviewResponse> {
    try {
      const response = await apiClient.get<ClientsOverviewResponse>('/clients');
      if (response && Array.isArray(response.companies)) {
        return response;
      }
    } catch (err) {
      console.error('Failed to fetch clients from backend database:', err);
    }

    return {
      companies: [],
      stats: EMPTY_CLIENT_KPIS,
      counts: EMPTY_FILTER_COUNTS,
    };
  },

  async updateRemarks(clientId: string, remarks: string): Promise<{ status: string; remarks: string }> {
    return await apiClient.patch<{ status: string; remarks: string }>(`/clients/${clientId}/remarks`, {
      remarks,
    });
  },

  async updateRating(clientId: string, rating: number): Promise<{ status: string; rating: number }> {
    return await apiClient.patch<{ status: string; rating: number }>(`/clients/${clientId}/rating`, {
      rating,
    });
  },
};
