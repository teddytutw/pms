import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Search, Plus, LayoutGrid, List as ListIcon, 
  ArrowUpRight, Tag, ChevronRight, BarChart3, Clock,
  CalendarClock, Download, FileSpreadsheet, X, Edit3
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

  // Management State
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState<'start' | 'end'>('start');

  // Form
  const [newProject, setNewProject] = useState({ id: null as number | null, name: '', description: '', ownerId: null as number | null, plannedStartDate: '', plannedEndDate: '', budget: 0 });

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

  useEffect(() => {
    fetchProjects();
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.executionStatus === statusFilter;
    const matchesYear = yearFilters.length === 0 || (p.projectYear && yearFilters.includes(p.projectYear));
    return matchesSearch && matchesStatus && matchesYear;
  });

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => p.executionStatus === 'STARTED').length,
      upcoming: projects.filter(p => p.executionStatus === 'NOT_STARTED').length,
      templates: projects.filter(p => p.executionStatus === 'TEMPLATE').length
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    const method = 'POST';
    const url = (import.meta as any).env.BASE_URL + 'api/projects';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, type: 'Project' }),
      });
      if (res.ok) {
        setIsCreateProjectModalOpen(false);
        setNewProject({ id: null, name: '', description: '', ownerId: null, plannedStartDate: '', plannedEndDate: '', budget: 0 });
        fetchProjects();
      }
    } catch (err) { console.error(err); }
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
        <main className="flex-1 flex flex-col min-w-0 p-8 lg:p-12 overflow-y-auto no-scrollbar">
           <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12">
              <div className="flex-1 max-w-2xl relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                 <input 
                   type="text" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="Search project name..." 
                   className="w-full pl-16 pr-6 py-5 bg-white border-2 border-transparent focus:border-indigo-600 rounded-3xl outline-none shadow-sm shadow-slate-200 text-slate-900 font-bold text-lg transition-all" 
                 />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 mr-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}><ListIcon className="w-5 h-5" /></button>
                 </div>

                 <button 
                  onClick={() => setIsCreateProjectModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-xl font-black text-xs hover:bg-slate-50 transition-all shadow-sm"
                 >
                   <Plus className="w-4 h-4 text-indigo-600" /> CREATE PRJ
                 </button>

                 <button 
                  disabled={!selectedProjectId}
                  onClick={() => navigate(`/details/PROJECT/${selectedProjectId}`)}
                  className="flex items-center gap-2 px-6 py-4 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all disabled:opacity-30 shadow-sm"
                 >
                   <Edit3 className="w-4 h-4" /> 專案維護
                 </button>

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
                  className="flex items-center gap-2 px-6 py-4 bg-amber-500 text-white rounded-xl font-black text-xs hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all disabled:opacity-30 disabled:shadow-none"
                 >
                   <CalendarClock className="w-4 h-4" /> RESCHEDULE
                 </button>

                 <button 
                  disabled={!selectedProjectId}
                  onClick={handleExportProject}
                  className="flex items-center gap-2 px-6 py-4 bg-slate-800 text-white rounded-xl font-black text-xs hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all disabled:opacity-30 disabled:shadow-none"
                 >
                   <Download className="w-4 h-4" /> EXPORT MPP
                 </button>

                 <button 
                  disabled={!selectedProjectId}
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-30 disabled:shadow-none"
                 >
                   <FileSpreadsheet className="w-4 h-4" /> IMPORT WBS
                 </button>
              </div>
           </div>

           {/* Quick Stats */}
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><BarChart3 className="w-6 h-6" /></div>
                 <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Total</div>
                    <div className="text-xl font-black text-slate-900">{stats.total}</div>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                 <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600"><ArrowUpRight className="w-6 h-6" /></div>
                 <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Started</div>
                    <div className="text-xl font-black text-slate-900">{stats.active}</div>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                 <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Clock className="w-6 h-6" /></div>
                 <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Upcoming</div>
                    <div className="text-xl font-black text-slate-900">{stats.upcoming}</div>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                 <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600"><Tag className="w-6 h-6" /></div>
                 <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Templates</div>
                    <div className="text-xl font-black text-slate-900">{stats.templates}</div>
                 </div>
              </div>
           </div>

           {/* Results */}
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
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${selectedProjectId === p.id ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                            <Folder className="w-7 h-7" />
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
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                              <Folder className="w-5 h-5" />
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
        {isCreateProjectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
               <h3 className="text-xl font-black text-slate-900">Create New Project</h3>
               <input type="text" placeholder="Project Name..." value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-900 transition-all" />
               <textarea placeholder="Description (Optional)" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-900 transition-all resize-none" />
               
               <div className="flex gap-3">
                 <button onClick={() => setIsCreateProjectModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase hover:text-slate-600 transition-all">Cancel</button>
                 <button onClick={handleCreateProject} disabled={!newProject.name.trim()} className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-40">Create Workspace</button>
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
