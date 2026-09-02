'use client';

import { useState, useEffect, useCallback } from 'react';
import { allocationsApi } from './api';
import { SectorAllocation, AllocationCreate, AllocationStatusUpdate } from './types';

export function useMyAllocations() {
  const [allocations, setAllocations] = useState<SectorAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await allocationsApi.getMyAllocations();
      setAllocations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned flights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const updateStatus = async (allocationId: string, statusUpdate: AllocationStatusUpdate) => {
    const updated = await allocationsApi.updateAllocationStatus(allocationId, statusUpdate);
    setAllocations((prev) =>
      prev.map((item) => (item.id === allocationId ? updated : item))
    );
    return updated;
  };

  return { allocations, loading, error, refetch: fetchAllocations, updateStatus };
}
