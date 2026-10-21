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

-- 11. Comments Table (Thảo luận cho Task & Project)
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) CHECK (target_type IN ('task', 'project')) NOT NULL,
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS crm_deal_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue_address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue_lat REAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue_lng REAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue_radius INTEGER DEFAULT 300;

-- 12. Event Cues (Run of Show / Cue Sheet)
CREATE TABLE IF NOT EXISTS event_cues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cue_order INTEGER DEFAULT 1,
    cue_code VARCHAR(50),
    start_time VARCHAR(50),
    duration_mins INTEGER DEFAULT 5,
    segment_title TEXT NOT NULL,
    mc_script TEXT,
    audio_cue TEXT,
    lighting_cue TEXT,
    visual_cue TEXT,
    stage_notes TEXT,
    pic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    pic_name VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('pending', 'standby', 'live', 'done')) DEFAULT 'pending',
    live_started_at VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Event Logistics (Packing List & Equipment)
CREATE TABLE IF NOT EXISTS event_logistics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'Thiết bị AV',
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'Cái',
    pic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    pic_name VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('planned', 'checked_out', 'onsite', 'returned', 'issue')) DEFAULT 'planned',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Event Budget Items (P&L & Vendor Payment Tracker)
CREATE TABLE IF NOT EXISTS event_budget_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(100) DEFAULT 'Sản xuất & Kỹ thuật',
    item_name TEXT NOT NULL,
    vendor_name VARCHAR(255),
    vendor_phone VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Gói',
    quantity REAL DEFAULT 1,
    estimated_unit_price BIGINT DEFAULT 0,
    actual_unit_price BIGINT DEFAULT 0,
    paid_amount BIGINT DEFAULT 0,
    payment_status VARCHAR(50) CHECK (payment_status IN ('unpaid', 'deposit', 'paid')) DEFAULT 'unpaid',
    payment_due_date VARCHAR(50),
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. HR Leave, Overtime & Show Allowance Requests
CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    request_type VARCHAR(50) CHECK (request_type IN ('leave', 'comp_off', 'overtime', 'show_allowance')) DEFAULT 'leave',
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    hours_or_days REAL DEFAULT 1,
    allowance_amount BIGINT DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. HR Freelancers & Event Talent Pool
CREATE TABLE IF NOT EXISTS hr_freelancers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role_specialty VARCHAR(150) NOT NULL,
    daily_rate BIGINT DEFAULT 0,
    portfolio_link TEXT,
    bank_info TEXT,
    rating INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Voice Comms & Incident SOS Messages
CREATE TABLE IF NOT EXISTS voice_comms_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    channel VARCHAR(50) NOT NULL DEFAULT 'ALL',
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    message_type VARCHAR(50) CHECK (message_type IN ('voice', 'sos', 'cue_call')) DEFAULT 'voice',
    text_message TEXT,
    audio_data TEXT,
    duration_sec REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


