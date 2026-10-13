import copy
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.planning.repository import planning_repository
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.sectors.kml_service import kml_parser_service
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.sectors.repository import sector_repository
from app.modules.sectors.schema import (
    SectorBatchCreate,
    SectorStatusUpdate,
    SectorPlanningUpdate,
    SectorDailyLogCreate,
    BatchAssignPilotsRequest,
    BatchScheduleDatesRequest,
)
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User


class SectorService:
    """Business logic for flight sector creation and status tracking."""

    async def create_sectors(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        batch_in: SectorBatchCreate,
    ) -> List[Sector]:
        # 1. RBAC Guard: Admin or Operations only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can subdivide survey sectors",
            )

        # 2. Fetch and validate parent project
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # Project must be APPROVED or ACTIVE before sectors can be assigned
        if project.status not in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.ACTIVE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate sectors for project in '{project.status.value}' state. Plan must be approved first.",
            )

        # 3. Fetch and validate operational plan
        plan = await planning_repository.get_by_id(db, batch_in.plan_id)
        if not plan or plan.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid operational plan for this project",
            )

        # 4. Create sectors
        sectors = await sector_repository.bulk_create(
            db=db,
            project_id=project_id,
            plan_id=plan.id,
            sectors_in=batch_in.sectors,
        )

        # 5. Transition Project to ACTIVE if it was APPROVED
        if project.status == ProjectStatusEnum.APPROVED:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.ACTIVE)

        # 6. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="allocation",
            action="sectors_created",
            message=f"Subdivided {len(sectors)} flight sectors for project '{project.title}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={"sectors_count": len(sectors), "plan_id": str(plan.id)},
        )

        return sectors

    async def get_sector(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")
        await project_service.get_project(db, current_user, sector.project_id)
        return sector

    async def list_sectors_for_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[Sector]:
        await project_service.get_project(db, current_user, project_id)
        return await sector_repository.list_by_project(db, project_id)

    async def _verify_pilot_assignment(self, db: AsyncSession, current_user: User, sector: Sector) -> bool:
        """Verifies if the current user is authorized to log or update this sector.
        Admin & Operations are always authorized.
        Pilots are authorized if explicitly matched via pilot_id, email, name, assigned_pilots list, or DB allocation.
        """
        if current_user.role in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            return True
        if current_user.role != RoleEnum.PILOT:
            return False

        coords_check = dict(sector.polygon_coordinates or {})
        planning_check = dict(coords_check.get("planning") or {})
        assigned_id = planning_check.get("assigned_pilot_id")
        pilot_email = (planning_check.get("pilot_email") or "").strip().lower()
        assigned_name = (planning_check.get("assigned_pilot") or "").strip().lower()
        assigned_pilots = planning_check.get("assigned_pilots") or []

        user_id_str = str(current_user.id)
        user_email = (current_user.email or "").strip().lower()
        user_name = (current_user.full_name or "").strip().lower()

        # 1. Direct ID or email match (authoritative)
        if (
            (assigned_id and str(assigned_id) == user_id_str) or
            (pilot_email and pilot_email == user_email)
        ):
            return True

        # Name matching with exclusion of generic placeholder tokens
        INVALID_PLACEHOLDER_NAMES = {"", "—", "-", "n/a", "na", "none", "tbd", "unassigned", "pending", "pilot", "drone pilot"}
        if assigned_name and assigned_name not in INVALID_PLACEHOLDER_NAMES and len(assigned_name) >= 3 and len(user_name) >= 3:
            if (
                assigned_name == user_name
                or (len(assigned_name) >= 4 and len(user_name) >= 4 and (user_name in assigned_name or assigned_name in user_name))
            ):
                return True

        # 2. Check assigned_pilots array
        if isinstance(assigned_pilots, list):
            for p in assigned_pilots:
                if isinstance(p, dict):
                    p_id = str(p.get("id") or "")
                    p_email = (p.get("email") or "").strip().lower()
                    p_name = (p.get("name") or "").strip().lower()
                    if (
                        (p_id and p_id == user_id_str) or
                        (p_email and p_email == user_email)
                    ):
                        return True
                    if p_name and p_name not in INVALID_PLACEHOLDER_NAMES and len(p_name) >= 3 and len(user_name) >= 3:
                        if (
                            p_name == user_name
                            or (len(p_name) >= 4 and len(user_name) >= 4 and (user_name in p_name or p_name in user_name))
                        ):
                            return True
                elif isinstance(p, str):
                    p_str = p.strip().lower()
                    if p_str and p_str not in INVALID_PLACEHOLDER_NAMES and len(p_str) >= 3 and len(user_name) >= 3:
                        if (
                            p_str == user_name
                            or (len(p_str) >= 4 and len(user_name) >= 4 and (user_name in p_str or p_str in user_name))
                        ):
                            return True

        # 3. Check SectorAllocation table in database
        try:
            from app.modules.allocations.model import SectorAllocation
            alloc_stmt = select(SectorAllocation).where(
                SectorAllocation.sector_id == sector.id,
                SectorAllocation.pilot_id == current_user.id,
            )
            alloc_res = await db.execute(alloc_stmt)
            if alloc_res.scalars().first():
                return True
        except Exception:
            pass

        return False

    async def update_sector_status(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        status_in: SectorStatusUpdate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # Pilot restriction: pilots can only update status of sectors assigned to them
        if not await self._verify_pilot_assignment(db, current_user, sector):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pilots can only update survey status for sectors assigned to them",
            )

        old_status = sector.status
        updated_sector = await sector_repository.update_status(
            db=db,
            sector=sector,
            new_status=status_in.status,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_status_updated",
            message=f"Sector {sector.sector_code} survey status updated to '{status_in.status.value}'",
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={
                "sector_id": str(sector.id),
                "sector_code": sector.sector_code,
                "old_status": old_status.value,
                "new_status": status_in.status.value,
            },
        )

        return updated_sector

    async def update_sector_planning(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        planning_in: SectorPlanningUpdate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # RBAC: Ops and Admin only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only LATRICS Operations or Administrator can define sector planning parameters",
            )

        # Lifecycle check: cannot modify if project is completed or cancelled
        project = await project_repository.get_by_id(db, sector.project_id)
        if not project or project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sector planning parameters cannot be modified on a completed or cancelled project",
            )

        if planning_in.sector_code is not None and planning_in.sector_code.strip():
            sector.sector_code = planning_in.sector_code.strip()
        if planning_in.target_area_sqkm is not None:
            sector.target_area_sqkm = planning_in.target_area_sqkm

        coords = dict(sector.polygon_coordinates or {})
        planning_data = dict(coords.get("planning") or {})

        if planning_in.sector_code is not None:
            planning_data["sector_name"] = planning_in.sector_code.strip()
        if planning_in.target_area_sqkm is not None:
            planning_data["target_area_sqkm"] = planning_in.target_area_sqkm
        if planning_in.planned_sorties is not None:
            planning_data["planned_sorties"] = planning_in.planned_sorties
        if planning_in.scanning_date is not None:
            clean_d = planning_in.scanning_date.strip() if planning_in.scanning_date else ""
            planning_data["scanning_date"] = clean_d or None
            planning_data["planned_start_date"] = clean_d or None
            planning_data["planned_end_date"] = clean_d or None
        elif planning_in.planned_start_date is not None:
            planning_data["planned_start_date"] = planning_in.planned_start_date
            if "scanning_date" not in planning_data:
                planning_data["scanning_date"] = planning_in.planned_start_date
        if planning_in.planned_end_date is not None:
            planning_data["planned_end_date"] = planning_in.planned_end_date
        if planning_in.assigned_pilot is not None:
            clean_p = planning_in.assigned_pilot.strip() if planning_in.assigned_pilot else ""
            planning_data["assigned_pilot"] = clean_p or None
            if clean_p:
                planning_data["assigned_pilots"] = [
                    {
                        "id": planning_in.assigned_pilot_id or planning_data.get("assigned_pilot_id"),
                        "name": clean_p,
                        "email": planning_in.pilot_email or planning_data.get("pilot_email"),
                        "phone": planning_in.pilot_phone or planning_data.get("pilot_phone"),
                        "status": "pending_invite" if planning_in.is_pending_invite else "assigned",
                    }
                ]
            else:
                planning_data["assigned_pilots"] = []
                planning_data["assigned_pilot_id"] = None
        if planning_in.assigned_pilot_id is not None:
            planning_data["assigned_pilot_id"] = planning_in.assigned_pilot_id or None
        if planning_in.pilot_email is not None:
            planning_data["pilot_email"] = planning_in.pilot_email or None
        if planning_in.pilot_phone is not None:
            planning_data["pilot_phone"] = planning_in.pilot_phone or None
        if planning_in.is_pending_invite is not None:
            planning_data["is_pending_invite"] = bool(planning_in.is_pending_invite)
        if planning_in.assigned_pilots is not None:
            planning_data["assigned_pilots"] = planning_in.assigned_pilots
        if planning_in.assigned_drone is not None:
            planning_data["assigned_drone"] = planning_in.assigned_drone
        if planning_in.priority is not None:
            planning_data["priority"] = planning_in.priority
        if planning_in.terrain_note is not None:
            planning_data["terrain_note"] = planning_in.terrain_note
        if planning_in.planning_remarks is not None:
            planning_data["planning_remarks"] = planning_in.planning_remarks

        planning_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        planning_data["updated_by"] = current_user.full_name or current_user.email

        coords["planning"] = planning_data
        sector.polygon_coordinates = coords
        flag_modified(sector, "polygon_coordinates")
        await db.commit()
        try:
            await db.refresh(sector)
        except Exception:
            pass

        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_planning_configured",
            message=f"Ops defined planning parameters for Sector {sector.sector_code}",
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={"sector_id": str(sector.id), "sector_code": sector.sector_code},
        )
        return sector

    async def batch_assign_pilots(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        batch_in: BatchAssignPilotsRequest,
    ) -> List[Sector]:
        """Form A/Batch: Allocate multiple sectors to a registered pilot or invited pilot."""
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can assign pilots to sectors",
            )

        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        updated_sectors: List[Sector] = []
        for sec_id in batch_in.sector_ids:
            sec = await sector_repository.get_by_id(db, sec_id)
            if not sec or sec.project_id != project_id:
                continue

            coords = dict(sec.polygon_coordinates or {})
            planning_data = dict(coords.get("planning") or {})

            has_pilot = bool(batch_in.pilot_name and batch_in.pilot_name.strip())
            if has_pilot:
                p_name = batch_in.pilot_name.strip()
                planning_data["assigned_pilot"] = p_name
                planning_data["assigned_pilot_id"] = batch_in.pilot_id
                planning_data["pilot_email"] = batch_in.pilot_email
                planning_data["pilot_phone"] = batch_in.pilot_phone
                planning_data["is_pending_invite"] = bool(batch_in.is_pending_invite)
                planning_data["assigned_pilots"] = [
                    {
                        "id": batch_in.pilot_id,
                        "name": p_name,
                        "email": batch_in.pilot_email,
                        "phone": batch_in.pilot_phone,
                        "status": "pending_invite" if batch_in.is_pending_invite else "assigned",
                    }
                ]

            # Resolve scanning date for this specific sector
            sec_id_str = str(sec.id)
            sec_date = None
            if batch_in.sector_scanning_dates:
                sec_date = batch_in.sector_scanning_dates.get(sec_id_str) or batch_in.sector_scanning_dates.get(str(sec_id))
            if not sec_date and batch_in.scanning_date:
                sec_date = batch_in.scanning_date

            if sec_date and str(sec_date).strip():
                clean_date = str(sec_date).strip()
                planning_data["scanning_date"] = clean_date
                planning_data["planned_start_date"] = clean_date
                planning_data["planned_end_date"] = clean_date
            elif sec_date == "":
                planning_data["scanning_date"] = None
                planning_data["planned_start_date"] = None
                planning_data["planned_end_date"] = None

            planning_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            planning_data["updated_by"] = current_user.full_name or current_user.email

            coords["planning"] = planning_data
            sec.polygon_coordinates = coords
            flag_modified(sec, "polygon_coordinates")
            updated_sectors.append(sec)

        # Synchronize with project requirements_payload -> mobilisation -> pilots roster (only if pilot was provided)
        if batch_in.pilot_name and batch_in.pilot_name.strip():
            latest_req = None
            try:
                from app.modules.requests.repository import request_repository
                latest_req = await request_repository.get_latest_by_project_id(db, project_id)
            except Exception:
                pass

            req_payload = {}
            if latest_req and latest_req.requirements_payload:
                req_payload = copy.deepcopy(latest_req.requirements_payload)
            elif hasattr(project, "requirements_payload") and project.requirements_payload:
                req_payload = copy.deepcopy(project.requirements_payload)

            mob = dict(req_payload.get("mobilisation") or {})
            pilots = list(mob.get("pilots") or [])

            existing_idx = next(
                (
                    i for i, p in enumerate(pilots)
                    if (batch_in.pilot_email and (p.get("email") or "").strip().lower() == batch_in.pilot_email.strip().lower()) or
                       (batch_in.pilot_id and str(p.get("id")) == str(batch_in.pilot_id)) or
                       (p.get("name") or "").strip().lower() == batch_in.pilot_name.strip().lower()
                ),
                None,
            )

            pilot_entry = {
                "id": batch_in.pilot_id or f"pilot_{uuid.uuid4()}",
                "name": batch_in.pilot_name.strip(),
                "email": batch_in.pilot_email or "",
                "contactNo": batch_in.pilot_phone or "—",
                "role": "Certified Remote Pilot" if not batch_in.is_pending_invite else "Remote Pilot (Invited)",
                "is_pending_invite": bool(batch_in.is_pending_invite),
                "insuranceActive": True,
            }

            if existing_idx is not None:
                pilots[existing_idx] = {**pilots[existing_idx], **pilot_entry}
            else:
                pilots.append(pilot_entry)

            mob["pilots"] = pilots
            req_payload["mobilisation"] = mob

            if latest_req:
                latest_req.requirements_payload = req_payload
                flag_modified(latest_req, "requirements_payload")

            if hasattr(project, "requirements_payload"):
                project.requirements_payload = req_payload
                try:
                    flag_modified(project, "requirements_payload")
                except Exception:
                    pass

        await db.commit()
        try:
            for sec in updated_sectors:
                await db.refresh(sec)
            await db.refresh(project)
        except Exception:
            pass

        any_date = any(
            bool((sec.polygon_coordinates or {}).get("planning", {}).get("scanning_date"))
            for sec in updated_sectors
        )
        date_detail = " with scheduled scanning dates" if any_date else ""
        await timeline_service.log_event(
            db=db,
            category="execution",
            action="pilot_batch_assigned",
            message=f"Ops assigned {len(updated_sectors)} sector(s) to Pilot {batch_in.pilot_name}{date_detail}{' (Invitation Pending)' if batch_in.is_pending_invite else ''}",
            project_id=project_id,
            user_id=current_user.id,
            metadata={
                "pilot_name": batch_in.pilot_name,
                "pilot_email": batch_in.pilot_email,
                "sector_count": len(updated_sectors),
                "is_pending_invite": batch_in.is_pending_invite,
                "has_scanning_dates": any_date,
            },
        )

        return updated_sectors

    async def batch_schedule_dates(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        schedule_in: BatchScheduleDatesRequest,
    ) -> List[Sector]:
        """Form A / Batch: Schedule or update scanning dates for multiple sectors independently."""
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can schedule sector dates",
            )

        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        updated_sectors: List[Sector] = []
        for sec_id in schedule_in.sector_ids:
            sec = await sector_repository.get_by_id(db, sec_id)
            if not sec or sec.project_id != project_id:
                continue

            coords = dict(sec.polygon_coordinates or {})
            planning_data = dict(coords.get("planning") or {})

            sec_id_str = str(sec.id)
            sec_date = None
            if schedule_in.sector_scanning_dates:
                sec_date = schedule_in.sector_scanning_dates.get(sec_id_str) or schedule_in.sector_scanning_dates.get(str(sec_id))
            if not sec_date and schedule_in.scanning_date:
                sec_date = schedule_in.scanning_date

            if sec_date and str(sec_date).strip():
                clean_date = str(sec_date).strip()
                planning_data["scanning_date"] = clean_date
                planning_data["planned_start_date"] = clean_date
                planning_data["planned_end_date"] = clean_date
            elif sec_date == "":
                planning_data["scanning_date"] = None
                planning_data["planned_start_date"] = None
                planning_data["planned_end_date"] = None

            planning_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            planning_data["updated_by"] = current_user.full_name or current_user.email

            coords["planning"] = planning_data
            sec.polygon_coordinates = coords
            flag_modified(sec, "polygon_coordinates")
            updated_sectors.append(sec)

        await db.commit()
        try:
            for sec in updated_sectors:
                await db.refresh(sec)
        except Exception:
            pass

        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_dates_scheduled",
            message=f"Ops scheduled scanning dates for {len(updated_sectors)} sector(s)",
            project_id=project_id,
            user_id=current_user.id,
            metadata={"sector_count": len(updated_sectors)},
        )
        return updated_sectors


    async def add_sector_daily_log(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        log_in: SectorDailyLogCreate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # 1. RBAC Guard: Authorized pilot (or Admin/Operations)
        if not await self._verify_pilot_assignment(db, current_user, sector):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pilots can only log flight activity for sectors assigned to them",
            )


        # 2. Check project lifecycle: cannot log if project is completed or cancelled
        project = await project_repository.get_by_id(db, sector.project_id)
        if not project or project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daily flight logs cannot be submitted on a completed or cancelled project",
            )

        coords = dict(sector.polygon_coordinates or {})
        flight_logs = list(coords.get("flight_logs") or [])

        now_iso = datetime.now(timezone.utc).isoformat()
        log_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "date": log_in.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "landings_today": log_in.landings_today,
            "flight_start_time": log_in.flight_start_time,
            "flight_end_time": log_in.flight_end_time,
            "area_covered_today": log_in.area_covered_today or 0.0,
            "sector_status": log_in.sector_status.value if log_in.sector_status else sector.status.value,
            "weather_condition": log_in.weather_condition or "Clear",
            "remarks": log_in.remarks or "",
            "logged_by": current_user.full_name or current_user.email,
            "logged_by_role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        }
        flight_logs.append(log_entry)
        coords["flight_logs"] = flight_logs

        # Auto-update status: 1 flight / landing completes the sector
        if log_in.sector_status:
            sector.status = log_in.sector_status
        elif log_in.landings_today >= 1:
            sector.status = SectorStatusEnum.SURVEYED
        elif sector.status == SectorStatusEnum.PENDING:
            sector.status = SectorStatusEnum.IN_PROGRESS

        # Ensure logged status reflects final sector status
        log_entry["sector_status"] = sector.status.value

        sector.polygon_coordinates = coords
        await db.commit()
        await db.refresh(sector)

        # Classify capturing stage event
        weather_clean = (log_in.weather_condition or "").strip().lower()
        remarks_clean = (log_in.remarks or "").strip().lower()
        is_aborted = (
            weather_clean in ("aborted", "abort")
            or "abort" in remarks_clean
            or sector.status == SectorStatusEnum.FLAGGED
        )
        is_completed = (
            sector.status == SectorStatusEnum.SURVEYED
            or (log_in.sector_status and log_in.sector_status == SectorStatusEnum.SURVEYED)
        )
        is_delay_or_issue = (
            weather_clean in ("rain-delayed", "windy")
            or any(w in remarks_clean for w in ("delay", "rain", "wind", "issue", "problem", "battery", "sensor", "gps", "error", "fail", "hazard"))
        )

        area_str = f"{log_in.area_covered_today} sq km" if log_in.area_covered_today else ""
        sorties_cnt = max(1, log_in.landings_today) if log_in.landings_today > 0 else 1
        sorties_text = f"{sorties_cnt} Sortie{'s' if sorties_cnt != 1 else ''}"

        if is_aborted:
            event_action = "sector_flight_aborted"
            clean_event_msg = f"Sector {sector.sector_code}: Flight Aborted ({log_in.remarks or log_in.weather_condition or 'Mission aborted'})"
        elif is_completed:
            event_action = "sector_completed"
            clean_event_msg = f"Sector {sector.sector_code}: Survey Completed ({area_str or 'Target area covered'}{f' - {log_in.remarks}' if log_in.remarks else ''})"
        elif is_delay_or_issue:
            event_action = "sector_issue_reported"
            clean_event_msg = f"Sector {sector.sector_code}: Delay / Issue ({log_in.weather_condition}{f' - {log_in.remarks}' if log_in.remarks else ''})"
        else:
            event_action = "sector_flight_log_recorded"
            clean_event_msg = f"Sector {sector.sector_code}: {sorties_text} Flown ({area_str or 'Telemetry recorded'})"

        await timeline_service.log_event(
            db=db,
            category="execution",
            action=event_action,
            message=clean_event_msg,
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={
                "sector_id": str(sector.id),
                "sector_code": sector.sector_code,
                "landings_today": log_in.landings_today,
                "area_covered_today": log_in.area_covered_today,
                "weather": log_in.weather_condition,
                "status": sector.status.value,
                "remarks": log_in.remarks,
                "event_type": "abort" if is_aborted else "completion" if is_completed else "issue" if is_delay_or_issue else "sortie",
            },
        )
        return sector

    async def upload_sector_kml(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        file_bytes: bytes,
        filename: str,
    ) -> List[Sector]:
        # 1. RBAC Guard: Admin or Operations only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can upload sectorised KML flight plans",
            )

        # 2. Fetch and validate parent project
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot upload sectors for project in '{project.status.value}' state",
            )

        # 3. Parse KML / KMZ safely into normalized geometries
        parsed_sectors = kml_parser_service.parse_kml_or_kmz(file_bytes, filename)

        # 4. Resolve Plan ID if any plan exists
        plan = await planning_repository.get_active_plan_for_project(db, project_id)
        if not plan:
            plans = await planning_repository.list_by_project(db, project_id)
            plan = plans[0] if plans else None
        plan_id = plan.id if plan else None

        # 5. Cleanly replace any previous sectors for this project
        await sector_repository.delete_by_project(db, project_id)

        # 6. Insert new sectors
        created_sectors: List[Sector] = []
        total_area = 0.0
        for ps in parsed_sectors:
            total_area += ps.target_area_sqkm
            sec = await sector_repository.create(
                db=db,
                project_id=project_id,
                plan_id=plan_id,
                sector_code=ps.sector_code,
                polygon_coordinates=ps.polygon_coordinates,
                target_area_sqkm=ps.target_area_sqkm,
                estimated_flight_minutes=None,
            )
            created_sectors.append(sec)

        # 7. Transition project to ACTIVE if currently APPROVED or PLANNING
        if project.status in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.PLANNING]:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.ACTIVE)

        # 8. Log clean timeline event
        await timeline_service.log_event(
            db=db,
            category="execution",
            action="kml_sectors_ingested",
            message=f"Ops uploaded operational sector plan with {len(created_sectors)} sectors ({total_area} sq km)",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "sectors_count": len(created_sectors),
                "total_area_sqkm": total_area,
                "filename": filename,
            },
        )

        return created_sectors

    async def list_assigned_sectors(
        self,
        db: AsyncSession,
        current_user: User,
        pilot_id: uuid.UUID | None = None,
    ) -> List[dict]:
        """List flight sectors assigned to the pilot, or all scheduled sectors if Ops/Admin."""
        stmt = select(Sector).order_by(Sector.created_at.desc())
        result = await db.execute(stmt)
        sectors = list(result.scalars().all())

        project_ids = list({s.project_id for s in sectors if s.project_id})
        projects_map = {}
        if project_ids:
            for pid in project_ids:
                p = await project_repository.get_by_id(db, pid)
                if p:
                    projects_map[str(pid)] = p

        matched = []
        user_id_str = str(current_user.id)
        user_email_lower = (current_user.email or "").strip().lower()
        user_name_lower = (current_user.full_name or "").strip().lower()
        is_pilot = current_user.role == RoleEnum.PILOT
        target_pilot_id_str = str(pilot_id) if pilot_id else None

        for sec in sectors:
            coords = dict(sec.polygon_coordinates or {})
            planning = dict(coords.get("planning") or {})

            p_id = str(planning.get("assigned_pilot_id") or "").strip()
            p_email = str(planning.get("pilot_email") or "").strip().lower()
            p_name = str(planning.get("assigned_pilot") or "").strip().lower()
            assigned_list = planning.get("assigned_pilots") or []

            is_match = False
            if is_pilot:
                if (
                    (p_id and p_id == user_id_str)
                    or (p_email and p_email == user_email_lower)
                    or (p_name and p_name == user_name_lower)
                ):
                    is_match = True
                elif isinstance(assigned_list, list):
                    for ap in assigned_list:
                        if isinstance(ap, dict):
                            if (
                                str(ap.get("id") or "") == user_id_str
                                or str(ap.get("email") or "").strip().lower() == user_email_lower
                                or str(ap.get("name") or "").strip().lower() == user_name_lower
                            ):
                                is_match = True
                                break
            else:
                if target_pilot_id_str:
                    if p_id == target_pilot_id_str:
                        is_match = True
                    elif isinstance(assigned_list, list):
                        for ap in assigned_list:
                            if isinstance(ap, dict) and str(ap.get("id") or "") == target_pilot_id_str:
                                is_match = True
                                break
                else:
                    has_pilot = bool(p_id or p_name or (isinstance(assigned_list, list) and len(assigned_list) > 0))
                    has_date = bool(planning.get("scanning_date") or planning.get("planned_start_date"))
                    if has_pilot or has_date:
                        is_match = True

            if is_match:
                proj = projects_map.get(str(sec.project_id))
                scanning_date = (
                    planning.get("scanning_date")
                    or planning.get("planned_start_date")
                    or None
                )
                pilot_display = planning.get("assigned_pilot")
                if not pilot_display and isinstance(assigned_list, list) and assigned_list:
                    first_ap = assigned_list[0]
                    if isinstance(first_ap, dict):
                        pilot_display = first_ap.get("name")

                matched.append({
                    "id": str(sec.id),
                    "project_id": str(sec.project_id),
                    "project_title": proj.title if proj else "Survey Mission",
                    "project_code": getattr(proj, "project_code", None) or f"PROJ-{str(sec.project_id)[:6].upper()}",
                    "survey_location": getattr(proj, "survey_location", None) or "Field Site",
                    "client_name": getattr(proj, "client_name", None) or "Client",
                    "sector_code": sec.sector_code,
                    "status": sec.status.value if hasattr(sec.status, "value") else str(sec.status),
                    "target_area_sqkm": sec.target_area_sqkm,
                    "estimated_flight_minutes": sec.estimated_flight_minutes,
                    "polygon_coordinates": sec.polygon_coordinates,
                    "planning": planning,
                    "scanning_date": scanning_date,
                    "assigned_pilot": pilot_display,
                    "assigned_pilot_id": p_id or None,
                    "pilot_email": p_email or None,
                    "created_at": sec.created_at.isoformat() if sec.created_at else None,
                    "updated_at": sec.updated_at.isoformat() if sec.updated_at else None,
                })

        def sort_key(s):
            d = s.get("scanning_date") or "9999-99-99"
            return (d, s.get("sector_code", ""))

        matched.sort(key=sort_key)
        return matched


sector_service = SectorService()
