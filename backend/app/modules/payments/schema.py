import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.payments.model import PaymentStatusEnum


class PaymentRecordCreate(BaseModel):
    milestone_name: str = Field(..., min_length=2, max_length=150, description="Milestone title (e.g. Mobilization Deposit (50%))")
    amount_usd: float = Field(..., gt=0.0, description="Invoiced milestone amount in USD")
    payment_method: Optional[str] = Field(default=None, max_length=100, description="Payment method (e.g. Wire Transfer, ACH, Check)")
    reference_code: Optional[str] = Field(default=None, max_length=100, description="Bank transaction reference / UTR / Invoice number")
    notes: Optional[str] = Field(default=None, description="Billing and invoice remarks")


class PaymentRecordVerify(BaseModel):
    reference_code: Optional[str] = Field(default=None, max_length=100, description="Confirmed bank wire transaction UTR / receipt code")
    notes: Optional[str] = Field(default=None, description="Admin verification audit notes")


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
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
