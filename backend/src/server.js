const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { db, initDatabase } = require('./config/database');
const { authenticateToken, requireRole, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Request logging & Error Interceptor Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    const bodyCopy = { ...req.body };
    if (bodyCopy.password) bodyCopy.password = '******';
    console.log(`  Payload:`, JSON.stringify(bodyCopy));
  }

  // Intercept json responses to log errors and save to errors.log
  const originalJson = res.json;
  res.json = function(body) {
    if (res.statusCode >= 400) {
      const errTimestamp = new Date().toISOString();
      const errMessage = `[${errTimestamp}] API ERROR (${res.statusCode}) on ${req.method} ${req.originalUrl}: ${JSON.stringify(body)}`;
      console.error(errMessage);

      if (res.statusCode >= 500) {
        try {
          const logFile = path.join(__dirname, '..', 'errors.log');
          const logContent = `[${errTimestamp}] ERROR (${res.statusCode}) ${req.method} ${req.originalUrl}\n` +
                             `User: ${req.user ? JSON.stringify(req.user) : 'Unauthenticated'}\n` +
                             `Response: ${JSON.stringify(body)}\n` +
                             `--------------------------------------------------\n`;
          fs.appendFileSync(logFile, logContent);
        } catch (fileErr) {
          console.error('Failed to write error to errors.log file:', fileErr);
        }
      }
    }
    return originalJson.apply(this, arguments);
  };

  // Log on complete
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Initialize Database before starting
initDatabase().then(() => {
  console.log("Database initialized successfully.");
}).catch(err => {
  console.error("Database initialization failed:", err);
});

// Helper promises for SQLite database access
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

// --- AUTHENTICATION ROUTES ---

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu không được bỏ trống' });
  }

  db.get(
    `SELECT u.*, d.name as department_name 
     FROM users u 
     LEFT JOIN departments d ON u.department_id = d.id 
     WHERE u.email = ?`,
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Don't send password
      delete user.password;
      res.json({ token, user });
    }
  );
});

// Get Current User Profile Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name as department_name 
     FROM users u 
     LEFT JOIN departments d ON u.department_id = d.id 
     WHERE u.id = ?`,
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
      res.json(user);
    }
  );
});

// --- USER MANAGEMENT ---
app.get('/api/users', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.base_salary, d.name as department_name 
     FROM users u 
     LEFT JOIN departments d ON u.department_id = d.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Create User
app.post('/api/users', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, email, password, role, department_id, base_salary } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Tên, email, mật khẩu và vai trò là bắt buộc' });
  }

  db.run(
    `INSERT INTO users (name, email, password, role, department_id, base_salary) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, password, role, department_id || null, base_salary || 15000000],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, email, role, department_id, base_salary: base_salary || 15000000 });
    }
  );
});

// Update User
app.put('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, email, password, role, department_id, base_salary } = req.body;
  const userId = req.params.id;

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, oldUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldUser) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    const updatedName = name !== undefined ? name : oldUser.name;
    const updatedEmail = email !== undefined ? email : oldUser.email;
    const updatedPassword = (password && password.trim() !== '') ? password : oldUser.password;
    const updatedRole = role !== undefined ? role : oldUser.role;
    const updatedDept = department_id !== undefined ? department_id : oldUser.department_id;
    const updatedSalary = base_salary !== undefined ? base_salary : oldUser.base_salary;

    db.run(
      `UPDATE users SET name = ?, email = ?, password = ?, role = ?, department_id = ?, base_salary = ? WHERE id = ?`,
      [updatedName, updatedEmail, updatedPassword, updatedRole, updatedDept, updatedSalary, userId],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Cập nhật nhân viên thành công' });
      }
    );
  });
});

// Delete User
app.delete('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'Không thể xóa chính tài khoản đang đăng nhập' });
  }

  db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Xóa nhân viên thành công' });
  });
});

// --- DEPARTMENT MANAGEMENT ---
app.get('/api/departments', authenticateToken, (req, res) => {
  db.all(
    `SELECT d.*, COUNT(u.id) as member_count 
     FROM departments d 
     LEFT JOIN users u ON u.department_id = d.id 
     GROUP BY d.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Create department
app.post('/api/departments', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Tên phòng ban là bắt buộc' });

  db.run(
    `INSERT INTO departments (name, description) VALUES (?, ?)`,
    [name, description],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, description });
    }
  );
});

// Update department
app.put('/api/departments/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, description } = req.body;
  const deptId = req.params.id;

  db.run(
    `UPDATE departments SET name = ?, description = ? WHERE id = ?`,
    [name, description, deptId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Tên phòng ban đã tồn tại' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Cập nhật phòng ban thành công' });
    }
  );
});

// Delete department
app.delete('/api/departments/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const deptId = req.params.id;
  db.run(`DELETE FROM departments WHERE id = ?`, [deptId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Xóa phòng ban thành công' });
  });
});

// --- PROJECT MANAGEMENT ---
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await dbAll(
      `SELECT p.*, 
              u1.name as owner_name,
              u2.name as sub_owner_name,
              COUNT(t.id) as total_tasks,
              SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks
       FROM projects p
       LEFT JOIN users u1 ON p.owner_id = u1.id
       LEFT JOIN users u2 ON p.sub_owner_id = u2.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE ? = 'Admin' 
          OR p.owner_id = ? 
          OR p.sub_owner_id = ? 
          OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
          OR p.id IN (SELECT project_id FROM project_departments WHERE department_id = ?)
       GROUP BY p.id`,
      [req.user.role, req.user.id, req.user.id, req.user.id, req.user.department_id]
    );

    // Fetch members and departments for each project
    for (let proj of projects) {
      proj.members = await dbAll(
        `SELECT pm.user_id, u.name, u.role 
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ?`,
        [proj.id]
      );

      proj.departments = await dbAll(
        `SELECT pd.department_id, d.name 
         FROM project_departments pd
         JOIN departments d ON pd.department_id = d.id
         WHERE pd.project_id = ?`,
        [proj.id]
      );
    }

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, description, status, start_date, end_date, owner_id, sub_owner_id, members, departments } = req.body;
  if (!name) return res.status(400).json({ error: 'Tên dự án là bắt buộc' });

  try {
    const result = await dbRun(
      `INSERT INTO projects (name, description, status, start_date, end_date, owner_id, sub_owner_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, status || 'Active', start_date, end_date, owner_id || null, sub_owner_id || null]
    );

    const projectId = result.lastID;

    // Save members mappings
    if (Array.isArray(members)) {
      for (let userId of members) {
        await dbRun(`INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`, [projectId, userId]);
      }
    }

    // Save departments mappings
    if (Array.isArray(departments)) {
      for (let deptId of departments) {
        await dbRun(`INSERT INTO project_departments (project_id, department_id) VALUES (?, ?)`, [projectId, deptId]);
      }
    }

    res.status(201).json({ id: projectId, name, description, status: status || 'Active', start_date, end_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const { name, description, status, start_date, end_date, owner_id, sub_owner_id, members, departments } = req.body;
  const projectId = req.params.id;

  try {
    const project = await dbGet(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    if (req.user.role !== 'Admin' && project.owner_id !== req.user.id && project.sub_owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa thiết lập dự án này' });
    }

    await dbRun(
      `UPDATE projects 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           start_date = COALESCE(?, start_date),
           end_date = COALESCE(?, end_date),
           owner_id = COALESCE(?, owner_id),
           sub_owner_id = COALESCE(?, sub_owner_id)
       WHERE id = ?`,
      [name, description, status, start_date, end_date, owner_id, sub_owner_id, projectId]
    );

    // Update members mappings
    if (Array.isArray(members)) {
      await dbRun(`DELETE FROM project_members WHERE project_id = ?`, [projectId]);
      for (let userId of members) {
        await dbRun(`INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`, [projectId, userId]);
      }
    }

    // Update departments mappings
    if (Array.isArray(departments)) {
      await dbRun(`DELETE FROM project_departments WHERE project_id = ?`, [projectId]);
      for (let deptId of departments) {
        await dbRun(`INSERT INTO project_departments (project_id, department_id) VALUES (?, ?)`, [projectId, deptId]);
      }
    }

    res.json({ message: 'Cập nhật dự án thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, requireRole(['Admin', 'Lead']), async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await dbGet(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    if (req.user.role !== 'Admin' && project.owner_id !== req.user.id && project.sub_owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa dự án này' });
    }

    db.run(`DELETE FROM projects WHERE id = ?`, [projectId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Dự án đã được xóa thành công' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK MANAGEMENT ---
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await dbAll(
      `SELECT t.*, 
              u.name as assignee_name, 
              p.name as project_name,
              u1.name as owner_name,
              u2.name as sub_owner_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u1 ON t.owner_id = u1.id
       LEFT JOIN users u2 ON t.sub_owner_id = u2.id
       WHERE ? = 'Admin' 
          OR t.assignee_id = ?
          OR t.owner_id = ?
          OR t.sub_owner_id = ?
          OR t.id IN (SELECT task_id FROM task_members WHERE user_id = ?)
          OR t.project_id IN (
             SELECT id FROM projects 
             WHERE owner_id = ? OR sub_owner_id = ? 
                OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
                OR id IN (SELECT project_id FROM project_departments WHERE department_id = ?)
          )
       ORDER BY t.due_date ASC`,
      [
        req.user.role, 
        req.user.id, 
        req.user.id, 
        req.user.id, 
        req.user.id, 
        req.user.id, 
        req.user.id, 
        req.user.id, 
        req.user.department_id
      ]
    );

    for (let task of tasks) {
      task.members = await dbAll(
        `SELECT tm.user_id, u.name 
         FROM task_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.task_id = ?`,
        [task.id]
      );

      task.departments = await dbAll(
        `SELECT td.department_id, d.name 
         FROM task_departments td
         JOIN departments d ON td.department_id = d.id
         WHERE td.task_id = ?`,
        [task.id]
      );
    }

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id, members, departments } = req.body;
  if (!title) return res.status(400).json({ error: 'Tiêu đề công việc là bắt buộc' });

  try {
    const result = await dbRun(
      `INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, project_id, assignee_id, status || 'Todo', priority || 'Medium', due_date, owner_id || null, sub_owner_id || null]
    );

    const taskId = result.lastID;

    // Save task members
    if (Array.isArray(members)) {
      for (let userId of members) {
        await dbRun(`INSERT INTO task_members (task_id, user_id) VALUES (?, ?)`, [taskId, userId]);
      }
    }

    // Save task departments
    if (Array.isArray(departments)) {
      for (let deptId of departments) {
        await dbRun(`INSERT INTO task_departments (task_id, department_id) VALUES (?, ?)`, [taskId, deptId]);
      }
    }

    const task = await dbGet(
      `SELECT t.*, u.name as assignee_name, p.name as project_name 
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { title, description, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id, members, departments } = req.body;
  const taskId = req.params.id;

  try {
    await dbRun(
      `UPDATE tasks 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           project_id = COALESCE(?, project_id),
           assignee_id = COALESCE(?, assignee_id),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           due_date = COALESCE(?, due_date),
           owner_id = COALESCE(?, owner_id),
           sub_owner_id = COALESCE(?, sub_owner_id)
       WHERE id = ?`,
      [title, description, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id, taskId]
    );

    // Update members mappings
    if (Array.isArray(members)) {
      await dbRun(`DELETE FROM task_members WHERE task_id = ?`, [taskId]);
      for (let userId of members) {
        await dbRun(`INSERT INTO task_members (task_id, user_id) VALUES (?, ?)`, [taskId, userId]);
      }
    }

    // Update departments mappings
    if (Array.isArray(departments)) {
      await dbRun(`DELETE FROM task_departments WHERE task_id = ?`, [taskId]);
      for (let deptId of departments) {
        await dbRun(`INSERT INTO task_departments (task_id, department_id) VALUES (?, ?)`, [taskId, deptId]);
      }
    }

    const task = await dbGet(
      `SELECT t.*, u.name as assignee_name, p.name as project_name 
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  db.run(`DELETE FROM tasks WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Công việc đã được xóa thành công' });
  });
});

// --- ATTENDANCE SYSTEM (CHẤM CÔNG) ---

// Daily check-in status for current user
app.get('/api/attendance/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  db.get(
    `SELECT * FROM attendance WHERE user_id = ? AND date = ?`,
    [req.user.id, today],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { check_in: null, check_out: null, status: null });
    }
  );
});

// Check-in action
app.post('/api/attendance/checkin', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS
  
  // Decide status (Late if check-in is after 09:30 AM)
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
  const status = isLate ? 'Late' : 'Present';

  db.run(
    `INSERT INTO attendance (user_id, date, check_in, status) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET check_in = COALESCE(attendance.check_in, excluded.check_in)`,
    [req.user.id, today, timeString, status],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        `SELECT * FROM attendance WHERE user_id = ? AND date = ?`,
        [req.user.id, today],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(row);
        }
      );
    }
  );
});

// Check-out action
app.post('/api/attendance/checkout', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS

  db.run(
    `UPDATE attendance 
     SET check_out = ? 
     WHERE user_id = ? AND date = ?`,
    [timeString, req.user.id, today],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        `SELECT * FROM attendance WHERE user_id = ? AND date = ?`,
        [req.user.id, today],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(row);
        }
      );
    }
  );
});

// Get user's monthly attendance logs
app.get('/api/attendance/logs', authenticateToken, (req, res) => {
  let userId = req.user.id;
  if ((req.query.user_id && req.user.role === 'Admin') || (req.query.user_id && req.user.role === 'Lead')) {
    userId = req.query.user_id;
  }

  db.all(
    `SELECT a.*, u.name as user_name 
     FROM attendance a
     JOIN users u ON a.user_id = u.id
     WHERE a.user_id = ?
     ORDER BY a.date DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get all users attendance logs
app.get('/api/attendance/admin-logs', authenticateToken, requireRole(['Admin', 'Lead']), (req, res) => {
  db.all(
    `SELECT a.*, u.name as user_name, d.name as department_name
     FROM attendance a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     ORDER BY a.date DESC, a.check_in ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET /api/attendance/salary-report
app.get('/api/attendance/salary-report', authenticateToken, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  try {
    let usersQuery = `
      SELECT u.id, u.name, u.email, u.role, u.department_id, u.base_salary, d.name as department_name 
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
    `;
    const queryParams = [];

    if (req.user.role === 'Member') {
      usersQuery += ` WHERE u.id = ?`;
      queryParams.push(req.user.id);
    } else if (req.user.role === 'Lead') {
      usersQuery += ` WHERE u.department_id = ? OR u.id = ?`;
      queryParams.push(req.user.department_id, req.user.id);
    }

    const users = await dbAll(usersQuery, queryParams);

    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return res.json([]);
    }

    const placeholders = userIds.map(() => '?').join(',');
    const attendanceLogs = await dbAll(
      `SELECT * FROM attendance 
       WHERE user_id IN (${placeholders}) AND date LIKE ?`,
      [...userIds, `${month}-%`]
    );

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const parts = timeStr.split(':').map(Number);
      if (parts.length < 2) return null;
      const h = parts[0];
      const m = parts[1];
      const s = parts[2] || 0;
      return h + m / 60 + s / 3600;
    };

    const report = users.map(u => {
      const logs = attendanceLogs.filter(log => log.user_id === u.id);
      
      let presentDays = 0;
      let lateDays = 0;
      let totalHoursWorked = 0;
      let calculatedSalary = 0;
      const dailyRate = u.base_salary / 23.0;

      logs.forEach(log => {
        if (log.status !== 'Absent') {
          presentDays++;
          if (log.status === 'Late') {
            lateDays++;
          }

          const checkInHour = parseTime(log.check_in);
          const checkOutHour = parseTime(log.check_out);

          if (checkInHour !== null && checkOutHour !== null && checkOutHour > checkInHour) {
            const effectiveStart = Math.max(checkInHour, 9.5);
            const effectiveEnd = Math.min(checkOutHour, 18.5);
            const dailyHours = Math.max(0, effectiveEnd - effectiveStart);
            
            totalHoursWorked += dailyHours;
            calculatedSalary += (dailyHours / 9.0) * dailyRate;
          }
        }
      });

      const absentDays = Math.max(0, 23 - presentDays);

      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department_name: u.department_name || 'Chưa phân bổ',
        base_salary: u.base_salary,
        target_days: 23,
        present_days: presentDays,
        late_days: lateDays,
        absent_days: absentDays,
        hours_worked: Math.round(totalHoursWorked * 100) / 100,
        calculated_salary: Math.round(calculatedSalary)
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WORK REPORTS (BÁO CÁO CÔNG VIỆC) ---

// Get reports list
app.get('/api/reports', authenticateToken, (req, res) => {
  const queryUser = req.query.user_id;
  let sql = `
    SELECT r.*, u.name as user_name, d.name as department_name 
    FROM reports r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
  `;
  const params = [];

  if (req.user.role === 'Member') {
    sql += ` WHERE r.user_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'Lead') {
    sql += ` WHERE (u.department_id = ? OR r.user_id = ?)`;
    params.push(req.user.department_id, req.user.id);
  } else if (req.user.role === 'Admin' && queryUser) {
    sql += ` WHERE r.user_id = ?`;
    params.push(queryUser);
  }

  sql += ` ORDER BY r.date DESC, r.id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Submit report
app.post('/api/reports', authenticateToken, (req, res) => {
  const { content } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (!content) {
    return res.status(400).json({ error: 'Nội dung báo cáo là bắt buộc' });
  }

  db.run(
    `INSERT INTO reports (user_id, content, date, status) VALUES (?, ?, ?, 'Submitted')`,
    [req.user.id, content, today],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, user_id: req.user.id, content, date: today, status: 'Submitted' });
    }
  );
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const logFile = path.join(__dirname, '..', 'errors.log');
  const logContent = `[${timestamp}] UNHANDLED ERROR: ${err.message}\n` +
                     `Path: ${req.method} ${req.originalUrl}\n` +
                     `User: ${req.user ? JSON.stringify(req.user) : 'Unauthenticated'}\n` +
                     `Stack: ${err.stack}\n` +
                     `--------------------------------------------------\n`;
  console.error(`[${timestamp}] Unhandled error on request:`, err);
  try {
    fs.appendFileSync(logFile, logContent);
  } catch (fileErr) {
    console.error('Failed to write error to errors.log file:', fileErr);
  }
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống nghiêm trọng' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`TaskAssign Pro backend listening on port ${PORT}`);
});
