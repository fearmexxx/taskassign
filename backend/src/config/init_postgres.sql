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
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) CHECK (status IN ('Planning', 'Active', 'Completed', 'OnHold')) DEFAULT 'Active',
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sub_owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
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

-- Seed initial data
INSERT INTO departments (name, description) VALUES
('Management', 'Executive and administration team'),
('Development', 'Software engineers and developers'),
('Design', 'UI/UX and graphic designers'),
('Marketing', 'Digital marketing and sales team')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, password, role, department_id) VALUES
('Alice Smith', 'alice@agency.com', '123456', 'Admin', 1),
('Bob Jones', 'bob@agency.com', '123456', 'Lead', 2),
('Charlie Brown', 'charlie@agency.com', '123456', 'Member', 2),
('Diana Prince', 'diana@agency.com', '123456', 'Lead', 3),
('Ethan Hunt', 'ethan@agency.com', '123456', 'Member', 3),
('Fiona Gallagher', 'fiona@agency.com', '123456', 'Lead', 4),
('George Clark', 'george@agency.com', '123456', 'Member', 4),
('Hannah Abbott', 'hannah@agency.com', '123456', 'Member', 2),
('Ian Malcolm', 'ian@agency.com', '123456', 'Member', 3),
('Julia Roberts', 'julia@agency.com', '123456', 'Member', 4)
ON CONFLICT DO NOTHING;
