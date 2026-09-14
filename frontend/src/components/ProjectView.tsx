import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Briefcase,
  Users,
  Settings,
  FolderOpen,
  History,
  AlertTriangle,
  Paperclip,
  FileText,
  Download,
  Eye,
  BarChart2,
  CheckCircle,
  Clock,
  Edit,
  X,
  Building2,
  ChevronDown,
  ChevronUp
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
  created_by?: number | null;
  creator_name?: string;
  owner_name?: string;
  sub_owner_name?: string;
  members?: { user_id: number; name: string; role: string }[];
  departments?: { department_id: number; name: string }[];
}

interface DeletionLog {
  id: number;
  project_id: number;
  project_name: string;
  project_description: string;
  created_by_id: number | null;
  created_by_name: string;
  deleted_by_id: number;
  deleted_by_name: string;
  deleted_by_email: string;
  deleted_at: string;
  total_tasks: number;
  tasks_summary: string;
}

interface TaskAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 data URI
  uploaded_at: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  details?: string;
  attachments?: string | TaskAttachment[];
  created_by?: number | null;
  creator_name?: string;
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

interface DeptProgress {
  department_id: number;
  department_name: string;
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  percent: number;
}

interface ProgressMatrix {
  project_id: number;
  project_name: string;
  overall: {
    total: number;
    todo: number;
    in_progress: number;
    review: number;
    done: number;
    percent: number;
  };
  departments: DeptProgress[];
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

  // Progress Matrix State
  const [progressMatrix, setProgressMatrix] = useState<ProgressMatrix | null>(null);
  const [showProgressSection, setShowProgressSection] = useState(true);

  // Deletion logs modal state (Admin only)
  const [showDeletionLogs, setShowDeletionLogs] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  // Task Modal (Add / Edit) state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [taskStatus, setTaskStatus] = useState<'Todo' | 'InProgress' | 'Review' | 'Done'>('Todo');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskOwner, setTaskOwner] = useState<number>(0);
  const [taskSubOwner, setTaskSubOwner] = useState<number>(0);
  const [selectedTaskMembers, setSelectedTaskMembers] = useState<number[]>([]);
  const [selectedTaskDepts, setSelectedTaskDepts] = useState<number[]>([]);

  // Task Detail View Modal (Read-only quick view + attachment downloads)
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (targetProjectId?: number) => {
    try {
      const projRes = await fetchWithAuth('/api/projects');
      if (projRes.ok) {
        const projData: Project[] = await projRes.json();
        setProjects(projData);
        if (targetProjectId) {
          setSelectedProjectId(targetProjectId);
        } else if (selectedProjectId !== null) {
          // If current selected project still exists, keep it; otherwise pick first
          const exists = projData.some(p => p.id === selectedProjectId);
          if (!exists && projData.length > 0) {
            setSelectedProjectId(projData[0].id);
          } else if (projData.length === 0) {
            setSelectedProjectId(null);
          }
        } else if (projData.length > 0) {
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
          setTaskOwner(teamData[0].id);
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

  useEffect(() => {
    if (selectedProjectId) {
      loadProgressMatrix(selectedProjectId);
    } else {
      setProgressMatrix(null);
    }
  }, [selectedProjectId]);

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

  const openAddProjectModal = () => {
    resetProjectForm();
    // Default Owner to current logged-in user and select them in members
    if (user?.id) {
      setNewProjectOwner(user.id);
      setSelectedProjMembers([user.id]);
    }
    // If user has a department, pre-select it
    if (user?.department_id) {
      setSelectedProjDepts([user.department_id]);
    }
    setShowAddProject(true);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Vui lòng nhập tên dự án');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc,
          start_date: newProjectStart,
          end_date: newProjectEnd,
          status: 'Active',
          owner_id: newProjectOwner || user?.id || null,
          sub_owner_id: newProjectSubOwner || null,
          members: selectedProjMembers,
          departments: selectedProjDepts
        }),
      });

      if (res.ok) {
        const createdProj = await res.json();
        resetProjectForm();
        setShowAddProject(false);
        await loadData(createdProj?.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Thêm dự án thất bại. Vui lòng thử lại.');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi kết nối khi thêm dự án.');
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
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Cập nhật dự án thất bại.');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi kết nối khi cập nhật dự án.');
    }
  };

  const resetProjectForm = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectStart('');
    setNewProjectEnd('');
    setNewProjectOwner(user?.id || team[0]?.id || 0);
    setNewProjectSubOwner(0);
    setSelectedProjMembers(user?.id ? [user.id] : []);
    setSelectedProjDepts(user?.department_id ? [user.department_id] : []);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Việc này sẽ xóa toàn bộ công việc liên quan và được lưu vào nhật ký hệ thống.')) return;
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = projects.filter(p => p.id !== projectId);
        setProjects(updated);
        if (selectedProjectId === projectId) {
          setSelectedProjectId(updated.length > 0 ? updated[0].id : null);
        }
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Xóa dự án thất bại.');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi kết nối khi xóa dự án.');
    }
  };

  const openDeletionLogsModal = async () => {
    setShowDeletionLogs(true);
    setLoadingLogs(true);
    try {
      const res = await fetchWithAuth('/api/admin/project-deletion-logs');
      if (res.ok) {
        const data = await res.json();
        setDeletionLogs(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Không thể tải nhật ký xóa.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Lỗi kết nối khi tải nhật ký xóa.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadProgressMatrix = async (projectId: number) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/progress-matrix`);
      if (res.ok) {
        const data = await res.json();
        setProgressMatrix(data);
      }
    } catch (e) {
      console.error("Failed to load progress matrix:", e);
    }
  };

  const openAddTaskModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskDetails('');
    setTaskAttachments([]);
    setTaskPriority('Medium');
    setTaskStatus('Todo');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
    setTaskOwner(user?.id || team[0]?.id || 0);
    setTaskSubOwner(0);
    setSelectedTaskMembers(user?.id ? [user.id] : []);
    setSelectedTaskDepts(user?.department_id ? [user.department_id] : []);
    setShowTaskModal(true);
  };

  const parseAttachments = (raw?: string | TaskAttachment[]): TaskAttachment[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const openEditTaskModal = (t: Task) => {
    setEditingTaskId(t.id);
    setTaskTitle(t.title);
    setTaskDesc(t.description || '');
    setTaskDetails(t.details || '');
    setTaskAttachments(parseAttachments(t.attachments));
    setTaskPriority(t.priority || 'Medium');
    setTaskStatus(t.status || 'Todo');
    setTaskDueDate(t.due_date || '');
    setTaskOwner(t.owner_id || 0);
    setTaskSubOwner(t.sub_owner_id || 0);
    setSelectedTaskMembers(t.members?.map(m => m.user_id) || []);
    setSelectedTaskDepts(t.departments?.map(d => d.department_id) || []);
    setShowTaskModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
    const newFiles: TaskAttachment[] = [];

    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE) {
        alert(`Tệp "${file.name}" vượt quá giới hạn 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB). Vui lòng chọn tệp nhỏ hơn 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setTaskAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            data: base64Data,
            uploaded_at: new Date().toISOString()
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setTaskAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedProjectId) {
      alert('Vui lòng nhập tiêu đề công việc');
      return;
    }

    const payload = {
      title: taskTitle.trim(),
      description: taskDesc,
      details: taskDetails,
      attachments: taskAttachments,
      project_id: selectedProjectId,
      status: taskStatus,
      priority: taskPriority,
      due_date: taskDueDate || new Date().toISOString().split('T')[0],
      owner_id: taskOwner || user?.id || null,
      sub_owner_id: taskSubOwner || null,
      members: selectedTaskMembers,
      departments: selectedTaskDepts
    };

    try {
      let res;
      if (editingTaskId) {
        res = await fetchWithAuth(`/api/tasks/${editingTaskId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithAuth('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowTaskModal(false);
        setEditingTaskId(null);
        await loadData();
        if (selectedProjectId) {
          await loadProgressMatrix(selectedProjectId);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || (editingTaskId ? 'Cập nhật công việc thất bại.' : 'Tạo công việc thất bại.'));
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi kết nối khi lưu công việc.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadData();
        if (selectedProjectId) {
          await loadProgressMatrix(selectedProjectId);
        }
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
        await loadData();
        if (selectedProjectId) {
          await loadProgressMatrix(selectedProjectId);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Xóa công việc thất bại.');
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
    if (!dept) return '';
    const depts: Record<string, string> = {
      'Management': 'Ban quản lý',
      'Development': 'Phòng Phát triển',
      'Design': 'Phòng Thiết kế',
      'Marketing': 'Phòng Marketing',
      'Phòng Sales & Account': 'Phòng Sales & Account',
      'Phòng Media': 'Phòng Media',
      'Phòng Kỹ thuật & Vận Hành': 'Phòng Kỹ thuật & Vận Hành'
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

        @media (max-width: 768px) {
          .project-view-container {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            overflow-y: auto !important;
            padding-bottom: 74px !important;
          }
          .project-sidebar {
            border-right: none !important;
            border-bottom: 1px solid var(--border-color) !important;
            padding: 12px !important;
            max-height: none !important;
          }
          .project-list {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            gap: 8px !important;
            padding-bottom: 6px !important;
            -webkit-overflow-scrolling: touch;
          }
          .project-item {
            min-width: 160px !important;
            flex-shrink: 0 !important;
            padding: 10px 12px !important;
          }
          .project-details-area {
            padding: 12px !important;
            overflow-x: hidden !important;
          }
          .details-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .proj-roles-bar {
            flex-direction: column !important;
            gap: 6px !important;
          }
          .board-grid {
            display: flex !important;
            overflow-x: auto !important;
            gap: 12px !important;
            padding: 4px 0 20px 0 !important;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
          }
          .board-column {
            min-width: 270px !important;
            width: 82vw !important;
            flex-shrink: 0 !important;
            scroll-snap-align: start;
          }
          .modal-body {
            width: 94vw !important;
            padding: 16px !important;
            max-height: 85dvh !important;
          }
          .form-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>

      {/* SIDEBAR DỰ ÁN */}
      <div className="project-sidebar">
        <div className="sidebar-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Dự Án VBE Agency</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {user?.role === 'Admin' && (
              <button 
                className="btn-outline" 
                style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 4 }} 
                onClick={openDeletionLogsModal}
                title="Xem nhật ký xóa dự án"
              >
                <History size={14} />
              </button>
            )}
            <button className="btn-neon" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={openAddProjectModal}>
              <Plus size={14} /> Dự án
            </button>
          </div>
        </div>

        <div className="project-list">
          {projects.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              <p>Chưa có dự án nào</p>
              <button 
                onClick={openAddProjectModal} 
                style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
              >
                + Tạo dự án mới
              </button>
            </div>
          ) : (
            projects.map(proj => {
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
            })
          )}
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
                  {activeProject.creator_name && (
                    <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>
                      • Khởi tạo bởi: <strong>{activeProject.creator_name}</strong>
                    </span>
                  )}
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

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button 
                  className="btn-outline" 
                  style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, color: showProgressSection ? 'var(--accent-orange)' : 'var(--text-secondary)' }}
                  onClick={() => setShowProgressSection(!showProgressSection)}
                  title="Xem ma trận tiến độ phòng ban"
                >
                  <BarChart2 size={16} /> Tiến độ phòng ban {showProgressSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {(user?.role === 'Admin' || activeProject.created_by === user?.id || activeProject.owner_id === user?.id || activeProject.sub_owner_id === user?.id) && (
                  <button className="btn-outline" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => openEditProjectModal(activeProject)}>
                    <Settings size={16} /> Thiết lập
                  </button>
                )}
                <button className="btn-neon" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={openAddTaskModal}>
                  <Plus size={16} /> Tạo Công Việc
                </button>
                {(user?.role === 'Admin' || activeProject.created_by === user?.id) && (
                  <button className="btn-outline" style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)', padding: '8px 12px' }} onClick={() => handleDeleteProject(activeProject.id)} title="Xóa dự án (Chỉ người tạo hoặc Admin)">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* BẢNG TIẾN ĐỘ THEO DÕI PHÒNG BAN & BAN QUẢN TRỊ */}
            {showProgressSection && progressMatrix && (
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid var(--border-color)', 
                borderRadius: 10, 
                padding: '16px 20px', 
                marginBottom: 24,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={18} style={{ color: 'var(--accent-orange)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Ma Trận Tiến Độ Dự Án — Phòng Ban & Ban Quản Trị
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Cập nhật thời gian thực
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  {/* Thẻ Toàn Dự Án (Ban Quản Trị) */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.08))', 
                    border: '1px solid rgba(79, 70, 229, 0.25)', 
                    borderRadius: 8, 
                    padding: 12 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                        👑 Ban Quản Trị (Tổng thể)
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>
                        {progressMatrix.overall.percent}%
                      </span>
                    </div>

                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${progressMatrix.overall.percent}%`, background: 'linear-gradient(90deg, #4f46e5, #06b6d4)' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span>Tổng: <strong>{progressMatrix.overall.total}</strong> việc</span>
                      <span style={{ color: '#16a34a' }}>Xong: <strong>{progressMatrix.overall.done}</strong></span>
                      <span style={{ color: '#0284c7' }}>Đang làm: <strong>{progressMatrix.overall.in_progress}</strong></span>
                      <span style={{ color: '#64748b' }}>Chờ: <strong>{progressMatrix.overall.todo}</strong></span>
                    </div>
                  </div>

                  {/* Thẻ từng phòng ban */}
                  {progressMatrix.departments.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      Chưa có công việc nào phân bổ cho phòng ban.
                    </div>
                  ) : (
                    progressMatrix.departments.map(dept => (
                      <div 
                        key={dept.department_id} 
                        style={{ 
                          background: '#f8fafc', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 8, 
                          padding: 12 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            🏢 {translateDept(dept.department_name)}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: dept.percent === 100 ? '#16a34a' : 'var(--text-primary)' }}>
                            {dept.percent}%
                          </span>
                        </div>

                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: `${dept.percent}%`, background: dept.percent === 100 ? '#16a34a' : '#3b82f6' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                          <span>Tổng: <strong>{dept.total}</strong> việc</span>
                          <span style={{ color: '#16a34a' }}>Xong: <strong>{dept.done}</strong></span>
                          <span style={{ color: '#0284c7' }}>Đang làm: <strong>{dept.in_progress}</strong></span>
                          <span style={{ color: '#64748b' }}>Chờ: <strong>{dept.todo}</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

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

                    {columnTasks.map(task => {
                      const attachmentsList = parseAttachments(task.attachments);
                      const hasAttachments = attachmentsList.length > 0;
                      const hasDetails = !!(task.details && task.details.trim());

                      return (
                        <div key={task.id} className="task-card glass-panel" onClick={() => setViewingTask(task)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <h4 className="task-card-title">{task.title}</h4>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                              <button 
                                className="btn-outline" 
                                style={{ padding: '2px 5px', fontSize: 11, border: 'none', color: 'var(--text-muted)' }} 
                                onClick={() => openEditTaskModal(task)}
                                title="Chỉnh sửa công việc"
                              >
                                <Edit size={13} />
                              </button>
                              <span 
                                style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, fontWeight: 700 }} 
                                onClick={() => handleDeleteTask(task.id)}
                                title="Xóa công việc"
                              >
                                ×
                              </span>
                            </div>
                          </div>

                          {task.description && <p className="task-card-desc" style={{ marginBottom: 6 }}>{task.description}</p>}

                          {/* Indicators: Details & Attachments badges */}
                          {(hasDetails || hasAttachments) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                              {hasDetails && (
                                <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <FileText size={10} /> Chi tiết
                                </span>
                              )}
                              {hasAttachments && (
                                <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Paperclip size={10} /> {attachmentsList.length} tệp
                                </span>
                              )}
                            </div>
                          )}
                          
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
    
                          <div className="task-card-footer" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--accent-orange)' }}>Hạn: {task.due_date}</span>
                            <span className={`priority-${task.priority}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                              {translatePriority(task.priority)}
                            </span>
                          </div>

                          {/* Di chuyển công việc nhanh */}
                          <div 
                            style={{ display: 'flex', gap: 4, marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6 }}
                            onClick={e => e.stopPropagation()}
                          >
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
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', padding: '40px 20px', textAlign: 'center' }}>
            <Briefcase size={56} style={{ marginBottom: 16, color: 'var(--accent-orange)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có dự án nào</h3>
            <p style={{ fontSize: 14, maxWidth: 420, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Bắt đầu quản lý công việc và phân bổ nhân sự cho agency bằng cách tạo dự án đầu tiên của bạn!
            </p>
            <button 
              className="btn-neon" 
              style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}
              onClick={openAddProjectModal}
            >
              <Plus size={18} /> Tạo Dự Án Mới
            </button>
          </div>
        )}
      </div>

      {/* MODAL TẠO DỰ ÁN MỚI */}
      {showAddProject && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel">
            <h3 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Khởi tạo dự án mới</h3>
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
            <h3 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Thiết lập dự án</h3>
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

      {/* MODAL TẠO & CHỈNH SỬA CÔNG VIỆC (HỖ TRỢ DETAILS & ATTACHMENTS <5MB) */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel" style={{ maxWidth: 640, width: '92vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                {editingTaskId ? 'Chỉnh sửa công việc' : 'Giao công việc mới'}
              </h3>
              <button 
                type="button" 
                className="btn-outline" 
                style={{ padding: '4px 8px', border: 'none' }} 
                onClick={() => setShowTaskModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label>Tiêu đề công việc *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Ví dụ: Thiết kế giao diện trang chủ" 
                  value={taskTitle} 
                  onChange={e => setTaskTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Tóm tắt nhiệm vụ</label>
                <input 
                  type="text" 
                  placeholder="Mô tả ngắn gọn mục tiêu..." 
                  value={taskDesc} 
                  onChange={e => setTaskDesc(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Văn bản / Hướng dẫn chi tiết (Details)</label>
                <textarea 
                  rows={4} 
                  placeholder="Nhập nội dung, văn bản quy chuẩn, link tài liệu, yêu cầu nghiệm thu chi tiết..." 
                  value={taskDetails} 
                  onChange={e => setTaskDetails(e.target.value)} 
                />
              </div>

              {/* TỆP ĐÍNH KÈM (ATTACHMENTS < 5MB) */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Tệp đính kèm (Giới hạn &lt; 5MB/tệp)</label>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip size={13} /> Chọn tệp tải lên
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    multiple 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                  />
                </div>

                {taskAttachments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    {taskAttachments.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', background: '#ffffff', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Paperclip size={12} style={{ color: 'var(--accent-orange)' }} />
                          <span style={{ fontWeight: 600, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, padding: '0 4px' }} 
                          onClick={() => removeAttachment(idx)}
                          title="Xóa tệp"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>
                    Chưa có tệp đính kèm nào được tải lên.
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Người phụ trách chính (PIC) *</label>
                  <select value={taskOwner} onChange={e => setTaskOwner(parseInt(e.target.value))}>
                    <option value={0}>-- Chọn người phụ trách --</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phó phụ trách</label>
                  <select value={taskSubOwner} onChange={e => setTaskSubOwner(parseInt(e.target.value))}>
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
                      <input 
                        type="checkbox" 
                        checked={selectedTaskMembers.includes(m.id)} 
                        onChange={() => toggleTaskMember(m.id)} 
                      />
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
                      <input 
                        type="checkbox" 
                        checked={selectedTaskDepts.includes(d.id)} 
                        onChange={() => toggleTaskDept(d.id)} 
                      />
                      {translateDept(d.name)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Độ ưu tiên</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)}>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Trạng thái</label>
                  <select value={taskStatus} onChange={e => setTaskStatus(e.target.value as any)}>
                    <option value="Todo">Cần làm</option>
                    <option value="InProgress">Đang làm</option>
                    <option value="Review">Đánh giá</option>
                    <option value="Done">Hoàn thành</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hạn hoàn thành</label>
                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setShowTaskModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 20px' }}>
                  {editingTaskId ? 'Cập nhật công việc' : 'Tạo công việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT CÔNG VIỆC (VIEW DETAILS & TẢI FILE ĐÍNH KÈM) */}
      {viewingTask && (
        <div className="modal-overlay" onClick={() => setViewingTask(null)}>
          <div className="modal-body glass-panel" style={{ maxWidth: 640, width: '92vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div>
                <span className={`priority-${viewingTask.priority}`} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
                  {translatePriority(viewingTask.priority)} • {translateStatus(viewingTask.status)}
                </span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: 20, color: 'var(--text-primary)' }}>
                  {viewingTask.title}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button 
                  className="btn-outline" 
                  style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    const t = viewingTask;
                    setViewingTask(null);
                    openEditTaskModal(t);
                  }}
                >
                  <Edit size={13} /> Sửa
                </button>
                <button 
                  className="btn-outline" 
                  style={{ padding: '6px 10px', fontSize: 14 }}
                  onClick={() => setViewingTask(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {viewingTask.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Mô tả:</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  {viewingTask.description}
                </div>
              </div>
            )}

            {/* Ô DETAILS: VĂN BẢN HƯỚNG DẪN */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={14} style={{ color: 'var(--accent-orange)' }} /> Văn bản / Chỉ dẫn chi tiết (Details):
              </div>
              {viewingTask.details && viewingTask.details.trim() ? (
                <div style={{ fontSize: 13, color: 'var(--text-primary)', background: '#ffffff', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {viewingTask.details}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  Chưa có nội dung văn bản chi tiết. Bấm "Sửa" để cập nhật.
                </div>
              )}
            </div>

            {/* DANH SÁCH FILE ĐÍNH KÈM & TẢI VỀ */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Paperclip size={14} style={{ color: 'var(--accent-orange)' }} /> Tệp đính kèm ({parseAttachments(viewingTask.attachments).length}):
              </div>

              {parseAttachments(viewingTask.attachments).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {parseAttachments(viewingTask.attachments).map((f, index) => (
                    <div 
                      key={index}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#f8fafc', 
                        padding: '8px 12px', 
                        borderRadius: 6, 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <Paperclip size={14} style={{ color: '#0284c7' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>

                      <a 
                        href={f.data} 
                        download={f.name} 
                        className="btn-outline" 
                        style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: '#0284c7' }}
                      >
                        <Download size={13} /> Tải xuống
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Không có tệp đính kèm.
                </div>
              )}
            </div>

            {/* THÔNG TIN NHÂN SỰ & THỜI HẠN */}
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div>👤 <strong>Chủ trì (PIC):</strong> {viewingTask.owner_name || 'Chưa phân công'}</div>
              {viewingTask.sub_owner_name && <div>👥 <strong>Phó chủ trì:</strong> {viewingTask.sub_owner_name}</div>}
              {viewingTask.members && viewingTask.members.length > 0 && (
                <div>👥 <strong>Thành viên:</strong> {viewingTask.members.map(m => m.name).join(', ')}</div>
              )}
              {viewingTask.departments && viewingTask.departments.length > 0 && (
                <div>🏢 <strong>Phòng ban:</strong> {viewingTask.departments.map(d => translateDept(d.name)).join(', ')}</div>
              )}
              <div>📅 <strong>Hạn chót:</strong> {viewingTask.due_date || 'Không có'}</div>
              {viewingTask.creator_name && <div>✍️ <strong>Người giao việc:</strong> {viewingTask.creator_name}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                className="btn-outline" 
                style={{ borderColor: '#ef4444', color: '#ef4444', padding: '8px 14px' }}
                onClick={() => {
                  const id = viewingTask.id;
                  setViewingTask(null);
                  handleDeleteTask(id);
                }}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} /> Xóa việc
              </button>
              <button 
                type="button" 
                className="btn-neon" 
                style={{ padding: '8px 20px' }} 
                onClick={() => setViewingTask(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NHẬT KÝ XÓA DỰ ÁN (DÀNH CHO QUẢN TRỊ VIÊN) */}
      {showDeletionLogs && (
        <div className="modal-overlay">
          <div className="modal-body glass-panel" style={{ maxWidth: 840, width: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={22} style={{ color: 'var(--accent-orange)' }} />
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18 }}>Nhật Ký Xóa Dự Án</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Lịch sử chi tiết các dự án đã xóa, người thực hiện và danh sách công việc liên quan
                  </p>
                </div>
              </div>
              <button 
                className="btn-outline" 
                style={{ padding: '4px 10px', fontSize: 14 }} 
                onClick={() => setShowDeletionLogs(false)}
              >
                ✕
              </button>
            </div>

            {loadingLogs ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Đang tải nhật ký xóa...
              </div>
            ) : deletionLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Briefcase size={36} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Chưa có dự án nào bị xóa trong hệ thống.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 6 }}>
                {deletionLogs.map(log => (
                  <div 
                    key={log.id} 
                    style={{ 
                      background: '#ffffff', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 8, 
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.project_name}
                      </span>
                      <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        Đã xóa: {log.deleted_at}
                      </span>
                    </div>

                    {log.project_description && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                        {log.project_description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
                      <span>👤 <strong>Người khởi tạo:</strong> {log.created_by_name || 'Không rõ'}</span>
                      <span>🗑️ <strong>Người xóa:</strong> {log.deleted_by_name} ({log.deleted_by_email})</span>
                      <span>📋 <strong>Số công việc ảnh hưởng:</strong> {log.total_tasks}</span>
                    </div>

                    {log.tasks_summary && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600 }}>Chi tiết công việc: </span>
                        {log.tasks_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button 
                type="button" 
                className="btn-neon" 
                style={{ padding: '8px 20px' }} 
                onClick={() => setShowDeletionLogs(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
