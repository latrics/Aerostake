import { apiClient } from '@/lib/api-client';
import {
  ClientPaymentProofIn,
  ClientWalletSummary,
  DateWiseCostSummary,
  Invoice,
  InvoiceCreate,
  PaymentRecord,
  PaymentRecordCreate,
  PaymentRecordVerify,
  RecordPaymentIn,
} from './types';

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

  async submitPaymentProof(projectId: string, data: ClientPaymentProofIn): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/projects/${projectId}/submit-slip`, data);
  },

  async verifyPayment(paymentId: string, data: PaymentRecordVerify): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/payments/${paymentId}/verify`, data);
  },

  async rejectPayment(paymentId: string, notes?: string): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/payments/${paymentId}/reject`, { notes });
  },

  // ── Digital Invoices & Billing ──
  async createDigitalInvoice(projectId: string, data: InvoiceCreate): Promise<Invoice> {
    return await apiClient.post<Invoice>(`/projects/${projectId}/invoices`, data);
  },

  async listProjectInvoices(projectId: string): Promise<Invoice[]> {
    return await apiClient.get<Invoice[]>(`/projects/${projectId}/invoices`);
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
  },

  async recordClientPayment(projectId: string, data: RecordPaymentIn): Promise<PaymentRecord> {
    return await apiClient.post<PaymentRecord>(`/projects/${projectId}/record-payment`, data);
  },

  // ── Cumulative Client Wallet & Running Ledger ──
  async getMyWallet(): Promise<ClientWalletSummary> {
    return await apiClient.get<ClientWalletSummary>(`/payments/my-wallet`);
  },

  async getProjectWallet(projectId: string): Promise<ClientWalletSummary> {
    return await apiClient.get<ClientWalletSummary>(`/projects/${projectId}/wallet`);
  },

  // ── Date-wise Cost Ledger ──
  async getProjectCostLedger(projectId: string): Promise<DateWiseCostSummary[]> {
    return await apiClient.get<DateWiseCostSummary[]>(`/projects/${projectId}/cost-ledger`);
  },

  async getGlobalCostLedger(): Promise<DateWiseCostSummary[]> {
    return await apiClient.get<DateWiseCostSummary[]>(`/payments/cost-ledger`);
  },
};

