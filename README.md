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
- **`CLIENT_PRIMARY`**: Organization owner / executive with survey request creation, versioned scope management, plan approval & mobilisation sign-off, and company profile governance.
- **`CLIENT_SUB`**: Subordinate team members within the client company (up to 4 members) collaborating on projects with inherited profile details.
- **`ADMIN`**: User management, system configuration, request & planning oversight, invitation management, and payment record verification.
- **`OPERATIONS`**: Planning package preparation, sector divisions, resource allocation, and operational client management.
- **`PILOT`**: Field view for assigned sectors, task completion updates, flight remarks, and daily sector logs.

---

## 🛠️ Technology Stack
- **Backend:** FastAPI (Python 3.11+), SQLAlchemy Async, Alembic, Pydantic Settings, Pytest
- **Database & Cache:** PostgreSQL 16, Redis 7 (Docker Compose)
- **Frontend:** Next.js (App Router, TypeScript, TailwindCSS/Vanilla CSS), Firebase Cloud Messaging
- **Integrations:** Resend (Email), Firebase (Push Notifications)
- **Infrastructure & Deployment:** Docker, Hostinger VPS, Nginx, Let's Encrypt SSL, systemd, PM2

---

## 🚀 Local Quickstart

### 1. Start Infrastructure (PostgreSQL & Redis)
From the project root:
```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Verify containers are running:
```bash
docker compose -f docker-compose.dev.yml ps
```

### 2. Set Up & Run the Backend API

Navigate to the `backend/` directory, activate the virtual environment, run migrations, and launch FastAPI:

**Windows (PowerShell):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Apply database migrations
python -m alembic upgrade head

# (Optional) Seed standard admin and ops accounts
python -m app.seed

# Start hot-reloading FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

> [!NOTE]
> **Windows Note:** Always run `python -m uvicorn` and `python -m alembic` instead of calling `uvicorn.exe` or `alembic.exe` directly to avoid Windows Defender Application Control (WDAC) / AppLocker blocking binary execution.

* **API Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) -> `{"status":"ok"}`
* **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Run the Frontend App

In a separate terminal, start the Next.js app:
```bash
cd frontend
pnpm install
pnpm dev
```
* **Frontend Portal:** [http://localhost:3000](http://localhost:3000)

---

## ⚡ Daily Development Workflow (Everyday Routine)

When returning to work on the project every day, follow this 3-terminal routine:

### 1️⃣ Daily Start

| Terminal | Path | Command |
|---|---|---|
| **Terminal 1 (Docker)** | `Aerostake/` | `docker compose -f docker-compose.dev.yml up -d postgres redis` |
| **Terminal 2 (Backend)** | `Aerostake/backend/` | `.\.venv\Scripts\Activate.ps1`<br>`python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` |
| **Terminal 3 (Frontend)** | `Aerostake/frontend/` | `pnpm dev` |

---

### 2️⃣ How to Check If Both Are Running

#### Option A: In the Browser
- **Backend Health:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) → should return `{"status":"ok"}`
- **Backend API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) → Swagger UI
- **Frontend App:** [http://localhost:3000](http://localhost:3000) → Aerostake Login / App

#### Option B: In PowerShell (Terminal Command)
Run this single command to check if all local services are actively listening on their ports:
```powershell
Get-NetTCPConnection -LocalPort 3000, 8000, 5432, 6379 -State Listen | Select-Object LocalPort, State
```
*Expected:* Ports `3000` (Next.js), `8000` (FastAPI), `5432` (PostgreSQL), and `6379` (Redis) will show `Listen`.

You can also ping both API endpoints directly:
```powershell
# Check Backend:
Invoke-RestMethod http://127.0.0.1:8000/health

# Check Frontend:
(Invoke-WebRequest http://localhost:3000 -UseBasicParsing).StatusCode
```

---

### 3️⃣ Daily Shutdown (End of Session)
- Press `Ctrl + C` in Terminal 2 (Backend) and Terminal 3 (Frontend).
- Spin down database containers:
  ```powershell
  docker compose -f docker-compose.dev.yml stop
  ```

---


## 📋 Progress & Documentation
- Refer to [`docs/README.md`](./docs/README.md) for the master documentation hub and architecture maps.
- Refer to [`docs/01_planning/progress_tracker.md`](./docs/01_planning/progress_tracker.md) for the phase status matrix.
- Refer to [`docs/04_engineering_records/daily_engineering_log.md`](./docs/04_engineering_records/daily_engineering_log.md) and [`docs/04_engineering_records/dev_record_booklet.md`](./docs/04_engineering_records/dev_record_booklet.md) for detailed engineering logs (REC-001 through REC-076).
