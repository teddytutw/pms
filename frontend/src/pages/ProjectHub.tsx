import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Search, Plus, LayoutGrid, List as ListIcon, 
  ArrowUpRight, Tag, ChevronRight, BarChart3, Clock,
  CalendarClock, X, Edit3, Save,
  CheckSquare, AlertCircle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import ImportModal from '../components/ImportModal';


export default function ProjectHub() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilters, setYearFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // To-do list state
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [todoLoading, setTodoLoading] = useState(true);

  // Resizable divider state
  const [todoWidth, setTodoWidth] = useState(440);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(440);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = todoWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [todoWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX; // dragging left = grow todo
      const newWidth = Math.min(700, Math.max(240, dragStartWidth.current + delta));
      setTodoWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);


  // Management State
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState<'start' | 'end'>('start');

  // Save As
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [saveAsData, setSaveAsData] = useState({ name: '', description: '', isTemplate: false, plannedStartDate: '', plannedEndDate: '' });
  const [saveAsMode, setSaveAsMode] = useState<'start' | 'end'>('start');
  const [saveAsLoading, setSaveAsLoading] = useState(false);

  const fetchProjects = () => {
    setLoading(true);
    fetch((import.meta as any).env.BASE_URL + 'api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchTodoTasks = () => {
    setTodoLoading(true);
    const userJson = localStorage.getItem('currentUser');
    let userIdParam = '';
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user && user.id) {
          userIdParam = `?userId=${user.id}`;
        }
      } catch (e) {}
    }

    fetch((import.meta as any).env.BASE_URL + `api/tasks/todo${userIdParam}`)
      .then(res => res.json())
      .then(data => { setTodoTasks(data); setTodoLoading(false); })
      .catch(() => setTodoLoading(false));
  };

  useEffect(() => {
    fetchProjects();
    fetchTodoTasks();
  }, []);


  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
    [projects, selectedProjectId]
  );

  const years = useMemo(() => {
    const y = new Set<string>();
    // Pre-populate with current range (e.g. 2023 - 2026)
    const curYear = new Date().getFullYear();
    for (let i = -1; i <= 2; i++) y.add(String(curYear + i));
    
    // Add years from projects
    projects.forEach(p => p.projectYear && y.add(String(p.projectYear)));
    return Array.from(y).sort().reverse();
  }, [projects]);

  const isTemplate = (p: any) => p.isTemplate === true || p.executionStatus === 'TEMPLATE';

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'TEMPLATE' ? isTemplate(p) : p.executionStatus === statusFilter);
    const matchesYear = yearFilters.length === 0 || (p.projectYear && yearFilters.includes(p.projectYear));
    return matchesSearch && matchesStatus && matchesYear;
  });

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => p.executionStatus === 'STARTED').length,
      upcoming: projects.filter(p => p.executionStatus === 'NOT_STARTED' && !isTemplate(p)).length,
      templates: projects.filter(p => isTemplate(p)).length
    };
  }, [projects]);

  // Actions
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
      } else {
        alert('Export failed');
      }
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
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
    if (!selectedProject || !rescheduleDate) return;
    
    try {
      const taskRes = await fetch((import.meta as any).env.BASE_URL + `api/tasks/project/${selectedProjectId}`);
      if (!taskRes.ok) throw new Error('Failed to fetch tasks');
      const projectTasks = await taskRes.json();

      let anchorDate: Date;
      if (rescheduleMode === 'start') {
        anchorDate = selectedProject.plannedStartDate ? new Date(selectedProject.plannedStartDate) : new Date();
      } else {
        anchorDate = selectedProject.plannedEndDate ? new Date(selectedProject.plannedEndDate) : new Date();
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

      const newProjStart = selectedProject.plannedStartDate ? addWorkingDays(selectedProject.plannedStartDate, shiftDays) : '';
      const newProjEnd = selectedProject.plannedEndDate ? addWorkingDays(selectedProject.plannedEndDate, shiftDays) : '';

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
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert('Reschedule failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        onStatusChange={setStatusFilter}
        onYearChange={setYearFilters}
        currentStatus={statusFilter}
        currentYears={yearFilters}
        allYears={years}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Project Hub</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
               <Clock className="w-4 h-4" />
               <span>Last Updated: Today</span>
             </div>
             <div className="h-8 w-[1px] bg-slate-200" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs">U</div>
                <span className="text-sm font-bold text-slate-700">User</span>
             </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {/* ─── Left: Project List ─── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">

           {/* Sticky top controls */}
           <div className="sticky top-0 z-20 bg-slate-50 px-8 lg:px-10 pt-4 pb-3 border-b border-slate-100 shadow-sm">
           <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3">
              <div className="flex-1 max-w-2xl relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                 <input
                   type="text"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="Search project name..."
                   className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none shadow-sm shadow-slate-200 text-slate-900 font-bold text-sm transition-all"
                 />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 mr-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}><ListIcon className="w-5 h-5" /></button>
                 </div>

                 {/* Icon-only action buttons with tooltips */}
                 <div className="flex items-center gap-2">
                   {/* Create Project */}
                   <div className="relative group/btn">
                     <button
                       onClick={() => navigate('/details/PROJECT/new')}
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                     >
                       <Plus className="w-5 h-5" />
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
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 text-violet-600 rounded-xl hover:bg-violet-50 hover:border-violet-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                       <Edit3 className="w-5 h-5" />
                     </button>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                       Maintain project
                       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                     </div>
                   </div>

                   {/* Save As */}
                   <div className="relative group/btn">
                     <button
                       disabled={!selectedProjectId}
                       onClick={() => {
                         const pj = projects.find(p => p.id === selectedProjectId);
                         if (pj) {
                           setSaveAsData({
                             name: pj.name + ' - Copy',
                             description: pj.description || '',
                             isTemplate: false,
                             plannedStartDate: pj.plannedStartDate ? pj.plannedStartDate.substring(0, 10) : '',
                             plannedEndDate: pj.plannedEndDate ? pj.plannedEndDate.substring(0, 10) : ''
                           });
                           setIsSaveAsModalOpen(true);
                         }
                       }}
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 text-emerald-500 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                       <Save className="w-5 h-5" />
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
                         const pj = projects.find(p => p.id === selectedProjectId);
                         if (pj) {
                           setRescheduleDate(pj.plannedStartDate?.split('T')[0] || '');
                           setRescheduleMode('start');
                           setIsRescheduleModalOpen(true);
                         }
                       }}
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 text-amber-500 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                       <CalendarClock className="w-5 h-5" />
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
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                     >
                       <img src="export.png" alt="Export XML" className="w-7 h-7 object-contain" />
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
                       className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                     >
                       <img src="import.png" alt="Import Excel" className="w-7 h-7 object-contain" />
                     </button>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
                       Import WBS from Excel
                       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                     </div>
                   </div>
                 </div>
              </div>
           </div>

           {/* Quick Stats */}
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0"><BarChart3 className="w-4 h-4" /></div>
                 <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Total</div>
                    <div className="text-base font-black text-slate-900 leading-tight">{stats.total}</div>
                 </div>
              </div>
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0"><ArrowUpRight className="w-4 h-4" /></div>
                 <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Started</div>
                    <div className="text-base font-black text-slate-900 leading-tight">{stats.active}</div>
                 </div>
              </div>
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><Clock className="w-4 h-4" /></div>
                 <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Upcoming</div>
                    <div className="text-base font-black text-slate-900 leading-tight">{stats.upcoming}</div>
                 </div>
              </div>
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 shrink-0"><Tag className="w-4 h-4" /></div>
                 <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Templates</div>
                    <div className="text-base font-black text-slate-900 leading-tight">{stats.templates}</div>
                 </div>
              </div>
           </div>
           </div>{/* end sticky top controls */}

           {/* Results */}
           <div className="px-8 lg:px-10 pb-12 pt-4">
           {loading ? (
             <div className="flex-1 flex items-center justify-center py-20 text-slate-300 font-bold text-xl italic">Loading your projects...</div>
           ) : filteredProjects.length > 0 ? (
             <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 pb-12" : "space-y-3 pb-12"}>
               {filteredProjects.map((p, i) => (
                 <motion.div 
                   key={p.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   onClick={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
                   onDoubleClick={() => navigate('/dashboard', { state: { selectedProjectId: p.id } })}
                   className={`group bg-white border cursor-pointer overflow-hidden transition-all relative ${
                     selectedProjectId === p.id ? 'ring-4 ring-indigo-600/10 border-indigo-600 shadow-2xl' : 'border-slate-100 hover:shadow-2xl hover:border-indigo-100'
                   } ${
                     viewMode === 'grid' ? 'rounded-3xl p-8' : 'rounded-2xl p-4 flex items-center justify-between'
                   }`}
                 >
                   {selectedProjectId === p.id && (
                     <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg transition-all">
                        <X className="w-3.5 h-3.5 text-white" />
                     </div>
                   )}

                   {viewMode === 'grid' ? (
                     <>
                       <div className="flex items-start justify-between mb-8">
                         <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                           {p.coverImagePath ? (
                             <img
                               src={(import.meta as any).env.BASE_URL + `api/projects/${p.id}/cover`}
                               alt={p.name}
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className={`w-full h-full flex items-center justify-center transition-all ${selectedProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                               <Folder className="w-7 h-7" />
                             </div>
                           )}
                         </div>
                         <div className="flex flex-col items-end gap-2">
                           {p.projectYear && <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-widest">{p.projectYear}</span>}
                           <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${
                             p.executionStatus === 'STARTED' ? 'bg-green-100 text-green-700' : 
                             p.executionStatus === 'TEMPLATE' ? 'bg-slate-600 text-white' : 'bg-amber-100 text-amber-700'
                           }`}>
                             {p.executionStatus || 'NOT STARTED'}
                           </span>
                         </div>
                       </div>
                       <h3 className={`text-xl font-black mb-2 truncate transition-colors ${selectedProjectId === p.id ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>{p.name}</h3>
                       <p className="text-slate-400 text-sm font-medium line-clamp-2 mb-8 h-10 leading-relaxed">{p.description || 'No description available for this project.'}</p>
                       
                       <div className="flex items-center justify-end pt-6 border-t border-slate-50">
                          <ChevronRight className={`w-5 h-5 transition-all ${selectedProjectId === p.id ? 'text-indigo-600 translate-x-1' : 'text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1'}`} />
                       </div>
                     </>
                   ) : (
                     /* List View Row */
                     <>
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                           <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                             {p.coverImagePath ? (
                               <img
                                 src={(import.meta as any).env.BASE_URL + `api/projects/${p.id}/cover`}
                                 alt={p.name}
                                 className="w-full h-full object-cover"
                               />
                             ) : (
                               <div className={`w-full h-full flex items-center justify-center transition-all ${selectedProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                 <Folder className="w-5 h-5" />
                               </div>
                             )}
                           </div>
                           <div className="min-w-0 flex-1">
                              <h3 className={`text-sm font-black truncate ${selectedProjectId === p.id ? 'text-indigo-600' : 'text-slate-900'}`}>{p.name}</h3>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-0.5">
                                 <span>{p.projectYear || 'N/A'}</span>
                                 <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                 <span className={p.executionStatus === 'STARTED' ? 'text-green-600' : ''}>{p.executionStatus || 'NOT STARTED'}</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-8 text-slate-400 px-8">
                           <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase mb-1">Status</span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden leading-none">
                                 <div className="h-full bg-indigo-600 w-1/2" />
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase">Active</span>
                           </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-all ${selectedProjectId === p.id ? 'text-indigo-600 translate-x-1' : 'text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1'}`} />
                     </>
                   )}
                 </motion.div>
               ))}
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center py-40 space-y-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300"><Search className="w-12 h-12" /></div>
                <div className="text-center">
                   <h3 className="text-slate-900 font-black tracking-tight text-xl mb-1">No results for "{search}"</h3>
                   <p className="text-slate-400 font-bold text-sm">Try using different filters or search keywords.</p>
                </div>
                <button onClick={() => { setSearch(''); setStatusFilter('ALL'); setYearFilters([]); }} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-indigo-600 hover:bg-slate-50 shadow-sm transition-all uppercase tracking-widest">Clear all filters</button>
             </div>
           )}
           </div>{/* end results padding wrapper */}
          </div>{/* end left projects */}

          {/* ─── Resizable Divider ─── */}
          <div
            onMouseDown={onDividerMouseDown}
            className="w-1.5 shrink-0 bg-slate-100 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors relative group"
            title="拖曳調整面板大小"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
          </div>

          {/* ─── Right: To-do List Table ─── */}
          <div style={{ width: todoWidth }} className="shrink-0 flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <h2 className="font-black text-slate-900 text-sm">My To-Do List</h2>
                {!todoLoading && (
                  <span className="ml-auto text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {todoTasks.length} 筆
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">未完成任務 &amp; 近30天內即將開始的任務</p>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {todoLoading ? (
                <div className="flex items-center justify-center h-32 text-slate-300 text-sm font-bold">載入中...</div>
              ) : todoTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-3">
                  <CheckSquare className="w-10 h-10 opacity-30" />
                  <p className="font-bold text-sm text-slate-400">太棒了！沒有待辦任務</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[38%]">任務名稱</th>
                      <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[17%]">開始日期</th>
                      <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[17%]">結束日期</th>
                      <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[28%]">所屬專案</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todoTasks.map((task: any) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const startDate = task.plannedStartDate ? new Date(task.plannedStartDate.substring(0, 10)) : null;
                      const endDate   = task.plannedEndDate   ? new Date(task.plannedEndDate.substring(0, 10))   : null;
                      const isOverdue      = endDate   && endDate   < today;
                      const isStartingSoon = startDate && startDate >= today && (startDate.getTime() - today.getTime()) <= 7 * 86400000;
                      const fmtDate = (d: string | null) => d ? d.substring(0, 10) : '—';

                      const rowCls = isOverdue
                        ? 'bg-red-50/60 hover:bg-red-50'
                        : isStartingSoon
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-slate-50';

                      return (
                        <tr key={task.id} className={`border-b border-slate-50 transition-colors ${rowCls}`}>
                          {/* Task Name */}
                          <td className="px-3 py-2.5 align-top">
                            <div className="flex items-start gap-1.5">
                              {isOverdue
                                ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                : isStartingSoon
                                ? <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                : <div className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />}
                              <button
                                onClick={() => navigate(`/details/TASK/${task.id}`)}
                                className="text-[11px] font-bold text-left leading-tight text-slate-800 hover:text-indigo-600 transition-colors line-clamp-3 break-all"
                                title={task.title}
                              >
                                {task.title}
                              </button>
                            </div>
                            {isOverdue && (
                              <span className="ml-4 mt-0.5 inline-block text-[8px] font-black text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">逾期</span>
                            )}
                            {isStartingSoon && !isOverdue && (
                              <span className="ml-4 mt-0.5 inline-block text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">即將開始</span>
                            )}
                          </td>

                          {/* Start Date */}
                          <td className={`px-2 py-2.5 text-[10px] font-bold align-top whitespace-nowrap ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                            {fmtDate(task.plannedStartDate)}
                          </td>

                          {/* End Date */}
                          <td className={`px-2 py-2.5 text-[10px] font-bold align-top whitespace-nowrap ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                            {fmtDate(task.plannedEndDate)}
                          </td>

                          {/* Root Project */}
                          <td className="px-2 py-2.5 align-top">
                            <button
                              onClick={() => navigate('/dashboard', { state: { selectedProjectId: task.projectId } })}
                              className="flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors group/proj"
                              title={task.projectName}
                            >
                              <Folder className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[110px]">{task.projectName}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/proj:opacity-60 transition-opacity shrink-0" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>{/* end right todo */}
        </main>

      </div>

      {/* Modals */}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        projectId={selectedProjectId || 0}
        projectName={selectedProject?.name || ''}
        onImportSuccess={() => { setIsImportModalOpen(false); fetchProjects(); }}
      />

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
                         const pj = projects.find(p => p.id === selectedProjectId);
                         setSaveAsMode('start');
                         setSaveAsData(d => ({ ...d, plannedStartDate: pj?.plannedStartDate?.substring(0,10) || '', plannedEndDate: '' }));
                      }} 
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${saveAsMode === 'start' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}
                    >
                      New Start Date
                    </button>
                    <button 
                      onClick={() => {
                        const pj = projects.find(p => p.id === selectedProjectId);
                        setSaveAsMode('end');
                        setSaveAsData(d => ({ ...d, plannedEndDate: pj?.plannedEndDate?.substring(0,10) || '', plannedStartDate: '' }));
                      }} 
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${saveAsMode === 'end' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}
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

        {isRescheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRescheduleModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-black text-slate-900 mb-2">Reschedule Project</h3>
              <p className="text-sm text-slate-500 font-bold mb-8 italic">Shift all tasks relative to a new anchor date.</p>
              
              <div className="space-y-6 mb-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reschedule Based On</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setRescheduleMode('start')} className={`py-3 rounded-2xl text-xs font-black transition-all ${rescheduleMode === 'start' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Project Start</button>
                       <button onClick={() => setRescheduleMode('end')} className={`py-3 rounded-2xl text-xs font-black transition-all ${rescheduleMode === 'end' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Project End</button>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">New Target Date</label>
                    <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-900 transition-all" />
                 </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setIsRescheduleModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all">Cancel</button>
                <button onClick={handleReschedule} className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Apply Shift</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
