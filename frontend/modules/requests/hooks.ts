import { useState, useEffect, useCallback } from 'react';
import { requestApi } from './api';
import { RequestVersion, RequestVersionCreate } from './types';

export function useProjectRequests(projectId: string | null) {
  const [requests, setRequests] = useState<RequestVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await requestApi.listProjectRequests(projectId);
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch request history');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const submitRequest = async (data: RequestVersionCreate): Promise<RequestVersion> => {
    if (!projectId) throw new Error('No project ID provided');
    const newVersion = await requestApi.submitRequest(projectId, data);
    setRequests((prev) => [newVersion, ...prev]);
    return newVersion;
  };

  const latestRequest = requests.length > 0 ? requests[0] : null;

  return {
    requests,
    latestRequest,
    loading,
    error,
    refetch: fetchRequests,
    submitRequest,
  };
}
