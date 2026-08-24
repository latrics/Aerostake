# Aerostake — Latrics Joint Ownership Portal

Aerostake is an enterprise drone joint-ownership and operations portal connecting Clients with Latrics Operations, Pilots, and Admins.

---

## 🎯 Core Product Lifecycle
1. **Onboard:** Signup & mandatory profile completion.
2. **Request:** Client creates project & submits versioned requirements (`#001`, `#002`, etc.).
3. **Plan:** Operations reviews geographic boundaries, generates sector divisions, estimates, and required pilot/drone counts.
4. **Approve Gate:** Client reviews interactive project overview (Map + interchangeable Grid/Table); approves or requests revisions.
5. **Allocate:** Operations assigns verified pilots & drone IDs sector-wise *post-approval only*.
6. **Execute:** Live sector progress tracking, flight/landing logs, operational stats, remarks, and travel responsibility.
7. **Complete & Report:** Final sector status, external payment verification, and historical reporting.

---

## 👥 User Roles
- **`CLIENT`**: Customer interface for project initiation, versioned requests, plan approvals, live sector progress tracking, and historical reports.
- **`ADMIN`**: User management, system configuration, request & planning oversight, and payment record verification.
- **`OPERATIONS`**: Planning package preparation, sector divisions, resource allocation, and operational management.
- **`PILOT`**: Mobile/field view for assigned sectors, task completion updates, flight remarks, and logs.

---

## 🛠️ Technology Stack
- **Backend:** FastAPI (Python 3.11+), SQLAlchemy Async, Alembic, Pydantic Settings, Pytest
- **Database & Cache:** PostgreSQL 16, Redis 7 (Docker Compose)
- **Frontend:** Next.js (App Router, TypeScript, TailwindCSS/Vanilla CSS), Firebase Cloud Messaging
- **Integrations:** Resend (Email), Firebase (Push Notifications)
- **Infrastructure & Deployment:** Docker, Hostinger VPS, Nginx, Let's Encrypt SSL, systemd, PM2

---

## 🚀 Local Quickstart (Phase 0)

### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 2. Verify Container Health
```bash
docker compose ps
```

---

## 📋 Progress & Documentation
- Refer to [`PROGRESS.md`](./PROGRESS.md) for the active phase and overall progress.
- Refer to [`DEV_JOURNAL.md`](./DEV_JOURNAL.md) for engineering logs, architectural decisions, and bug/gotcha records.
