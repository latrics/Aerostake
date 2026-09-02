import { apiClient } from '@/lib/api-client';
import { PaymentRecord, PaymentRecordCreate, PaymentRecordVerify } from './types';

export const paymentsApi = {
  async listProjectPayments(projectId: string): Promise<PaymentRecord[]> {
    return await apiClient.get<PaymentRecord[]>(`/projects/${projectId}/payments`);
  },

  async getPayment(paymentId: string): Promise<PaymentRecord> {
    return await apiClient.get<PaymentRecord>(`/payments/${paymentId}`);
  },

  async createMilestoneCharge(projectId: string, data: PaymentRecordCreate): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/projects/${projectId}/payments`, data);
  },

  async verifyPayment(paymentId: string, data: PaymentRecordVerify): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/payments/${paymentId}/verify`, data);
  },
};
