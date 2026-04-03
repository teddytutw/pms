import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import WBSView from '../components/WBSView';

import {
  LayoutDashboard, Users, Settings, Search,
  Menu, X, FolderPlus, BarChart2, LogOut, List
} from 'lucide-react';

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  // View & selection
  const [viewState, setViewState] = useState<'list' | 'gantt'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Data
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form
  const [newTask, setNewTask] = useState({ title: '', projectId: null as number | null, startDate: '', endDate: '', assigneeId: null as number | null, phase: 'Planning' });
  const [newProject, setNewProject] = useState({ id: null as number | null, name: '', description: '', ownerId: null as number | null, startDate: '', endDate: '', budget: 0 });

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) { navigate('/login'); return; }
    setCurrentUser(JSON.parse(userJson));

    (async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          fetch('http://localhost:8080/api/users'),
          fetch('http://localhost:8080/api/projects'),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (projectsRes.ok) {
          const p = await projectsRes.json();
          setProjects(p);
          if (p.length > 0) {
            const lastId = p[p.length - 1].id;
            setSelectedProjectId(lastId);
            fetchProjectDetails(lastId);
          }
        }
      } catch (err) { console.error(err); }
    })();
  }, []);

  const fetchProjectDetails = async (projectId: number) => {
    try {
      const [tasksRes, membersRes, gatesRes] = await Promise.all([
        fetch(`http://localhost:8080/api/tasks/project/${projectId}`),
        fetch(`http://localhost:8080/api/projects/${projectId}/members`),
        fetch(`http://localhost:8080/api/projects/${projectId}/gates`),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (membersRes.ok) setProjectMembers(await membersRes.json());
      if (gatesRes.ok) setGates(await gatesRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedProjectId) fetchProjectDetails(selectedProjectId);
  }, [selectedProjectId]);

  // Task moved via DnD — use lightweight PATCH
  const handleTaskMoved = async (taskId: number, newPhase: string, newProjectId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.phase === newPhase && task.projectId === newProjectId) return; // no change
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, phase: newPhase, projectId: newProjectId }
      : t
    ));
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase, projectId: newProjectId }),
      });
      if (!res.ok) throw new Error('PATCH failed');
    } catch (err) {
      console.error('DnD save failed, reverting:', err);
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
    }
  };

  const handleLogout = () => { localStorage.removeItem('currentUser'); navigate('/login'); };

  // Rename handlers
  const handleRenameProject = async (projectId: number, newName: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
    try {
      await fetch(`http://localhost:8080/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
    } catch { setProjects(prev => prev.map(p => p.id === projectId ? proj : p)); }
  };

  const handleRenameTask = async (taskId: number, newTitle: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
    try {
      await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch { setTasks(prev => prev.map(t => t.id === taskId ? task : t)); }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    const method = newProject.id ? 'PUT' : 'POST';
    const url = newProject.id
      ? `http://localhost:8080/api/projects/${newProject.id}`
      : 'http://localhost:8080/api/projects';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, status: 'ACTIVE', plannedStartDate: newProject.startDate, plannedEndDate: newProject.endDate }),
      });
      if (res.ok) {
        const saved = await res.json();
        setProjects(newProject.id ? projects.map(p => p.id === saved.id ? saved : p) : [...projects, saved]);
        setSelectedProjectId(saved.id);
        setIsCreateProjectModalOpen(false);
        setNewProject({ id: null, name: '', description: '', ownerId: null, startDate: '', endDate: '', budget: 0 });
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.projectId) return;
    try {
      const res = await fetch('http://localhost:8080/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks([created, ...tasks]);
        setIsCreateTaskModalOpen(false);
        setNewTask({ title: '', projectId: selectedProjectId, startDate: '', endDate: '', assigneeId: null, phase: 'Planning' });
      }
    } catch (err) { console.error(err); }
  };

  const handleApproveGate = async (projectId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${projectId}/gates/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: currentUser.id, comments: '通過關卡' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(projects.map(p => p.id === projectId ? updated : p));
        // Refresh gates
        const gatesRes = await fetch(`http://localhost:8080/api/projects/${projectId}/gates`);
        if (gatesRes.ok) setGates(await gatesRes.json());
      } else {
        const err = await res.json();
        alert(err.message || '核准失敗！');
      }
    } catch (err) { console.error(err); }
  };

  const currentProject = projects.find(p => p.id === selectedProjectId) ?? (projects[projects.length - 1] ?? null);
  const isOwner = currentUser && currentProject && currentProject.ownerId === currentUser.id;

  const PHASES = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'];
  const ganttTasks: GanttTask[] = tasks
    .filter(t => t.startDate && t.endDate && new Date(t.startDate) <= new Date(t.endDate))
    .map((t, i) => ({
      start: new Date(t.startDate), end: new Date(t.endDate), name: t.title,
      id: String(t.id || i), type: 'task' as const,
      progress: t.status === '已完成' ? 100 : (t.status === '進行中' ? 50 : 0),
      isDisabled: true, styles: { progressColor: '#6366f1', progressSelectedColor: '#4f46e5' },
    }));

  const navItems = [
    { name: '儀表板', icon: LayoutDashboard, onClick: () => navigate('/dashboard'), active: true },
    { name: '團隊成員管理', icon: Users, onClick: () => navigate('/team'), active: false },
    { name: '系統設定', icon: Settings, onClick: () => {}, active: false },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* ── Sidebar ── */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className={`font-black text-xl text-indigo-600 truncate ${!isSidebarOpen && 'hidden'}`}>PMP Enterprise</div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {navItems.map(item => (
              <li key={item.name}>
                <button onClick={item.onClick} className={`w-full flex items-center h-10 px-3 rounded-xl transition-all ${item.active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className={`ml-3 font-medium whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`ml-3 font-medium ${!isSidebarOpen && 'hidden'}`}>登出系統</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="max-w-xl w-full">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input type="text" placeholder="快速搜尋任務..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-sm" />
            </div>
          </div>
          <div className="flex items-center space-x-5">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{currentUser?.name}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{currentUser?.role}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-100 cursor-default select-none">
              {currentUser?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Top Actions ── */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900">專案儀表板</h2>
                <p className="text-gray-400 text-sm mt-0.5">PMP 企業級專案管理 — Work Breakdown Structure</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setIsCreateProjectModalOpen(true)} className="bg-white border-2 border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center shadow-sm text-sm">
                  <FolderPlus className="w-4 h-4 mr-2" /> 建立專案
                </button>
                <button
                  onClick={() => {
                    setIsCreateTaskModalOpen(true);
                    setNewTask({ title: '', projectId: selectedProjectId, startDate: '', endDate: '', assigneeId: null, phase: 'Initiation' });
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-200 text-sm"
                >
                  <span className="mr-1.5 font-black text-lg leading-none">+</span> 新增任務
                </button>
              </div>
            </div>

            {/* ── Project Card ── */}
            {currentProject && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-50/30 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">選擇專案</p>
                    <Select
                      options={projects.map(p => ({ value: p.id, label: p.name }))}
                      value={{ value: currentProject.id, label: currentProject.name }}
                      onChange={o => setSelectedProjectId(o?.value || null)}
                      className="text-lg font-black"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setNewProject({ ...currentProject, startDate: currentProject.plannedStartDate, endDate: currentProject.plannedEndDate }); setIsCreateProjectModalOpen(true); }}
                      className="px-3 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                      ✎ 編輯章程
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => handleApproveGate(currentProject.id)}
                        className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 shadow-lg shadow-green-100 transition-all"
                      >
                        ✓ 核准階段
                      </button>
                    )}
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 whitespace-nowrap">
                      ▶ {currentProject.currentPhase || 'Initiation'}
                    </span>
                  </div>
                </div>

                {/* Phase Progress Rail */}
                <div className="flex gap-1">
                  {PHASES.map((p, i) => {
                    const idx = PHASES.indexOf(currentProject.currentPhase || 'Initiation');
                    const active = i <= idx;
                    const current = i === idx;
                    return (
                      <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className={`h-1.5 w-full rounded-full transition-all duration-700 ${active ? (current ? 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-indigo-300') : 'bg-gray-100'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-wide ${current ? 'text-indigo-600' : (active ? 'text-indigo-300' : 'text-gray-200')}`}>{p}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── WBS Panel ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-50/30 overflow-hidden">
              {/* Panel Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex space-x-1 bg-white p-1 rounded-xl border">
                  <button
                    onClick={() => setViewState('list')}
                    className={`flex items-center px-5 py-1.5 rounded-lg text-xs font-black transition-all ${viewState === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <List className="w-3.5 h-3.5 mr-1.5" /> WBS 結構
                  </button>
                  <button
                    onClick={() => setViewState('gantt')}
                    className={`flex items-center px-5 py-1.5 rounded-lg text-xs font-black transition-all ${viewState === 'gantt' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> 甘特圖
                  </button>
                </div>

                {/* Team avatars */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    {projectMembers.slice(0, 6).map((m, i) => {
                      const u = users.find(u => u.id === m.userId);
                      return (
                        <div key={i} title={u?.name} className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-black shadow-sm">
                          {u?.name?.charAt(0) ?? '?'}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => navigate('/team')} className="text-xs text-indigo-500 font-bold hover:text-indigo-700 hover:underline whitespace-nowrap">
                    管理團隊 ({projectMembers.length})
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 min-h-96">
                {viewState === 'list' ? (
                  <WBSView
                    projects={projects}
                    tasks={tasks}
                    gates={gates}
                    users={users}
                    selectedProjectId={selectedProjectId}
                    onTaskMoved={handleTaskMoved}
                    onRenameProject={handleRenameProject}
                    onRenameTask={handleRenameTask}
                  />
                ) : (
                  <div className="h-full">
                    <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                      <span className="text-amber-500">⚠</span> 甘特圖僅顯示設有開始與結束日期的任務
                    </p>
                    {ganttTasks.length > 0 ? (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <Gantt tasks={ganttTasks} viewMode={ViewMode.Day} listCellWidth="" columnWidth={60} locale="zh" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-3">
                          <BarChart2 className="w-7 h-7" />
                        </div>
                        <p className="text-gray-500 font-bold text-sm">無可顯示的任務</p>
                        <p className="text-xs text-gray-400 mt-1">請確保任務已設定開始與結束日期</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Create Task Modal ── */}
        {isCreateTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="px-7 h-16 border-b flex items-center justify-between bg-indigo-50/50">
                <h3 className="text-lg font-black text-indigo-900">分派 WBS 任務</h3>
                <button onClick={() => setIsCreateTaskModalOpen(false)} className="p-1.5 hover:bg-white rounded-full text-indigo-400 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-7 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">任務名稱 *</label>
                  <input type="text" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold"
                    placeholder="輸入任務名稱..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">歸屬專案 *</label>
                    <Select
                      options={projects.map(p => ({ value: p.id, label: p.name }))}
                      value={projects.map(p => ({ value: p.id, label: p.name })).find(o => o.value === newTask.projectId) ?? null}
                      onChange={o => setNewTask({ ...newTask, projectId: o?.value ?? null })}
                      placeholder="選擇專案..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">歸屬階段 (Phase) *</label>
                    <Select
                      options={['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'].map(p => ({ value: p, label: p }))}
                      value={{ value: newTask.phase, label: newTask.phase }}
                      onChange={o => setNewTask({ ...newTask, phase: o?.value || 'Initiation' })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">指派人員</label>
                  <Select
                    options={projectMembers.map(m => { const u = users.find(x => x.id === m.userId); return { value: m.userId, label: u?.name ?? '?' }; })}
                    onChange={o => setNewTask({ ...newTask, assigneeId: o?.value as any })}
                    isClearable
                    placeholder="選擇成員..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">開始日期</label>
                    <input type="date" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">結束日期</label>
                    <input type="date" value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateTaskModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-400 hover:bg-gray-50 rounded-xl">取消</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    新增至 WBS
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Create Project Modal ── */}
        {isCreateProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-7 h-16 border-b flex items-center justify-between bg-amber-50/50">
                <h3 className="text-lg font-black text-amber-900">專案章程</h3>
                <button onClick={() => setIsCreateProjectModalOpen(false)} className="p-1.5 hover:bg-white rounded-full text-amber-400 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="p-7 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">專案名稱 *</label>
                  <input type="text" required value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-amber-400 rounded-xl outline-none text-sm font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">預算</label>
                    <input type="number" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-amber-400 rounded-xl outline-none text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">專案 Owner</label>
                    <Select
                      options={users.map(u => ({ value: u.id, label: u.name }))}
                      value={users.map(u => ({ value: u.id, label: u.name })).find(x => x.value === newProject.ownerId)}
                      onChange={o => setNewProject({ ...newProject, ownerId: o?.value as any })}
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateProjectModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-400 hover:bg-gray-50 rounded-xl">取消</button>
                  <button type="submit" className="px-6 py-2 bg-amber-500 text-white text-sm font-black rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all active:scale-95">
                    儲存章程
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
