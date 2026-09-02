import { useState, useEffect, useCallback } from 'react';
import { planningApi } from './api';
import { OperationalPlan, PlanRevisionRequest } from './types';
import { Project } from '@/modules/projects/types';

export function useOperationalPlan(projectId: string | null) {
  const [activePlan, setActivePlan] = useState<OperationalPlan | null>(null);
  const [plans, setPlans] = useState<OperationalPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const [active, history] = await Promise.all([
        planningApi.getActivePlan(projectId).catch(() => null),
        planningApi.listProjectPlans(projectId).catch(() => []),
      ]);
      setActivePlan(active);
      setPlans(history);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch operational plans');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const approvePlan = async (): Promise<Project> => {
    if (!projectId) throw new Error('No project ID provided');
    const updatedProject = await planningApi.approvePlan(projectId);
    await fetchPlans();
    return updatedProject;
  };

  const requestRevision = async (data: PlanRevisionRequest): Promise<Project> => {
    if (!projectId) throw new Error('No project ID provided');
    const updatedProject = await planningApi.requestPlanRevision(projectId, data);
    await fetchPlans();
    return updatedProject;
  };

  return {
    activePlan,
    plans,
    loading,
    error,
    refetch: fetchPlans,
    approvePlan,
    requestRevision,
  };
}
