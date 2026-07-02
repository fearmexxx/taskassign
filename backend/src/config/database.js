const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const isPostgres = !!process.env.DATABASE_URL;
let db = null;
let pgPool = null;

// Helper to translate SQLite query placeholders ? to PostgreSQL $1, $2
const translateSql = (sql) => {
  if (!isPostgres) return sql;
  
  // Translate AUTOINCREMENT and SQLite types for table creations
  let translated = sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME/gi, 'TIMESTAMP');

  // Translate ? placeholders to $1, $2...
  let index = 1;
  translated = translated.replace(/\?/g, () => `$${index++}`);

  // Postgres specific: make sure EXCLUDED is uppercase
  translated = translated.replace(/excluded\./gi, 'EXCLUDED.');

  return translated;
};

if (isPostgres) {
  console.log("Database: Initializing remote PostgreSQL (Neon) connection...");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Create unified PostgreSQL db API adapter matching SQLite methods
  db = {
    serialize: (cb) => {
      // Postgres pool handles serialization implicitly, execute callback
      cb();
    },
    run: function(sql, params, callback) {
      const pgSql = translateSql(sql);
      const args = Array.isArray(params) ? params : (params ? [params] : []);
      
      // If it's an INSERT query and doesn't contain RETURNING, append RETURNING id to get lastID
      let finalSql = pgSql;
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        finalSql = pgSql + ' RETURNING id';
      }

      pgPool.query(finalSql, args, (err, res) => {
        if (err) {
          if (callback) callback(err);
          return;
        }
        if (callback) {
          const lastID = (isInsert && res.rows && res.rows[0]) ? res.rows[0].id : null;
          const context = {
            lastID: lastID,
            changes: res.rowCount
          };
          callback.call(context, null);
        }
      });
    },
    get: function(sql, params, callback) {
      const pgSql = translateSql(sql);
      const args = Array.isArray(params) ? params : (params ? [params] : []);

      pgPool.query(pgSql, args, (err, res) => {
        if (err) {
          if (callback) callback(err);
          return;
        }
        if (callback) {
          const row = (res.rows && res.rows[0]) ? res.rows[0] : null;
          // PostgreSQL returns count as a string, convert to number if present
          if (row && row.count !== undefined) {
            row.count = parseInt(row.count);
          }
          callback(null, row);
        }
      });
    },
    all: function(sql, params, callback) {
      const pgSql = translateSql(sql);
      const args = Array.isArray(params) ? params : (params ? [params] : []);

      pgPool.query(pgSql, args, (err, res) => {
        if (err) {
          if (callback) callback(err);
          return;
        }
        if (callback) {
          callback(null, res.rows || []);
        }
      });
    },
    prepare: function(sql) {
      const runs = [];
      const self = this;
      return {
        run: function(params, cb) {
          runs.push(new Promise((resolve, reject) => {
            self.run(sql, params, function(err) {
              if (err) {
                if (cb) cb(err);
                reject(err);
              } else {
                if (cb) cb.call(this, null);
                resolve();
              }
            });
          }));
        },
        finalize: function(cb) {
          Promise.all(runs)
            .then(() => { if (cb) cb(null); })
            .catch(err => { if (cb) cb(err); });
        }
      };
    }
  };
} else {
  console.log("Database: Initializing local SQLite database...");
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath);
  
  db = sqliteDb;
}

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Translate the standard SQLite schema creation commands for Postgres if running in cloud
      const runCreateTable = (sql) => {
        return new Promise((res, rej) => {
          db.run(sql, [], (err) => {
            if (err) rej(err);
            else res();
          });
        });
      };

      Promise.all([
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
          )
        `),
        runCreateTable(`
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
        `),
        runCreateTable(`
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
        `),
        runCreateTable(`
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
        `),
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS project_members (
            project_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `),
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS project_departments (
            project_id INTEGER,
            department_id INTEGER,
            PRIMARY KEY (project_id, department_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
          )
        `),
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS task_members (
            task_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (task_id, user_id),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `),
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS task_departments (
            task_id INTEGER,
            department_id INTEGER,
            PRIMARY KEY (task_id, department_id),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
          )
        `),
        runCreateTable(`
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
        `),
        runCreateTable(`
          CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            content TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT CHECK(status IN ('Submitted', 'Approved')) DEFAULT 'Submitted',
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `)
      ])
      .then(() => {
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
              ['Alice Smith', 'alice@agency.com', '123456', 'Admin', 1, 15000000],
              ['Bob Jones', 'bob@agency.com', '123456', 'Lead', 2, 12000000],
              ['Charlie Brown', 'charlie@agency.com', '123456', 'Member', 2, 8000000],
              ['Diana Prince', 'diana@agency.com', '123456', 'Lead', 3, 13000000],
              ['Ethan Hunt', 'ethan@agency.com', '123456', 'Member', 3, 9500000],
              ['Fiona Gallagher', 'fiona@agency.com', '123456', 'Lead', 4, 11000000],
              ['George Clark', 'george@agency.com', '123456', 'Member', 4, 8500000],
              ['Hannah Abbott', 'hannah@agency.com', '123456', 'Member', 2, 8000000],
              ['Ian Malcolm', 'ian@agency.com', '123456', 'Member', 3, 9000000],
              ['Julia Roberts', 'julia@agency.com', '123456', 'Member', 4, 8000000]
            ];

            const stmtUser = db.prepare("INSERT INTO users (name, email, password, role, department_id, base_salary) VALUES (?, ?, ?, ?, ?, ?)");
            users.forEach(u => stmtUser.run(u));
            stmtUser.finalize();

            // Insert Projects
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const projects = [
              ['Acme Web Design', 'Redesign of corporate website with Figma mockup layouts', 'Active', today, nextWeek, 2, 3],
              ['CRM Mobile Application', 'Build core REST endpoints and Flutter integration dashboards', 'Active', today, nextWeek, 4, 5],
              ['Social Media Campaign', 'Develop content calendar & schedule design posts', 'Active', today, nextWeek, 6, 7]
            ];

            const stmtProj = db.prepare("INSERT INTO projects (name, description, status, start_date, end_date, owner_id, sub_owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            projects.forEach(p => stmtProj.run(p));
            stmtProj.finalize();

            // Insert Tasks
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
      })
      .catch((err) => {
        reject(err);
      });
    });
  });
};

module.exports = {
  db,
  initDatabase
};
