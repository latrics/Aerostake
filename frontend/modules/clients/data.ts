import { ClientKPIStats, ClientFilterCounts } from './types';

export const EMPTY_CLIENT_KPIS: ClientKPIStats = {
  total_companies: 0,
  completed_projects: 0,
  total_projects: 0,
  total_landings: 0,
  total_sectors: 0,
  pending_payments_formatted: '₹0.0L',
  pending_payments_amount: 0,
  open_issues: 0,
  total_requests: 0,
  converted_requests: 0,
};

export const EMPTY_FILTER_COUNTS: ClientFilterCounts = {
  all: 0,
  active: 0,
  capturing: 0,
  planning: 0,
  pending_payment: 0,
  issues: 0,
};
