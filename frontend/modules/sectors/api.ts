import { apiClient } from '@/lib/api-client';
import {
  Sector,
  SectorBatchCreate,
  SectorStatusUpdate,
  SectorPlanningData,
  SectorDailyLogCreate,
  BatchAssignPilotsPayload,
  BatchScheduleDatesPayload,
} from './types';

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

  async batchAssignPilots(projectId: string, data: BatchAssignPilotsPayload): Promise<Sector[]> {
    return await apiClient.patch<Sector[]>(`/projects/${projectId}/sectors/batch-assign-pilots`, data);
  },

  async batchScheduleDates(projectId: string, data: BatchScheduleDatesPayload): Promise<Sector[]> {
    return await apiClient.patch<Sector[]>(`/projects/${projectId}/sectors/batch-schedule-dates`, data);
  },

  async addSectorDailyLog(sectorId: string, data: SectorDailyLogCreate): Promise<Sector> {
    return await apiClient.post<Sector>(`/sectors/${sectorId}/daily-logs`, data);
  },

  async uploadSectorKml(projectId: string, file: File): Promise<Sector[]> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient.post<Sector[]>(`/projects/${projectId}/sectors/upload-kml`, formData);
  },

  async listAssignedSectors(pilotId?: string): Promise<any[]> {
    const query = pilotId ? `?pilot_id=${pilotId}` : '';
    return await apiClient.get<any[]>(`/sectors/pilot/assigned${query}`);
  },
};


