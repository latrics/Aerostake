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
  amount_inr?: number;
  status: PaymentStatusEnum | string;
  payment_method?: string | null;
  reference_code?: string | null;
  bank_reference?: string | null;
  notes?: string | null;
  slip_url?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
}

export interface PaymentRecordCreate {
  milestone_name: string;
  amount_usd: number;
  amount_inr?: number;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
  slip_url?: string;
}

export interface PaymentRecordVerify {
  reference_code?: string;
  verified_amount?: number;
  notes?: string;
}

export interface ClientPaymentProofIn {
  amount: number;
  reference_code: string;
  payment_method?: string;
  payment_date?: string;
  slip_url?: string;
  notes?: string;
}

// ── Invoice Line Items & Digital Bills ──

export interface InvoiceItem {
  sl_no: number;
  date: string;
  item_name: string;
  unit: number;
  price: number;
  tenure?: string;
  multiply_tenure?: boolean;
  total_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  client_id?: string | null;
  title: string;
  bill_date: string;
  due_date?: string | null;
  items: InvoiceItem[];
  subtotal_amount: number;
  total_amount: number;
  status: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InvoiceCreate {
  title?: string;
  bill_date: string;
  due_date?: string;
  items: InvoiceItem[];
  total_amount: number;
  notes?: string;
}

export interface RecordPaymentIn {
  amount: number;
  payment_date?: string;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
}

// ── Cumulative Client Wallet & Running Ledger ──

export interface WalletLedgerEntry {
  id: string;
  date: string;
  timestamp?: string | null;
  type: 'bill' | 'payment';
  reference: string;
  description: string;
  amount_billed: number;
  amount_paid: number;
  running_balance: number;
  balance_status: 'due' | 'settled' | 'credit';
  badge_color: 'red' | 'green';
}

export interface ClientWalletSummary {
  client_id?: string | null;
  client_name?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  total_billed: number;
  total_paid: number;
  current_balance: number;
  status: 'due' | 'settled' | 'credit';
  status_label: string;
  status_color: 'red' | 'green';
  amount_due: number;
  credit_surplus: number;
  ledger_entries: WalletLedgerEntry[];
}

// ── Date-wise Cost Ledger (Reports) ──

export interface DateCostItem {
  sl_no: number;
  invoice_id: string;
  invoice_number: string;
  project_id: string;
  project_title: string;
  item_name: string;
  unit: number;
  price: number;
  tenure?: string;
  multiply_tenure?: boolean;
  total_price: number;
  stage?: string;
  timestamp?: string;
}

export interface DateWiseCostSummary {
  date: string;
  items: DateCostItem[];
  day_total: number;
  total_items_count: number;
  timestamp?: string;
}


