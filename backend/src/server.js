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
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

// --- NOTIFICATION HELPER ---

/**
 * Tạo thông báo in-app cho một user
 * @param {number} userId  - ID của người nhận
 * @param {string} type    - 'task_assigned' | 'project_added' | 'task_updated'
 * @param {string} title   - Tiêu đề ngắn
 * @param {string} message - Nội dung chi tiết
 * @param {number|null} referenceId   - ID task hoặc project liên quan
 * @param {string|null} referenceType - 'task' | 'project'
 */
const createNotification = async (userId, type, title, message, referenceId = null, referenceType = null) => {
  try {
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, is_read, reference_id, reference_type, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, type, title, message, referenceId, referenceType]
    );
  } catch (err) {
    console.error(`[Notification] Failed to create notification for user ${userId}:`, err.message);
  }
};

// --- AUTHENTICATION ROUTES ---

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu không được bỏ trống' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.toString().trim();

  // Tạo email thay thế tương ứng để hỗ trợ cả 2 domain @vbe.com.vn và @agency.com
  let altEmail = cleanEmail;
  if (cleanEmail.endsWith('@vbe.com.vn')) {
    altEmail = cleanEmail.replace('@vbe.com.vn', '@agency.com');
  } else if (cleanEmail.endsWith('@agency.com')) {
    altEmail = cleanEmail.replace('@agency.com', '@vbe.com.vn');
  }

  db.get(
    `SELECT u.*, d.name as department_name 
     FROM users u 
     LEFT JOIN departments d ON u.department_id = d.id 
     WHERE LOWER(u.email) = ? OR LOWER(u.email) = ?`,
    [cleanEmail, altEmail],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user || user.password !== cleanPassword) {
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
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.base_salary, d.name as department_name 
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

// Update Current User Profile (Name, Email)
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Họ tên và email là bắt buộc' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Kiểm tra email xem có bị trùng với user khác không
  db.get(`SELECT id FROM users WHERE LOWER(email) = ? AND id != ?`, [cleanEmail, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Email này đã được sử dụng bởi tài khoản khác' });

    db.run(
      `UPDATE users SET name = ?, email = ? WHERE id = ?`,
      [cleanName, cleanEmail, req.user.id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        db.get(
          `SELECT u.id, u.name, u.email, u.role, u.department_id, u.base_salary, d.name as department_name 
           FROM users u 
           LEFT JOIN departments d ON u.department_id = d.id 
           WHERE u.id = ?`,
          [req.user.id],
          (fetchErr, updatedUser) => {
            if (fetchErr) return res.status(500).json({ error: fetchErr.message });
            res.json({
              message: 'Cập nhật thông tin thành công',
              user: updatedUser
            });
          }
        );
      }
    );
  });
});

// Change Current User Password
app.put('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  db.get(`SELECT password FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    if (user.password !== currentPassword.toString().trim()) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    db.run(
      `UPDATE users SET password = ? WHERE id = ?`,
      [newPassword.toString().trim(), req.user.id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ message: 'Đổi mật khẩu thành công' });
      }
    );
  });
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
    let query = `
      SELECT p.*, 
             u1.name as owner_name,
             u2.name as sub_owner_name,
             u3.name as creator_name,
             COUNT(t.id) as total_tasks,
             SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks
      FROM projects p
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.sub_owner_id = u2.id
      LEFT JOIN users u3 ON p.created_by = u3.id
      LEFT JOIN tasks t ON t.project_id = p.id
    `;
    const params = [];

    if (req.user.role === 'Admin') {
      // Admin sees all projects
      query += ` GROUP BY p.id, u1.name, u2.name, u3.name ORDER BY p.id DESC`;
    } else if (req.user.role === 'Lead') {
      // Lead sees projects where they are creator/owner/sub_owner/member OR projects belonging to their department
      query += `
        WHERE p.created_by = ?
           OR p.owner_id = ? 
           OR p.sub_owner_id = ? 
           OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
           OR p.id IN (SELECT project_id FROM project_departments WHERE department_id = ?)
        GROUP BY p.id, u1.name, u2.name, u3.name
        ORDER BY p.id DESC
      `;
      params.push(req.user.id, req.user.id, req.user.id, req.user.id, req.user.department_id);
    } else {
      // Member sees projects where they are creator, owner, sub_owner, or in project_members
      query += `
        WHERE p.created_by = ?
           OR p.owner_id = ? 
           OR p.sub_owner_id = ? 
           OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
        GROUP BY p.id, u1.name, u2.name, u3.name
        ORDER BY p.id DESC
      `;
      params.push(req.user.id, req.user.id, req.user.id, req.user.id);
    }

    const projects = await dbAll(query, params);

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

// Create project - ALL employees are allowed to create projects
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, description, status, start_date, end_date, owner_id, sub_owner_id, members, departments } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên dự án là bắt buộc' });

  try {
    const trimmedName = name.trim();
    const defaultOwnerId = owner_id || req.user.id;
    const result = await dbRun(
      `INSERT INTO projects (name, description, status, start_date, end_date, owner_id, sub_owner_id, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [trimmedName, description || '', status || 'Active', start_date || null, end_date || null, defaultOwnerId, sub_owner_id || null, req.user.id]
    );

    const projectId = result.lastID;

    // Build complete member list (ensure creator and owner are always included)
    let memberSet = new Set(Array.isArray(members) ? members : []);
    if (req.user.id) memberSet.add(Number(req.user.id));
    if (defaultOwnerId) memberSet.add(Number(defaultOwnerId));
    if (sub_owner_id) memberSet.add(Number(sub_owner_id));

    for (let userId of memberSet) {
      if (userId) {
        await dbRun(`INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [projectId, userId]);
      }
    }

    // Save departments mappings
    let targetDepts = Array.isArray(departments) ? [...departments] : [];
    // If user has a department and no depts were selected, associate creator's department
    if (targetDepts.length === 0 && req.user.department_id) {
      targetDepts.push(req.user.department_id);
    }

    for (let deptId of targetDepts) {
      if (deptId) {
        await dbRun(`INSERT INTO project_departments (project_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [projectId, deptId]);
      }
    }

    // --- Fire notifications for project creation ---
    const pCreatorName = req.user.name || 'Ai đó';
    for (const uid of memberSet) {
      if (uid && uid !== req.user.id) {
        createNotification(
          uid,
          'project_added',
          `Bạn được thêm vào dự án mới`,
          `${pCreatorName} đã thêm bạn vào dự án "${trimmedName}".`,
          projectId,
          'project'
        );
      }
    }

    res.status(201).json({ 
      id: projectId, 
      name: trimmedName, 
      description, 
      status: status || 'Active', 
      start_date, 
      end_date,
      owner_id: defaultOwnerId,
      sub_owner_id: sub_owner_id || null,
      created_by: req.user.id
    });
  } catch (err) {
    console.error("Create project error:", err);
    if (err.code === '23505' || (err.message && err.message.includes('unique'))) {
      return res.status(400).json({ error: `Tên dự án "${name}" đã tồn tại. Vui lòng chọn tên khác hoặc phân biệt tên.` });
    }
    res.status(500).json({ error: err.message || 'Lỗi hệ thống khi tạo dự án' });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const { name, description, status, start_date, end_date, owner_id, sub_owner_id, members, departments } = req.body;
  const projectId = req.params.id;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên dự án là bắt buộc' });

  try {
    // Permission check: Admin, Project Creator, or Project Owner can edit project settings
    const currentProj = await dbGet(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (!currentProj) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    const canEdit = req.user.role === 'Admin' || 
                    currentProj.created_by === req.user.id || 
                    currentProj.owner_id === req.user.id ||
                    currentProj.sub_owner_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa dự án này' });
    }

    await dbRun(
      `UPDATE projects 
       SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, owner_id = ?, sub_owner_id = ?
       WHERE id = ?`,
      [name.trim(), description || '', status || 'Active', start_date || null, end_date || null, owner_id || null, sub_owner_id || null, projectId]
    );

    // Update members
    if (Array.isArray(members)) {
      // Capture old member IDs before deleting
      const oldProjMembers = await dbAll(`SELECT user_id FROM project_members WHERE project_id = ?`, [projectId]);
      const oldMemberSet = new Set(oldProjMembers.map(r => r.user_id));

      await dbRun(`DELETE FROM project_members WHERE project_id = ?`, [projectId]);
      for (let userId of members) {
        await dbRun(`INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`, [projectId, userId]);
      }

      // Notify newly added members
      const pUpdaterName = req.user.name || 'Ai đó';
      const pName = name.trim();
      for (const userId of members) {
        if (!oldMemberSet.has(Number(userId)) && Number(userId) !== req.user.id) {
          createNotification(
            Number(userId),
            'project_added',
            `Bạn được thêm vào dự án`,
            `${pUpdaterName} đã thêm bạn vào dự án "${pName}".`,
            Number(projectId),
            'project'
          );
        }
      }
    }

    // Update departments
    if (Array.isArray(departments)) {
      await dbRun(`DELETE FROM project_departments WHERE project_id = ?`, [projectId]);
      for (let deptId of departments) {
        await dbRun(`INSERT INTO project_departments (project_id, department_id) VALUES (?, ?)`, [projectId, deptId]);
      }
    }

    res.json({ message: 'Cập nhật dự án thành công' });
  } catch (err) {
    console.error("Update project error:", err);
    if (err.code === '23505' || (err.message && err.message.includes('unique'))) {
      return res.status(400).json({ error: `Tên dự án "${name}" đã tồn tại trên một dự án khác.` });
    }
    res.status(500).json({ error: err.message || 'Lỗi khi cập nhật dự án' });
  }
});

// Delete project - Only the creator OR an Admin can delete a project. Log full audit history!
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await dbGet(`
      SELECT p.*, u.name as creator_name 
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id 
      WHERE p.id = ?
    `, [projectId]);
    
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    // Deletion rule: User can ONLY delete if they are Admin or if they created this project
    const canDelete = req.user.role === 'Admin' || project.created_by === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Bạn chỉ có quyền xóa dự án do chính bạn tạo.' });
    }

    // Fetch tasks belonging to this project for detailed audit summary
    const projectTasks = await dbAll(`SELECT id, title, status FROM tasks WHERE project_id = ?`, [projectId]);
    const totalTasks = projectTasks ? projectTasks.length : 0;
    const taskTitles = projectTasks && projectTasks.length > 0 
      ? projectTasks.map(t => `${t.title} [${t.status}]`).join('; ')
      : 'Không có công việc nào';

    // 1. Write deletion audit log
    try {
      await dbRun(
        `INSERT INTO project_deletion_logs 
         (project_id, project_name, project_description, created_by_id, created_by_name, deleted_by_id, deleted_by_name, deleted_by_email, total_tasks, tasks_summary) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.name,
          project.description || '',
          project.created_by || null,
          project.creator_name || 'Không rõ',
          req.user.id,
          req.user.name,
          req.user.email,
          totalTasks,
          taskTitles
        ]
      );
    } catch (logErr) {
      console.error("Error writing project deletion log:", logErr);
    }

    // 2. Cascading cleanups to avoid foreign key conflicts
    for (const t of projectTasks) {
      await dbRun(`DELETE FROM task_members WHERE task_id = ?`, [t.id]);
      await dbRun(`DELETE FROM task_departments WHERE task_id = ?`, [t.id]);
    }
    await dbRun(`DELETE FROM tasks WHERE project_id = ?`, [projectId]);
    await dbRun(`DELETE FROM project_members WHERE project_id = ?`, [projectId]);
    await dbRun(`DELETE FROM project_departments WHERE project_id = ?`, [projectId]);
    await dbRun(`DELETE FROM projects WHERE id = ?`, [projectId]);

    res.json({ message: 'Dự án đã được xóa thành công và đã ghi nhật ký hệ thống' });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: View project deletion audit logs
app.get('/api/admin/project-deletion-logs', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const logs = await dbAll(`
      SELECT * FROM project_deletion_logs 
      ORDER BY id DESC
    `);
    res.json(logs || []);
  } catch (err) {
    console.error("Error fetching project deletion logs:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- TASK MANAGEMENT ---
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT t.*, 
             u.name as assignee_name, 
             p.name as project_name,
             u1.name as owner_name,
             u2.name as sub_owner_name,
             u3.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.owner_id = u1.id
      LEFT JOIN users u2 ON t.sub_owner_id = u2.id
      LEFT JOIN users u3 ON t.created_by = u3.id
    `;
    const params = [];

    if (req.user.role === 'Admin') {
      // Admin sees all tasks
      query += ` ORDER BY t.due_date ASC`;
    } else if (req.user.role === 'Lead') {
      // Lead sees tasks assigned to them, owned by them, created by them, or tasks in projects of their dept
      query += `
        WHERE t.assignee_id = ?
           OR t.owner_id = ?
           OR t.sub_owner_id = ?
           OR t.created_by = ?
           OR t.id IN (SELECT task_id FROM task_members WHERE user_id = ?)
           OR t.project_id IN (
              SELECT id FROM projects 
              WHERE owner_id = ? OR sub_owner_id = ? OR created_by = ?
                 OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
                 OR id IN (SELECT project_id FROM project_departments WHERE department_id = ?)
           )
        ORDER BY t.due_date ASC
      `;
      params.push(
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.department_id
      );
    } else {
      // Member sees tasks where they are assignee, owner, sub-owner, creator, in task_members,
      // OR tasks in projects they explicitly belong to / created
      query += `
        WHERE t.assignee_id = ?
           OR t.owner_id = ?
           OR t.sub_owner_id = ?
           OR t.created_by = ?
           OR t.id IN (SELECT task_id FROM task_members WHERE user_id = ?)
           OR t.project_id IN (
              SELECT id FROM projects 
              WHERE owner_id = ? OR sub_owner_id = ? OR created_by = ?
                 OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
           )
        ORDER BY t.due_date ASC
      `;
      params.push(
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id,
        req.user.id
      );
    }

    const tasks = await dbAll(query, params);

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

// Create task - All members in project can create tasks
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, details, attachments, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id, members, departments } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Tiêu đề công việc là bắt buộc' });
  if (!project_id) return res.status(400).json({ error: 'Dự án là bắt buộc' });

  try {
    const rawAttachments = attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null;
    const defaultOwnerId = owner_id || req.user.id;

    const result = await dbRun(
      `INSERT INTO tasks (title, description, details, attachments, created_by, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(), 
        description || '', 
        details || '', 
        rawAttachments, 
        req.user.id, 
        project_id, 
        assignee_id || null, 
        status || 'Todo', 
        priority || 'Medium', 
        due_date || null, 
        defaultOwnerId, 
        sub_owner_id || null
      ]
    );

    const taskId = result.lastID;

    // Save task members (include PIC and creator)
    let memberSet = new Set(Array.isArray(members) ? members : []);
    if (defaultOwnerId) memberSet.add(Number(defaultOwnerId));
    if (sub_owner_id) memberSet.add(Number(sub_owner_id));

    for (let userId of memberSet) {
      if (userId) {
        await dbRun(`INSERT INTO task_members (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [taskId, userId]);
      }
    }

    // Save task departments
    if (Array.isArray(departments)) {
      for (let deptId of departments) {
        if (deptId) {
          await dbRun(`INSERT INTO task_departments (task_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [taskId, deptId]);
        }
      }
    }

    const task = await dbGet(
      `SELECT t.*, u.name as assignee_name, p.name as project_name, u1.name as owner_name, u2.name as sub_owner_name, u3.name as creator_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u1 ON t.owner_id = u1.id
       LEFT JOIN users u2 ON t.sub_owner_id = u2.id
       LEFT JOIN users u3 ON t.created_by = u3.id
       WHERE t.id = ?`,
      [taskId]
    );

    task.members = await dbAll(
      `SELECT tm.user_id, u.name 
       FROM task_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.task_id = ?`,
      [taskId]
    );

    task.departments = await dbAll(
      `SELECT td.department_id, d.name 
       FROM task_departments td
       JOIN departments d ON td.department_id = d.id
       WHERE td.task_id = ?`,
      [taskId]
    );

    // --- Fire notifications (async, không block response) ---
    const creatorId = req.user.id;
    const creatorName = req.user.name || 'Ai đó';
    const projectName = task.project_name || 'dự án';
    const notifyUserIds = new Set();

    // Notify PIC/owner nếu khác người tạo
    if (defaultOwnerId && Number(defaultOwnerId) !== creatorId) {
      notifyUserIds.add(Number(defaultOwnerId));
    }
    // Notify tất cả members được gán (trừ người tạo)
    for (const m of task.members || []) {
      if (m.user_id !== creatorId) notifyUserIds.add(m.user_id);
    }

    for (const uid of notifyUserIds) {
      createNotification(
        uid,
        'task_assigned',
        `Bạn được giao công việc mới`,
        `${creatorName} đã giao cho bạn task "${task.title}" trong ${projectName}.`,
        taskId,
        'task'
      );
    }

    res.status(201).json(task);
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { title, description, details, attachments, project_id, assignee_id, status, priority, due_date, owner_id, sub_owner_id, members, departments } = req.body;
  const taskId = req.params.id;

  try {
    const currentTask = await dbGet(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (!currentTask) return res.status(404).json({ error: 'Không tìm thấy công việc' });

    const rawAttachments = attachments !== undefined 
      ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) 
      : currentTask.attachments;

    await dbRun(
      `UPDATE tasks 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           details = COALESCE(?, details),
           attachments = ?,
           project_id = COALESCE(?, project_id),
           assignee_id = COALESCE(?, assignee_id),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           due_date = COALESCE(?, due_date),
           owner_id = COALESCE(?, owner_id),
           sub_owner_id = COALESCE(?, sub_owner_id)
       WHERE id = ?`,
      [
        title ? title.trim() : null, 
        description !== undefined ? description : null, 
        details !== undefined ? details : null, 
        rawAttachments, 
        project_id || null, 
        assignee_id || null, 
        status || null, 
        priority || null, 
        due_date || null, 
        owner_id || null, 
        sub_owner_id || null, 
        taskId
      ]
    );

    // Update members mappings
    if (Array.isArray(members)) {
      await dbRun(`DELETE FROM task_members WHERE task_id = ?`, [taskId]);
      for (let userId of members) {
        if (userId) {
          await dbRun(`INSERT INTO task_members (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [taskId, userId]);
        }
      }
    }

    // Update departments mappings
    if (Array.isArray(departments)) {
      await dbRun(`DELETE FROM task_departments WHERE task_id = ?`, [taskId]);
      for (let deptId of departments) {
        if (deptId) {
          await dbRun(`INSERT INTO task_departments (task_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [taskId, deptId]);
        }
      }
    }

    const task = await dbGet(
      `SELECT t.*, u.name as assignee_name, p.name as project_name, u1.name as owner_name, u2.name as sub_owner_name, u3.name as creator_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u1 ON t.owner_id = u1.id
       LEFT JOIN users u2 ON t.sub_owner_id = u2.id
       LEFT JOIN users u3 ON t.created_by = u3.id
       WHERE t.id = ?`,
      [taskId]
    );

    task.members = await dbAll(
      `SELECT tm.user_id, u.name 
       FROM task_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.task_id = ?`,
      [taskId]
    );

    task.departments = await dbAll(
      `SELECT td.department_id, d.name 
       FROM task_departments td
       JOIN departments d ON td.department_id = d.id
       WHERE td.task_id = ?`,
      [taskId]
    );

    // --- Fire notifications for task update ---
    const updaterName = req.user.name || 'Ai đó';
    const taskTitle = task.title || 'công việc';
    const projName = task.project_name || 'dự án';

    // Notify new owner nếu owner_id thay đổi và khác người cập nhật
    if (owner_id && Number(owner_id) !== Number(currentTask.owner_id) && Number(owner_id) !== req.user.id) {
      createNotification(
        Number(owner_id),
        'task_assigned',
        `Bạn được giao làm PIC công việc`,
        `${updaterName} đã chỉ định bạn làm người phụ trách "${taskTitle}" trong ${projName}.`,
        Number(taskId),
        'task'
      );
    }

    // Notify members mới được thêm vào (nếu members được update)
    if (Array.isArray(members)) {
      const oldMemberIds = new Set(
        (await dbAll(`SELECT user_id FROM task_members WHERE task_id = ?`, [taskId])).map(r => r.user_id)
      );
      // So sánh với members vừa được update (đã INSERT ở trên, đọc lại từ task.members)
      for (const m of task.members || []) {
        if (!oldMemberIds.has(m.user_id) && m.user_id !== req.user.id) {
          createNotification(
            m.user_id,
            'task_assigned',
            `Bạn được thêm vào công việc`,
            `${updaterName} đã thêm bạn vào task "${taskTitle}" trong ${projName}.`,
            Number(taskId),
            'task'
          );
        }
      }
    }

    res.json(task);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete task - Creator, PIC, Project Owner, or Admin can delete
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  try {
    const task = await dbGet(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });

    let canDelete = req.user.role === 'Admin' || task.created_by === req.user.id || task.owner_id === req.user.id;
    if (!canDelete && task.project_id) {
      const project = await dbGet(`SELECT owner_id, created_by FROM projects WHERE id = ?`, [task.project_id]);
      if (project && (project.owner_id === req.user.id || project.created_by === req.user.id)) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa công việc này' });
    }

    await dbRun(`DELETE FROM task_members WHERE task_id = ?`, [taskId]);
    await dbRun(`DELETE FROM task_departments WHERE task_id = ?`, [taskId]);
    await dbRun(`DELETE FROM tasks WHERE id = ?`, [taskId]);

    res.json({ message: 'Công việc đã được xóa thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project Department & Overall Progress Matrix
app.get('/api/projects/:id/progress-matrix', authenticateToken, async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = await dbGet(`SELECT * FROM projects WHERE id = ?`, [projectId]);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    // 1. Overall project progress for Executive / General Management
    const overallRow = await dbGet(`
      SELECT 
        COUNT(id) as total,
        SUM(CASE WHEN status = 'Todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'InProgress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as review,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done
      FROM tasks
      WHERE project_id = ?
    `, [projectId]);

    const totalTasks = overallRow ? parseInt(overallRow.total || 0) : 0;
    const completedTasks = overallRow ? parseInt(overallRow.done || 0) : 0;
    const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overall = {
      total: totalTasks,
      todo: overallRow ? parseInt(overallRow.todo || 0) : 0,
      in_progress: overallRow ? parseInt(overallRow.in_progress || 0) : 0,
      review: overallRow ? parseInt(overallRow.review || 0) : 0,
      done: completedTasks,
      percent: overallCompletion
    };

    // 2. Department-level breakdown for this project
    // Fetch all active departments
    const allDepts = await dbAll(`SELECT id, name FROM departments ORDER BY id ASC`);
    
    // For each department, find tasks that either:
    // (a) are explicitly associated with the department via task_departments, OR
    // (b) have owner or assignee belonging to that department
    const deptsProgress = [];
    for (const d of allDepts) {
      const deptTasks = await dbAll(`
        SELECT DISTINCT t.id, t.status 
        FROM tasks t
        LEFT JOIN task_departments td ON td.task_id = t.id
        LEFT JOIN users u_owner ON t.owner_id = u_owner.id
        LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
        WHERE t.project_id = ?
          AND (td.department_id = ? OR u_owner.department_id = ? OR u_assignee.department_id = ?)
      `, [projectId, d.id, d.id, d.id]);

      if (deptTasks && deptTasks.length > 0) {
        const dTotal = deptTasks.length;
        const dDone = deptTasks.filter(t => t.status === 'Done').length;
        const dTodo = deptTasks.filter(t => t.status === 'Todo').length;
        const dInProgress = deptTasks.filter(t => t.status === 'InProgress').length;
        const dReview = deptTasks.filter(t => t.status === 'Review').length;
        const dPercent = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0;

        deptsProgress.push({
          department_id: d.id,
          department_name: d.name,
          total: dTotal,
          todo: dTodo,
          in_progress: dInProgress,
          review: dReview,
          done: dDone,
          percent: dPercent
        });
      }
    }

    res.json({
      project_id: parseInt(projectId),
      project_name: project.name,
      overall,
      departments: deptsProgress
    });
  } catch (err) {
    console.error("Progress matrix error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ATTENDANCE SYSTEM (CHẤM CÔNG VBE AGENCY) ---

// Vietnam Timezone (GMT+7) Helper
const getVietnamTime = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  
  const dateString = `${map.year}-${map.month}-${map.day}`;
  const timeString = `${map.hour}:${map.minute}:${map.second}`;
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  
  return { dateString, timeString, hour, minute };
};

// Daily check-in status for current user
app.get('/api/attendance/today', authenticateToken, (req, res) => {
  const today = getVietnamTime().dateString;
  db.get(
    `SELECT * FROM attendance WHERE user_id = ? AND date = ?`,
    [req.user.id, today],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { check_in: null, check_out: null, status: null });
    }
  );
});

// Get team attendance status today:
// - Admin (vinh@vbe.vn): all agency
// - Lead (Trưởng phòng): department members
// - Member (Nhân viên): only self
app.get('/api/attendance/today-team', authenticateToken, async (req, res) => {
  try {
    const today = getVietnamTime().dateString;
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.department_id, d.name as department_name,
             a.check_in, a.check_out, a.status as attendance_status,
             a.check_in_distance, a.check_in_location_type, a.check_in_reason, a.check_in_address
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
    `;
    const params = [today];

    if (req.user.email === 'vinh@vbe.vn' || req.user.role === 'Admin') {
      // Admin sees everyone in the agency
    } else if (req.user.role === 'Lead') {
      // Lead sees staff in their department or self
      query += ` WHERE (u.department_id = ? OR u.id = ?)`;
      params.push(req.user.department_id, req.user.id);
    } else {
      // Member can ONLY see their own attendance status
      query += ` WHERE u.id = ?`;
      params.push(req.user.id);
    }

    query += `
      ORDER BY 
        CASE WHEN a.check_in IS NOT NULL THEN 0 ELSE 1 END,
        a.check_in ASC,
        u.name ASC
    `;

    const usersWithAttendance = await dbAll(query, params);
    res.json(usersWithAttendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Get company office settings (GPS coordinates, address, wifi name, radius)
app.get('/api/company/settings', authenticateToken, (req, res) => {
  db.get(`SELECT * FROM company_settings ORDER BY id ASC LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {
      company_name: 'VBE Agency',
      office_address: '772 EFG Sư Vạn Hạnh, Phường 12 (Hoà Hưng), Quận 10, TP.HCM',
      office_lat: 10.7745,
      office_lng: 106.6685,
      max_distance_meters: 200,
      allowed_wifi_name: 'VBE Agency',
      require_gps: 1,
      require_wifi: 0
    });
  });
});

// Update company office settings (Admin only)
app.put('/api/company/settings', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { company_name, office_address, office_lat, office_lng, max_distance_meters, allowed_wifi_name, require_gps, require_wifi } = req.body;
  
  db.get(`SELECT id FROM company_settings ORDER BY id ASC LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row) {
      db.run(
        `UPDATE company_settings 
         SET company_name = ?, office_address = ?, office_lat = ?, office_lng = ?, 
             max_distance_meters = ?, allowed_wifi_name = ?, require_gps = ?, require_wifi = ?
         WHERE id = ?`,
        [
          company_name || 'VBE Agency',
          office_address || '772 EFG Sư Vạn Hạnh, Phường 12 (Hoà Hưng), Quận 10, TP.HCM',
          office_lat !== undefined ? parseFloat(office_lat) : 10.7745,
          office_lng !== undefined ? parseFloat(office_lng) : 106.6685,
          max_distance_meters !== undefined ? parseInt(max_distance_meters) : 200,
          allowed_wifi_name || 'VBE Agency',
          require_gps !== undefined ? (require_gps ? 1 : 0) : 1,
          require_wifi !== undefined ? (require_wifi ? 1 : 0) : 0,
          row.id
        ],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          res.json({ message: 'Cập nhật cài đặt trụ sở thành công' });
        }
      );
    } else {
      db.run(
        `INSERT INTO company_settings (company_name, office_address, office_lat, office_lng, max_distance_meters, allowed_wifi_name, require_gps, require_wifi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name || 'VBE Agency',
          office_address || '772 EFG Sư Vạn Hạnh, Phường 12 (Hoà Hưng), Quận 10, TP.HCM',
          office_lat !== undefined ? parseFloat(office_lat) : 10.7745,
          office_lng !== undefined ? parseFloat(office_lng) : 106.6685,
          max_distance_meters !== undefined ? parseInt(max_distance_meters) : 200,
          allowed_wifi_name || 'VBE Agency',
          require_gps !== undefined ? (require_gps ? 1 : 0) : 1,
          require_wifi !== undefined ? (require_wifi ? 1 : 0) : 0
        ],
        function(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });
          res.json({ message: 'Tạo cài đặt trụ sở thành công' });
        }
      );
    }
  });
});

// Check-in action (GPS Geofencing, Lý do ngoài VP, Ca chuẩn: 9h30 - 18h30)
app.post('/api/attendance/checkin', authenticateToken, async (req, res) => {
  const vnTime = getVietnamTime();
  const today = vnTime.dateString;
  const timeString = vnTime.timeString;
  
  const { latitude, longitude, reason, address, device_info } = req.body;

  try {
    // 1. Fetch office settings
    const settings = await dbGet(`SELECT * FROM company_settings ORDER BY id ASC LIMIT 1`) || {
      office_lat: 10.7745,
      office_lng: 106.6685,
      max_distance_meters: 200,
      allowed_wifi_name: 'VBE Agency',
      require_gps: 1,
      require_wifi: 0
    };

    let calculatedDistance = null;
    let isGpsValid = false;

    // Check GPS
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      calculatedDistance = calculateDistanceMeters(userLat, userLng, settings.office_lat, settings.office_lng);
      isGpsValid = calculatedDistance <= settings.max_distance_meters;
    }

    // Decide location type: Office vs Remote
    let locationType = 'Office';
    let checkInReason = reason ? reason.trim() : null;

    if (!isGpsValid) {
      locationType = 'Remote'; // Ngoài văn phòng (> 200m)
      
      // Bắt buộc phải có lý do nếu ở ngoài văn phòng
      if (!checkInReason) {
        return res.status(400).json({
          error: `Bạn đang ở cách văn phòng ${calculatedDistance || 'nhiều'}m (ngoài bán kính 200m). Vui lòng xác nhận và nhập lý do làm việc ngoài văn phòng (Làm việc tại nhà, Gặp khách hàng, Công tác...).`,
          requires_reason: true,
          distance: calculatedDistance,
          max_distance: settings.max_distance_meters
        });
      }
    } else {
      locationType = 'Office'; // Có mặt tại văn phòng
      if (!checkInReason) {
        checkInReason = 'Tại văn phòng 772 Sư Vạn Hạnh';
      }
    }

    // Decide status (Late if check-in is after 09:30 AM Vietnam time)
    const isLate = vnTime.hour > 9 || (vnTime.hour === 9 && vnTime.minute > 30);
    const status = isLate ? 'Late' : 'Present';

    await dbRun(
      `INSERT INTO attendance (user_id, date, check_in, status, check_in_lat, check_in_lng, check_in_distance, check_in_location_type, check_in_reason, check_in_address, check_in_device) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET 
         check_in = COALESCE(attendance.check_in, excluded.check_in),
         check_in_lat = COALESCE(attendance.check_in_lat, excluded.check_in_lat),
         check_in_lng = COALESCE(attendance.check_in_lng, excluded.check_in_lng),
         check_in_distance = COALESCE(attendance.check_in_distance, excluded.check_in_distance),
         check_in_location_type = COALESCE(attendance.check_in_location_type, excluded.check_in_location_type),
         check_in_reason = COALESCE(attendance.check_in_reason, excluded.check_in_reason),
         check_in_address = COALESCE(attendance.check_in_address, excluded.check_in_address),
         check_in_device = COALESCE(attendance.check_in_device, excluded.check_in_device)`,
      [
        req.user.id, 
        today, 
        timeString, 
        status, 
        latitude ? parseFloat(latitude) : null, 
        longitude ? parseFloat(longitude) : null, 
        calculatedDistance,
        locationType,
        checkInReason,
        address || null,
        device_info || 'Web Mobile'
      ]
    );

    const row = await dbGet(`SELECT * FROM attendance WHERE user_id = ? AND date = ?`, [req.user.id, today]);
    res.json({
      ...row,
      verified_distance: calculatedDistance,
      location_type: locationType,
      reason: checkInReason,
      message: locationType === 'Office' ? 'Chấm công tại văn phòng thành công!' : 'Chấm công ngoài văn phòng thành công!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check-out action
app.post('/api/attendance/checkout', authenticateToken, (req, res) => {
  const vnTime = getVietnamTime();
  const today = vnTime.dateString;
  const timeString = vnTime.timeString;

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
// - vinh@vbe.vn (Admin): can view any user's logs
// - Lead: can view logs of users in their department or self
// - Member: can ONLY view self logs
app.get('/api/attendance/logs', authenticateToken, async (req, res) => {
  let targetUserId = req.user.id;

  if (req.query.user_id && req.query.user_id != req.user.id) {
    if (req.user.email === 'vinh@vbe.vn' || req.user.role === 'Admin') {
      targetUserId = req.query.user_id;
    } else if (req.user.role === 'Lead') {
      // Check if target user is in the same department
      try {
        const targetUser = await dbGet(`SELECT id, department_id FROM users WHERE id = ?`, [req.query.user_id]);
        if (targetUser && targetUser.department_id === req.user.department_id) {
          targetUserId = req.query.user_id;
        } else {
          return res.status(403).json({ error: 'Bạn chỉ có quyền xem chấm công của nhân sự trong phòng ban mình phụ trách' });
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Member can never view other's logs
      return res.status(403).json({ error: 'Nhân viên chỉ có quyền xem chấm công của chính mình' });
    }
  }

  db.all(
    `SELECT a.*, u.name as user_name 
     FROM attendance a
     JOIN users u ON a.user_id = u.id
     WHERE a.user_id = ?
     ORDER BY a.date DESC`,
    [targetUserId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get attendance logs (Admin: all agency; Lead: their department)
app.get('/api/attendance/admin-logs', authenticateToken, requireRole(['Admin', 'Lead']), (req, res) => {
  let sql = `
    SELECT a.*, u.name as user_name, d.name as department_name
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
  `;
  const params = [];

  if (req.user.role === 'Lead') {
    sql += ` WHERE (u.department_id = ? OR u.id = ?)`;
    params.push(req.user.department_id, req.user.id);
  }

  sql += ` ORDER BY a.date DESC, a.check_in ASC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/attendance/salary-report - CHỈ DÀNH RIÊNG CHO CẤP QUẢN TRỊ CAO NHẤT (vinh@vbe.vn)
app.get('/api/attendance/salary-report', authenticateToken, async (req, res) => {
  if (req.user.email !== 'vinh@vbe.vn') {
    return res.status(403).json({ error: 'Chỉ cấp quản trị cao nhất (vinh@vbe.vn) mới có quyền truy cập bảng lương' });
  }

  const month = req.query.month || getVietnamTime().dateString.slice(0, 7); // YYYY-MM
  
  try {
    let usersQuery = `
      SELECT u.id, u.name, u.email, u.role, u.department_id, u.base_salary, d.name as department_name 
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
    `;
    const queryParams = [];

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
  const today = getVietnamTime().dateString;

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

// --- NOTIFICATIONS API ---

// GET /api/notifications - Lấy danh sách thông báo của user hiện tại (max 50)
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await dbAll(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count - Số lượng thông báo chưa đọc
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ count: row ? (row.count || 0) : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - Đánh dấu 1 thông báo đã đọc
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await dbRun(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all - Đánh dấu tất cả thông báo đã đọc
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await dbRun(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// PHÂN HỆ CRM & QUẢN LÝ KHÁCH HÀNG (CUSTOMER RELATIONSHIP MANAGEMENT)
// Chỉ Ban Quản Lý (Admin) và Phòng Sales & Account được phép truy cập
// =========================================================================

// Middleware phân quyền CRM
const requireCrmAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
    }
    // 1. Admin hoặc email vinh@vbe.vn có toàn quyền
    if (req.user.role === 'Admin' || req.user.email === 'vinh@vbe.vn') {
      return next();
    }
    // 2. Kiểm tra phòng ban của user
    if (req.user.department_id) {
      const dept = await dbGet(`SELECT name FROM departments WHERE id = ?`, [req.user.department_id]);
      if (dept && (dept.name.includes('Sales') || dept.name.includes('Account'))) {
        return next();
      }
    }
    return res.status(403).json({ error: 'Bạn không có quyền truy cập phân hệ CRM (Chỉ dành cho Ban Quản Lý và Phòng Sales & Account)' });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi kiểm tra quyền CRM: ' + err.message });
  }
};

// Chuẩn hóa số điện thoại: bỏ khoảng trắng, dấu gạch, dấu chấm
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/[\s\.\-\(\)]/g, '').trim();
};

// GET /api/crm/stats - Thống kê tổng quan CRM & Forecast
app.get('/api/crm/stats', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const totalCustomersRow = await dbGet(`SELECT COUNT(*) as count FROM crm_customers`);
    const dealsStatsRow = await dbGet(`
      SELECT 
        COUNT(*) as total_deals,
        SUM(CASE WHEN stage NOT IN ('won', 'lost') THEN expected_value ELSE 0 END) as pipeline_value,
        SUM(CASE WHEN stage = 'won' OR stage = 'execution' OR stage = 'payment_report' THEN contract_value ELSE 0 END) as won_value,
        SUM(paid_amount) as total_collected,
        COUNT(CASE WHEN stage = 'lead' THEN 1 END) as count_lead,
        COUNT(CASE WHEN stage = 'brief' THEN 1 END) as count_brief,
        COUNT(CASE WHEN stage = 'proposal' THEN 1 END) as count_proposal,
        COUNT(CASE WHEN stage = 'meeting' THEN 1 END) as count_meeting,
        COUNT(CASE WHEN stage = 'negotiation' THEN 1 END) as count_negotiation,
        COUNT(CASE WHEN stage = 'won' THEN 1 END) as count_won,
        COUNT(CASE WHEN stage = 'execution' THEN 1 END) as count_execution,
        COUNT(CASE WHEN stage = 'payment_report' THEN 1 END) as count_payment_report,
        COUNT(CASE WHEN stage = 'lost' THEN 1 END) as count_lost
      FROM crm_deals
    `);

    // Thống kê forecast theo quý
    const forecastRows = await dbAll(`
      SELECT 
        forecast_year, 
        forecast_quarter, 
        SUM(forecast_revenue) as total_forecast, 
        COUNT(*) as customer_count 
      FROM crm_customers 
      WHERE forecast_quarter IS NOT NULL AND forecast_quarter != '' 
      GROUP BY forecast_year, forecast_quarter 
      ORDER BY forecast_year DESC, forecast_quarter ASC
    `);

    res.json({
      total_customers: totalCustomersRow ? totalCustomersRow.count : 0,
      total_deals: dealsStatsRow ? (dealsStatsRow.total_deals || 0) : 0,
      pipeline_value: dealsStatsRow ? (dealsStatsRow.pipeline_value || 0) : 0,
      won_value: dealsStatsRow ? (dealsStatsRow.won_value || 0) : 0,
      total_collected: dealsStatsRow ? (dealsStatsRow.total_collected || 0) : 0,
      stage_counts: {
        lead: dealsStatsRow ? (dealsStatsRow.count_lead || 0) : 0,
        brief: dealsStatsRow ? (dealsStatsRow.count_brief || 0) : 0,
        proposal: dealsStatsRow ? (dealsStatsRow.count_proposal || 0) : 0,
        meeting: dealsStatsRow ? (dealsStatsRow.count_meeting || 0) : 0,
        negotiation: dealsStatsRow ? (dealsStatsRow.count_negotiation || 0) : 0,
        won: dealsStatsRow ? (dealsStatsRow.count_won || 0) : 0,
        execution: dealsStatsRow ? (dealsStatsRow.count_execution || 0) : 0,
        payment_report: dealsStatsRow ? (dealsStatsRow.count_payment_report || 0) : 0,
        lost: dealsStatsRow ? (dealsStatsRow.count_lost || 0) : 0
      },
      forecast_by_quarter: forecastRows || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/customers - Lấy danh bạ khách hàng
app.get('/api/crm/customers', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const { search, quarter, year } = req.query;
    let sql = `
      SELECT 
        c.*, 
        u.name as assigned_name,
        cb.name as creator_name,
        (SELECT COUNT(*) FROM crm_deals d WHERE d.customer_phone = c.phone) as total_deals,
        (SELECT SUM(d.contract_value) FROM crm_deals d WHERE d.customer_phone = c.phone AND d.stage IN ('won', 'execution', 'payment_report')) as total_won_value
      FROM crm_customers c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users cb ON c.created_by = cb.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (c.phone LIKE ? OR c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (quarter) {
      sql += ` AND c.forecast_quarter = ?`;
      params.push(quarter);
    }
    if (year) {
      sql += ` AND c.forecast_year = ?`;
      params.push(parseInt(year));
    }

    sql += ` ORDER BY c.id DESC`;

    const customers = await dbAll(sql, params);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/customers/:id - Chi tiết khách hàng + lịch sử deals & projects
app.get('/api/crm/customers/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const customer = await dbGet(`
      SELECT c.*, u.name as assigned_name, cb.name as creator_name
      FROM crm_customers c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users cb ON c.created_by = cb.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Lấy danh sách deals của khách hàng dựa trên customer_phone
    const deals = await dbAll(`
      SELECT d.*, p.name as project_name, u.name as assigned_name
      FROM crm_deals d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE d.customer_phone = ?
      ORDER BY d.id DESC
    `, [customer.phone]);

    // Lấy các activities tương tác với khách hàng này
    const activities = await dbAll(`
      SELECT a.*, u.name as user_name
      FROM crm_activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.customer_phone = ? OR a.deal_id IN (SELECT id FROM crm_deals WHERE customer_phone = ?)
      ORDER BY a.id DESC
      LIMIT 50
    `, [customer.phone, customer.phone]);

    res.json({
      ...customer,
      deals: deals || [],
      activities: activities || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/customers - Tạo khách hàng mới (Số điện thoại là UNIQUE KEY)
app.post('/api/crm/customers', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const {
      phone,
      name,
      company,
      email,
      social,
      address,
      commission_rate,
      commission_notes,
      current_project_status,
      past_projects_notes,
      forecast_quarter,
      forecast_year,
      forecast_revenue,
      forecast_notes,
      assigned_to
    } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ error: 'Họ tên và Số điện thoại khách hàng là bắt buộc' });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    }

    // Kiểm tra số điện thoại đã tồn tại chưa
    const existing = await dbGet(`SELECT id, name FROM crm_customers WHERE phone = ?`, [cleanPhone]);
    if (existing) {
      return res.status(400).json({ 
        error: `Số điện thoại ${cleanPhone} đã tồn tại trong hệ thống (Khách hàng: ${existing.name}). Vui lòng kiểm tra lại.` 
      });
    }

    const assignedId = assigned_to ? parseInt(assigned_to) : req.user.id;
    const currentYear = new Date().getFullYear();

    const result = await dbRun(`
      INSERT INTO crm_customers (
        phone, name, company, email, social, address,
        commission_rate, commission_notes, current_project_status, past_projects_notes,
        forecast_quarter, forecast_year, forecast_revenue, forecast_notes,
        assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanPhone,
      name.trim(),
      company ? company.trim() : '',
      email ? email.trim() : '',
      social ? social.trim() : '',
      address ? address.trim() : '',
      parseFloat(commission_rate) || 0,
      commission_notes ? commission_notes.trim() : '',
      current_project_status ? current_project_status.trim() : 'Mới tiếp cận',
      past_projects_notes ? past_projects_notes.trim() : '',
      forecast_quarter || 'Q1',
      parseInt(forecast_year) || currentYear,
      parseInt(forecast_revenue) || 0,
      forecast_notes ? forecast_notes.trim() : '',
      assignedId,
      req.user.id
    ]);

    const newId = result.lastID || (result.rows && result.rows[0] ? result.rows[0].id : null);
    const createdCustomer = await dbGet(`SELECT * FROM crm_customers WHERE phone = ?`, [cleanPhone]);

    res.status(201).json({
      message: 'Tạo khách hàng mới thành công',
      customer: createdCustomer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/customers/:id - Cập nhật khách hàng (ĐỒNG BỘ CHÉO KHI THAY ĐỔI SỐ ĐIỆN THOẠI)
app.put('/api/crm/customers/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const customerId = req.params.id;
    const existing = await dbGet(`SELECT * FROM crm_customers WHERE id = ?`, [customerId]);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    const {
      phone,
      name,
      company,
      email,
      social,
      address,
      commission_rate,
      commission_notes,
      current_project_status,
      past_projects_notes,
      forecast_quarter,
      forecast_year,
      forecast_revenue,
      forecast_notes,
      assigned_to
    } = req.body;

    const oldPhone = existing.phone;
    const newPhone = phone ? normalizePhone(phone) : oldPhone;

    if (!newPhone || !name) {
      return res.status(400).json({ error: 'Họ tên và Số điện thoại khách hàng là bắt buộc' });
    }

    // Nếu đổi sang số điện thoại khác, kiểm tra xem số mới có bị trùng không
    if (newPhone !== oldPhone) {
      const duplicate = await dbGet(`SELECT id, name FROM crm_customers WHERE phone = ? AND id != ?`, [newPhone, customerId]);
      if (duplicate) {
        return res.status(400).json({ 
          error: `Số điện thoại ${newPhone} đã được dùng cho khách hàng ${duplicate.name}` 
        });
      }
    }

    // 1. Cập nhật bảng crm_customers
    await dbRun(`
      UPDATE crm_customers SET
        phone = ?,
        name = ?,
        company = ?,
        email = ?,
        social = ?,
        address = ?,
        commission_rate = ?,
        commission_notes = ?,
        current_project_status = ?,
        past_projects_notes = ?,
        forecast_quarter = ?,
        forecast_year = ?,
        forecast_revenue = ?,
        forecast_notes = ?,
        assigned_to = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      newPhone,
      name.trim(),
      company ? company.trim() : '',
      email ? email.trim() : '',
      social ? social.trim() : '',
      address ? address.trim() : '',
      parseFloat(commission_rate) || 0,
      commission_notes ? commission_notes.trim() : '',
      current_project_status ? current_project_status.trim() : '',
      past_projects_notes ? past_projects_notes.trim() : '',
      forecast_quarter || existing.forecast_quarter,
      parseInt(forecast_year) || existing.forecast_year,
      parseInt(forecast_revenue) || 0,
      forecast_notes ? forecast_notes.trim() : '',
      assigned_to ? parseInt(assigned_to) : existing.assigned_to,
      customerId
    ]);

    // 2. NẾU SỐ ĐIỆN THOẠI THAY ĐỔI -> ĐỒNG BỘ CHÉO TOÀN BỘ BẢNG LIÊN QUAN
    if (newPhone !== oldPhone) {
      console.log(`[CRM Sync] Customer phone changed from ${oldPhone} to ${newPhone}. Cascading sync across database...`);
      // Đồng bộ bảng crm_deals
      await dbRun(`UPDATE crm_deals SET customer_phone = ? WHERE customer_phone = ? OR customer_id = ?`, [newPhone, oldPhone, customerId]);
      // Đồng bộ bảng crm_activities
      await dbRun(`UPDATE crm_activities SET customer_phone = ? WHERE customer_phone = ?`, [newPhone, oldPhone]);
      // Đồng bộ bảng projects nếu có liên kết
      await dbRun(`UPDATE projects SET customer_phone = ? WHERE customer_phone = ?`, [newPhone, oldPhone]);

      // Ghi activity log
      await dbRun(`
        INSERT INTO crm_activities (customer_phone, user_id, action_type, content)
        VALUES (?, ?, 'note', ?)
      `, [
        newPhone,
        req.user.id,
        `Đã cập nhật số điện thoại khách hàng từ ${oldPhone} sang ${newPhone} (Đồng bộ toàn hệ thống)`
      ]);
    }

    const updated = await dbGet(`SELECT * FROM crm_customers WHERE id = ?`, [customerId]);
    res.json({
      message: 'Cập nhật thông tin khách hàng thành công',
      customer: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/customers/:id - Xóa khách hàng (Chỉ Admin)
app.delete('/api/crm/customers/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.email !== 'vinh@vbe.vn') {
      return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền xóa khách hàng' });
    }

    const customer = await dbGet(`SELECT * FROM crm_customers WHERE id = ?`, [req.params.id]);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    await dbRun(`DELETE FROM crm_customers WHERE id = ?`, [req.params.id]);
    res.json({ message: `Đã xóa khách hàng ${customer.name} (${customer.phone})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/deals - Danh sách Deals / Cơ hội bán hàng
app.get('/api/crm/deals', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const { stage, search, assigned_to, customer_phone } = req.query;
    let sql = `
      SELECT 
        d.*,
        c.name as customer_name,
        c.company as customer_company,
        c.email as customer_email,
        c.social as customer_social,
        c.commission_rate,
        c.commission_notes,
        u.name as assigned_name,
        cb.name as creator_name,
        p.name as project_name,
        p.status as project_status
      FROM crm_deals d
      LEFT JOIN crm_customers c ON d.customer_phone = c.phone
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users cb ON d.created_by = cb.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (stage) {
      sql += ` AND d.stage = ?`;
      params.push(stage);
    }
    if (assigned_to) {
      sql += ` AND d.assigned_to = ?`;
      params.push(parseInt(assigned_to));
    }
    if (customer_phone) {
      sql += ` AND d.customer_phone = ?`;
      params.push(normalizePhone(customer_phone));
    }
    if (search) {
      sql += ` AND (d.title LIKE ? OR d.customer_phone LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY d.id DESC`;

    const deals = await dbAll(sql, params);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/deals/:id - Chi tiết deal + timeline activities
app.get('/api/crm/deals/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const deal = await dbGet(`
      SELECT 
        d.*,
        c.name as customer_name,
        c.company as customer_company,
        c.email as customer_email,
        c.social as customer_social,
        c.address as customer_address,
        c.commission_rate,
        c.commission_notes,
        c.current_project_status,
        c.past_projects_notes,
        u.name as assigned_name,
        cb.name as creator_name,
        p.name as project_name,
        p.status as project_status
      FROM crm_deals d
      LEFT JOIN crm_customers c ON d.customer_phone = c.phone
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users cb ON d.created_by = cb.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.id = ?
    `, [req.params.id]);

    if (!deal) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    const activities = await dbAll(`
      SELECT a.*, u.name as user_name
      FROM crm_activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.deal_id = ?
      ORDER BY a.id DESC
    `, [deal.id]);

    res.json({
      ...deal,
      activities: activities || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/deals - Tạo Deal mới (cho phép chọn hoặc tạo nhanh khách hàng theo SĐT)
app.post('/api/crm/deals', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const {
      title,
      customer_phone,
      customer_name,
      customer_company,
      customer_email,
      customer_social,
      stage,
      expected_value,
      contract_value,
      brief_content,
      proposal_url,
      expected_close_date,
      assigned_to
    } = req.body;

    if (!title || !customer_phone) {
      return res.status(400).json({ error: 'Tên chiến dịch và Số điện thoại khách hàng là bắt buộc' });
    }

    const cleanPhone = normalizePhone(customer_phone);

    // Tìm xem khách hàng đã có trong bảng crm_customers chưa
    let customer = await dbGet(`SELECT * FROM crm_customers WHERE phone = ?`, [cleanPhone]);
    let customerId = customer ? customer.id : null;

    // Nếu chưa có khách hàng, tự động tạo mới vào bảng crm_customers
    if (!customer) {
      const custName = customer_name ? customer_name.trim() : 'Khách hàng mới (' + cleanPhone + ')';
      const custCompany = customer_company ? customer_company.trim() : '';
      const custEmail = customer_email ? customer_email.trim() : '';
      const custSocial = customer_social ? customer_social.trim() : '';
      
      const custResult = await dbRun(`
        INSERT INTO crm_customers (phone, name, company, email, social, assigned_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [cleanPhone, custName, custCompany, custEmail, custSocial, assigned_to || req.user.id, req.user.id]);

      customerId = custResult.lastID || (custResult.rows && custResult.rows[0] ? custResult.rows[0].id : null);
      customer = await dbGet(`SELECT * FROM crm_customers WHERE phone = ?`, [cleanPhone]);
    }

    const dealStage = stage || 'lead';
    const assignedUser = assigned_to ? parseInt(assigned_to) : req.user.id;

    const result = await dbRun(`
      INSERT INTO crm_deals (
        customer_id, customer_phone, title, stage,
        expected_value, contract_value, brief_content, proposal_url,
        expected_close_date, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      cleanPhone,
      title.trim(),
      dealStage,
      parseInt(expected_value) || 0,
      parseInt(contract_value) || 0,
      brief_content ? brief_content.trim() : '',
      proposal_url ? proposal_url.trim() : '',
      expected_close_date || '',
      assignedUser,
      req.user.id
    ]);

    const dealId = result.lastID || (result.rows && result.rows[0] ? result.rows[0].id : null);

    // Ghi activity log
    await dbRun(`
      INSERT INTO crm_activities (deal_id, customer_phone, user_id, action_type, content)
      VALUES (?, ?, ?, 'stage_change', ?)
    `, [
      dealId,
      cleanPhone,
      req.user.id,
      `Khởi tạo cơ hội kinh doanh mới: "${title.trim()}" ở giai đoạn "${dealStage}"`
    ]);

    const createdDeal = await dbGet(`SELECT * FROM crm_deals WHERE id = ?`, [dealId]);

    res.status(201).json({
      message: 'Tạo cơ hội kinh doanh thành công',
      deal: createdDeal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/deals/:id - Cập nhật thông tin / giai đoạn Deal
app.put('/api/crm/deals/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const dealId = req.params.id;
    const existing = await dbGet(`SELECT * FROM crm_deals WHERE id = ?`, [dealId]);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    const {
      title,
      stage,
      expected_value,
      contract_value,
      paid_amount,
      payment_status,
      brief_content,
      proposal_url,
      contract_number,
      contract_url,
      meeting_notes,
      feedback_notes,
      event_report_notes,
      expected_close_date,
      assigned_to
    } = req.body;

    const newStage = stage || existing.stage;
    const isStageChanged = newStage !== existing.stage;

    await dbRun(`
      UPDATE crm_deals SET
        title = ?,
        stage = ?,
        expected_value = ?,
        contract_value = ?,
        paid_amount = ?,
        payment_status = ?,
        brief_content = ?,
        proposal_url = ?,
        contract_number = ?,
        contract_url = ?,
        meeting_notes = ?,
        feedback_notes = ?,
        event_report_notes = ?,
        expected_close_date = ?,
        assigned_to = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title ? title.trim() : existing.title,
      newStage,
      expected_value !== undefined ? parseInt(expected_value) : existing.expected_value,
      contract_value !== undefined ? parseInt(contract_value) : existing.contract_value,
      paid_amount !== undefined ? parseInt(paid_amount) : existing.paid_amount,
      payment_status || existing.payment_status,
      brief_content !== undefined ? brief_content : existing.brief_content,
      proposal_url !== undefined ? proposal_url : existing.proposal_url,
      contract_number !== undefined ? contract_number : existing.contract_number,
      contract_url !== undefined ? contract_url : existing.contract_url,
      meeting_notes !== undefined ? meeting_notes : existing.meeting_notes,
      feedback_notes !== undefined ? feedback_notes : existing.feedback_notes,
      event_report_notes !== undefined ? event_report_notes : existing.event_report_notes,
      expected_close_date !== undefined ? expected_close_date : existing.expected_close_date,
      assigned_to ? parseInt(assigned_to) : existing.assigned_to,
      dealId
    ]);

    if (isStageChanged) {
      await dbRun(`
        INSERT INTO crm_activities (deal_id, customer_phone, user_id, action_type, content)
        VALUES (?, ?, ?, 'stage_change', ?)
      `, [
        dealId,
        existing.customer_phone,
        req.user.id,
        `Chuyển giai đoạn từ "${existing.stage}" sang "${newStage}"`
      ]);

      // Đồng thời cập nhật trạng thái dự án hiện tại bên bảng crm_customers
      const stageMap = {
        lead: 'Đang tìm hiểu dịch vụ',
        brief: 'Đã nhận Brief & Yêu cầu',
        proposal: 'Đã gửi Báo giá & Proposal',
        meeting: 'Đang họp trao đổi / Pitching',
        negotiation: 'Đang đàm phán hợp đồng',
        won: 'Đã chốt Deal & Ký Hợp Đồng',
        execution: 'Đang triển khai thực thi',
        payment_report: 'Nghiệm thu & Quyết toán thanh toán',
        lost: 'Đã dừng / Hủy'
      };
      await dbRun(`
        UPDATE crm_customers SET current_project_status = ? WHERE phone = ?
      `, [`${existing.title}: ${stageMap[newStage] || newStage}`, existing.customer_phone]);
    }

    const updated = await dbGet(`SELECT * FROM crm_deals WHERE id = ?`, [dealId]);
    res.json({
      message: 'Cập nhật cơ hội kinh doanh thành công',
      deal: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/deals/:id - Xóa deal
app.delete('/api/crm/deals/:id', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const deal = await dbGet(`SELECT * FROM crm_deals WHERE id = ?`, [req.params.id]);
    if (!deal) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    await dbRun(`DELETE FROM crm_deals WHERE id = ?`, [req.params.id]);
    res.json({ message: `Đã xóa cơ hội kinh doanh ${deal.title}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/deals/:id/activities - Thêm hoạt động/ghi chú mới vào Deal
app.post('/api/crm/deals/:id/activities', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const { action_type, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Nội dung hoạt động là bắt buộc' });
    }

    const deal = await dbGet(`SELECT * FROM crm_deals WHERE id = ?`, [req.params.id]);
    if (!deal) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    await dbRun(`
      INSERT INTO crm_activities (deal_id, customer_phone, user_id, action_type, content)
      VALUES (?, ?, ?, ?, ?)
    `, [
      deal.id,
      deal.customer_phone,
      req.user.id,
      action_type || 'note',
      content.trim()
    ]);

    const activities = await dbAll(`
      SELECT a.*, u.name as user_name
      FROM crm_activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.deal_id = ?
      ORDER BY a.id DESC
    `, [deal.id]);

    res.status(201).json({
      message: 'Thêm hoạt động thành công',
      activities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/deals/:id/convert-to-project - 1-CLICK TẠO DỰ ÁN THỰC THI TỪ DEAL
app.post('/api/crm/deals/:id/convert-to-project', authenticateToken, requireCrmAccess, async (req, res) => {
  try {
    const dealId = req.params.id;
    const deal = await dbGet(`
      SELECT d.*, c.name as customer_name, c.company as customer_company, c.commission_rate, c.commission_notes
      FROM crm_deals d
      LEFT JOIN crm_customers c ON d.customer_phone = c.phone
      WHERE d.id = ?
    `, [dealId]);

    if (!deal) {
      return res.status(404).json({ error: 'Không tìm thấy cơ hội kinh doanh' });
    }

    // Nếu đã chuyển đổi dự án rồi thì trả về thông tin dự án cũ
    if (deal.project_id) {
      const existingProject = await dbGet(`SELECT * FROM projects WHERE id = ?`, [deal.project_id]);
      if (existingProject) {
        return res.json({
          message: 'Cơ hội này đã được chuyển giao sang Dự án thực thi từ trước',
          project: existingProject,
          already_converted: true
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = deal.expected_close_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Soạn mô tả chi tiết dự án lấy từ thông tin CRM
    let projectDescription = `[DỰ ÁN TỪ CRM - VBE AGENCY]\n`;
    projectDescription += `Khách hàng: ${deal.customer_name || 'N/A'}`;
    if (deal.customer_company) projectDescription += ` (${deal.customer_company})`;
    projectDescription += `\nHotline: ${deal.customer_phone}`;
    if (deal.contract_value) projectDescription += `\nGiá trị hợp đồng: ${deal.contract_value.toLocaleString('vi-VN')} VNĐ`;
    if (deal.commission_rate) projectDescription += `\nChiết khấu hoa hồng: ${deal.commission_rate}% (${deal.commission_notes || 'Thỏa thuận'})`;
    if (deal.brief_content) projectDescription += `\n\nNỘI DUNG BRIEF:\n${deal.brief_content}`;

    // 1. Tạo project mới trong bảng projects
    const projResult = await dbRun(`
      INSERT INTO projects (
        name, description, status, start_date, end_date,
        owner_id, created_by, crm_deal_id, customer_phone
      ) VALUES (?, ?, 'Active', ?, ?, ?, ?, ?, ?)
    `, [
      deal.title,
      projectDescription,
      today,
      defaultEnd,
      deal.assigned_to || req.user.id,
      req.user.id,
      deal.id,
      deal.customer_phone
    ]);

    const newProjectId = projResult.lastID || (projResult.rows && projResult.rows[0] ? projResult.rows[0].id : null);

    // 2. Thêm người tạo và người phụ trách vào project_members
    await dbRun(`INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)`, [newProjectId, req.user.id]);
    if (deal.assigned_to && deal.assigned_to !== req.user.id) {
      await dbRun(`INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)`, [newProjectId, deal.assigned_to]);
    }

    // 3. Tự động tạo 3 tasks khởi động ban đầu trong dự án mới
    const defaultTasks = [
      ['Họp Kick-off và thống nhất Timeline thực thi', 'Team họp với Account Manager để thống nhất kế hoạch chi tiết', 'InProgress', 'High'],
      ['Chuẩn bị tài liệu & Phân bổ nhân sự các phòng ban', 'Phân bổ nhân sự Kỹ thuật, Media, Thiết kế theo brief khách hàng', 'Todo', 'Medium'],
      ['Triển khai sản xuất & Báo cáo tiến độ cho khách', 'Thực hiện sản xuất và định kỳ cập nhật trạng thái', 'Todo', 'High']
    ];

    for (const t of defaultTasks) {
      await dbRun(`
        INSERT INTO tasks (title, description, project_id, status, priority, due_date, created_by, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [t[0], t[1], newProjectId, t[2], t[3], defaultEnd, req.user.id, deal.assigned_to || req.user.id]);
    }

    // 4. Cập nhật deal: gắn project_id và đổi stage sang 'execution'
    await dbRun(`
      UPDATE crm_deals 
      SET project_id = ?, stage = 'execution', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newProjectId, deal.id]);

    // 5. Cập nhật trạng thái khách hàng
    await dbRun(`
      UPDATE crm_customers 
      SET current_project_status = ? 
      WHERE phone = ?
    `, [`Đang triển khai thực thi: ${deal.title}`, deal.customer_phone]);

    // 6. Ghi log activity
    await dbRun(`
      INSERT INTO crm_activities (deal_id, customer_phone, user_id, action_type, content)
      VALUES (?, ?, ?, 'stage_change', ?)
    `, [
      deal.id,
      deal.customer_phone,
      req.user.id,
      `Đã chuyển giao thành công sang Dự án thực thi: "${deal.title}" (ID Dự án: #${newProjectId})`
    ]);

    // 7. Tạo thông báo in-app cho người phụ trách
    if (deal.assigned_to) {
      await createNotification(
        deal.assigned_to,
        'project_added',
        '🚀 Dự án thực thi mới từ CRM',
        `Deal "${deal.title}" của khách hàng ${deal.customer_phone} đã được chuyển sang Dự án thực thi.`,
        newProjectId,
        'project'
      );
    }

    const createdProject = await dbGet(`SELECT * FROM projects WHERE id = ?`, [newProjectId]);

    res.status(201).json({
      message: 'Chuyển giao sang Dự án thực thi thành công!',
      project: createdProject,
      deal_id: deal.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
