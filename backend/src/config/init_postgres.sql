-- TaskAssign Pro: PostgreSQL Init Schema (For Neon / Production)

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Admin', 'Lead', 'Member')) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    base_salary INTEGER DEFAULT 15000000
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) CHECK (status IN ('Planning', 'Active', 'Completed', 'OnHold')) DEFAULT 'Active',
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sub_owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 3b. Project Deletion Logs Table
CREATE TABLE IF NOT EXISTS project_deletion_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    created_by_id INTEGER,
    created_by_name VARCHAR(255),
    deleted_by_id INTEGER NOT NULL,
    deleted_by_name VARCHAR(255) NOT NULL,
    deleted_by_email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_tasks INTEGER DEFAULT 0,
    tasks_summary TEXT
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    details TEXT,
    attachments TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) CHECK (status IN ('Todo', 'InProgress', 'Review', 'Done')) DEFAULT 'Todo',
    priority VARCHAR(50) CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    due_date VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sub_owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 4b. Mapping Tables for many-to-many associations
CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_departments (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, department_id)
);

CREATE TABLE IF NOT EXISTS task_members (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_departments (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, department_id)
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date VARCHAR(50) NOT NULL,
    check_in VARCHAR(50),
    check_out VARCHAR(50),
    status VARCHAR(50) CHECK (status IN ('Present', 'Late', 'Absent')) DEFAULT 'Present',
    UNIQUE(user_id, date)
);

-- 6. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Submitted', 'Approved')) DEFAULT 'Submitted'
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. CRM Customers Table
CREATE TABLE IF NOT EXISTS crm_customers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    social VARCHAR(255),
    address TEXT,
    commission_rate NUMERIC(5,2) DEFAULT 0,
    commission_notes TEXT,
    current_project_status VARCHAR(255),
    past_projects_notes TEXT,
    forecast_quarter VARCHAR(10),
    forecast_year INTEGER,
    forecast_revenue BIGINT DEFAULT 0,
    forecast_notes TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. CRM Deals Table
CREATE TABLE IF NOT EXISTS crm_deals (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES crm_customers(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    stage VARCHAR(50) CHECK (stage IN ('lead', 'brief', 'proposal', 'meeting', 'negotiation', 'won', 'execution', 'payment_report', 'lost')) DEFAULT 'lead',
    expected_value BIGINT DEFAULT 0,
    contract_value BIGINT DEFAULT 0,
    paid_amount BIGINT DEFAULT 0,
    payment_status VARCHAR(50) CHECK (payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    brief_content TEXT,
    proposal_url TEXT,
    contract_number VARCHAR(100),
    contract_url TEXT,
    meeting_notes TEXT,
    feedback_notes TEXT,
    event_report_notes TEXT,
    expected_close_date VARCHAR(50),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. CRM Activities Table
CREATE TABLE IF NOT EXISTS crm_activities (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER REFERENCES crm_deals(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS crm_deal_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

