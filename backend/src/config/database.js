const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Departments Table
      db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        )
      `);

      // 2. Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT CHECK(role IN ('Admin', 'Lead', 'Member')) NOT NULL,
          department_id INTEGER,
          base_salary INTEGER DEFAULT 15000000,
          FOREIGN KEY (department_id) REFERENCES departments(id)
        )
      `);

      // 3. Projects Table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          status TEXT CHECK(status IN ('Planning', 'Active', 'Completed', 'OnHold')) DEFAULT 'Active',
          start_date TEXT,
          end_date TEXT,
          owner_id INTEGER,
          sub_owner_id INTEGER,
          FOREIGN KEY (owner_id) REFERENCES users(id),
          FOREIGN KEY (sub_owner_id) REFERENCES users(id)
        )
      `);

      // 4. Tasks Table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          project_id INTEGER,
          assignee_id INTEGER,
          status TEXT CHECK(status IN ('Todo', 'InProgress', 'Review', 'Done')) DEFAULT 'Todo',
          priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
          due_date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          owner_id INTEGER,
          sub_owner_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (sub_owner_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // 4b. Mapping Tables for many-to-many associations
      db.run(`
        CREATE TABLE IF NOT EXISTS project_members (
          project_id INTEGER,
          user_id INTEGER,
          PRIMARY KEY (project_id, user_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS project_departments (
          project_id INTEGER,
          department_id INTEGER,
          PRIMARY KEY (project_id, department_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS task_members (
          task_id INTEGER,
          user_id INTEGER,
          PRIMARY KEY (task_id, user_id),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS task_departments (
          task_id INTEGER,
          department_id INTEGER,
          PRIMARY KEY (task_id, department_id),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )
      `);

      // Alter columns safely if running on an existing DB
      db.run(`ALTER TABLE users ADD COLUMN base_salary INTEGER DEFAULT 15000000`, (err) => {});
      db.run(`ALTER TABLE projects ADD COLUMN owner_id INTEGER`, (err) => {});
      db.run(`ALTER TABLE projects ADD COLUMN sub_owner_id INTEGER`, (err) => {});
      db.run(`ALTER TABLE tasks ADD COLUMN owner_id INTEGER`, (err) => {});
      db.run(`ALTER TABLE tasks ADD COLUMN sub_owner_id INTEGER`, (err) => {});

      // 5. Attendance Table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          date TEXT NOT NULL,
          check_in TEXT,
          check_out TEXT,
          status TEXT CHECK(status IN ('Present', 'Late', 'Absent')) DEFAULT 'Present',
          UNIQUE(user_id, date),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 6. Reports Table
      db.run(`
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          content TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT CHECK(status IN ('Submitted', 'Approved')) DEFAULT 'Submitted',
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Seed standard data if users are empty
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          console.log("Seeding initial data...");

          // Insert Departments
          const depts = [
            ['Management', 'Executive and administration team'],
            ['Development', 'Software engineers and developers'],
            ['Design', 'UI/UX and graphic designers'],
            ['Marketing', 'Digital marketing and sales team']
          ];

          const stmtDept = db.prepare("INSERT INTO departments (name, description) VALUES (?, ?)");
          depts.forEach(d => stmtDept.run(d));
          stmtDept.finalize();

          // Insert Users (Passwords are all '123456')
          const users = [
            ['Alice Smith', 'alice@agency.com', '123456', 'Admin', 1],
            ['Bob Jones', 'bob@agency.com', '123456', 'Lead', 2],
            ['Charlie Brown', 'charlie@agency.com', '123456', 'Member', 2],
            ['Diana Prince', 'diana@agency.com', '123456', 'Lead', 3],
            ['Ethan Hunt', 'ethan@agency.com', '123456', 'Member', 3],
            ['Fiona Gallagher', 'fiona@agency.com', '123456', 'Lead', 4],
            ['George Clark', 'george@agency.com', '123456', 'Member', 4],
            ['Hannah Abbott', 'hannah@agency.com', '123456', 'Member', 2],
            ['Ian Malcolm', 'ian@agency.com', '123456', 'Member', 3],
            ['Julia Roberts', 'julia@agency.com', '123456', 'Member', 4]
          ];

          const stmtUser = db.prepare("INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)");
          users.forEach(u => stmtUser.run(u));
          stmtUser.finalize();

          // Insert Projects with owners and sub-owners
          const projects = [
            ['Acme Website Redesign', 'Complete redesign of Acme website with dark modern theme.', 'Active', '2026-06-01', '2026-07-15', 4, 2],
            ['Mobile E-Commerce App', 'Build a React Native shopping application.', 'Planning', '2026-07-01', '2026-09-30', 2, 8],
            ['Social Media Blitz', 'Q2 Marketing and advertisement campaign.', 'Active', '2026-05-15', '2026-06-30', 6, 7]
          ];

          const stmtProj = db.prepare("INSERT INTO projects (name, description, status, start_date, end_date, owner_id, sub_owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
          projects.forEach(p => stmtProj.run(p));
          stmtProj.finalize();

          // Insert Tasks with owners and sub-owners
          const today = new Date().toISOString().split('T')[0];
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const tasks = [
            ['Figma Mockups Wireframing', 'Create full wireframes for home & contact pages', 1, 4, 'Done', 'High', today, 4, 5],
            ['Setup Express API boilerplate', 'Initialize sqlite & express server skeleton', 1, 2, 'InProgress', 'High', today, 2, 3],
            ['Implement UI Dashboard UI Layout', 'Create general layout with dark sidebar and metric panels', 1, 3, 'InProgress', 'Medium', nextWeek, 3, 5],
            ['Write Copy for Landing Page', 'Prepare sales copy & slogan ideas', 3, 6, 'Todo', 'Low', nextWeek, 6, 10],
            ['Configure JWT Auth Middleware', 'Secure routes with JWT tokens', 1, 8, 'Todo', 'High', nextWeek, 8, 3],
            ['Market Research on Competitors', 'Competitor pricing analysis and target audience definitions', 3, 7, 'Done', 'Medium', today, 7, 10]
          ];

          const stmtTask = db.prepare("INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
          tasks.forEach(t => stmtTask.run(t));
          stmtTask.finalize();

          // Seed project many-to-many associations
          const projMembers = [
            [1, 3], [1, 5], [1, 8], [2, 3], [2, 9], [3, 10]
          ];
          const stmtPM = db.prepare("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)");
          projMembers.forEach(m => stmtPM.run(m));
          stmtPM.finalize();

          const projDepts = [
            [1, 2], [1, 3], [2, 2], [3, 4]
          ];
          const stmtPD = db.prepare("INSERT INTO project_departments (project_id, department_id) VALUES (?, ?)");
          projDepts.forEach(d => stmtPD.run(d));
          stmtPD.finalize();

          // Seed task many-to-many associations
          const taskMembers = [
            [1, 9], [2, 8], [3, 9], [4, 7]
          ];
          const stmtTM = db.prepare("INSERT INTO task_members (task_id, user_id) VALUES (?, ?)");
          taskMembers.forEach(m => stmtTM.run(m));
          stmtTM.finalize();

          const taskDepts = [
            [1, 3], [2, 2], [3, 2], [3, 3], [4, 4]
          ];
          const stmtTD = db.prepare("INSERT INTO task_departments (task_id, department_id) VALUES (?, ?)");
          taskDepts.forEach(d => stmtTD.run(d));
          stmtTD.finalize();

          // Insert Attendance logs (seed for the last few days for rich visual charts)
          const stmtAtt = db.prepare("INSERT INTO attendance (user_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)");
          const dates = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            if (d.getDay() !== 0 && d.getDay() !== 6) { // skip weekends
              dates.push(d.toISOString().split('T')[0]);
            }
          }

          dates.forEach(d => {
            // Seed check-ins for Bob, Charlie, Diana, Ethan, Fiona
            stmtAtt.run(2, d, '08:45:00', '17:30:00', 'Present');
            stmtAtt.run(3, d, '09:15:00', '18:00:00', 'Late');
            stmtAtt.run(4, d, '08:50:00', '17:45:00', 'Present');
            stmtAtt.run(5, d, '08:30:00', '17:15:00', 'Present');
            stmtAtt.run(6, d, '09:20:00', '18:05:00', 'Late');
          });
          stmtAtt.finalize();

          console.log("Database seeded successfully.");
        }
        resolve();
      });
    });
  });
};

module.exports = {
  db,
  initDatabase
};
