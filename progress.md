# Progress & Revisions Log

This log tracks the build history, feature additions, styling changes, and deployment plans for **TaskAssign Pro**.

---

## 📅 Chronological Updates

### Phase 1: Core ERP Foundations
- **Feature**: Built a light-scale ERP system tailored for an agency of 10 users.
- **Components**:
  - Daily Check-in & Chấm công (Attendance tracker with automatic lateness detection at 9:00 AM).
  - Department overview & structure management panel.
  - Kanban Board view featuring columns: Cần làm (Todo), Đang làm (InProgress), Đánh giá (Review), Hoàn thành (Done).
  - Daily Work Reports submission feed (Báo cáo ngày).
- **Security**: Complete JWT-based auth guard structure with role-based restrictions (`Admin`, `Lead`, `Member`).

### Phase 2: Role Scoping & Translation
- **Vietnamese Translation**: Localized all tabs, modals, buttons, and state indicators.
- **Visibility Scoping**: Restricted project and task queries so members only see items that match their participating projects, personal tasks, or departments.
- **Project Detail Overhaul**: Added lists displaying name tags of all members participating in the project.

### Phase 3: Card Layout & UI Restyling
- **Priority Formatting**: Redesigned Kanban task cards:
  - Title moved to the very top with larger, bolder typeface.
  - Priority badge positioned at the bottom with colors matching the background theme:
    - **High (Cao)**: Yellow text (`#d97706`).
    - **Medium (Trung bình)**: Blue text (`#2563eb`).
    - **Low (Thấp)**: White text on slate-grey badge (`#64748b`) for readability.
- **Asana Style Theme Overhaul**: Changed colors to easier read on computers:
  - Main workspace background set to light grey (`#f9f9fb`).
  - Cards, filters, details, and modal background panels converted to solid white (`#ffffff`).
  - Content text contrast increased using deep charcoal/black (`#151b26`).
  - Nav sidebar maintained in deep dark mode (`#1e1f21`) per specifications.

### Phase 4: Port Adjustment & Error Logging
- **Port config**: Switched client development port from `3000` to `3010`.
- **Backend Logging**:
  - Implemented request logging middleware showing incoming request data, payloads (with passwords masked), status, and response time.
  - Implemented automatic file logging to `backend/errors.log` on error responses ($\ge 500$) for production rollout diagnostics.

---

## 🚀 Deployment Plan (Vercel + Neon + Render)

The system is configured to roll out on the following platforms:
1. **Frontend**: Deployed on **Vercel** (connects to the Git repository, builds `tsc && vite build` and serves static files globally).
2. **Backend**: Deployed on **Render** (Node.js web service running `node src/server.js`).
3. **Database**: Migrating SQLite to **Neon PostgreSQL** (serverless Postgres instance with free tier).
