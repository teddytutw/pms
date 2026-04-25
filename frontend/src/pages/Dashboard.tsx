import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import WBSView from '../components/WBSView';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Search,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CalendarClock,
  Folder, Edit3, Plus, Save
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProjectSelectorModal from '../components/ProjectSelectorModal';
import ImportModal from '../components/ImportModal';
import TaskDetailView from '../components/TaskDetailView';

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Resize state (Initial ratio for Detail mode: WBS is 66.66% of total)
  const [wbsWidthPercentage, setWbsWidthPercentage] = useState(66.66);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState<'start' | 'end'>('start');
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Save As
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [saveAsData, setSaveAsData] = useState({ name: '', description: '', isTemplate: false, plannedStartDate: '', plannedEndDate: '' });
  const [saveAsMode, setSaveAsMode] = useState<'start' | 'end'>('start');
  const [saveAsLoading, setSaveAsLoading] = useState(false);

  // View & selection
  const [ganttViewMode, setGanttViewMode] = useState<ViewMode>(ViewMode.Week);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [rightPaneMode, setRightPaneMode] = useState<'detail' | 'gantt' | 'both'>('detail');

  // Auto-adjust layout based on requested ratios
  useEffect(() => {
    if (rightPaneMode === 'detail') {
      setWbsWidthPercentage(66.66); // 2:1 ratio (WBS is 2x Right)
    } else if (rightPaneMode === 'gantt') {
      setWbsWidthPercentage(50);    // 1:1 ratio
    } else if (rightPaneMode === 'both') {
      setWbsWidthPercentage(30);    // Give more room to the two right panes
    }
  }, [rightPaneMode]);

  // Detail State
  const [selectedItem, setSelectedItem] = useState<{ type: 'PROJECT' | 'PHASE' | 'TASK' | null, id: string | number | null }>({ type: null, id: null });
  const selectedTaskId = selectedItem.type === 'TASK' ? (selectedItem.id as number) : null;

  // Data
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Per-modal dynamic properties
  const [modalGates, setModalGates] = useState<any[]>([]);

  // Form
  const [newTask, setNewTask] = useState({ title: '', projectId: null as number | null, plannedStartDate: '', plannedEndDate: '', assigneeId: null as number | null, phase: '' });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      const newPercentage = (relativeX / containerRect.width) * 100;
      setWbsWidthPercentage(Math.max(10, Math.min(90, newPercentage)));
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
  };
  useEffect(() => {
    fetch((import.meta as any).env.BASE_URL + 'api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
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

    fetch((import.meta as any).env.BASE_URL + 'api/responsible-roles')
      .then(res => res.json())
      .then(data => setRoles(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      sessionStorage.setItem('dashboard_selectedProjectId', selectedProjectId.toString());
      fetchProjectDetails(selectedProjectId);
    } else {
      setTasks([]);
      setGates([]);
    }
  }, [selectedProjectId]);

  // Support ?projectId=X URL param (used by Where Used navigation from DeliverableModal)
  useEffect(() => {
    const pid = searchParams.get('projectId');
    if (pid && projects.length > 0) {
      const numPid = parseInt(pid, 10);
      if (!isNaN(numPid) && numPid !== selectedProjectId) setSelectedProjectId(numPid);
    }
  }, [searchParams, projects]);

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

  const handleSaveAs = async () => {
    if (!saveAsData.name || !selectedProjectId) return;
    setSaveAsLoading(true);
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${selectedProjectId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveAsData)
      });
      if (res.ok) {
        const newData = await res.json();
        setIsSaveAsModalOpen(false);
        navigate(`/details/PROJECT/${newData.id}`);
      } else {
        alert('Save As failed');
      }
    } catch (e) {
      console.error(e);
      alert('Save As error');
    } finally {
      setSaveAsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!currentProject || !rescheduleDate || !selectedProjectId) return;
    try {
      const taskRes = await fetch((import.meta as any).env.BASE_URL + `api/tasks/project/${selectedProjectId}`);
      if (!taskRes.ok) throw new Error('Failed to fetch tasks');
      const projectTasks = await taskRes.json();

      let anchorDate: Date;
      if (rescheduleMode === 'start') {
        anchorDate = currentProject.plannedStartDate ? new Date(currentProject.plannedStartDate) : new Date();
      } else {
        anchorDate = currentProject.plannedEndDate ? new Date(currentProject.plannedEndDate) : new Date();
      }
      const newAnchor = new Date(rescheduleDate);
      const shiftMs = newAnchor.getTime() - anchorDate.getTime();
      const shiftDays = Math.round(shiftMs / 86400000);

      const addWorkingDays = (dateStr: string, days: number): string => {
        const d = new Date(dateStr);
        let remaining = Math.abs(days);
        const step = days >= 0 ? 1 : -1;
        while (remaining > 0) {
          d.setDate(d.getDate() + step);
          if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
        }
        return d.toISOString().split('T')[0];
      };

      const validTasks = projectTasks.filter((t: any) => t.plannedStartDate && t.plannedEndDate);
      const updates = validTasks.map((t: any) => ({
        id: t.id,
        plannedStartDate: addWorkingDays(t.plannedStartDate, shiftDays),
        plannedEndDate: addWorkingDays(t.plannedEndDate, shiftDays),
      }));

      const newProjStart = currentProject.plannedStartDate ? addWorkingDays(currentProject.plannedStartDate, shiftDays) : '';
      const newProjEnd = currentProject.plannedEndDate ? addWorkingDays(currentProject.plannedEndDate, shiftDays) : '';

      await Promise.all([
        ...updates.map((u: any) => fetch((import.meta as any).env.BASE_URL + `api/tasks/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedStartDate: u.plannedStartDate, plannedEndDate: u.plannedEndDate }),
        })),
        fetch((import.meta as any).env.BASE_URL + `api/projects/${selectedProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedStartDate: newProjStart, plannedEndDate: newProjEnd }),
        })
      ]);

      setIsRescheduleModalOpen(false);
      setRescheduleDate('');
      fetchProjectDetails(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert('Reschedule failed');
    }
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
      if (res.ok && selectedProjectId) { fetchProjectDetails(selectedProjectId); setDetailRefreshKey(k => k + 1); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok && selectedProjectId) fetchProjectDetails(selectedProjectId);
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

  const handleSelectItem = (type: 'PROJECT' | 'PHASE' | 'TASK', id: string | number) => {
    setSelectedItem({ type, id });
  };

  const handleAdjustTask = async (direction: 'indent' | 'outdent' | 'up' | 'down') => {
    if (!selectedTaskId) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${selectedTaskId}/adjust?direction=${direction}`, { method: 'POST' });
      if (res.ok && selectedProjectId) { fetchProjectDetails(selectedProjectId); setDetailRefreshKey(k => k + 1); }
    } catch (err) { console.error(err); }
  };



  const ganttTasks: GanttTask[] = useMemo(() => {
    const list: GanttTask[] = [];
    if (!selectedProjectId) return list;

    const safeDate = (dateStr: string | null | undefined, fallback: Date, isEnd = false): Date => {
      if (!dateStr) return fallback;
      const localStr = dateStr.length === 10 ? `${dateStr}T${isEnd ? '23:59:59' : '00:00:00'}` : dateStr;
      const d = new Date(localStr);
      return isNaN(d.getTime()) ? fallback : d;
    };

    const proj = projects.find(p => p.id == selectedProjectId);
    if (!proj) return list;

    const pStart = safeDate(proj.plannedStartDate, new Date());
    const pEnd   = safeDate(proj.plannedEndDate,   new Date(), true);
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
          dependencies: (task.predecessors || '').split(',').map((p: string) => p.trim().replace(/^T/, '')).filter((id: string) => id && allTaskIds.has(id)),
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
          dependencies: (task.predecessors || '').split(',').map((p: string) => p.trim().replace(/^T/, '')).filter((id: string) => id && allTaskIds.has(id)),
          styles: { backgroundColor: '#e2e8f0', backgroundSelectedColor: '#cbd5e1', progressColor: '#4f46e5', progressSelectedColor: '#4338ca' }
        });
      });
    }
    return list;
  }, [tasks, projects, selectedProjectId]);

  const currentProject = projects.find(p => p.id === selectedProjectId);

  const wbsMap = useMemo(() => {
    const map: Record<number, string> = {};
    const phaseGateNames = new Set(gates.map(g => g.phaseName));
    const phases = Array.from(new Set(gates.map(g => g.phaseName))).filter(Boolean);
    const assignRecursive = (taskList: any[], parentId: number | null, prefix: string) => {
      const children = taskList.filter(t => (t.parentTaskId || null) == parentId).sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id));
      children.forEach((t, i) => {
        const code = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
        map[t.id] = code;
        assignRecursive(taskList, t.id, code);
      });
    };
    phases.forEach((p, pi) => {
      const pts = tasks.filter(t => t.phase === p);
      assignRecursive(pts, null, String(pi + 1));
    });
    const common = tasks.filter(t => !t.phase || !phaseGateNames.has(t.phase));
    assignRecursive(common, null, 'C');
    return map;
  }, [tasks, gates]);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
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
             
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsProjectModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-all font-mono uppercase tracking-tighter"
                >
                  <Search className="w-4 h-4" /> SELECT PROJECT
                </button>
                <div className="w-[1px] h-6 bg-gray-100" />

                {/* Icon-only action buttons with tooltips */}
                <div className="flex items-center gap-1.5">
                  {/* Create Project */}
                  <div className="relative group/btn">
                    <button
                      onClick={() => navigate('/details/PROJECT/new')}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Create project
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>

                  {/* Maintain Project */}
                  <div className="relative group/btn">
                    <button
                      disabled={!selectedProjectId}
                      onClick={() => navigate(`/details/PROJECT/${selectedProjectId}`)}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-violet-600 rounded-xl hover:bg-violet-50 hover:border-violet-300 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Maintain project
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>

                  {/* Save As Project */}
                  <div className="relative group/btn">
                    <button
                      disabled={!selectedProjectId}
                      onClick={() => {
                        if (currentProject) {
                          setSaveAsData({
                            name: currentProject.name + ' - Copy',
                            description: currentProject.description || '',
                            isTemplate: false,
                            plannedStartDate: currentProject.plannedStartDate ? currentProject.plannedStartDate.substring(0, 10) : '',
                            plannedEndDate: currentProject.plannedEndDate ? currentProject.plannedEndDate.substring(0, 10) : ''
                          });
                          setIsSaveAsModalOpen(true);
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-emerald-500 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Save as project
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>

                  {/* Reschedule */}
                  <div className="relative group/btn">
                    <button
                      disabled={!selectedProjectId}
                      onClick={() => {
                        if (currentProject) {
                          setRescheduleDate(currentProject.plannedStartDate?.split('T')[0] || '');
                          setRescheduleMode('start');
                          setIsRescheduleModalOpen(true);
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-amber-500 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <CalendarClock className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Reschedule
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>

                  {/* Export WBS to xml */}
                  <div className="relative group/btn">
                    <button
                      disabled={!selectedProjectId}
                      onClick={handleExportProject}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <img src="export.png" alt="Export XML" className="w-6 h-6 object-contain" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Export WBS to xml
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>

                  {/* Import WBS from Excel */}
                  <div className="relative group/btn">
                    <button
                      disabled={!selectedProjectId}
                      onClick={() => setIsImportModalOpen(true)}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <img src="import.png" alt="Import Excel" className="w-6 h-6 object-contain" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                      Import WBS from Excel
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </div>
                </div>
             </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-6">
                   <div className="font-black text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">WBS Control</div>
                   
                   {/* View Mode Radio Group */}
                   <div className="flex items-center gap-4 bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-100">
                     <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="radio" name="vm" checked={rightPaneMode === 'detail'} onChange={() => setRightPaneMode('detail')} className="w-3.5 h-3.5 text-indigo-600" />
                       <span className={`text-[10px] font-black uppercase tracking-tight ${rightPaneMode === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>Detail</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="radio" name="vm" checked={rightPaneMode === 'gantt'} onChange={() => setRightPaneMode('gantt')} className="w-3.5 h-3.5 text-indigo-600" />
                       <span className={`text-[10px] font-black uppercase tracking-tight ${rightPaneMode === 'gantt' ? 'text-indigo-600' : 'text-slate-400'}`}>Gantt</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="radio" name="vm" checked={rightPaneMode === 'both'} onChange={() => setRightPaneMode('both')} className="w-3.5 h-3.5 text-indigo-600" />
                       <span className={`text-[10px] font-black uppercase tracking-tight ${rightPaneMode === 'both' ? 'text-indigo-600' : 'text-slate-400'}`}>Both</span>
                     </label>
                   </div>

                   <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                     <button onClick={() => handleAdjustTask('outdent')} disabled={!selectedTaskId} className={`p-1 rounded ${selectedTaskId ? 'text-indigo-600 hover:bg-white' : 'text-gray-300'}`}><ChevronLeft className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleAdjustTask('indent')} disabled={!selectedTaskId} className={`p-1 rounded ${selectedTaskId ? 'text-indigo-600 hover:bg-white' : 'text-gray-300'}`}><ChevronRight className="w-3.5 h-3.5" /></button>
                     <div className="w-[1px] h-3 bg-gray-200 mx-0.5" />
                     <button onClick={() => handleAdjustTask('up')} disabled={!selectedTaskId} className={`p-1 rounded ${selectedTaskId ? 'text-indigo-600 hover:bg-white' : 'text-gray-300'}`}><ArrowUp className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleAdjustTask('down')} disabled={!selectedTaskId} className={`p-1 rounded ${selectedTaskId ? 'text-indigo-600 hover:bg-white' : 'text-gray-300'}`}><ArrowDown className="w-3.5 h-3.5" /></button>
                   </div>

                   <div className="flex items-center gap-1.5">
                      <button onClick={() => { const n = prompt('Phase:'); if (n && selectedProjectId) handleAddPhase(selectedProjectId, n); }} className="bg-violet-600 text-white px-3 py-1 rounded-lg text-[9px] font-black shadow-sm">PHASE +</button>
                      <button onClick={() => { setIsCreateTaskModalOpen(true); setNewTask(p => ({ ...p, projectId: selectedProjectId, title: '', plannedStartDate: '', plannedEndDate: '' })); }} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black shadow-sm">TASK +</button>
                      <button onClick={() => { setIsCreateTaskModalOpen(true); const t = new Date().toISOString().split('T')[0]; setNewTask(p => ({ ...p, projectId: selectedProjectId, title: 'GATE: ', plannedStartDate: t, plannedEndDate: t })); }} className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[9px] font-black shadow-sm">GATE +</button>
                   </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 text-[8px] font-black">
                   <button onClick={() => setGanttViewMode(ViewMode.Day)} className={`px-2 py-1 rounded ${ganttViewMode === ViewMode.Day ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>DAY</button>
                   <button onClick={() => setGanttViewMode(ViewMode.Week)} className={`px-2 py-1 rounded ${ganttViewMode === ViewMode.Week ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>WK</button>
                   <button onClick={() => setGanttViewMode(ViewMode.Month)} className={`px-2 py-1 rounded ${ganttViewMode === ViewMode.Month ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>MO</button>
                   <button onClick={() => setGanttViewMode(ViewMode.Year)} className={`px-2 py-1 rounded ${ganttViewMode === ViewMode.Year ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>YR</button>
                </div>
             </div>

             <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
                 <div style={{ width: `${wbsWidthPercentage}%` }} className="border-r border-gray-100 overflow-y-auto no-scrollbar">
                    <WBSView 
                      projects={projects} tasks={tasks} gates={gates} users={users} roles={roles}
                      selectedProjectId={selectedProjectId} 
                      onTaskMoved={handleTaskMoved} onRenameProject={handleRenameProject} onReorderPhases={handleReorderPhases} 
                      onSelectTask={(id) => handleSelectItem('TASK', id)}
                      onSelectPhase={(id) => handleSelectItem('PHASE', id)}
                      onSelectProject={(id) => handleSelectItem('PROJECT', id)}
                      selectedTaskId={selectedTaskId} 
                      onUpdateTask={handleUpdateTask} onUpdatePhase={handleUpdatePhase}
                      onAdjustTask={handleAdjustTask} onDeleteTask={handleDeleteTask}
                      wbsMap={wbsMap} 
                    />
                 </div>

                <div className="w-1.5 hover:bg-gray-200 cursor-col-resize z-20 shrink-0" onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} />

                <div style={{ width: `${100 - wbsWidthPercentage}%` }} className="bg-white border-l border-gray-100 flex overflow-hidden">
                   {(rightPaneMode === 'detail' || rightPaneMode === 'both') && (
                     <div className={`${rightPaneMode === 'both' ? 'w-1/2 border-r border-gray-100' : 'w-full'} h-full flex flex-col`}>
                        <TaskDetailView allUsers={users} allRoles={roles}
                          targetType={selectedItem.type} targetId={selectedItem.id}
                          onUpdateSuccess={() => selectedProjectId && fetchProjectDetails(selectedProjectId)}
                          refreshKey={detailRefreshKey}
                        />
                     </div>
                   )}
                   {(rightPaneMode === 'gantt' || rightPaneMode === 'both') && (
                     <div className={`${rightPaneMode === 'both' ? 'w-1/2' : 'w-full'} h-full flex flex-col overflow-hidden`}>
                        {ganttTasks.length > 0 ? (
                           <div className="gantt-container h-full overflow-auto no-scrollbar">
                             <Gantt 
                               tasks={ganttTasks} viewMode={ganttViewMode} locale="en" listCellWidth="" columnWidth={65} rowHeight={32} fontSize="11px" headerHeight={45} barCornerRadius={2} todayColor="rgba(37, 99, 235, 0.04)"
                               onClick={t => {
                                 if (t.id.startsWith('project')) handleSelectItem('PROJECT', parseInt(t.id.split('-')[1]));
                                 else if (t.id.startsWith('phase')) handleSelectItem('PHASE', `${selectedProjectId}-${t.name}`);
                                 else handleSelectItem('TASK', parseInt(t.id));
                               }} 
                             />
                           </div>
                        ) : <div className="h-full flex items-center justify-center text-gray-300 font-black text-[10px] uppercase italic">Select project to view Gantt</div>}
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 space-y-6">
            <h3 className="text-[14px] font-black text-indigo-900 border-b pb-4 uppercase tracking-widest">Add Task</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Title..." value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-[12px]" />
              <div className="grid grid-cols-2 gap-4">
                <Select options={projects.map(p => ({ value: p.id, label: p.name }))} value={projects.map(p => ({ value: p.id, label: p.name })).find(o => o.value === newTask.projectId)} onChange={o => setNewTask(p => ({ ...p, projectId: o?.value || null }))} placeholder="PJ" />
                <Select options={modalGates.map(g => ({ value: g.phaseName, label: g.phaseName }))} value={{ value: newTask.phase, label: newTask.phase }} onChange={o => setNewTask(p => ({ ...p, phase: o?.value || '' }))} placeholder="PHASE" isDisabled={!newTask.projectId} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newTask.plannedStartDate} onChange={e => setNewTask(p => ({ ...p, plannedStartDate: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[11px] font-bold" />
                <input type="date" value={newTask.plannedEndDate} onChange={e => setNewTask(p => ({ ...p, plannedEndDate: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[11px] font-bold" />
              </div>
            </div>
            <div className="flex justify-end gap-3"><button onClick={() => setIsCreateTaskModalOpen(false)} className="px-6 py-2 text-[11px] font-black text-gray-400">CANCEL</button><button onClick={handleCreateTask} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg">CREATE</button></div>
          </div>
        </div>
      )}

      <ProjectSelectorModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} projects={projects} onSelect={(id) => { setSelectedProjectId(id); fetchProjectDetails(id); sessionStorage.setItem('dashboard_selectedProjectId', String(id)); }} currentProjectId={selectedProjectId} />
      {currentProject && <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} projectId={currentProject.id} projectName={currentProject.name} onImportSuccess={() => fetchProjectDetails(currentProject.id)} />}

      <AnimatePresence>
        {isSaveAsModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSaveAsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
              <h3 className="text-xl font-black text-slate-900">Save As Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Project Name</label>
                  <input type="text" value={saveAsData.name} onChange={e => setSaveAsData(d => ({ ...d, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Description</label>
                  <textarea rows={3} value={saveAsData.description} onChange={e => setSaveAsData(d => ({ ...d, description: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-900 resize-none" />
                </div>
                <div className="space-y-4 pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Anchor Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                         setSaveAsMode('start');
                         setSaveAsData(d => ({ ...d, plannedStartDate: d.plannedStartDate || d.plannedEndDate || '', plannedEndDate: '' }));
                      }} 
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${saveAsMode === 'start' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                      New Start Date
                    </button>
                    <button 
                      onClick={() => {
                        setSaveAsMode('end');
                        setSaveAsData(d => ({ ...d, plannedEndDate: d.plannedEndDate || d.plannedStartDate || '', plannedStartDate: '' }));
                      }} 
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${saveAsMode === 'end' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                      New End Date
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target {saveAsMode === 'start' ? 'Start' : 'End'} Date</label>
                    <input 
                      type="date" 
                      value={saveAsMode === 'start' ? saveAsData.plannedStartDate : saveAsData.plannedEndDate} 
                      onChange={e => {
                        const v = e.target.value;
                        if (saveAsMode === 'start') setSaveAsData(d => ({ ...d, plannedStartDate: v, plannedEndDate: '' }));
                        else setSaveAsData(d => ({ ...d, plannedEndDate: v, plannedStartDate: '' }));
                      }} 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Is template</label>
                    <select value={saveAsData.isTemplate ? 'Yes' : 'No'} onChange={e => setSaveAsData(d => ({ ...d, isTemplate: e.target.value === 'Yes' }))} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-900">
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsSaveAsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase hover:text-slate-600 transition-all">Cancel</button>
                <button onClick={handleSaveAs} disabled={saveAsLoading || !saveAsData.name} className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-40">
                  {saveAsLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest border-b pb-4">Reschedule</h3>
            <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
              <button onClick={() => setRescheduleMode('start')} className={`flex-1 py-2 rounded-lg text-[11px] font-black ${rescheduleMode === 'start' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>Start</button>
              <button onClick={() => setRescheduleMode('end')} className={`flex-1 py-2 rounded-lg text-[11px] font-black ${rescheduleMode === 'end' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>End</button>
            </div>
            <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="w-full px-4 py-3 bg-amber-50 rounded-xl font-black text-[13px]" />
            <div className="flex justify-end gap-3"><button onClick={() => setIsRescheduleModalOpen(false)} className="px-6 py-2 text-[11px] font-black text-gray-400">CANCEL</button><button onClick={handleReschedule} className="px-6 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-black shadow-lg">APPLY</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
