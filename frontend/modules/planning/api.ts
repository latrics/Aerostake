import { apiClient } from '@/lib/api-client';
import { OperationalPlan, OperationalPlanCreate, PlanRevisionRequest } from './types';
import { Project } from '@/modules/projects/types';

export const planningApi = {
  async getActivePlan(projectId: string): Promise<OperationalPlan | null> {
    try {
      return await apiClient.get<OperationalPlan>(`/projects/${projectId}/plan`);
    } catch (err: any) {
      if (err.message && (err.message.includes('404') || err.message.includes('No active published'))) {
        return null;
      }
      throw err;
    }
  },

  async getPlanById(planId: string): Promise<OperationalPlan> {
    return await apiClient.get<OperationalPlan>(`/planning/plans/${planId}`);
  },

  async listProjectPlans(projectId: string): Promise<OperationalPlan[]> {
    return await apiClient.get<OperationalPlan[]>(`/projects/${projectId}/plans`);
  },

  async publishPlan(requestVersionId: string, planData: OperationalPlanCreate): Promise<OperationalPlan> {
    return await apiClient.post<OperationalPlan>(`/planning/requests/${requestVersionId}`, planData);
  },

  async approvePlan(projectId: string): Promise<Project> {
    return await apiClient.post<Project>(`/projects/${projectId}/approve`);
  },

  async requestPlanRevision(projectId: string, data: PlanRevisionRequest): Promise<Project> {
    return await apiClient.post<Project>(`/projects/${projectId}/revise`, data);
  },
};
