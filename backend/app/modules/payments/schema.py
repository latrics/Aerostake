import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.payments.model import PaymentStatusEnum


class PaymentRecordCreate(BaseModel):
    milestone_name: str = Field(..., min_length=2, max_length=150, description="Milestone title (e.g. Mobilization Deposit (50%))")
    amount_usd: float = Field(..., gt=0.0, description="Invoiced milestone amount in USD or INR")
    payment_method: Optional[str] = Field(default=None, max_length=100, description="Payment method (e.g. Wire Transfer, ACH, Check, RTGS)")
    reference_code: Optional[str] = Field(default=None, max_length=100, description="Bank transaction reference / UTR / Invoice number")
    notes: Optional[str] = Field(default=None, description="Billing and invoice remarks")
    slip_url: Optional[str] = Field(default=None, description="Uploaded payment slip or receipt image/PDF URL")


class PaymentRecordVerify(BaseModel):
    reference_code: Optional[str] = Field(default=None, max_length=100, description="Confirmed bank wire transaction UTR / receipt code")
    verified_amount: Optional[float] = Field(default=None, gt=0.0, description="Verified actual amount received in INR")
    notes: Optional[str] = Field(default=None, description="Admin verification audit notes")


class ClientPaymentProofIn(BaseModel):
    amount: float = Field(..., gt=0.0, description="Remittance / payment amount made by client in INR")
    reference_code: str = Field(..., min_length=2, max_length=100, description="Bank Transaction ID / UTR number")
    payment_method: Optional[str] = Field(default="Bank Transfer (RTGS/NEFT)", description="Mode of payment (UPI, NEFT, RTGS, IMPS)")
    payment_date: Optional[str] = Field(default=None, description="Date payment was made (YYYY-MM-DD)")
    slip_url: Optional[str] = Field(default=None, description="Payment slip or screenshot (Data URL or file URL)")
    notes: Optional[str] = Field(default=None, description="Client remittance remarks")


class PaymentRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    milestone_name: str
    amount_usd: float
    status: PaymentStatusEnum
    payment_method: Optional[str] = None
    reference_code: Optional[str] = None
    notes: Optional[str] = None
    slip_url: Optional[str] = None
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ── Invoice Line Item & Digital Bill Schemas ──

class InvoiceItemSchema(BaseModel):
    sl_no: int = Field(..., description="Serial number (1, 2, 3...)")
    date: str = Field(..., description="Item date (YYYY-MM-DD)")
    item_name: str = Field(..., min_length=1, max_length=200, description="Item / Service description")
    unit: float = Field(..., gt=0, description="Unit / Quantity")
    price: float = Field(..., ge=0, description="Rate / Price per unit in ₹")
    tenure: Optional[str] = Field(default=None, description="Optional tenure string (e.g. 3 Days)")
    multiply_tenure: Optional[bool] = Field(default=False, description="Whether tenure multiplies with price")
    total_price: float = Field(..., ge=0, description="Total price")


class InvoiceCreate(BaseModel):
    title: Optional[str] = Field(default="Project Survey Service Bill", max_length=200)
    bill_date: str = Field(..., description="Bill date (YYYY-MM-DD)")
    due_date: Optional[str] = Field(default=None, description="Due date (YYYY-MM-DD)")
    items: List[InvoiceItemSchema] = Field(..., min_length=1, description="Line items table")
    total_amount: float = Field(..., ge=0, description="Summation of all line item costs in ₹")
    notes: Optional[str] = Field(default=None, description="Payment instructions and terms")


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    project_id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    title: str
    bill_date: datetime
    due_date: Optional[datetime] = None
    items: List[Dict[str, Any]]
    subtotal_amount: float
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Client Wallet & Ledger Schemas ──

class RecordPaymentIn(BaseModel):
    amount: float = Field(..., gt=0, description="Remittance / payment received amount in ₹")
    payment_date: Optional[str] = Field(default=None, description="Date payment was received (YYYY-MM-DD)")
    payment_method: Optional[str] = Field(default="Bank Transfer (RTGS/NEFT)", description="Mode of payment")
    reference_code: Optional[str] = Field(default=None, description="Bank transaction reference UTR / receipt")
    notes: Optional[str] = Field(default=None, description="Payment remarks / client audit note")
    slip_url: Optional[str] = Field(default=None, description="Payment slip or screenshot (Data URL or file URL)")


class WalletLedgerEntry(BaseModel):
    id: str
    date: str
    timestamp: Optional[str] = None
    type: str  # "bill" or "payment"
    reference: str  # Invoice # or Bank UTR #
    description: str
    amount_billed: float = 0.0
    amount_paid: float = 0.0
    running_balance: float
    balance_status: str  # "due" | "settled" | "credit"
    badge_color: str  # "red" if due else "green"


class ClientWalletSummary(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    company_name: Optional[str] = None
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    total_billed: float
    total_paid: float
    current_balance: float  # total_billed - total_paid
    status: str  # "due" if > 0, "settled" if == 0, "credit" if < 0
    status_label: str  # "₹1,40,000 Due" or "Settled" or "₹60,000 Credit"
    status_color: str  # "red" if due else "green"
    amount_due: float  # max(0, current_balance)
    credit_surplus: float  # max(0, -current_balance)
    ledger_entries: List[WalletLedgerEntry]


# ── Date-wise Cost Ledger Schemas ──

class DateCostItem(BaseModel):
    sl_no: int
    invoice_id: str
    invoice_number: str
    project_id: str
    project_title: str
    item_name: str
    unit: float
    price: float
    tenure: Optional[str] = None
    multiply_tenure: Optional[bool] = None
    total_price: float
    stage: Optional[str] = None
    timestamp: Optional[str] = None


class DateWiseCostSummary(BaseModel):
    date: str
    items: List[DateCostItem]
    day_total: float
    total_items_count: int
    timestamp: Optional[str] = None


