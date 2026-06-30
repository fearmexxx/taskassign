# TaskAssign Pro - ERP & Project Management System

**TaskAssign Pro** is a lightweight, high-performance ERP and project management system tailored for small agency teams (up to 10 users). Built with **React (TypeScript & Vite)** on the frontend, **Node.js (Express)** on the backend, and **SQLite/Postgres** support on the database layer.

The UI is optimized for a premium, readable **Asana-style** theme, featuring a dark navigation sidebar, a clean light-grey workspace background, and high-contrast typography.

---

## 🗺️ Features Map

### 1. Authentication & Security
- **JWT Authorization**: All backend API endpoints are secured using JSON Web Tokens (JWT).
- **Default Accounts**: Pre-configured with 10 dummy accounts spanning Admin, Lead, and Member roles across 4 agency departments.
- **Default Credentials**: All users utilize the password `123456` for sandbox testing.

### 2. General Dashboard
- **Performance Summary**: Displays current task statistics, check-in statuses, and report logs.
- **Interactive Check-In / Check-Out**: Quick logging button. Lateness is automatically flagged if checked-in past 9:00 AM.
- **Admin Supervision Log**: Admins can view live check-in timestamps and logs of all agency members in real-time.

### 3. Project & Task Board (Kanban)
- **Collaborative Project Setup**: Projects support:
  - Project Owner (Trưởng dự án) & Sub-Owner (Phó dự án).
  - Target Departments (Phòng ban liên quan) & Participating Members (Nhân sự tham gia).
- **Kanban Board Columns**: Cần làm (Todo), Đang làm (InProgress), Đánh giá (Review), Hoàn thành (Done).
- **Redesigned Task Cards**:
  - Task title is displayed at the top in a large, clear format.
  - Priority indicators placed at the card base with custom readability tags (High=yellow, Medium=blue, Low=slate grey).
- **Visibility Scoping**: Users only see projects and tasks they are associated with (via department alignment, assigned duties, or project membership).

### 4. Department & Personnel Manager
- **Agency Departments**: Organized into Management, Development, Design, and Marketing.
- **Sơ đồ Nhân sự (Staffing Diagram)**: Displays the roster of personnel associated with each department, their roles, and member counts.

### 5. Calendar & Attendance History
- **Personal Dashboard**: Shows calendar grids mapping due dates of active tasks.
- **Attendance Dots**: Calendar cells display color-coded indicators of past work days (Green = Present/On-time, Orange = Late, Red = Absent).

### 6. Daily Work Reports
- **Báo cáo cuối ngày**: Daily progression log submission portal.
- **Admin/Lead Filtering**: Management roles can filter and read report feeds sorted by individual staff members.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript, Lucide React (icons), vanilla CSS theme modules.
- **Backend**: Node.js, Express, JSONWebTokens, SQLite3 (local) / PostgreSQL (production client).
- **Logging System**: Express request/response logger with automatic error appending in `backend/errors.log` on status codes $\ge 500$.

---

## 🚀 Cloud Deployment Guide (Vercel + Neon + Render)

### 1. Database Setup (Neon PostgreSQL)
1. Sign up at [Neon.tech](https://neon.tech) and create a new serverless PostgreSQL project.
2. Retrieve your database connection string:
   `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`
3. Run the database migration script. You can execute the schema layout statements listed in `backend/src/config/database.js` to create the tables (`users`, `departments`, `projects`, `tasks`, `project_members`, `project_departments`, `task_members`, `task_departments`, `attendance`, `reports`) on your Neon cluster.

### 2. Backend Deployment (Render)
1. Sign up at [Render.com](https://render.com) and create a new **Web Service**.
2. Connect your Git repository containing the project.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
4. Set the Environment Variables under Render dashboard:
   - `PORT`: `5005`
   - `JWT_SECRET`: `your_jwt_signing_key`
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
5. Render will deploy the backend and expose a URL (e.g., `https://taskassign-backend.onrender.com`).

### 3. Frontend Deployment (Vercel)
1. Sign up at [Vercel.com](https://vercel.com) and link your Git repository.
2. Select the `taskassign-pro` directory as your project root.
3. Configure the build settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `tsc && vite build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - Update `vite.config.ts` target proxy endpoint to route `/api` traffic directly to your Render URL:
     ```typescript
     proxy: {
       '/api': {
         target: 'https://taskassign-backend.onrender.com',
         changeOrigin: true,
       }
     }
     ```
5. Deploy. Vercel will build and serve your static React client with global CDN routing.
