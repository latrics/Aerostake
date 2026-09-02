import { apiClient } from '@/lib/api-client';
import {
  SectorAllocation,
  AllocationCreate,
  AllocationStatusUpdate,
} from './types';

export const allocationsApi = {
  async allocateSector(sectorId: string, data: AllocationCreate): Promise<SectorAllocation> {
    return await apiClient.post<SectorAllocation>(`/sectors/${sectorId}/allocations`, data);
  },

  async getMyAllocations(): Promise<SectorAllocation[]> {
    return await apiClient.get<SectorAllocation[]>('/pilots/me/allocations');
  },

  async updateAllocationStatus(
    allocationId: string,
    data: AllocationStatusUpdate
  ): Promise<SectorAllocation> {
    return await apiClient.patch<SectorAllocation>(`/allocations/${allocationId}/status`, data);
  },
};
