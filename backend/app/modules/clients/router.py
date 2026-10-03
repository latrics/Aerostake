import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.organizations.model import Organization
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.users.model import RoleEnum, User
from app.modules.payments.model import Invoice, PaymentRecord, PaymentStatusEnum
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.security.permissions import require_role

clients_router = APIRouter(prefix="/clients", tags=["Clients"])


def format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "Unknown"
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 120:
        return "Just now"
    hours = seconds / 3600
    if hours < 24:
        return f"{int(hours)} hours ago" if int(hours) > 1 else "1 hour ago"
    days = int(hours / 24)
    if days == 1:
        return "Yesterday"
    if days < 7:
        return f"{days} days ago"
    if days < 30:
        weeks = days // 7
        return f"{weeks} week ago" if weeks == 1 else f"{weeks} weeks ago"
    return dt.strftime("%b %Y")


def format_inr_amount(amount: float) -> str:
    if amount <= 0:
        return "₹0.00"
    if amount >= 10000000:
        cr = amount / 10000000
        return f"₹{cr:.2f} Cr"
    if amount >= 100000:
        lakhs = amount / 100000
        return f"₹{lakhs:.1f}L"
    return f"₹{amount:,.0f}"


class UpdateRemarksPayload(BaseModel):
    remarks: str


class UpdateRatingPayload(BaseModel):
    rating: float


@clients_router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get aggregated client companies and metrics from actual database (Ops and Admin only)",
)
async def get_clients_overview(
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Aggregates all client organizations, linked users, projects, sectors, and payments

    strictly from the active PostgreSQL database.
    """
    # 1. Fetch all registered organizations
    orgs_res = await db.execute(select(Organization).order_by(Organization.name.asc()))
    orgs = orgs_res.scalars().all()

    # Also find any client users whose company is not yet in organizations table
    client_users_res = await db.execute(
        select(User).where(
            User.role.in_([RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB, RoleEnum.CLIENT])
        )
    )
    client_users = client_users_res.scalars().all()

    org_names_lower = {o.name.lower(): o for o in orgs}

    companies: List[Dict[str, Any]] = []

    trash_names = {"lola1234", "lol1234", "clent1 solution company", "lol", "llll", "lola", "test unauth co", "wrongful co"}
    seen_org_names = set()

    all_completed_projects = 0
    all_total_projects = 0
    all_total_landings = 0
    all_total_sectors = 0
    all_total_pending_payments = 0.0
    all_total_open_issues = 0
    all_total_requests = 0
    all_converted_requests = 0

    counts = {
        "all": 0,
        "active": 0,
        "capturing": 0,
        "planning": 0,
        "pending_payment": 0,
        "issues": 0,
    }

    for org in orgs:
        norm_name = org.name.strip().lower()
        if norm_name in trash_names:
            continue

        # Find all users linked to this organization
        u_stmt = select(User).where(
            (User.organization_id == org.id) | (func.lower(User.company_name) == org.name.lower())
        )
        u_res = await db.execute(u_stmt)
        users = u_res.scalars().all()
        user_ids = [u.id for u in users]

        # Find all projects for this organization
        conditions = [Project.organization_id == org.id]
        if user_ids:
            conditions.append(Project.client_id.in_(user_ids))
        p_stmt = select(Project).where(or_(*conditions)).order_by(Project.created_at.desc())
        p_res = await db.execute(p_stmt)
        projects = p_res.scalars().all()

        # Deduplication safeguard: exclude duplicate company names and empty phantom orgs
        if norm_name in seen_org_names:
            continue
        if len(projects) == 0 and len(users) == 0:
            continue
        seen_org_names.add(norm_name)

        # Determine primary contact person
        primary_contact = next(
            (u for u in users if u.role == RoleEnum.CLIENT_PRIMARY),
            users[0] if users else None,
        )

        # Compute project summaries and operational metrics
        project_summaries: List[Dict[str, Any]] = []
        org_sectors_count = 0
        org_finished_sectors = 0
        org_landings = 0
        org_pending_payment = 0.0
        org_open_issues = 0

        latest_activity_dt = org.updated_at or org.created_at

        for p in projects:
            if p.updated_at and p.updated_at > latest_activity_dt:
                latest_activity_dt = p.updated_at
            elif p.created_at and p.created_at > latest_activity_dt:
                latest_activity_dt = p.created_at

            sec_stmt = select(Sector).where(Sector.project_id == p.id)
            sec_res = await db.execute(sec_stmt)
            sectors = sec_res.scalars().all()

            completed_sec = len([
                s for s in sectors
                if s.status in (SectorStatusEnum.SURVEYED, SectorStatusEnum.VERIFIED)
            ])
            flagged_sec = len([
                s for s in sectors
                if s.status == SectorStatusEnum.FLAGGED
            ])

            # Calculate project dues from digital invoices and verified payments (Cumulative Wallet)
            inv_stmt = select(Invoice).where(Invoice.project_id == p.id)
            inv_res = await db.execute(inv_stmt)
            p_invoices = inv_res.scalars().all()
            total_invoiced = sum(float(inv.total_amount) for inv in p_invoices if getattr(inv, "status", None) != "cancelled")

            pay_verified_stmt = select(PaymentRecord).where(
                PaymentRecord.project_id == p.id,
                PaymentRecord.status == PaymentStatusEnum.VERIFIED,
            )
            pay_verified_res = await db.execute(pay_verified_stmt)
            p_verified_payments = pay_verified_res.scalars().all()
            total_paid = sum(float(pay.amount_usd) for pay in p_verified_payments)

            pay_pending_stmt = select(PaymentRecord).where(
                PaymentRecord.project_id == p.id,
                PaymentRecord.status == PaymentStatusEnum.PENDING,
            )
            pay_pending_res = await db.execute(pay_pending_stmt)
            legacy_pending = sum(float(pay.amount_usd) for pay in pay_pending_res.scalars().all())

            wallet_balance = total_invoiced - total_paid
            pending_pay = max(0.0, wallet_balance) if total_invoiced > 0 else legacy_pending

            # Landings count (2 sorties per completed sector or 1 per project)
            p_landings = completed_sec * 2 if completed_sec > 0 else (1 if p.status == ProjectStatusEnum.ACTIVE else 0)

            org_sectors_count += len(sectors)
            org_finished_sectors += completed_sec
            org_landings += p_landings
            org_pending_payment += pending_pay
            # Help Desk issue workflow is pending implementation; do not count issues for now
            org_open_issues = 0

            # Extract location
            loc = getattr(p, "survey_location", None) or "Site Workspace"

            project_summaries.append({
                "id": str(p.id),
                "title": p.title,
                "status": p.status.value,
                "sectors_count": len(sectors),
                "completed_sectors_count": completed_sec,
                "landings": p_landings,
                "target_area_sqkm": getattr(p, "target_area_sqkm", None),
                "location": loc,
            })

        completed_projects_count = len([p for p in projects if p.status == ProjectStatusEnum.COMPLETED])
        total_projects_count = len(projects)

        # Requests & Converted Projects Metrics
        converted_statuses = {
            ProjectStatusEnum.APPROVED,
            ProjectStatusEnum.ACTIVE,
            ProjectStatusEnum.COMPLETED,
        }
        org_requests_count = total_projects_count
        org_converted_requests_count = len([p for p in projects if p.status in converted_statuses])
        org_requests_converted = f"{org_converted_requests_count}/{org_requests_count}" if org_requests_count > 0 else "0/0"

        # Tenure Calculation: 3 years = 1095 days
        tenure_total_days = 1095
        created_dt = org.created_at or datetime.now(timezone.utc)
        now_dt = datetime.now(timezone.utc)
        days_elapsed = max(0, (now_dt - created_dt).days)
        tenure_days_left = max(0, tenure_total_days - days_elapsed)

        all_total_projects += total_projects_count
        all_completed_projects += completed_projects_count
        all_total_sectors += org_sectors_count
        all_total_landings += org_landings
        all_total_pending_payments += org_pending_payment
        all_total_open_issues += org_open_issues
        all_total_requests += org_requests_count
        all_converted_requests += org_converted_requests_count

        # Determine category based on actual state (issues category disabled until Help Desk is built)
        if org_pending_payment > 0:
            category = "pending_payment"
        elif any(p.status == ProjectStatusEnum.ACTIVE for p in projects):
            category = "capturing"
        elif any(p.status in (ProjectStatusEnum.PLANNING, ProjectStatusEnum.SUBMITTED) for p in projects):
            category = "planning"
        else:
            category = "active"

        counts["all"] += 1
        if category in counts:
            counts[category] += 1
        if category != "active" and total_projects_count > 0:
            counts["active"] += 1

        # Profile notes, remarks, and rating from primary contact
        remarks = "Active organization in Latrics"
        client_rating = 5.0
        if primary_contact and primary_contact.company_profile and isinstance(primary_contact.company_profile, dict):
            profile = primary_contact.company_profile
            remarks = profile.get("remarks") or profile.get("notes") or profile.get("nature_of_business") or remarks
            if profile.get("rating") is not None:
                try:
                    client_rating = round(float(profile["rating"]), 1)
                except (ValueError, TypeError):
                    client_rating = 5.0

        company_dict = {
            "id": str(org.id),
            "name": org.name,
            "active_since": f"Active since {org.created_at.strftime('%b %Y')}",
            "category": category,
            "projects_count": total_projects_count,
            "landings_count": org_landings,
            "landings_max": 1000,
            "tenure_days_left": tenure_days_left,
            "tenure_total_days": tenure_total_days,
            "requests_count": org_requests_count,
            "converted_requests_count": org_converted_requests_count,
            "requests_converted": org_requests_converted,
            "projects_completed": f"{completed_projects_count}/{total_projects_count}" if total_projects_count > 0 else "0/0",
            "sectors_count": org_sectors_count,
            "finished_sectors": f"{org_finished_sectors}/{org_sectors_count}" if org_sectors_count > 0 else "0/0",
            "pending_payment": org_pending_payment,
            "pending_payment_formatted": format_inr_amount(org_pending_payment),
            "issues_count": 0,
            "rating": client_rating,
            "last_activity": format_relative_time(latest_activity_dt),
            "remarks": remarks,
            "contact_name": primary_contact.full_name if primary_contact else "Primary Client POC",
            "contact_email": primary_contact.email if primary_contact else None,
            "contact_phone": primary_contact.phone_number if primary_contact else None,
            "address": primary_contact.company_profile.get("registered_address") if (primary_contact and primary_contact.company_profile) else None,
            "projects": project_summaries,
            "is_database_client": True,
        }
        companies.append(company_dict)

    stats = {
        "total_companies": len(companies),
        "completed_projects": all_completed_projects,
        "total_projects": all_total_projects,
        "total_landings": all_total_landings,
        "total_sectors": all_total_sectors,
        "pending_payments_formatted": format_inr_amount(all_total_pending_payments),
        "pending_payments_amount": all_total_pending_payments,
        "open_issues": 0,
        "total_requests": all_total_requests,
        "converted_requests": all_converted_requests,
    }

    return {
        "companies": companies,
        "stats": stats,
        "counts": counts,
    }


@clients_router.patch(
    "/{client_id}/remarks",
    status_code=status.HTTP_200_OK,
    summary="Update operational remarks for a client company in database",
)
async def update_client_remarks(
    client_id: str,
    payload: UpdateRemarksPayload,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        org_uuid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid client organization ID")

    # Find the organization
    org_res = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Client organization not found")

    # Save to primary contact or create/update company profile
    u_stmt = select(User).where(
        (User.organization_id == org.id) | (func.lower(User.company_name) == org.name.lower())
    )
    u_res = await db.execute(u_stmt)
    users = u_res.scalars().all()

    primary_contact = next(
        (u for u in users if u.role == RoleEnum.CLIENT_PRIMARY),
        users[0] if users else None,
    )

    if primary_contact:
        profile = dict(primary_contact.company_profile or {})
        profile["remarks"] = payload.remarks
        primary_contact.company_profile = profile
        await db.commit()

    return {"status": "ok", "client_id": client_id, "remarks": payload.remarks}


@clients_router.patch(
    "/{client_id}/rating",
    status_code=status.HTTP_200_OK,
    summary="Update operational rating for a client company in database",
)
async def update_client_rating(
    client_id: str,
    payload: UpdateRatingPayload,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        org_uuid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid client organization ID")

    org_res = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Client organization not found")

    u_stmt = select(User).where(
        (User.organization_id == org.id) | (func.lower(User.company_name) == org.name.lower())
    )
    u_res = await db.execute(u_stmt)
    users = u_res.scalars().all()

    primary_contact = next(
        (u for u in users if u.role == RoleEnum.CLIENT_PRIMARY),
        users[0] if users else None,
    )

    if primary_contact:
        profile = dict(primary_contact.company_profile or {})
        profile["rating"] = round(float(payload.rating), 1)
        primary_contact.company_profile = profile
        await db.commit()

    return {"status": "ok", "client_id": client_id, "rating": payload.rating}

