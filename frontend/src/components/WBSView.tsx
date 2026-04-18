import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  FolderOpen, Layers, CheckSquare2, ShieldCheck, ChevronDown, ChevronRight,
  GripVertical, Clock, Circle, CheckCircle, AlertCircle, Check, X
} from 'lucide-react';

// ──────────────────────────────────────────
//  Types
// ──────────────────────────────────────────
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

interface WBSViewProps {
  projects: WBSProject[];
  tasks: WBSTask[];
  gates: WBSGate[];
  users: WBSUser[];
  selectedProjectId: number | null;
  onTaskMoved: (taskId: number, newPhase: string, newProjectId: number) => void;
  onRenameProject?: (projectId: number, newName: string) => void;
  onReorderPhases?: (projectId: number, phaseIds: number[]) => Promise<void>;
  onSelectTask: (taskId: number) => void;
  selectedTaskId: number | null;
  onUpdateTask?: (taskId: number, updates: Partial<WBSTask>) => Promise<void>;
  onUpdatePhase?: (phaseId: number, updates: Partial<WBSGate>) => Promise<void>;
  onAdjustTask?: (action: 'indent' | 'outdent' | 'up' | 'down') => Promise<void>;
  wbsMap: Record<number, string>;
  criticalPathIds?: Set<string>;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
};

const calcWorkingDays = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const dStart = new Date(start);
  const dEnd = new Date(end);
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) return 0;
  let days = 0;
  let cur = new Date(dStart);
  while (cur <= dEnd) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const nodeConfig = {
  project: { Icon: FolderOpen,    bg: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700',    label: 'PROJ' },
  phase:   { Icon: Layers,        bg: 'bg-violet-100', badge: 'bg-violet-100 text-violet-700',    label: 'PHASE'   },
  task:    { Icon: CheckSquare2,  bg: 'bg-slate-100',  badge: 'bg-slate-100 text-slate-500',      label: 'TASK'    },
  gate:    { Icon: ShieldCheck,   bg: 'bg-amber-100',  badge: 'bg-amber-100 text-amber-700',      label: 'GATE'    },
};

const statusConfig: Record<string, { color: string; Icon: any }> = {
  'DONE': { color: 'text-green-600 bg-green-50', Icon: CheckCircle },
  'PROG': { color: 'text-blue-600 bg-blue-50',   Icon: Clock       },
  'TODO': { color: 'text-gray-400 bg-gray-50',   Icon: Circle      },
  'OVR':  { color: 'text-red-600  bg-red-50',    Icon: AlertCircle },
};

const gateStatusConfig: Record<string, { color: string; label: string }> = {
  APPROVED: { color: 'bg-green-100 text-green-700 border-green-200', label: '✓'  },
  REJECTED: { color: 'bg-red-100   text-red-700   border-red-200',   label: '✗'  },
  PENDING:  { color: 'bg-amber-100 text-amber-700 border-amber-200', label: '⏳' },
};

const indicatorConfig: Record<string, string> = {
  BLUE:   'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  GREEN:  'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  YELLOW: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
  RED:    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
};

function StatusIndicator({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <div 
      className={`w-2 h-2 rounded-full ${indicatorConfig[status] || 'bg-gray-300'} shrink-0`} 
      title={`Status: ${status}`}
    />
  );
}

function InlineEdit({
  value,
  onSave,
  onCancel,
  className = '',
}: { value: string; onSave: (v: string) => void; onCancel: () => void; className?: string }) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = () => { if (text.trim()) onSave(text.trim()); else onCancel(); };

  return (
    <span className={`flex items-center gap-1 ${className}`} onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
        className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-indigo-400 outline-none w-full"
      />
      <button onClick={commit} className="p-0.5 rounded bg-indigo-600 text-white"><Check className="w-3 h-3" /></button>
    </span>
  );
}

function NodeTypeTag({ type }: { type: keyof typeof nodeConfig }) {
  const cfg = nodeConfig[type];
  return (
    <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}


// ──────────────────────────────────────────
//  Inline Task Detail Panel
// ──────────────────────────────────────────
function TaskDetailPanel({
  task,
  users,
  project,
  wbsMap,
  criticalPathIds,
  onUpdateTask,
  onClose,
}: {
  task: WBSTask;
  users: WBSUser[];
  project: WBSProject;
  wbsMap: Record<number, string>;
  criticalPathIds?: Set<string>;
  onUpdateTask?: (taskId: number, updates: Partial<WBSTask>) => Promise<void>;
  onClose: () => void;
}) {
  const [titleVal, setTitleVal]   = useState(task.title);
  const [predVal,  setPredVal]    = useState('');

  // Sync title when task changes
  useEffect(() => { setTitleVal(task.title); }, [task.id, task.title]);

  // Convert stored T-prefixed preds → WBS codes for display
  useEffect(() => {
    let d = task.predecessors || '';
    (d.match(/T\d+/g) || []).forEach(m => {
      const tid = Number(m.substring(1));
      if (wbsMap[tid]) d = d.replace(m, wbsMap[tid]);
    });
    setPredVal(d);
  }, [task.id, task.predecessors, wbsMap]);

  const savePreds = async () => {
    const parts = predVal.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    const parsed = parts.map(part => {
      const match = part.match(/^([\d.]+)(.*)/);
      if (match) {
        const tid = Object.keys(wbsMap).find(k => wbsMap[Number(k)] === match[1]);
        if (tid) return `T${tid}${match[2]}`;
      }
      return part;
    }).join(', ');
    await onUpdateTask?.(task.id, { predecessors: parsed });
  };

  const roles = project.responsibleRoles?.split(',').map(r => r.trim()).filter(Boolean) || [];
  const isCritical = criticalPathIds?.has(String(task.id));
  const plDur  = calcWorkingDays(task.plannedStartDate, task.plannedEndDate);
  const actDur = calcWorkingDays(task.actualStartDate,  task.actualEndDate);

  const fieldLabel = (text: string) => (
    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{text}</label>
  );
  const inputCls = "w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-400 transition-colors";
  const selectCls = "w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-400 transition-colors";

  return (
    <div
      className="border-l-2 border-indigo-400 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/30 px-5 py-4 shadow-inner"
      onClick={e => e.stopPropagation()}
    >
      {/* Header row: badges + close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {wbsMap[task.id] && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-md">
              WBS {wbsMap[task.id]}
            </span>
          )}
          {isCritical && (
            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[8px] font-black rounded-md border border-red-200">
              ⚠ CRITICAL PATH
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-x-3 gap-y-3">
        {/* Activity Name ── col 4 */}
        <div className="col-span-4">
          {fieldLabel('Activity Name')}
          <input
            type="text"
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={e => { if (e.target.value.trim() && e.target.value !== task.title) onUpdateTask?.(task.id, { title: e.target.value.trim() }); }}
            className={inputCls}
          />
        </div>

        {/* Status ── col 1 */}
        <div>
          {fieldLabel('Status')}
          <select
            value={task.status || 'TODO'}
            onChange={e => onUpdateTask?.(task.id, { status: e.target.value })}
            className={selectCls}
          >
            {['TODO', 'PROG', 'DONE', 'OVR'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Owner ── col 1 */}
        <div>
          {fieldLabel('Owner')}
          <select
            value={task.assigneeId || ''}
            onChange={e => onUpdateTask?.(task.id, { assigneeId: e.target.value ? Number(e.target.value) : undefined })}
            className={selectCls}
          >
            <option value="">-</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* Responsible Role ── col 2 */}
        <div className="col-span-2">
          {fieldLabel('Responsible Role')}
          <select
            value={task.responsibleRoles || ''}
            onChange={e => onUpdateTask?.(task.id, { responsibleRoles: e.target.value })}
            className={selectCls}
          >
            <option value="">- Role -</option>
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>

        {/* PL Start ── col 1 */}
        <div>
          {fieldLabel('PL Start')}
          <input
            type="date"
            value={task.plannedStartDate?.split('T')[0] || ''}
            onChange={e => onUpdateTask?.(task.id, { plannedStartDate: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* PL End ── col 1 */}
        <div>
          {fieldLabel('PL End')}
          <input
            type="date"
            value={task.plannedEndDate?.split('T')[0] || ''}
            onChange={e => onUpdateTask?.(task.id, { plannedEndDate: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* ACT Start ── col 1 */}
        <div>
          {fieldLabel('ACT Start')}
          <input
            type="date"
            value={task.actualStartDate?.split('T')[0] || ''}
            onChange={e => onUpdateTask?.(task.id, { actualStartDate: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* ACT End ── col 1 */}
        <div>
          {fieldLabel('ACT End')}
          <input
            type="date"
            value={task.actualEndDate?.split('T')[0] || ''}
            onChange={e => onUpdateTask?.(task.id, { actualEndDate: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Duration summary ── col 4 */}
        <div className="col-span-4 flex items-center gap-6 px-1 py-1 bg-white/60 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">PL DUR</span>
            <span className={`text-[11px] font-black ${plDur > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
              {plDur > 0 ? `${plDur}d` : '-'}
            </span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ACT DUR</span>
            <span className={`text-[11px] font-black ${actDur > 0 ? 'text-green-600' : 'text-gray-300'}`}>
              {actDur > 0 ? `${actDur}d` : '-'}
            </span>
          </div>
          {plDur > 0 && actDur > 0 && (
            <>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">VARIANCE</span>
                <span className={`text-[11px] font-black ${actDur > plDur ? 'text-red-500' : 'text-green-600'}`}>
                  {actDur > plDur ? `+${actDur - plDur}d` : actDur < plDur ? `-${plDur - actDur}d` : '0d'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Predecessors ── col 4 */}
        <div className="col-span-4">
          {fieldLabel('Predecessors (WBS codes e.g. 1.1, 1.2)')}
          <input
            type="text"
            value={predVal}
            onChange={e => setPredVal(e.target.value)}
            onBlur={savePreds}
            onKeyDown={e => { if (e.key === 'Enter') savePreds(); }}
            placeholder="e.g. 1.1, 2.3"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
//  Main WBSView
// ──────────────────────────────────────────
export default function WBSView({
  projects,
  tasks,
  gates,
  users,
  selectedProjectId,
  onTaskMoved,
  onRenameProject,
  onReorderPhases,
  onSelectTask,
  selectedTaskId,
  onUpdateTask,
  onUpdatePhase,
  onAdjustTask,
  wbsMap,
  criticalPathIds,
}: WBSViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedPhases,    setExpandedPhases]    = useState<Record<string, boolean>>({});
  const [expandedProjects,  setExpandedProjects]  = useState<Record<number, boolean>>(() =>
    (projects || []).reduce((a, p) => ({ ...a, [p.id]: true }), {} as Record<number, boolean>)
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTaskId && containerRef.current) {
      containerRef.current.focus();
    }
  }, [selectedTaskId]);

  const getTaskLevel = (task: WBSTask) => {
    let level = 0;
    let curr = task;
    while (curr.parentTaskId) {
      const parent = tasks.find(t => t.id === curr.parentTaskId);
      if (!parent || level > 5) break;
      curr = parent;
      level++;
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

  const visibleProjects = selectedProjectId
    ? (projects || []).filter(p => p.id == selectedProjectId)
    : (projects || []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.type === 'PHASE_LIST') {
      const projectId = parseInt(result.source.droppableId.split('___')[1], 10);
      const projectGatesArr = (gates || []).filter(g => g.projectId === projectId).sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id));
      const newPhases = Array.from(projectGatesArr);
      const [reorderedItem] = newPhases.splice(result.source.index, 1);
      newPhases.splice(result.destination.index, 0, reorderedItem);
      if (onReorderPhases) onReorderPhases(projectId, newPhases.map(g => g.id));
      return;
    }
    const [, newPhase, newProjectIdStr] = result.destination.droppableId.split('___');
    const taskId      = parseInt(result.draggableId, 10);
    const newProjectId = parseInt(newProjectIdStr, 10);
    onTaskMoved(taskId, newPhase, newProjectId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div ref={containerRef} className="font-sans text-[11px] select-none outline-none" tabIndex={0} onKeyDown={handleKeyboardAdjustment}>
        {/* Header */}
        <div className="flex items-center px-4 py-1.5 bg-gray-50 border-b border-gray-100 font-black text-gray-400 uppercase tracking-widest text-[8px] sticky top-0 z-10">
          <div className="w-14 shrink-0">WBS</div>
          <div className="flex-1 min-w-[150px]">Activity Name</div>
          <div className="w-16 shrink-0 text-center">Status</div>
          <div className="w-20 shrink-0 text-center">Role</div>
          <div className="w-20 shrink-0 text-center">Owner</div>
          <div className="w-32 shrink-0 text-right">Schedule</div>
          <div className="w-14 shrink-0 text-right">DUR(d)</div>
          <div className="w-24 shrink-0 text-right">Predecessors</div>
        </div>

        <div className="min-w-fit">
          {(visibleProjects || []).map(project => {
            const projectTasks = (tasks || []).filter(t => t.projectId == project.id);
            const projectGates = (gates || []).filter(g => g.projectId == project.id);
            const isExpanded = expandedProjects[project.id] !== false;
            const editKey = `project-${project.id}`;

            // Identify tasks that aren't in any of the explicit phases/gates
            const phaseGateNames = new Set(projectGates.map(g => g.phaseName));
            const tasksWithoutExplicitGate = projectTasks.filter(t => !t.phase || !phaseGateNames.has(t.phase));

            return (
              <div key={project.id} className="border-b border-gray-100">
                <div className="flex items-center px-4 py-1.5 hover:bg-gray-50 bg-white group border-l-4 border-l-indigo-600">
                  <button onClick={() => setExpandedProjects(p => ({ ...p, [project.id]: !isExpanded }))} className="w-14 shrink-0 text-gray-400 hover:text-indigo-600 flex justify-center">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-[150px] flex items-center gap-2 overflow-hidden">
                    <FolderOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                    {editingKey === editKey ? (
                      <InlineEdit value={project.name} onSave={val => { onRenameProject?.(project.id, val); setEditingKey(null); }} onCancel={() => setEditingKey(null)} />
                    ) : (
                      <span className="font-black text-indigo-900 truncate" onDoubleClick={() => setEditingKey(editKey)}>{project.name}</span>
                    )}
                  </div>
                  <div className="w-16 shrink-0 flex justify-center"><StatusIndicator status={project.statusIndicator} /></div>
                  <div className="w-20 shrink-0 flex flex-wrap gap-0.5 justify-center overflow-hidden h-6 items-center">
                    {project.responsibleRoles?.split(',').map(r => r.trim()).filter(Boolean).map(role => (
                      <span key={role} className="text-[7px] bg-indigo-50 text-indigo-600 px-1 rounded-sm border border-indigo-100 uppercase font-black">{role}</span>
                    ))}
                  </div>
                  <div className="w-20 shrink-0"></div>
                  <div className="w-32 shrink-0 text-right"><NodeTypeTag type="project" /></div>
                  <div className="w-14 shrink-0 text-right text-[9px] font-black text-indigo-600 pr-1">
                    {(() => {
                      if (!projectTasks.length) return '-';
                      const tds = projectTasks.filter(t => t.plannedStartDate && t.plannedEndDate);
                      if (!tds.length) return '-';
                      const minS = [...tds].sort((a,b) => a.plannedStartDate!.localeCompare(b.plannedStartDate!))[0].plannedStartDate!;
                      const maxE = [...tds].sort((a,b) => b.plannedEndDate!.localeCompare(a.plannedEndDate!))[0].plannedEndDate!;
                      const d = calcWorkingDays(minS, maxE);
                      return d > 0 ? `${d}d` : '-';
                    })()}
                  </div>
                  <div className="w-24 shrink-0"></div>
                </div>

                {isExpanded && (
                  <Droppable droppableId={`project-phases___${project.id}`} type="PHASE_LIST">
                    {(phaseListProvided) => (
                      <div ref={phaseListProvided.innerRef} {...phaseListProvided.droppableProps}>
                        {projectGates.sort((a,b) => (a.displayOrder ?? a.id)-(b.displayOrder ?? b.id)).map((gate, phaseIdx) => {
                          const phase = gate.phaseName;
                          const phaseTasks = projectTasks
                            .filter(t => t.phase === phase)
                            .sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id));
                          const phaseExpanded = expandedPhases[phase] !== false;

                          return (
                            <Draggable key={gate.id.toString()} draggableId={`phase-drag___${gate.id}`} index={phaseIdx}>
                              {(dragProvided, dragSnapshot) => (
                                <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                  <div className={`flex items-center px-4 py-1 hover:bg-gray-50 bg-gray-50/20 group border-b border-gray-50 ${dragSnapshot.isDragging ? 'opacity-50' : ''}`}>
                                    <div className="w-14 shrink-0 flex items-center pl-1">
                                      <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 text-gray-300 w-4">
                                        <GripVertical className="w-3 h-3" />
                                      </div>
                                      <button onClick={() => setExpandedPhases(p => ({ ...p, [phase]: !phaseExpanded }))} className="text-gray-400 w-6">
                                        {phaseExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      </button>
                                      <div className="text-[9px] font-black text-gray-500 w-full text-center">{phaseIdx + 1}</div>
                                    </div>
                                    <div className="flex-1 min-w-[150px] flex items-center gap-2 overflow-hidden font-bold text-gray-700">
                                       <Layers className="w-3 h-3 text-violet-600 shrink-0" />
                                       <span className="truncate">{phase}</span>
                                    </div>
                                    <div className="w-16 shrink-0 flex justify-center"><StatusIndicator status={gate.statusIndicator} /></div>
                                    <div className="w-20 shrink-0 px-1">
                                      <select 
                                        className="w-full bg-white border border-gray-200 rounded text-[9px] font-bold outline-none focus:border-indigo-400 py-0.5"
                                        value={gate.responsibleRoles || ''}
                                        onChange={(e) => onUpdatePhase?.(gate.id, { responsibleRoles: e.target.value })}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <option value="">- Role -</option>
                                        {project.responsibleRoles?.split(',').map(r => r.trim()).filter(Boolean).map(role => (
                                          <option key={role} value={role}>{role}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="w-20 shrink-0"></div>
                                    <div className="w-32 shrink-0 text-right"><NodeTypeTag type="phase" /></div>
                                    <div className="w-14 shrink-0 text-right text-[9px] font-black text-violet-600 pr-1">
                                       {(() => {
                                         const tds = phaseTasks.filter(t => t.plannedStartDate && t.plannedEndDate);
                                         if (!tds.length) return '-';
                                         const minS = [...tds].sort((a,b) => a.plannedStartDate!.localeCompare(b.plannedStartDate!))[0].plannedStartDate!;
                                         const maxE = [...tds].sort((a,b) => b.plannedEndDate!.localeCompare(a.plannedEndDate!))[0].plannedEndDate!;
                                         const d = calcWorkingDays(minS, maxE);
                                         return d > 0 ? `${d}d` : '-';
                                       })()}
                                     </div>
                                     <div className="w-24 shrink-0"></div>
                                  </div>

                                  {phaseExpanded && (
                                    <Droppable droppableId={`phase___${phase}___${project.id}`}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'bg-indigo-50/20' : ''}>
                                          {phaseTasks.map((task, idx) => {
                                            const status = task.status === '已完成' ? 'DONE' : (task.status === '進行中' ? 'PROG' : (task.status || 'TODO'));
                                            const isSelected = selectedTaskId === task.id;

                                            // Format Predecessors for display
                                            let displayPreds = task.predecessors || '';
                                            const matches = displayPreds.match(/T\d+/g);
                                            if (matches) {
                                                matches.forEach(m => {
                                                    const tid = Number(m.substring(1));
                                                    if (wbsMap[tid]) displayPreds = displayPreds.replace(m, wbsMap[tid]);
                                                });
                                            }

                                            return (
                                              <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                                {(dragProvided, dragSnapshot) => (
                                                  <div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                  >
                                                    {/* ── Task Row ── */}
                                                    <div
                                                      onClick={() => onSelectTask(task.id)}
                                                      className={`flex items-center px-4 py-1 border-b border-gray-50 cursor-pointer ${
                                                        isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-gray-50 bg-white'
                                                      } ${dragSnapshot.isDragging ? 'shadow-lg z-50 bg-white !left-0 !top-0' : ''}`}
                                                      style={{ paddingLeft: `${48 + getTaskLevel(task) * 16}px` }}
                                                    >
                                                      <div className="w-14 shrink-0 flex items-center pr-2">
                                                         <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 text-gray-300 w-4">
                                                            <GripVertical className="w-3 h-3" />
                                                         </div>
                                                         <div className="text-[9px] font-black text-gray-500 w-full text-center">{wbsMap[task.id]}</div>
                                                      </div>
                                                      <div className="flex-1 min-w-[150px] flex items-center gap-2 truncate">
                                                         <div className={`h-1 w-1 rounded-full shrink-0 ${status === 'DONE' ? 'bg-green-500' : (status === 'PROG' ? 'bg-blue-500' : 'bg-gray-300')}`} />
                                                         <span className="font-medium text-gray-800 truncate">{task.title}</span>
                                                      </div>
                                                      <div className="w-16 shrink-0 flex justify-center">
                                                         <span className={`text-[8px] font-black px-1 py-0.5 rounded-sm uppercase ${(statusConfig[status] || statusConfig['TODO']).color.replace('text-', 'border-').split(' ')[0]} border`}>
                                                           {status}
                                                         </span>
                                                      </div>
                                                      <div className="w-20 shrink-0 px-1">
                                                        <select 
                                                          className="w-full bg-white border border-gray-200 rounded text-[9px] font-bold outline-none focus:border-indigo-400 py-0.5"
                                                          value={task.responsibleRoles || ''}
                                                          onChange={(e) => onUpdateTask?.(task.id, { responsibleRoles: e.target.value })}
                                                          onClick={e => e.stopPropagation()}
                                                        >
                                                          <option value="">- Role -</option>
                                                          {project.responsibleRoles?.split(',').map(r => r.trim()).filter(Boolean).map(role => (
                                                            <option key={role} value={role}>{role}</option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                      <div className="w-20 shrink-0 text-center truncate text-gray-500 text-[9px] font-bold">
                                                         {users.find(u => u.id === task.assigneeId)?.name || '-'}
                                                      </div>
                                                      <div className="w-32 shrink-0 text-right text-[8px] text-gray-400 font-black">
                                                         {formatDate(task.plannedStartDate)} - {formatDate(task.plannedEndDate)}
                                                      </div>
                                                      <div className="w-14 shrink-0 text-right pr-1">
                                                         {(() => {
                                                           const d = calcWorkingDays(task.plannedStartDate, task.plannedEndDate);
                                                           return <span className={`text-[9px] font-black ${d > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>{d > 0 ? `${d}d` : '-'}</span>;
                                                         })()}
                                                       </div>
                                                       <div className="w-24 shrink-0 text-right text-[10px] text-gray-500 font-bold px-2 truncate">
                                                         {displayPreds || '-'}
                                                       </div>
                                                    </div>

                                                    {/* ── Inline Detail Panel (expands when selected) ── */}
                                                    {isSelected && (
                                                      <TaskDetailPanel
                                                        task={task}
                                                        users={users}
                                                        project={project}
                                                        wbsMap={wbsMap}
                                                        criticalPathIds={criticalPathIds}
                                                        onUpdateTask={onUpdateTask}
                                                        onClose={() => onSelectTask(task.id)} // toggle off
                                                      />
                                                    )}
                                                  </div>
                                                )}
                                              </Draggable>
                                            );
                                          })}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  )}
                                  
                                  {/* Gate Row */}
                                  <div className="flex items-center px-4 py-1 ml-8 border-l border-dashed border-amber-200">
                                      <ShieldCheck className="w-2.5 h-2.5 text-amber-500 mr-2" />
                                      <span className="flex-1 text-[9px] font-black text-amber-900 border-b border-amber-100/50 pb-0.5 truncate uppercase">Gate: {phase}</span>
                                      <span className={`text-[8px] font-black ${gateStatusConfig[gate.gateStatus || 'PENDING'].color} px-1 rounded`}>
                                        {gateStatusConfig[gate.gateStatus || 'PENDING'].label}
                                      </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        
                        {/* Common Tasks / Unassigned Tasks Section */}
                        {tasksWithoutExplicitGate.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center px-4 py-1 bg-slate-100/50 border-b border-slate-200">
                              <div className="w-14 shrink-0 flex items-center justify-center pl-1">
                                <button onClick={() => setExpandedPhases(p => ({ ...p, 'Common': !expandedPhases['Common'] }))} className="text-slate-400 w-6">
                                  {expandedPhases['Common'] !== false ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="flex-1 flex items-center gap-2 font-black text-[10px] text-slate-500 uppercase tracking-wider">
                                <Layers className="w-3 h-3 text-slate-400" />
                                Common Tasks (Unassigned)
                              </div>
                            </div>
                            {(expandedPhases['Common'] !== false) && (
                              <div className="bg-white/30">
                                {tasksWithoutExplicitGate.map((task) => {
                                  const status = task.status === '已完成' ? 'DONE' : (task.status === '進行中' ? 'PROG' : (task.status || 'TODO'));
                                  const isSelected = selectedTaskId === task.id;
                                  
                                  let displayPreds = task.predecessors || '';
                                  const matches = displayPreds.match(/T\d+/g);
                                  if (matches) {
                                      matches.forEach(m => {
                                          const tid = Number(m.substring(1));
                                          if (wbsMap[tid]) displayPreds = displayPreds.replace(m, wbsMap[tid]);
                                      });
                                  }

                                  return (
                                    <div key={task.id} className="relative">
                                      <div
                                        onClick={() => onSelectTask(task.id)}
                                        className={`flex items-center px-4 py-1 border-b border-slate-100 cursor-pointer ${
                                          isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-slate-50'
                                        }`}
                                        style={{ paddingLeft: '64px' }}
                                      >
                                        <div className="w-14 shrink-0 flex items-center pr-2">
                                           <div className="text-[9px] font-black text-slate-400 w-full text-center">{wbsMap[task.id] || '?'}</div>
                                        </div>
                                        <div className="flex-1 min-w-[150px] flex items-center gap-2 truncate">
                                           <div className={`h-1 w-1 rounded-full shrink-0 ${status === 'DONE' ? 'bg-green-500' : (status === 'PROG' ? 'bg-blue-500' : 'bg-slate-300')}`} />
                                           <span className="font-medium text-slate-700 truncate">{task.title}</span>
                                        </div>
                                        <div className="w-16 shrink-0 flex justify-center">
                                           <span className={`text-[8px] font-black px-1 py-0.5 rounded-sm uppercase ${(statusConfig[status] || statusConfig['TODO']).color.replace('text-', 'border-').split(' ')[0]} border`}>
                                             {status}
                                           </span>
                                        </div>
                                        <div className="w-20 shrink-0 px-1"></div>
                                        <div className="w-20 shrink-0 text-center truncate text-slate-400 text-[9px] font-bold">
                                           {users.find(u => u.id === task.assigneeId)?.name || '-'}
                                        </div>
                                        <div className="w-32 shrink-0 text-right text-[8px] text-slate-400 font-black">
                                           {formatDate(task.plannedStartDate)} - {formatDate(task.plannedEndDate)}
                                        </div>
                                        <div className="w-14 shrink-0 text-right pr-1">
                                           {(() => {
                                             const d = calcWorkingDays(task.plannedStartDate, task.plannedEndDate);
                                             return <span className={`text-[9px] font-black ${d > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{d > 0 ? `${d}d` : '-'}</span>;
                                           })()}
                                        </div>
                                        <div className="w-24 shrink-0 text-right text-[10px] text-slate-500 font-bold px-2 truncate">
                                           {displayPreds || '-'}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <TaskDetailPanel
                                          task={task}
                                          users={users}
                                          project={project}
                                          wbsMap={wbsMap}
                                          criticalPathIds={criticalPathIds}
                                          onUpdateTask={onUpdateTask}
                                          onClose={() => onSelectTask(task.id)}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
