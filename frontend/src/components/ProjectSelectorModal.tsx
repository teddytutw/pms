import { useState, useEffect } from 'react';
import { Search, X, Folder, Tag, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
  id: number;
  name: string;
  projectYear?: string;
  executionStatus?: string;
  ownerId?: number;
  currentPhase?: string;
}

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSelect: (projectId: number) => void;
  currentProjectId: number | null;
}

export default function ProjectSelectorModal({ isOpen, onClose, projects, onSelect, currentProjectId }: ProjectSelectorModalProps) {
  const [search, setSearch] = useState('');
  
  // Reset search when opening
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.projectYear?.includes(search) ||
    p.executionStatus?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Switch Project</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Quick access to all workspaces</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search projects by name, year or status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none text-slate-900 font-bold transition-all"
                />
              </div>
            </div>

            {/* Project List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const isActive = project.id === currentProjectId;
                  return (
                    <button
                      key={project.id}
                      onClick={() => { onSelect(project.id); onClose(); }}
                      className={`w-full group flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-xl ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 shadow-sm'}`}>
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-black text-sm ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {project.name}
                            </h3>
                            {project.projectYear && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md uppercase">
                                {project.projectYear}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              <Tag className="w-3 h-3" />
                              <span className={project.executionStatus === 'STARTED' ? 'text-green-600 font-black' : ''}>
                                {project.executionStatus || 'NOT_STARTED'}
                              </span>
                            </div>
                            {project.currentPhase && (
                              <>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                                  {project.currentPhase}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}>
                        <ChevronRight className="w-5 h-5 transition-transform" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-300">
                    <Search className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No projects found matching "{search}"</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
               <span>{filteredProjects.length} Projects Available</span>
               <span>Press Esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
