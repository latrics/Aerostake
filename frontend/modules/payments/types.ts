export enum PaymentStatusEnum {
  PENDING = 'pending',
  VERIFIED = 'verified',
  WAIVED = 'waived',
  REFUNDED = 'refunded',
}

export interface PaymentRecord {
  id: string;
  project_id: string;
  milestone_name: string;
  amount_usd: number;
  status: PaymentStatusEnum;
  payment_method?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
}

export interface PaymentRecordCreate {
  milestone_name: string;
  amount_usd: number;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
}

export interface PaymentRecordVerify {
  reference_code?: string;
  notes?: string;
}
