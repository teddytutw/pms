import { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  FolderOpen, Layers, ShieldCheck, ChevronDown, ChevronRight,
  GripVertical, Check, X
} from 'lucide-react';

interface WBSTask {
  id: number;
  title: string;
  phase: string;
  projectId: number;
  status?: string;
  assigneeId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  statusIndicator?: string;
  displayOrder?: number;
  parentTaskId?: number | null;
  predecessors?: string;
  responsibleRoles?: string;
}

interface WBSGate {
  id: number;
  projectId: number;
  phaseName: string;
  gateStatus?: string;
  statusIndicator?: string;
  displayOrder?: number;
  responsibleRoles?: string;
}

interface WBSProject {
  id: number;
  name: string;
  currentPhase?: string;
  statusIndicator?: string;
  responsibleRoles?: string;
}

interface WBSUser {
  id: number;
  name: string;
}

interface WBSRole {
  id: number;
  roleName: string;
}

interface WBSViewProps {
  projects: WBSProject[];
  tasks: WBSTask[];
  gates: WBSGate[];
  users: WBSUser[];
  roles: WBSRole[];
  selectedProjectId: number | null;
  onTaskMoved: (taskId: number, newPhase: string, newProjectId: number) => void;
  onRenameProject?: (projectId: number, newName: string) => void;
  onReorderPhases?: (projectId: number, phaseIds: number[]) => Promise<void>;
  onSelectTask: (taskId: number) => void;
  onSelectPhase?: (phaseId: string) => void;
  onSelectProject?: (projectId: number) => void;
  selectedTaskId: number | null;
  onUpdateTask?: (taskId: number, updates: Partial<WBSTask>) => Promise<void>;
  onUpdatePhase?: (phaseId: number, updates: Partial<WBSGate>) => Promise<void>;
  onAdjustTask?: (action: 'indent' | 'outdent' | 'up' | 'down') => Promise<void>;
  onDeleteTask?: (taskId: number) => void;
  wbsMap: Record<number, string>;
}

const calcWorkingDays = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let d = 0, cur = new Date(s);
  while (cur <= e) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) d++;
    cur.setDate(cur.getDate() + 1);
  }
  return d;
};

const gateStatusConfig: Record<string, { color: string; label: string }> = {
  APPROVED: { color: 'bg-green-100 text-green-700 border-green-200', label: '✓'  },
  REJECTED: { color: 'bg-red-100   text-red-700   border-red-200',   label: '✗'  },
  PENDING:  { color: 'bg-amber-100 text-amber-700 border-amber-200', label: '⏳' },
};

function StatusIndicator({ status }: { status?: string }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    BLUE: 'bg-blue-500', GREEN: 'bg-green-500', YELLOW: 'bg-yellow-500', RED: 'bg-red-500'
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'} shrink-0`} />;
}

function InlineEdit({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSave(text); if (e.key === 'Escape') onCancel(); }} className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-indigo-400 outline-none w-full" />
      <button onClick={() => onSave(text)} className="p-0.5 rounded bg-indigo-600 text-white"><Check className="w-3 h-3" /></button>
    </span>
  );
}

export default function WBSView({
  projects, tasks, gates, users, roles, selectedProjectId,
  onTaskMoved, onRenameProject, onReorderPhases,
  onSelectTask, onSelectPhase, onSelectProject, selectedTaskId,
  onUpdateTask, onUpdatePhase, onAdjustTask, onDeleteTask, wbsMap
}: WBSViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>(() => (projects || []).reduce((a, p) => ({ ...a, [p.id]: true }), {}));
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const getTaskLevel = (task: WBSTask) => {
    let level = 0, curr = task;
    while (curr.parentTaskId) {
      const p = tasks.find(t => t.id == curr.parentTaskId);
      if (!p || level > 5) break;
      curr = p; level++;
    }
    return level;
  };

  const handleKeyboardAdjustment = async (e: React.KeyboardEvent) => {
    if (!selectedTaskId || editingKey || !onAdjustTask) return;
    if (e.key === 'ArrowRight') await onAdjustTask('indent');
    else if (e.key === 'ArrowLeft') await onAdjustTask('outdent');
    else if (e.key === 'ArrowUp') await onAdjustTask('up');
    else if (e.key === 'ArrowDown') await onAdjustTask('down');
  };

  const currentProjects = selectedProjectId ? projects.filter(p => p.id == selectedProjectId) : projects;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.type === 'PHASE_LIST') {
      const pid = parseInt(result.source.droppableId.split('___')[1], 10);
      const pg = gates.filter(g => g.projectId === pid).sort((a,b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id));
      const n = Array.from(pg);
      const [i] = n.splice(result.source.index, 1);
      n.splice(result.destination.index, 0, i);
      onReorderPhases?.(pid, n.map(g => g.id));
      return;
    }
    const [, phase, pidStr] = result.destination.droppableId.split('___');
    onTaskMoved(parseInt(result.draggableId, 10), phase, parseInt(pidStr, 10));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div ref={containerRef} className="font-sans text-[11px] select-none outline-none overflow-x-auto min-w-full" tabIndex={0} onKeyDown={handleKeyboardAdjustment}>
        <div className="flex items-center px-4 py-1.5 bg-gray-50 border-b border-gray-100 font-black text-gray-400 uppercase tracking-widest text-[8px] sticky top-0 z-10 w-max min-w-full">
          <div className="w-14 shrink-0">WBS</div>
          <div className="w-[180px] shrink-0">Activity Name</div>
          <div className="w-20 shrink-0 text-center">Status</div>
          <div className="w-24 shrink-0 text-center">Role</div>
          <div className="w-24 shrink-0 text-center">Owner</div>
          <div className="w-24 shrink-0 px-2">PL Start</div>
          <div className="w-24 shrink-0 px-2">PL End</div>
          <div className="w-24 shrink-0 px-2 text-right">DUR</div>
          <div className="w-24 shrink-0 px-2">Predecessors</div>
          <div className="w-10 shrink-0 text-center">Del</div>
        </div>

        <div className="w-max min-w-full">
          {currentProjects.map(project => {
            const pts = tasks.filter(t => t.projectId == project.id);
            const pgs = gates.filter(g => g.projectId == project.id);
            const isExp = expandedProjects[project.id] !== false;
            const gn = new Set(pgs.map(g => g.phaseName));
            const common = pts.filter(t => !t.phase || !gn.has(t.phase));

            return (
              <div key={project.id} className="border-b border-gray-100">
                <div className="flex items-center px-4 py-1.5 hover:bg-gray-50 bg-white group border-l-4 border-l-indigo-600">
                  <div className="w-14 shrink-0 flex items-center pr-2">
                    <button onClick={() => setExpandedProjects(p => ({ ...p, [project.id]: !isExp }))} className="text-gray-400 hover:text-indigo-600 w-full flex justify-center">
                      {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="w-[180px] shrink-0 flex items-center gap-2 overflow-hidden pr-2">
                    <FolderOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                    {editingKey === `project-${project.id}` ? (
                      <InlineEdit value={project.name} onSave={v => { onRenameProject?.(project.id, v); setEditingKey(null); }} onCancel={() => setEditingKey(null)} />
                    ) : (
                      <span className="font-black text-indigo-900 truncate cursor-pointer" onClick={() => onSelectProject?.(project.id)} onDoubleClick={() => setEditingKey(`project-${project.id}`)}>{project.name}</span>
                    )}
                  </div>
                  <div className="w-20 shrink-0 flex justify-center"><StatusIndicator status={project.statusIndicator} /></div>
                  <div className="w-24 shrink-0 px-1"></div>
                  <div className="w-24 shrink-0 px-1"></div>
                  <div className="w-24 shrink-0 px-2"></div>
                  <div className="w-24 shrink-0 px-2"></div>
                  <div className="w-24 shrink-0 px-2 text-right text-[9px] font-black text-indigo-600">
                    {(() => { if (!pts.length) return '-'; const ds = pts.filter(t => t.plannedStartDate && t.plannedEndDate); if (!ds.length) return '-'; const s = ds.sort((a,b) => a.plannedStartDate!.localeCompare(b.plannedStartDate!))[0].plannedStartDate!; const e = ds.sort((a,b) => b.plannedEndDate!.localeCompare(a.plannedEndDate!))[0].plannedEndDate!; const d = calcWorkingDays(s, e); return d > 0 ? `${d}d` : '-'; })()}
                  </div>
                  <div className="w-24 shrink-0 px-2"></div>
                  <div className="w-10 shrink-0"></div>
                </div>

                {isExp && (
                  <Droppable droppableId={`project-phases___${project.id}`} type="PHASE_LIST">
                    {(phaseListProvided) => (
                      <div ref={phaseListProvided.innerRef} {...phaseListProvided.droppableProps}>
                        {pgs.sort((a,b) => (a.displayOrder ?? a.id)-(b.displayOrder ?? b.id)).map((gate, phaseIdx) => {
                          const phase = gate.phaseName;
                          const phts = pts.filter(t => t.phase === phase).sort((a, b) => { const ca = wbsMap[a.id] || ''; const cb = wbsMap[b.id] || ''; return ca.localeCompare(cb, undefined, { numeric: true }); });
                          const phExp = expandedPhases[phase] !== false;

                          return (
                            <Draggable key={gate.id.toString()} draggableId={`phase-drag___${gate.id}`} index={phaseIdx}>
                              {(dragProvided, dragSnapshot) => (
                                <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                  <div className={`flex items-center px-4 py-1 hover:bg-gray-50 bg-gray-50/20 group border-b border-gray-50 ${dragSnapshot.isDragging ? 'opacity-50' : ''}`}>
                                    <div className="w-14 shrink-0 flex items-center pr-2" style={{ paddingLeft: '16px' }}>
                                      <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 text-gray-300 w-4"><GripVertical className="w-3 h-3" /></div>
                                      <button onClick={() => setExpandedPhases(p => ({ ...p, [phase]: !phExp }))} className="text-gray-400 w-4 pl-1">{phExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</button>
                                      <div className="text-[9px] font-black text-gray-500 w-full text-center">{phaseIdx + 1}</div>
                                    </div>
                                    <div className="w-[180px] shrink-0 flex items-center gap-2 pr-2 overflow-hidden font-bold text-gray-700 cursor-pointer" onClick={() => onSelectPhase?.(`${project.id}-${phase}`)}>
                                       <Layers className="w-3 h-3 text-violet-600 shrink-0" /><span className="truncate">{phase}</span>
                                    </div>
                                    <div className="w-20 shrink-0 flex justify-center"><StatusIndicator status={gate.statusIndicator} /></div>
                                    <div className="w-24 shrink-0 px-1">
                                      <select className="w-full bg-white border border-gray-200 rounded text-[9px] font-bold outline-none py-0.5" value={gate.responsibleRoles || ''} onChange={(e) => onUpdatePhase?.(gate.id, { responsibleRoles: e.target.value })} onClick={e => e.stopPropagation()}>
                                        <option value="">- Role -</option>{roles.map(r => <option key={r.id} value={r.roleName}>{r.roleName}</option>)}
                                      </select>
                                    </div>
                                    <div className="w-24 shrink-0 px-1"></div>
                                    <div className="w-24 shrink-0 px-2 text-right"></div>
                                    <div className="w-24 shrink-0 px-2 text-right font-black text-violet-600 text-[9px]">
                                      {(() => { const ds = phts.filter(t => t.plannedStartDate && t.plannedEndDate); if (!ds.length) return '-'; const s = ds.sort((a,b) => a.plannedStartDate!.localeCompare(b.plannedStartDate!))[0].plannedStartDate!; const e = ds.sort((a,b) => b.plannedEndDate!.localeCompare(a.plannedEndDate!))[0].plannedEndDate!; const d = calcWorkingDays(s, e); return d > 0 ? `${d}d` : '-'; })()}
                                    </div>
                                    <div className="w-24 shrink-0 px-2"></div><div className="w-10 shrink-0"></div>
                                  </div>
                                  {phExp && (
                                    <Droppable droppableId={`phase___${phase}___${project.id}`}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'bg-indigo-50/20' : ''}>
                                          {phts.map((task, idx) => (
                                            <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                              {(dragProvided, dragSnapshot) => (
                                                <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className={`flex items-center px-4 py-1 border-b border-gray-50 cursor-pointer ${selectedTaskId === task.id ? 'bg-indigo-50 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-gray-50 bg-white'} ${dragSnapshot.isDragging ? 'shadow-lg z-50 bg-white' : ''}`} onClick={() => onSelectTask(task.id)}>
                                                  <div className="w-14 shrink-0 flex items-center pr-2" style={{ paddingLeft: `${getTaskLevel(task) * 24}px` }}>
                                                     <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 text-gray-300 w-4"><GripVertical className="w-3 h-3" /></div>
                                                     <div className="text-[9px] font-black text-gray-500 w-full text-center">{wbsMap[task.id]}</div>
                                                  </div>
                                                  <div className="w-[180px] shrink-0 flex items-center gap-2 pr-2">
                                                     <div className={`h-1 w-1 rounded-full shrink-0 ${task.status === '已完成' ? 'bg-green-500' : (task.status === '進行中' ? 'bg-blue-500' : 'bg-gray-300')}`} />
                                                     <input type="text" value={task.title} onChange={(e) => onUpdateTask?.(task.id, { title: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-indigo-400 rounded px-1 py-0.5 text-[10px] font-medium truncate outline-none" />
                                                  </div>
                                                  <div className="w-20 shrink-0 px-1"><select className="w-full bg-transparent border border-transparent hover:bg-white rounded text-[9px] font-bold py-0.5" value={task.status || 'TODO'} onChange={(e) => onUpdateTask?.(task.id, { status: e.target.value })} onClick={e => e.stopPropagation()}>{['TODO','PROG','DONE','OVR'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                                  <div className="w-24 shrink-0 px-1"><select className="w-full bg-transparent border border-transparent hover:bg-white rounded text-[9px] font-bold py-0.5" value={task.responsibleRoles || ''} onChange={(e) => onUpdateTask?.(task.id, { responsibleRoles: e.target.value })} onClick={e => e.stopPropagation()}><option value="">-</option>{roles.map(r => <option key={r.id} value={r.roleName}>{r.roleName}</option>)}</select></div>
                                                  <div className="w-24 shrink-0 px-1"><select className="w-full bg-transparent border border-transparent hover:bg-white rounded text-[9px] font-bold py-0.5" value={task.assigneeId || ''} onChange={(e) => onUpdateTask?.(task.id, { assigneeId: e.target.value ? Number(e.target.value) : undefined })} onClick={e => e.stopPropagation()}><option value="">-</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                                                  <div className="w-24 shrink-0 px-2"><input type="date" value={task.plannedStartDate?.split('T')[0] || ''} onChange={(e) => onUpdateTask?.(task.id, { plannedStartDate: e.target.value })} onClick={e => e.stopPropagation()} className="w-full bg-transparent text-[9px] font-bold outline-none" /></div>
                                                  <div className="w-24 shrink-0 px-2"><input type="date" value={task.plannedEndDate?.split('T')[0] || ''} onChange={(e) => onUpdateTask?.(task.id, { plannedEndDate: e.target.value })} onClick={e => e.stopPropagation()} className="w-full bg-transparent text-[9px] font-bold outline-none" /></div>
                                                  <div className="w-24 shrink-0 px-2 text-right pr-1 font-black text-indigo-600 text-[9px]">{calcWorkingDays(task.plannedStartDate, task.plannedEndDate) || '-'}d</div>
                                                  <div className="w-24 shrink-0 px-2"><input type="text" value={task.predecessors || ''} onChange={(e) => onUpdateTask?.(task.id, { predecessors: e.target.value })} onClick={e => e.stopPropagation()} className="w-full bg-transparent text-[9px] font-bold outline-none truncate" placeholder="e.g. T1" /></div>
                                                  <div className="w-10 shrink-0 text-center"><button onClick={(e) => { e.stopPropagation(); onDeleteTask?.(task.id); }} className="text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button></div>
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  )}
                                  <div className="flex items-center px-4 py-1 ml-8 border-l border-dashed border-amber-200">
                                      <ShieldCheck className="w-2.5 h-2.5 text-amber-500 mr-2" />
                                      <span className="flex-1 text-[9px] font-black text-amber-900 truncate uppercase">Gate: {phase}</span>
                                      <span className={`text-[8px] font-black ${gateStatusConfig[gate.gateStatus || 'PENDING'].color} px-1 rounded`}>{gateStatusConfig[gate.gateStatus || 'PENDING'].label}</span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        
                        {common.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center px-4 py-1 bg-slate-100/50 border-b border-slate-200 cursor-pointer" onClick={() => setExpandedPhases(p => ({ ...p, 'Common': expandedPhases['Common'] === false }))}>
                               <div className="w-14 shrink-0 flex justify-center">{expandedPhases['Common'] !== false ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</div>
                               <div className="flex-1 flex items-center gap-2 font-black text-[10px] text-slate-500 uppercase tracking-wider"><Layers className="w-3 h-3" />Common Tasks</div>
                            </div>
                            {expandedPhases['Common'] !== false && (
                              <Droppable droppableId={`phase______${project.id}`}>
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {common.map((task, idx) => (
                                      <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                        {(dragProvided) => (
                                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className={`flex items-center px-4 py-1 border-b border-gray-50 cursor-pointer ${selectedTaskId === task.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50 bg-white'}`} onClick={() => onSelectTask(task.id)}>
                                            <div className="w-14 shrink-0 flex items-center pr-2" style={{ paddingLeft: `${getTaskLevel(task) * 24}px` }}>
                                               <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 text-gray-300 w-4"><GripVertical className="w-3 h-3" /></div>
                                               <div className="text-[9px] font-black text-slate-400 w-full text-center">{wbsMap[task.id] || '?'}</div>
                                            </div>
                                            <div className="w-[180px] shrink-0 flex items-center gap-2 pr-2">
                                               <div className={`h-1 w-1 rounded-full shrink-0 ${task.status === '已完成' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                               <input type="text" value={task.title} onChange={(e) => onUpdateTask?.(task.id, { title: e.target.value })} className="w-full bg-transparent text-[10px] outline-none" />
                                            </div>
                                            <div className="w-20 shrink-0 px-1"></div><div className="w-24 shrink-0 px-1"></div><div className="w-24 shrink-0 px-1"></div><div className="w-24 shrink-0 px-2"></div><div className="w-24 shrink-0 px-2"></div><div className="w-24 shrink-0 px-2 text-right"></div><div className="w-24 shrink-0 px-2"></div><div className="w-10 shrink-0"></div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </div>
                        )}
                        {phaseListProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
