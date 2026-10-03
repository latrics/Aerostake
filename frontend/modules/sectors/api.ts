import { apiClient } from '@/lib/api-client';
import { Sector, SectorBatchCreate, SectorStatusUpdate, SectorPlanningData, SectorDailyLogCreate } from './types';

export const sectorApi = {
  async listProjectSectors(projectId: string): Promise<Sector[]> {
    return await apiClient.get<Sector[]>(`/projects/${projectId}/sectors`);
  },

  async getSector(sectorId: string): Promise<Sector> {
    return await apiClient.get<Sector>(`/sectors/${sectorId}`);
  },

  async createSectors(projectId: string, batchData: SectorBatchCreate): Promise<Sector[]> {
    return await apiClient.post<Sector[]>(`/projects/${projectId}/sectors`, batchData);
  },

  async updateSectorStatus(sectorId: string, data: SectorStatusUpdate): Promise<Sector> {
    return await apiClient.patch<Sector>(`/sectors/${sectorId}/status`, data);
  },

  async updateSectorPlanning(sectorId: string, data: SectorPlanningData): Promise<Sector> {
    return await apiClient.patch<Sector>(`/sectors/${sectorId}/planning`, data);
  },

  async addSectorDailyLog(sectorId: string, data: SectorDailyLogCreate): Promise<Sector> {
    return await apiClient.post<Sector>(`/sectors/${sectorId}/daily-logs`, data);
  },
};

