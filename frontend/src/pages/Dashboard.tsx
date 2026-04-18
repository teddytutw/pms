import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import WBSView from '../components/WBSView';

import {
  X, Search, Plus,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CalendarClock, Download,
  Folder, FileSpreadsheet
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProjectSelectorModal from '../components/ProjectSelectorModal';
import ImportModal from '../components/ImportModal';

// const formatDate = (dateStr?: string) => {
//   if (!dateStr) return '-';
//   const date = new Date(dateStr);
//   if (isNaN(date.getTime())) return '-';
//   const m = String(date.getMonth() + 1).padStart(2, '0');
//   const d = String(date.getDate()).padStart(2, '0');
//   const y = date.getFullYear();
//   return `${m}/${d}/${y}`;
// };

const calcWorkingDays = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  const dStart = new Date(start);
  const dEnd = new Date(end);
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) return 0;
  let days = 0;
  let current = new Date(dStart);
  while (current <= dEnd) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) days++;
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // Resize state
  const [wbsWidthPercentage, setWbsWidthPercentage] = useState(45);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState<'start' | 'end'>('start');
  const [rescheduleDate, setRescheduleDate] = useState('');

  // View & selection
  const [ganttViewMode, setGanttViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Detail Drawer State
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Data
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  // const [currentUser, setCurrentUser] = useState<any>(null);

  // Per-modal dynamic properties
  const [modalGates, setModalGates] = useState<any[]>([]);
  const [modalMembers, setModalMembers] = useState<any[]>([]);

  // Form
  const [newTask, setNewTask] = useState({ title: '', projectId: null as number | null, plannedStartDate: '', plannedEndDate: '', assigneeId: null as number | null, phase: '' });
  const [newProject, setNewProject] = useState({ id: null as number | null, name: '', description: '', ownerId: null as number | null, plannedStartDate: '', plannedEndDate: '', budget: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      const newPercentage = (relativeX / containerRect.width) * 100;
      setWbsWidthPercentage(newPercentage);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const fetchProjectDetails = (projectId: number) => {
    setTasks([]);
    setGates([]);
    
    fetch((import.meta as any).env.BASE_URL + `api/tasks/project/${projectId}`)
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(err => console.error(err));
    
    fetch((import.meta as any).env.BASE_URL + `api/phases/project/${projectId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setGates(data);
        setModalGates(data);
      })
      .catch(err => {
        console.error("Failed to fetch phases:", err);
        setGates([]);
        setModalGates([]);
      });

    fetch((import.meta as any).env.BASE_URL + `api/projects/${projectId}/members`)
      .then(res => res.json())
      .then(data => setModalMembers(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      // const u = JSON.parse(userJson);
      // setCurrentUser(u);
    }

    fetch((import.meta as any).env.BASE_URL + 'api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        
        // Priority: 1. Navigation State, 2. Session Storage
        const statePid = location.state?.selectedProjectId;
        const storedPid = sessionStorage.getItem('dashboard_selectedProjectId');
        
        const pidToSet = statePid || (storedPid ? parseInt(storedPid) : null);
        
        if (pidToSet) {
          setSelectedProjectId(pidToSet);
          fetchProjectDetails(pidToSet);
          sessionStorage.setItem('dashboard_selectedProjectId', pidToSet.toString());
        }
      })
      .catch(err => console.error(err));

    fetch((import.meta as any).env.BASE_URL + 'api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, []);

  // Persist project selection when changed manually
  useEffect(() => {
    if (selectedProjectId) {
      sessionStorage.setItem('dashboard_selectedProjectId', selectedProjectId.toString());
      fetchProjectDetails(selectedProjectId);
    } else {
      setTasks([]);
      setGates([]);
    }
  }, [selectedProjectId]);

  const handleExportProject = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${selectedProjectId}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `project_${selectedProjectId}.xml`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.projectId) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + 'api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        setIsCreateTaskModalOpen(false);
        setNewTask({ title: '', projectId: selectedProjectId, plannedStartDate: '', plannedEndDate: '', assigneeId: null, phase: '' });
        if (selectedProjectId) fetchProjectDetails(selectedProjectId);
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateTask = async (taskId: number, updates: any) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        if (selectedProjectId) fetchProjectDetails(selectedProjectId);
      }
    } catch (err) { console.error(err); }
  };

  const handleTaskMoved = async (taskId: number, newPhase: string, newProjectId: number) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase, projectId: newProjectId })
      });
      if (res.ok && selectedProjectId) fetchProjectDetails(selectedProjectId);
    } catch (err) { console.error(err); }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + 'api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, type: 'Project' })
      });
      if (res.ok) {
        setIsCreateProjectModalOpen(false);
        setNewProject({ id: null, name: '', description: '', ownerId: null, plannedStartDate: '', plannedEndDate: '', budget: 0 });
        const AllProjects = await (await fetch((import.meta as any).env.BASE_URL + 'api/projects')).json();
        setProjects(AllProjects);
      }
    } catch (err) { console.error(err); }
  };

  const handleRenameProject = async (id: number, newName: string) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
      }
    } catch (err) { console.error(err); }
  };
  const handleAddPhase = async (projectId: number, phaseName: string) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/phases/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseName })
      });
      if (res.ok) fetchProjectDetails(projectId);
    } catch (err) { console.error(err); }
  };
  const handleUpdatePhase = async (phaseId: number, updates: any) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/phases/${phaseId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(updates)
      });
      if (res.ok && selectedProjectId) fetchProjectDetails(selectedProjectId);
    } catch (err) { console.error(err); }
  }
  const handleReorderPhases = async (projectId: number, phaseIds: number[]) => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/phases/project/${projectId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phaseIds)
      });
      if (res.ok) fetchProjectDetails(projectId);
    } catch (err) { console.error(err); }
  };

  const handleSelectTask = (taskId: number | null) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(!!taskId);
  };

  const handleAdjustTask = async (direction: 'indent' | 'outdent' | 'up' | 'down') => {
    if (!selectedTaskId) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${selectedTaskId}/adjust?direction=${direction}`, {
        method: 'POST'
      });
      if (res.ok && selectedProjectId) fetchProjectDetails(selectedProjectId);
    } catch (err) { console.error(err); }
  };

  const handleReschedule = async () => {
    if (!selectedProjectId || !rescheduleDate) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${selectedProjectId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: rescheduleDate, mode: rescheduleMode })
      });
      if (res.ok) {
        setIsRescheduleModalOpen(false);
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err) { console.error(err); }
  };

  const ganttTasks: GanttTask[] = useMemo(() => {
    const list: GanttTask[] = [];
    if (!selectedProjectId) return list;

    // Parse date-only strings as LOCAL time (not UTC) to align with
    // gantt-task-react's local-midnight column boundaries.
    const safeDate = (dateStr: string | null | undefined, fallback: Date, isEnd = false): Date => {
      if (!dateStr) return fallback;
      const localStr = dateStr.length === 10
        ? `${dateStr}T${isEnd ? '23:59:59' : '00:00:00'}`
        : dateStr;
      const d = new Date(localStr);
      return isNaN(d.getTime()) ? fallback : d;
    };

    const proj = projects.find(p => p.id == selectedProjectId);
    if (!proj) return list;

    const pStart = safeDate(proj.plannedStartDate, new Date());
    const pEnd   = safeDate(proj.plannedEndDate,   new Date(), true);

    // CRITICAL: Every task MUST have a unique, stable displayOrder.
    // gantt-task-react's internal sortTasks sorts by displayOrder.
    // Without it (undefined → Number.MAX_VALUE), the sort is unstable and
    // triggers an infinite "Maximum update depth exceeded" loop.
    let order = 0;

    list.push({
      id: `project-${proj.id}`,
      name: proj.name,
      start: pStart,
      end: pEnd,
      type: 'project',
      progress: 0,
      displayOrder: ++order,
      styles: { backgroundColor: '#4f46e5', backgroundSelectedColor: '#4338ca' }
    });

    const allTaskIds = new Set(tasks.map(t => String(t.id)));
    const phasesInOrder = Array.from(new Set(tasks.map(t => t.phase).filter(Boolean)));
    const tasksWithoutPhase = tasks.filter(t => !t.phase);

    phasesInOrder.forEach((phaseName) => {
      const phaseTasks = tasks.filter(t => t.phase === phaseName);
      if (phaseTasks.length === 0) return;

      const phaseStart = new Date(Math.min(...phaseTasks.map(t => safeDate(t.plannedStartDate, pStart).getTime())));
      const phaseEnd   = new Date(Math.max(...phaseTasks.map(t => safeDate(t.plannedEndDate, pEnd, true).getTime())));

      list.push({
        id: `phase-${order}`,
        name: String(phaseName),
        start: phaseStart,
        end: phaseEnd,
        type: 'project',
        progress: 0,
        displayOrder: ++order,
        styles: { backgroundColor: '#818cf8', backgroundSelectedColor: '#6366f1' }
      });

      phaseTasks.forEach(task => {
        const tStart = safeDate(task.plannedStartDate, phaseStart);
        const tEnd   = safeDate(task.plannedEndDate,   tStart, true);
        list.push({
          id: String(task.id),
          name: task.title,
          start: tStart,
          end: tEnd,
          type: 'task',
          progress: task.status === 'DONE' ? 100 : 0,
          displayOrder: ++order,
          dependencies: (task.predecessors || '').split(',')
            .map((p: string) => p.trim().replace(/^T/, ''))
            .filter((id: string) => id && allTaskIds.has(id)),
          styles: { backgroundColor: '#e2e8f0', backgroundSelectedColor: '#cbd5e1', progressColor: '#4f46e5', progressSelectedColor: '#4338ca' }
        });
      });
    });

    if (tasksWithoutPhase.length > 0) {
      const cStart = new Date(Math.min(...tasksWithoutPhase.map(t => safeDate(t.plannedStartDate, pStart).getTime())));
      const cEnd   = new Date(Math.max(...tasksWithoutPhase.map(t => safeDate(t.plannedEndDate, pEnd, true).getTime())));

      list.push({
        id: `phase-common`,
        name: 'Common Tasks',
        start: cStart,
        end: cEnd,
        type: 'project',
        progress: 0,
        displayOrder: ++order,
        styles: { backgroundColor: '#94a3b8', backgroundSelectedColor: '#64748b' }
      });

      tasksWithoutPhase.forEach(task => {
        const tStart = safeDate(task.plannedStartDate, cStart);
        const tEnd   = safeDate(task.plannedEndDate,   tStart, true);
        list.push({
          id: String(task.id),
          name: task.title,
          start: tStart,
          end: tEnd,
          type: 'task',
          progress: task.status === 'DONE' ? 100 : 0,
          displayOrder: ++order,
          dependencies: (task.predecessors || '').split(',')
            .map((p: string) => p.trim().replace(/^T/, ''))
            .filter((id: string) => id && allTaskIds.has(id)),
          styles: { backgroundColor: '#e2e8f0', backgroundSelectedColor: '#cbd5e1', progressColor: '#4f46e5', progressSelectedColor: '#4338ca' }
        });
      });
    }

    return list;
  }, [tasks, projects, selectedProjectId]);





  const currentProject = projects.find(p => p.id === selectedProjectId);

  // WBS Map for simple display
  const wbsMap = useMemo(() => {
    const map: Record<number, string> = {};
    const phases = Array.from(new Set(tasks.map(t => t.phase).filter(Boolean)));
    phases.forEach((p, pi) => {
      const pts = tasks.filter(t => t.phase === p);
      pts.forEach((t, ti) => {
        map[t.id] = `${pi + 1}.${ti + 1}`;
      });
    });
    return map;
  }, [tasks]);

  const criticalPathIds = useMemo(() => {
    // Highly simplified dummy logic for now
    return new Set<string>();
  }, [tasks]);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
          {/* Dashboard Header */}
          <header className="h-16 px-8 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
             <div className="flex items-center gap-4">
               <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100"><Folder className="w-5 h-5 text-white" /></div>
               <div className="flex flex-col">
                  <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">WBS Analysis</h1>
                  <p className="text-[10px] font-bold text-slate-400">Project: {currentProject?.name || 'Unselected'}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsProjectModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Search className="w-4 h-4" /> SELECT PROJECT
                </button>
                <div className="w-[1px] h-6 bg-gray-100" />
                <button 
                  disabled={!selectedProjectId}
                  onClick={() => setIsRescheduleModalOpen(true)}
                  className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-20" title="Reschedule"
                >
                  <CalendarClock className="w-5 h-5" />
                </button>
                <button 
                  disabled={!selectedProjectId}
                  onClick={handleExportProject}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-20" title="Export MPP"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  disabled={!selectedProjectId}
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-20" title="Import WBS"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </button>
             </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-6">
                   <div className="font-black text-[10px] text-slate-500 uppercase tracking-widest">WBS Schedule & Control</div>
                   
                   {/* Global WBS Action Toolbar */}
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                     <button 
                       onClick={() => handleAdjustTask('outdent')} 
                       disabled={!selectedTaskId}
                       className={`p-1 rounded transition-all ${selectedTaskId ? 'text-indigo-600 hover:bg-white hover:shadow-sm' : 'text-gray-300 pointer-events-none'}`}
                       title="Outdent (Move Up Level)"
                     >
                       <ChevronLeft className="w-3.5 h-3.5" />
                     </button>
                     <button 
                       onClick={() => handleAdjustTask('indent')} 
                       disabled={!selectedTaskId}
                       className={`p-1 rounded transition-all ${selectedTaskId ? 'text-indigo-600 hover:bg-white hover:shadow-sm' : 'text-gray-300 pointer-events-none'}`}
                       title="Indent (Move Down Level)"
                     >
                       <ChevronRight className="w-3.5 h-3.5" />
                     </button>
                     <div className="w-[1px] h-3 bg-gray-200 mx-0.5" />
                     <button 
                       onClick={() => handleAdjustTask('up')} 
                       disabled={!selectedTaskId}
                       className={`p-1 rounded transition-all ${selectedTaskId ? 'text-indigo-600 hover:bg-white hover:shadow-sm' : 'text-gray-300 pointer-events-none'}`}
                       title="Move Up"
                     >
                       <ArrowUp className="w-3.5 h-3.5" />
                     </button>
                     <button 
                       onClick={() => handleAdjustTask('down')} 
                       disabled={!selectedTaskId}
                       className={`p-1 rounded transition-all ${selectedTaskId ? 'text-indigo-600 hover:bg-white hover:shadow-sm' : 'text-gray-300 pointer-events-none'}`}
                       title="Move Down"
                     >
                       <ArrowDown className="w-3.5 h-3.5" />
                     </button>
                   </div>

                   <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          const name = prompt('Phase Name:');
                          if (name && selectedProjectId) handleAddPhase(selectedProjectId, name);
                        }}
                        className="bg-violet-600 text-white px-3 py-1 rounded-lg text-[9px] font-black flex items-center hover:bg-violet-700 transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" /> PHASE
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsCreateTaskModalOpen(true);
                          setNewTask(p => ({ ...p, projectId: selectedProjectId, title: '', plannedStartDate: '', plannedEndDate: '' }));
                        }}
                        className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black flex items-center hover:bg-indigo-700 transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" /> TASK
                      </button>

                      <button 
                        onClick={() => {
                          setIsCreateTaskModalOpen(true);
                          const today = new Date().toISOString().split('T')[0];
                          setNewTask(p => ({ 
                            ...p, 
                            projectId: selectedProjectId, 
                            title: 'GATE: ',
                            plannedStartDate: today, 
                            plannedEndDate: today 
                          }));
                        }}
                        className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[9px] font-black flex items-center hover:bg-amber-600 transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" /> GATE
                      </button>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 text-[8px] font-black tracking-wider">
                     <button onClick={() => setGanttViewMode(ViewMode.Day)} className={`px-2 py-1.5 rounded-lg transition-all ${ganttViewMode === ViewMode.Day ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}>DAY</button>
                     <button onClick={() => setGanttViewMode(ViewMode.Week)} className={`px-2 py-1.5 rounded-lg transition-all ${ganttViewMode === ViewMode.Week ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}>WK</button>
                     <button onClick={() => setGanttViewMode(ViewMode.Month)} className={`px-2 py-1.5 rounded-lg transition-all ${ganttViewMode === ViewMode.Month ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}>MO</button>
                     <button onClick={() => setGanttViewMode(ViewMode.Year)} className={`px-2 py-1.5 rounded-lg transition-all ${ganttViewMode === ViewMode.Year ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}>YR</button>
                  </div>
                </div>
             </div>
             <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
                 <div style={{ width: `${wbsWidthPercentage}%` }} className="border-r border-gray-100 overflow-y-auto">
                   <WBSView 
                     projects={projects} 
                     tasks={tasks} 
                     gates={gates} 
                     users={users} 
                     selectedProjectId={selectedProjectId} 
                     onTaskMoved={handleTaskMoved} 
                     onRenameProject={handleRenameProject} 
                     onReorderPhases={handleReorderPhases} 
                     onSelectTask={handleSelectTask} 
                     selectedTaskId={selectedTaskId} 
                     onUpdateTask={handleUpdateTask} 
                     onUpdatePhase={handleUpdatePhase}
                     onAdjustTask={handleAdjustTask} 
                     wbsMap={wbsMap} 
                     criticalPathIds={criticalPathIds}
                   />
                 </div>

                <div
                   className={`w-1.5 hover:w-2 bg-transparent hover:bg-gray-200 cursor-col-resize transition-all z-20 shrink-0 ${isResizing ? 'bg-indigo-400 w-2' : ''}`}
                   onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                >
                  <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100">
                     <div className="w-0.5 h-8 bg-gray-300 rounded-full" />
                  </div>
                </div>

                <div style={{ width: `${100 - wbsWidthPercentage}%` }} className="bg-white overflow-auto border-l border-gray-100 flex flex-col">
                  {ganttTasks.length > 0 ? (
                    <div className="gantt-container h-full">
                      <Gantt 
                         tasks={ganttTasks} 
                         viewMode={ganttViewMode} 
                         locale="en" 
                         listCellWidth=""
                         columnWidth={65} 
                         rowHeight={32}
                         fontSize="11px"
                         headerHeight={45}
                         barCornerRadius={2}
                         todayColor="rgba(37, 99, 235, 0.04)"
                         onClick={t => !t.id.startsWith('project') && !t.id.startsWith('phase') && handleSelectTask(parseInt(t.id))} 
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-300 font-black text-[10px] uppercase tracking-widest italic">Set dates to view Gantt Chart</div>
                  )}
                </div>
                {isDrawerOpen && (
                  <div className="absolute inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-gray-100 z-30 flex flex-col transform transition-all">
                     <div className="h-16 px-6 border-b flex items-center justify-between bg-white shrink-0">
                        <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-widest">Detail Maintenance</h3>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-4 h-4" /></button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6">
                        {selectedTaskId && tasks.find(t => t.id === selectedTaskId) ? (
                            <TaskDrawerContent 
                               task={tasks.find(t => t.id === selectedTaskId)} 
                               users={users} 
                               onUpdate={handleUpdateTask} 
                               wbsCode={wbsMap[selectedTaskId]} 
                               isCritical={criticalPathIds.has(String(selectedTaskId))} 
                               projectRoles={currentProject?.responsibleRoles?.split(',').map((r: string) => r.trim()).filter(Boolean) || []}
                            />
                        ) : (
                           <div className="text-gray-300 text-center py-20 italic">Loading...</div>
                        )}
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Modals placeholders */}
        {isCreateTaskModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden p-8 space-y-6">
                 <h3 className="text-[14px] font-black text-indigo-900 border-b pb-4 uppercase tracking-widest">Add WBS Task</h3>
                 <div className="space-y-4">
                    <input type="text" placeholder="Task title..." value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-[12px]" />
                    <div className="grid grid-cols-2 gap-4">
                       <Select options={projects.map(p => ({ value: p.id, label: p.name }))} value={projects.map(p => ({ value: p.id, label: p.name })).find(o => o.value === newTask.projectId)} onChange={o => setNewTask(p => ({ ...p, projectId: o?.value || null }))} placeholder="PJ" />
                       <Select options={modalGates.map(g => ({ value: g.phaseName, label: g.phaseName }))} value={{ value: newTask.phase, label: newTask.phase }} onChange={o => setNewTask(p => ({ ...p, phase: o?.value || '' }))} placeholder="PHASE" isDisabled={!newTask.projectId} />
                    </div>
                    <Select options={modalMembers.map(m => ({ value: m.userId, label: users.find(u => u.id === m.userId)?.name || '' }))} onChange={o => setNewTask(p => ({ ...p, assigneeId: o?.value || null }))} placeholder="ASSIGN" isDisabled={!newTask.projectId} />
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule Start <span className="text-red-500">*</span></label>
                          <input required type="date" value={newTask.plannedStartDate} onChange={e => setNewTask(p => ({ ...p, plannedStartDate: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none text-[11px] font-bold" />
                       </div>
                       <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule End <span className="text-red-500">*</span></label>
                          <input required type="date" value={newTask.plannedEndDate} onChange={e => setNewTask(p => ({ ...p, plannedEndDate: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none text-[11px] font-bold" />
                       </div>
                    </div>
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsCreateTaskModalOpen(false)} className="px-6 py-2 rounded-xl text-[11px] font-black text-gray-400">CANCEL</button>
                    <button
                      onClick={handleCreateTask}
                      disabled={!newTask.title.trim() || !newTask.projectId || !newTask.plannedStartDate || !newTask.plannedEndDate}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg disabled:opacity-40 disabled:pointer-events-none"
                    >CREATE</button>
                 </div>
              </div>
           </div>
        )}

        {isCreateProjectModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-8 space-y-6">
                 <h3 className="text-[14px] font-black text-indigo-900 border-b pb-4 uppercase tracking-widest">Edit Project</h3>
                 <input type="text" placeholder="PJ Name..." value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-[12px]" />
                 <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsCreateProjectModalOpen(false)} className="px-6 py-2 rounded-xl text-[11px] font-black text-gray-400">CANCEL</button>
                    <button onClick={handleCreateProject} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg uppercase">Save</button>
                 </div>
              </div>
           </div>
        )}

        {/* Reschedule Modal */}
        {isRescheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <CalendarClock className="w-5 h-5 text-amber-500" />
                <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Project Reschedule</h3>
              </div>
              <p className="text-[11px] text-gray-500">Set a new anchor date. All tasks will shift proportionally while preserving working-day durations.</p>
              <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                <button onClick={() => { setRescheduleMode('start'); setRescheduleDate(currentProject?.plannedStartDate?.split('T')[0] || ''); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${rescheduleMode === 'start' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>
                  By Start Date
                </button>
                <button onClick={() => { setRescheduleMode('end'); setRescheduleDate(currentProject?.plannedEndDate?.split('T')[0] || ''); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${rescheduleMode === 'end' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>
                  By End Date
                </button>
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  New {rescheduleMode === 'start' ? 'Project Start' : 'Project End'} Date
                </label>
                <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-200 focus:border-amber-500 rounded-xl outline-none text-[13px] font-black" />
                <div className="text-[10px] text-gray-400">
                  Current: {rescheduleMode === 'start'
                    ? (currentProject?.plannedStartDate?.split('T')[0] || 'N/A')
                    : (currentProject?.plannedEndDate?.split('T')[0] || 'N/A')}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsRescheduleModalOpen(false)} className="px-6 py-2 rounded-xl text-[11px] font-black text-gray-400 hover:bg-gray-50">CANCEL</button>
                <button onClick={handleReschedule} disabled={!rescheduleDate}
                  className="px-6 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-amber-600 disabled:opacity-40">
                  APPLY RESCHEDULE
                </button>
              </div>
            </div>
          </div>
        )}

        <ProjectSelectorModal 
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          projects={projects}
          onSelect={(id) => {
            setSelectedProjectId(id);
            fetchProjectDetails(id);
            sessionStorage.setItem('dashboard_selectedProjectId', String(id));
          }}
          currentProjectId={selectedProjectId}
        />

        {currentProject && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            projectId={currentProject.id}
            projectName={currentProject.name}
            onImportSuccess={() => {
              fetchProjectDetails(currentProject.id);
              setIsImportModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function TaskDrawerContent({ task, users, onUpdate, wbsCode, isCritical, projectRoles }: { 
  task: any, 
  users: any[], 
  onUpdate: any, 
  wbsCode?: string, 
  isCritical?: boolean,
  projectRoles: string[]
}) {
  if (!task) return null;

  return (
    <div className="space-y-6">
      {(wbsCode || isCritical) && (
        <div className="flex items-center gap-2">
          {wbsCode && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded-md">WBS {wbsCode}</span>}
          {isCritical && <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-black rounded-md border border-red-200">⚠ CRITICAL PATH</span>}
        </div>
      )}
      <div>
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Activity Name</label>
        <input type="text" value={task.title} onChange={e => onUpdate(task.id, { title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-[11px] font-black shadow-inner" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assignee</label>
          <Select options={users.map(u => ({ value: u.id, label: u.name }))} value={users.map(u => ({ value: u.id, label: u.name })).find(o => o.value === task.assigneeId) || null} onChange={o => onUpdate(task.id, { assigneeId: o?.value || null })} isClearable placeholder="Select..." />
        </div>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Responsible Role</label>
          <Select 
            options={projectRoles.map(r => ({ value: r, label: r }))} 
            value={task.responsibleRoles ? { value: task.responsibleRoles, label: task.responsibleRoles } : null} 
            onChange={o => onUpdate(task.id, { responsibleRoles: o?.value || null })} 
            isClearable 
            placeholder="Select Role..." 
          />
        </div>
      </div>
      <div>
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
        <Select options={['TODO', 'PROG', 'DONE', 'OVR'].map(s => ({ value: s, label: s }))} value={{ value: task.status || 'TODO', label: task.status || 'TODO' }} onChange={o => onUpdate(task.id, { status: o?.value })} />
      </div>
      <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-4">
        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Schedule</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
           <div>
             <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">PL Start</label>
             <input type="date" value={task.plannedStartDate || ''} onChange={e => onUpdate(task.id, { plannedStartDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-bold" />
           </div>
           <div>
             <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">PL End</label>
             <input type="date" value={task.plannedEndDate || ''} onChange={e => onUpdate(task.id, { plannedEndDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-bold" />
           </div>
           <div>
             <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">ACT Start</label>
             <input type="date" value={task.actualStartDate || ''} onChange={e => onUpdate(task.id, { actualStartDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-bold" />
           </div>
           <div>
             <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">ACT End</label>
             <input type="date" value={task.actualEndDate || ''} onChange={e => onUpdate(task.id, { actualEndDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-bold" />
           </div>
        </div>
        <div className="pt-2 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
           <span>PL DUR: {calcWorkingDays(task.plannedStartDate, task.plannedEndDate)}D</span>
           <span className={task.actualEndDate ? 'text-green-600' : 'text-gray-400'}>
             ACT DUR: {calcWorkingDays(task.actualStartDate, task.actualEndDate)}D
           </span>
        </div>
      </div>
      <div className="border border-dashed border-gray-200 rounded-2xl p-4">
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Predecessors (Backend Format e.g. T25[FS+3])</label>
        <input type="text" value={task.predecessors || ''} onChange={e => onUpdate(task.id, { predecessors: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-[11px] font-black shadow-inner mb-4" placeholder="T12[FS], T15[SS+2]" />
        
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Memo / Notes</label>
        <textarea placeholder="Add note..." className="w-full h-24 px-4 py-2 bg-transparent outline-none text-[10px] font-medium resize-none" />
      </div>
    </div>
  );
}
