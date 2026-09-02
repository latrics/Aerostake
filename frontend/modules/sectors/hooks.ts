import { useState, useEffect, useCallback } from 'react';
import { sectorApi } from './api';
import { Sector } from './types';

export function useProjectSectors(projectId: string | null) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSectors = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await sectorApi.listProjectSectors(projectId);
      setSectors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project sectors');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  // Calculate sector progress stats
  const totalSectors = sectors.length;
  const completedSectors = sectors.filter((s) => s.status === 'completed' || s.status === 'surveyed').length;
  const inProgressSectors = sectors.filter((s) => s.status === 'in_progress').length;
  const progressPercentage = totalSectors > 0 ? Math.round((completedSectors / totalSectors) * 100) : 0;

  return {
    sectors,
    totalSectors,
    completedSectors,
    inProgressSectors,
    progressPercentage,
    loading,
    error,
    refetch: fetchSectors,
  };
}

export function useSector(sectorId: string | null) {
  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSector = useCallback(async () => {
    if (!sectorId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await sectorApi.getSector(sectorId);
      setSector(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sector details');
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

  useEffect(() => {
    fetchSector();
  }, [fetchSector]);

  return {
    sector,
    loading,
    error,
    refetch: fetchSector,
  };
}
