# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PMS (Project Management System) — a full-stack web app for managing projects, phases, tasks, deliverables, and approval workflows. Backend is Spring Boot 3.2.4 (Java 17) + Maven; frontend is React 18 + TypeScript + Vite, co-located under `frontend/`.

## Build & Run Commands

### Backend only
```bash
mvn spring-boot:run                     # Run with default profile (H2/in-memory or external config)
mvn spring-boot:run -Dspring-boot.run.profiles=oracle
mvn spring-boot:run -Dspring-boot.run.profiles=postgresql
mvn clean package                       # Build pms.war (includes frontend)
```

### Frontend only (dev mode)
```bash
cd frontend
npm install
npm run dev        # Vite dev server on localhost:5173
npm run build      # tsc + vite build → frontend/dist/
npm run lint       # ESLint (max-warnings 0, will fail on any warning)
```

### Full production build
Maven's `frontend-maven-plugin` auto-installs Node v20.11.1/npm 10.2.4, runs `npm install` + `npm run build`, then copies `frontend/dist/` into `src/main/resources/static/`. Result: `target/pms.war`.

## Configuration

`application.yml` only contains profile routing. All real datasource/LDAP settings live in **external YAML files** at `D:/agile_config/pms/`:
- `application_pms.yml` — default profile
- `application-oracle_pms.yml` — oracle profile
- `application-postgresql_pms.yml` — postgresql profile

These files are not in the repo. You must create them locally with your DB credentials.

## Architecture

### Request flow
Browser → `/pms/` (base path) → Spring Boot serves React SPA from `static/`  
API calls → `/pms/api/**` → Spring controllers  
In dev: Vite proxy forwards `/pms/api` → `http://localhost:8080` (see `vite.config.ts`)

### Backend layers
```
controller/   ← REST endpoints (@CrossOrigin for localhost:5173)
service/      ← Business logic (ExportService, ImportService, LdapService, MailService)
repository/   ← Spring Data JPA interfaces (no custom SQL)
entity/       ← JPA entities with Lombok @Data
scheduler/    ← @Scheduled tasks (@EnableScheduling on PmsApplication)
config/       ← SecurityConfig, LdapConfig, DataInitializer
```

### Frontend structure
- `App.tsx` — Router with `PrivateRoute` checking `localStorage.currentUser`
- `pages/` — Full-page views (Dashboard, ProjectHub, WorkflowManagement, DeliverableTypeManagement, etc.)
- `components/` — Reusable pieces (WBSView, TaskDetailView, Sidebar, ImportModal)
- State: Zustand for global state; React hooks for local state

### Database migrations
Manual SQL scripts in `docs/sql/`, versioned by feature:
- v2: activity custom fields
- v3: display ordering for tasks and phases
- v4: project status fields
- v5: deliverables system (PostgreSQL only so far)

Run these scripts manually against your database in order when setting up or upgrading.

## Key Domain Concepts

**Project hierarchy:** Project → ProjectPhaseGate → Task (3 levels, WBS-style)

**Deliverable system (v5, in active development):**
- `DeliverableType` defines a kind of artifact with dynamic field schema (`DeliverableTypeField`: TEXT/DATE/SELECT/NUMBER)
- `Deliverable` is an instance of a type; its field values stored in `DeliverableFieldValue`
- `ActivityDeliverable` links a deliverable to any Project/Phase/Task (polymorphic via `targetType` + `targetId`)
- `Workflow` + `WorkflowStep` define approval processes; `DeliverableWorkflow` tracks per-deliverable progress; `DeliverableWorkflowLog` is the audit trail

**Attachments:** Polymorphic via `targetType` (PROJECT | PHASE | TASK | DELIVERABLE) + `targetId`. Files stored in `pms-uploads/`.

**Import/Export:** `ImportService` uses MPXJ (for .mpp) and Apache POI (for .xlsx) to parse and create project hierarchies. `ExportService` generates MS Project XML or Excel.

**LDAP auth:** `LdapService` validates credentials against LDAP; users are mirrored into `pms_users`. On startup, `PmsApplication` backfills any user whose `username` is blank with their `name` field.

## Frontend Routing

Protected routes use `PrivateRoute` (checks `localStorage.currentUser`); unauthenticated users redirect to `/login`.

| Path | Page |
|---|---|
| `/login` | Login |
| `/dashboard` | WBS/Gantt main view |
| `/projects` | Project CRUD hub |
| `/details/:targetType/:targetId` | Generic entity details |
| `/team` | User/member management |
| `/roles` | Role management |
| `/workflows` | Workflow CRUD (Owner role) |
| `/deliverable-types` | Deliverable type CRUD (Owner role) |
| `/settings` | Settings |
