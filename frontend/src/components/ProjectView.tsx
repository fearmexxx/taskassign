import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Briefcase,
  Users,
  Settings,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Completed' | 'OnHold';
  start_date: string;
  end_date: string;
  total_tasks: number;
  completed_tasks: number;
  owner_id: number | null;
  sub_owner_id: number | null;
  owner_name?: string;
  sub_owner_name?: string;
  members?: { user_id: number; name: string; role: string }[];
  departments?: { department_id: number; name: string }[];
}

interface Task {
  id: number;
  title: string;
  description: string;
  project_id: number;
  assignee_id: number;
  status: 'Todo' | 'InProgress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  project_name: string;
  assignee_name: string;
  owner_id: number | null;
  sub_owner_id: number | null;
  owner_name?: string;
  sub_owner_name?: string;
  members?: { user_id: number; name: string }[];
  departments?: { department_id: number; name: string }[];
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  department_name: string;
}

interface Department {
  id: number;
  name: string;
}

export const ProjectView: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals / forms state
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStart, setNewProjectStart] = useState('');
  const [newProjectEnd, setNewProjectEnd] = useState('');
  const [newProjectOwner, setNewProjectOwner] = useState<number>(0);
  const [newProjectSubOwner, setNewProjectSubOwner] = useState<number>(0);
  const [selectedProjMembers, setSelectedProjMembers] = useState<number[]>([]);
  const [selectedProjDepts, setSelectedProjDepts] = useState<number[]>([]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState<number>(0);
  const [newTaskSubOwner, setNewTaskSubOwner] = useState<number>(0);
  const [selectedTaskMembers, setSelectedTaskMembers] = useState<number[]>([]);
  const [selectedTaskDepts, setSelectedTaskDepts] = useState<number[]>([]);

  const loadData = async () => {
    try {
      const projRes = await fetchWithAuth('/api/projects');
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
        if (projData.length > 0 && selectedProjectId === null) {
          setSelectedProjectId(projData[0].id);
        }
      }

      const tasksRes = await fetchWithAuth('/api/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      const teamRes = await fetchWithAuth('/api/users');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeam(teamData);
        if (teamData.length > 0) {
          setNewProjectOwner(teamData[0].id);
          setNewTaskOwner(teamData[0].id);
        }
      }

      const deptRes = await fetchWithAuth('/api/departments');
      if (deptRes.ok) {
        setDepartments(await deptRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditProjectModal = (proj: Project) => {
    setNewProjectName(proj.name);
    setNewProjectDesc(proj.description);
    setNewProjectStart(proj.start_date);
    setNewProjectEnd(proj.end_date);
    setNewProjectOwner(proj.owner_id || 0);
    setNewProjectSubOwner(proj.sub_owner_id || 0);
    setSelectedProjMembers(proj.members?.map(m => m.user_id) || []);
    setSelectedProjDepts(proj.departments?.map(d => d.department_id) || []);
    setShowEditProject(true);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          start_date: newProjectStart,
          end_date: newProjectEnd,
          status: 'Active',
          owner_id: newProjectOwner || null,
          sub_owner_id: newProjectSubOwner || null,
          members: selectedProjMembers,
          departments: selectedProjDepts
        }),
      });

      if (res.ok) {
        resetProjectForm();
        setShowAddProject(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newProjectName.trim()) return;

    try {
      const res = await fetchWithAuth(`/api/projects/${selectedProjectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          start_date: newProjectStart,
          end_date: newProjectEnd,
          owner_id: newProjectOwner || null,
          sub_owner_id: newProjectSubOwner || null,
          members: selectedProjMembers,
          departments: selectedProjDepts
        }),
      });

      if (res.ok) {
        resetProjectForm();
        setShowEditProject(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetProjectForm = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectStart('');
    setNewProjectEnd('');
    setNewProjectOwner(team[0]?.id || 0);
    setNewProjectSubOwner(0);
    setSelectedProjMembers([]);
    setSelectedProjDepts([]);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Việc này sẽ xóa toàn bộ công việc liên quan.')) return;
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = projects.filter(p => p.id !== projectId);
        setProjects(updated);
        if (selectedProjectId === projectId) {
          setSelectedProjectId(updated.length > 0 ? updated[0].id : null);
        }
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    try {
      const res = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          project_id: selectedProjectId,
          status: 'Todo',
          priority: newTaskPriority,
          due_date: newTaskDueDate || new Date().toISOString().split('T')[0],
          owner_id: newTaskOwner || null,
          sub_owner_id: newTaskSubOwner || null,
          members: selectedTaskMembers,
          departments: selectedTaskDepts
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setSelectedTaskMembers([]);
        setSelectedTaskDepts([]);
        setShowAddTask(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;
    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleProjMember = (userId: number) => {
    setSelectedProjMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleProjDept = (deptId: number) => {
    setSelectedProjDepts(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleTaskMember = (userId: number) => {
    setSelectedTaskMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleTaskDept = (deptId: number) => {
    setSelectedTaskDepts(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.project_id === selectedProjectId);

  // Group tasks by status
  const tasksByStatus = {
    Todo: projectTasks.filter(t => t.status === 'Todo'),
    InProgress: projectTasks.filter(t => t.status === 'InProgress'),
    Review: projectTasks.filter(t => t.status === 'Review'),
    Done: projectTasks.filter(t => t.status === 'Done')
  };

  const translateStatus = (status: string) => {
    const statuses: Record<string, string> = {
      'Todo': 'Cần làm',
      'InProgress': 'Đang làm',
      'Review': 'Đánh giá',
      'Done': 'Hoàn thành'
    };
    return statuses[status] || status;
  };

  const translatePriority = (priority: string) => {
    const priorities: Record<string, string> = {
      'High': 'Cao',
      'Medium': 'Trung bình',
      'Low': 'Thấp'
    };
    return priorities[priority] || priority;
  };

  const translateDept = (dept: string) => {
    const depts: Record<string, string> = {
      'Management': 'Ban quản lý',
      'Development': 'Phòng Phát triển',
      'Design': 'Phòng Thiết kế',
      'Marketing': 'Phòng Marketing'
    };
    return depts[dept] || dept;
  };

  return (
    <div className="project-view-container animate-fade-in">
      <style>{`
        .project-view-container {
          flex: 1;
          display: grid;
          grid-template-columns: 280px 1fr;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
        }
        .project-sidebar {
          background: #f4f4f6;
          border-right: 1px solid var(--border-color);
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-primary);
        }
        .project-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .project-item {
          padding: 12px 16px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .project-item:hover {
          background: #f8f9fa;
          border-color: var(--text-muted);
        }
        .project-item.active {
          background: rgba(79, 70, 229, 0.05);
          border-color: #4f46e5;
        }
        .project-item-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .project-progress-bar {
          height: 4px;
          background: #e8ecef;
          border-radius: 2px;
          overflow: hidden;
          width: 100%;
        }
        .project-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, var(--accent-cyan));
        }
        .project-item-meta {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
        }
        .project-details-area {
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-dark);
        }
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 24px;
          margin-bottom: 24px;
        }
        .project-title-desc {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .proj-name {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .proj-desc {
          color: var(--text-secondary);
          font-size: 14px;
          max-width: 700px;
        }
        .proj-dates {
          font-size: 12px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        .proj-roles-bar {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          font-size: 12px;
        }
        .proj-role-item {
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 4px 10px;
          border-radius: 6px;
          color: var(--text-secondary);
        }
        .proj-dept-tags {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .proj-dept-tag {
          font-size: 11px;
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(79, 70, 229, 0.15);
        }
        .board-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          flex: 1;
        }
        .board-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .column-header {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid #e8ecef;
        }
        .col-Todo { border-bottom-color: var(--text-muted); }
        .col-InProgress { border-bottom-color: var(--accent-cyan); }
        .col-Review { border-bottom-color: var(--accent-purple); }
        .col-Done { border-bottom-color: var(--accent-green); }
 
        .task-card {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: var(--transition-smooth);
        }
        .task-card:hover {
          border-color: var(--text-muted);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        }
        .task-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .task-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .task-roles {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #f8f9fa;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }
        .task-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          font-size: 11px;
        }
        .priority-High { color: #d97706; font-weight: 700; }
        .priority-Medium { color: #2563eb; font-weight: 700; }
        .priority-Low { color: #ffffff; background: #64748b; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-body {
          width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 30px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .form-group input, .form-group textarea, .form-group select {
          padding: 10px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 14px;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none;
          border-color: #4f46e5;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .multiselect-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          max-height: 120px;
          overflow-y: auto;
          background: #ffffff;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
        }
      `}</style>

      {/* SIDEBAR DỰ ÁN */}
      <div className="project-sidebar">
        <div className="sidebar-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Dự Án Agency</h3>
          {(user?.role === 'Admin' || user?.role === 'Lead') && (
            <button className="btn-outline" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowAddProject(true)}>
              <Plus size={14} /> Dự án
            </button>
          )}
        </div>

        <div className="project-list">
          {projects.map(proj => {
            const completion = proj.total_tasks > 0 ? Math.round((proj.completed_tasks / proj.total_tasks) * 100) : 0;
            return (
              <div 
                key={proj.id} 
                className={`project-item ${selectedProjectId === proj.id ? 'active' : ''}`}
                onClick={() => setSelectedProjectId(proj.id)}
              >
                <div className="project-item-name">{proj.name}</div>
                <div className="project-progress-bar">
                  <div className="project-progress-fill" style={{ width: `${completion}%` }} />
                </div>
                <div className="project-item-meta">
                  <span>{completion}% Hoàn thành</span>
                  <span>{proj.completed_tasks}/{proj.total_tasks} Việc</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHI TIẾT DỰ ÁN */}
      <div className="project-details-area">
        {activeProject ? (
          <>
            <div className="details-header">
              <div className="project-title-desc">
                <h1 className="proj-name">{activeProject.name}</h1>
                <p className="proj-desc">{activeProject.description}</p>
                <div className="proj-dates">
                  <Calendar size={13} />
                  <span>Thời gian: {activeProject.start_date} đến {activeProject.end_date}</span>
                </div>
                
                <div className="proj-roles-bar">
                  <span className="proj-role-item">👤 <strong>Chủ trì (Owner):</strong> {activeProject.owner_name || 'Chưa phân công'}</span>
                  <span className="proj-role-item">👥 <strong>Phó chủ trì:</strong> {activeProject.sub_owner_name || 'Không có'}</span>
                  {activeProject.members && activeProject.members.length > 0 && (
                    <span className="proj-role-item">👥 <strong>Nhân sự tham gia:</strong> {activeProject.members.map(m => m.name).join(', ')}</span>
                  )}
                </div>

                {activeProject.departments && activeProject.departments.length > 0 && (
                  <div className="proj-dept-tags">
                    {activeProject.departments.map(d => (
                      <span key={d.department_id} className="proj-dept-tag">{translateDept(d.name)}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {(user?.role === 'Admin' || activeProject.owner_id === user?.id || activeProject.sub_owner_id === user?.id) && (
                  <button className="btn-outline" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => openEditProjectModal(activeProject)}>
                    <Settings size={16} /> Thiết lập
                  </button>
                )}
                <button className="btn-neon" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddTask(true)}>
                  <Plus size={16} /> Tạo Công Việc
                </button>
                {user?.role === 'Admin' && (
                  <button className="btn-outline" style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)', padding: '8px 12px' }} onClick={() => handleDeleteProject(activeProject.id)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* BẢNG KANBAN CÔNG VIỆC */}
            <div className="board-grid">
              {(['Todo', 'InProgress', 'Review', 'Done'] as const).map(colStatus => {
                const columnTasks = tasksByStatus[colStatus];
                return (
                  <div key={colStatus} className="board-column">
                    <div className={`column-header col-${colStatus}`}>
                      <span>{translateStatus(colStatus)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{columnTasks.length}</span>
                    </div>

                    {columnTasks.map(task => (
                      <div key={task.id} className="task-card glass-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <h4 className="task-card-title">{task.title}</h4>
                          <span style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, fontWeight: 700 }} onClick={() => handleDeleteTask(task.id)}>×</span>
                        </div>
                        {task.description && <p className="task-card-desc" style={{ marginBottom: 8 }}>{task.description}</p>}
                        
                        <div className="task-roles">
                          <span>👤 <strong>Chủ trì (PIC):</strong> {task.owner_name || 'Chưa giao'}</span>
                          {task.sub_owner_name && <span>👥 <strong>Phó chủ trì:</strong> {task.sub_owner_name}</span>}
                          
                          {task.members && task.members.length > 0 && (
                            <span style={{ fontSize: 10 }}>👥 <strong>Thành viên:</strong> {task.members.map(m => m.name).join(', ')}</span>
                          )}
                          
                          {task.departments && task.departments.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {task.departments.map(d => (
                                <span key={d.department_id} style={{ fontSize: 9, background: 'rgba(0, 242, 254, 0.08)', color: 'var(--accent-cyan)', padding: '1px 4px', borderRadius: 2 }}>{translateDept(d.name)}</span>
                              ))}
                            </div>
                          )}
                        </div>
 
                        <div className="task-card-footer" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--accent-orange)' }}>Hạn: {task.due_date}</span>
                          <span className={`priority-${task.priority}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                            {translatePriority(task.priority)}
                          </span>
                        </div>

                        {/* Di chuyển công việc nhanh */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 6 }}>
                          {colStatus !== 'Todo' && (
                            <button className="btn-outline" style={{ fontSize: 10, padding: '2px 6px', flex: 1 }} onClick={() => handleUpdateTaskStatus(task.id, colStatus === 'InProgress' ? 'Todo' : colStatus === 'Review' ? 'InProgress' : 'Review')}>
                              ◀ Trước
                            </button>
                          )}
                          {colStatus !== 'Done' && (
                            <button className="btn-outline" style={{ fontSize: 10, padding: '2px 6px', flex: 1 }} onClick={() => handleUpdateTaskStatus(task.id, colStatus === 'Todo' ? 'InProgress' : colStatus === 'InProgress' ? 'Review' : 'Done')}>
                              Tiếp ▶
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)' }}>
            <Briefcase size={48} style={{ marginBottom: 16, color: 'var(--text-muted)' }} />
            <h3>Chưa có dự án nào</h3>
            <p style={{ fontSize: 14, marginTop: 6 }}>Vui lòng thêm mới dự án của agency để bắt đầu!</p>
          </div>
        )}
      </div>

      {/* MODAL TẠO DỰ ÁN MỚI */}
      {showAddProject && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel">
            <h3 style={{ marginBottom: 20, color: '#fff' }}>Khởi tạo dự án mới</h3>
            <form onSubmit={handleAddProject}>
              <div className="form-group">
                <label>Tên dự án</label>
                <input required type="text" placeholder="Ví dụ: Thiết kế Website Bán Hàng" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
              </div>
              
              <div className="form-group">
                <label>Mô tả dự án</label>
                <textarea rows={2} placeholder="Nội dung & mục tiêu dự án..." value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Chủ trì dự án (Owner)</label>
                  <select value={newProjectOwner} onChange={e => setNewProjectOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người phụ trách --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phó chủ trì</label>
                  <select value={newProjectSubOwner} onChange={e => setNewProjectSubOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người hỗ trợ --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Thành viên tham gia (Members)</label>
                <div className="multiselect-container">
                  {team.map(m => (
                    <label key={m.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedProjMembers.includes(m.id)} onChange={() => toggleProjMember(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Phòng ban phụ trách (Departments)</label>
                <div className="multiselect-container">
                  {departments.map(d => (
                    <label key={d.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedProjDepts.includes(d.id)} onChange={() => toggleProjDept(d.id)} />
                      {translateDept(d.name)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input type="date" value={newProjectStart} onChange={e => setNewProjectStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc (Hạn chót)</label>
                  <input type="date" value={newProjectEnd} onChange={e => setNewProjectEnd(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => { setShowAddProject(false); resetProjectForm(); }}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Bắt đầu dự án</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THIẾT LẬP DỰ ÁN */}
      {showEditProject && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel">
            <h3 style={{ marginBottom: 20, color: '#fff' }}>Thiết lập dự án</h3>
            <form onSubmit={handleEditProjectSubmit}>
              <div className="form-group">
                <label>Tên dự án</label>
                <input required type="text" placeholder="Ví dụ: Thiết kế Website Bán Hàng" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
              </div>
              
              <div className="form-group">
                <label>Mô tả dự án</label>
                <textarea rows={2} placeholder="Nội dung & mục tiêu dự án..." value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Chủ trì dự án (Owner)</label>
                  <select value={newProjectOwner} onChange={e => setNewProjectOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người phụ trách --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phó chủ trì</label>
                  <select value={newProjectSubOwner} onChange={e => setNewProjectSubOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người hỗ trợ --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Thành viên tham gia (Members)</label>
                <div className="multiselect-container">
                  {team.map(m => (
                    <label key={m.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedProjMembers.includes(m.id)} onChange={() => toggleProjMember(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Phòng ban phụ trách (Departments)</label>
                <div className="multiselect-container">
                  {departments.map(d => (
                    <label key={d.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedProjDepts.includes(d.id)} onChange={() => toggleProjDept(d.id)} />
                      {translateDept(d.name)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input type="date" value={newProjectStart} onChange={e => setNewProjectStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc (Hạn chót)</label>
                  <input type="date" value={newProjectEnd} onChange={e => setNewProjectEnd(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => { setShowEditProject(false); resetProjectForm(); }}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO CÔNG VIỆC MỚI */}
      {showAddTask && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel">
            <h3 style={{ marginBottom: 20, color: '#fff' }}>Giao công việc mới</h3>
            <form onSubmit={handleAddTask}>
              <div className="form-group">
                <label>Tiêu đề công việc</label>
                <input required type="text" placeholder="Ví dụ: Thiết kế giao diện trang chủ" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Chi tiết công việc</label>
                <textarea rows={2} placeholder="Mô tả cụ thể nhiệm vụ..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Người phụ trách (PIC)</label>
                  <select value={newTaskOwner} onChange={e => setNewTaskOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người phụ trách --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phó phụ trách</label>
                  <select value={newTaskSubOwner} onChange={e => setNewTaskSubOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn phó phụ trách --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Thành viên thực hiện phối hợp (Members)</label>
                <div className="multiselect-container">
                  {team.map(m => (
                    <label key={m.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedTaskMembers.includes(m.id)} onChange={() => toggleTaskMember(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Phòng ban phối hợp (Departments)</label>
                <div className="multiselect-container">
                  {departments.map(d => (
                    <label key={d.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedTaskDepts.includes(d.id)} onChange={() => toggleTaskDept(d.id)} />
                      {translateDept(d.name)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Độ ưu tiên</label>
                  <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)}>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Hạn hoàn thành</label>
                  <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setShowAddTask(false)}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Tạo công việc</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
