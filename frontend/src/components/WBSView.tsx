import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  FolderOpen, Layers, CheckSquare2, ShieldCheck, ChevronDown, ChevronRight,
  GripVertical, Clock, ArrowRightLeft, Circle, CheckCircle, AlertCircle, Pencil, Check, X
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
}

interface WBSGate {
  id: number;
  phaseName: string;
  gateStatus?: string;
  statusIndicator?: string;
}

interface WBSProject {
  id: number;
  name: string;
  currentPhase?: string;
  statusIndicator?: string;
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
  onUpdateTask?: (taskId: number, updates: Partial<WBSTask>) => void;
}

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

// ──────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────
const PHASES = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'] as const;

const nodeConfig = {
  project: { Icon: FolderOpen,    bg: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700',    label: 'PROJECT' },
  phase:   { Icon: Layers,        bg: 'bg-violet-100', badge: 'bg-violet-100 text-violet-700',    label: 'PHASE'   },
  task:    { Icon: CheckSquare2,  bg: 'bg-slate-100',  badge: 'bg-slate-100 text-slate-500',      label: 'TASK'    },
  gate:    { Icon: ShieldCheck,   bg: 'bg-amber-100',  badge: 'bg-amber-100 text-amber-700',      label: 'GATE'    },
};

const statusConfig: Record<string, { color: string; Icon: any }> = {
  '已完成': { color: 'text-green-600 bg-green-50', Icon: CheckCircle },
  '進行中': { color: 'text-blue-600 bg-blue-50',   Icon: Clock       },
  '待辦':   { color: 'text-gray-400 bg-gray-50',   Icon: Circle      },
  '逾期':   { color: 'text-red-600  bg-red-50',    Icon: AlertCircle },
};

const gateStatusConfig: Record<string, { color: string; label: string }> = {
  APPROVED: { color: 'bg-green-100 text-green-700 border-green-200', label: '✓ 已核准'  },
  REJECTED: { color: 'bg-red-100   text-red-700   border-red-200',   label: '✗ 已否決'  },
  PENDING:  { color: 'bg-amber-100 text-amber-700 border-amber-200', label: '⏳ 待審核' },
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
      className={`w-2.5 h-2.5 rounded-full ${indicatorConfig[status] || 'bg-gray-300'} shrink-0`} 
      title={`Status: ${status}`}
    />
  );
}

// ──────────────────────────────────────────
//  Inline Edit Input
// ──────────────────────────────────────────
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
        className="px-2 py-0.5 rounded text-xs font-bold bg-white border-2 border-indigo-400 outline-none min-w-[120px]"
      />
      <button onClick={commit} className="p-0.5 rounded bg-green-500 text-white hover:bg-green-600">
        <Check className="w-3 h-3" />
      </button>
      <button onClick={onCancel} className="p-0.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ──────────────────────────────────────────
//  Sub-components
// ──────────────────────────────────────────

function NodeTypeTag({ type }: { type: keyof typeof nodeConfig }) {
  const cfg = nodeConfig[type];
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

// ──────────────────────────────────────────
//  Main Component
// ──────────────────────────────────────────
export default function WBSView({
  projects,
  tasks,
  gates,
  users,
  selectedProjectId,
  onTaskMoved,
  onRenameProject,
  onUpdateTask,
}: WBSViewProps) {
  const navigate = useNavigate();
  const [expandedPhases,    setExpandedPhases]    = useState<Record<string, boolean>>(() =>
    PHASES.reduce((a, p) => ({ ...a, [p]: true }), {})
  );
  const [expandedProjects,  setExpandedProjects]  = useState<Record<number, boolean>>(() =>
    projects.reduce((a, p) => ({ ...a, [p.id]: true }), {} as Record<number, boolean>)
  );

  // Editing state: "project-{id}", "task-{id}", "phase-{phase}"
  const [editingKey, setEditingKey] = useState<string | null>(null);



  const visibleProjects = selectedProjectId
    ? projects.filter(p => p.id === selectedProjectId)
    : projects;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const [, newPhase, newProjectIdStr] = result.destination.droppableId.split('___');
    const taskId      = parseInt(result.draggableId, 10);
    const newProjectId = parseInt(newProjectIdStr, 10);
    onTaskMoved(taskId, newPhase, newProjectId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-2 font-sans text-sm select-none">
        {visibleProjects.map(project => {
          const projectTasks  = tasks.filter(t => t.projectId === project.id);
          const projectGates  = gates; // all fetched gates belong to current project
          const isExpanded    = expandedProjects[project.id] !== false;
          const editKey       = `project-${project.id}`;

          return (
            <div key={project.id} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">

              {/* ── PROJECT ROW ── */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white group">
                <button
                  onClick={() => setExpandedProjects(p => ({ ...p, [project.id]: !isExpanded }))}
                  className="shrink-0"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 opacity-80" /> : <ChevronRight className="w-4 h-4 opacity-80" />}
                </button>
                <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-white" />
                </div>

                {/* Project name / inline edit */}
                {editingKey === editKey ? (
                  <InlineEdit
                    value={project.name}
                    onSave={name => { onRenameProject?.(project.id, name); setEditingKey(null); }}
                    onCancel={() => setEditingKey(null)}
                    className="flex-1"
                  />
                ) : (
                  <span
                    className="font-black text-sm tracking-wide truncate flex-1 cursor-pointer hover:underline"
                    onDoubleClick={() => setEditingKey(editKey)}
                    title="雙擊以修改名稱"
                  >
                    {project.name}
                  </span>
                )}

                <button
                  onClick={() => setEditingKey(editingKey === editKey ? null : editKey)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded bg-white/20 hover:bg-white/30 transition-all shrink-0"
                  title="修改名稱"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <NodeTypeTag type="project" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                  {projectTasks.length} 項
                </span>
                <StatusIndicator status={project.statusIndicator} />
                {project.currentPhase && (
                  <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-black text-white/90 shrink-0">
                    ▶ {project.currentPhase}
                  </span>
                )}
              </div>

              {/* ── PHASES ── */}
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {PHASES.map((phase, phaseIdx) => {
                    const phaseTasks    = projectTasks.filter(t => t.phase === phase);
                    const phaseGates    = projectGates.filter(g => g.phaseName === phase);
                    const phaseExpanded = expandedPhases[phase] !== false;
                    const completedCount = phaseTasks.filter(t => t.status === '已完成').length;
                    const phaseEditKey  = `phase-${project.id}-${phase}`;

                    return (
                      <div key={phase}>
                        {/* Phase Header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-50/50 hover:bg-violet-50 border-l-4 border-violet-300 group">
                          <button onClick={() => setExpandedPhases(p => ({ ...p, [phase]: !phaseExpanded }))} className="shrink-0">
                            {phaseExpanded
                              ? <ChevronDown  className="w-3.5 h-3.5 text-violet-400" />
                              : <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
                          </button>
                          <div className="h-5 w-5 rounded bg-violet-100 flex items-center justify-center shrink-0">
                            <Layers className="w-3 h-3 text-violet-600" />
                          </div>

                          <span className="font-black text-violet-800 text-xs uppercase tracking-wider flex-1">
                            Phase {phaseIdx + 1}：{phase}
                          </span>

                          <button
                            onClick={() => setEditingKey(editingKey === phaseEditKey ? null : phaseEditKey)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-violet-100 text-violet-400 transition-all shrink-0"
                            title="修改名稱"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/details/PHASE/${project.id}-${phase}`); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] bg-violet-100 text-violet-600 px-2 py-1 rounded font-bold hover:bg-violet-200 transition-all ml-2"
                          >
                            詳細維護
                          </button>

                          <NodeTypeTag type="phase" />
                          <StatusIndicator status={phaseGates[0]?.statusIndicator} />
                          <div className="hidden sm:flex items-center gap-2 shrink-0">
                            <div className="w-16 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-400 rounded-full transition-all"
                                style={{ width: phaseTasks.length > 0 ? `${(completedCount / phaseTasks.length) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-[10px] text-violet-500 font-bold">
                              {completedCount}/{phaseTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Tasks (Droppable) */}
                        {phaseExpanded && (
                          <Droppable droppableId={`phase___${phase}___${project.id}`}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`pl-8 pr-2 py-1 space-y-0.5 min-h-[32px] transition-colors ${
                                  snapshot.isDraggingOver ? 'bg-violet-50/80 rounded-b-lg' : ''
                                }`}
                              >
                                {phaseTasks.map((task, idx) => {
                                  const taskEditKey  = `task-${task.id}`;

                                  return (
                                    <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all group/task ${
                                            dragSnapshot.isDragging
                                              ? 'bg-indigo-50 border-indigo-200 shadow-lg rotate-[1deg] scale-[1.02]'
                                              : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30'
                                          }`}
                                        >
                                          {/* Drag handle */}
                                          <div
                                            {...dragProvided.dragHandleProps}
                                            className="text-gray-200 group-hover/task:text-gray-400 transition-colors cursor-grab active:cursor-grabbing shrink-0"
                                            title="拖曳移動至其他 Phase"
                                          >
                                            <GripVertical className="w-4 h-4" />
                                          </div>

                                          <div className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                            <CheckSquare2 className="w-3 h-3 text-slate-500" />
                                          </div>

                                          {/* Title / inline edit */}
                                          {editingKey === taskEditKey ? (
                                            <InlineEdit
                                              value={task.title}
                                              onSave={title => { onUpdateTask?.(task.id, { title }); setEditingKey(null); }}
                                              onCancel={() => setEditingKey(null)}
                                              className="flex-1"
                                            />
                                          ) : (
                                            <span
                                              className="flex-1 min-w-0 text-xs font-bold text-gray-800 truncate cursor-pointer hover:text-indigo-700"
                                              onDoubleClick={() => setEditingKey(taskEditKey)}
                                              title="雙擊以修改名稱"
                                            >
                                              {task.title}
                                            </span>
                                          )}

                                          <StatusIndicator status={task.statusIndicator} />

                                          {/* Edit btn */}
                                          {editingKey !== taskEditKey && (
                                            <div className="flex gap-1 shrink-0 ml-2">
                                              <button
                                                onClick={e => { e.stopPropagation(); setEditingKey(taskEditKey); }}
                                                className="opacity-0 group-hover/task:opacity-100 p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-400 transition-all"
                                                title="修改任務名稱"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/details/TASK/${task.id}`); }}
                                                className="opacity-0 group-hover/task:opacity-100 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 rounded-lg font-bold hover:bg-indigo-100 transition-all"
                                              >
                                                詳細維護
                                              </button>
                                            </div>
                                          )}

                                          {/* Editable Data Columns */}
                                          <div className="hidden lg:flex items-center shrink-0 text-[10px] divide-x divide-gray-100">
                                            {/* Planned */}
                                            <div className="flex flex-col px-3 items-center justify-center min-w-[120px]">
                                              <span className="text-[9px] text-gray-400 font-bold mb-0.5">規劃 ({calcWorkingDays(task.plannedStartDate, task.plannedEndDate)} 天)</span>
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="date"
                                                  value={task.plannedStartDate || ''}
                                                  onChange={e => onUpdateTask?.(task.id, { plannedStartDate: e.target.value })}
                                                  className="w-[85px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-gray-600 outline-none focus:border-indigo-400"
                                                />
                                                <span className="text-gray-300">-</span>
                                                <input
                                                  type="date"
                                                  value={task.plannedEndDate || ''}
                                                  onChange={e => onUpdateTask?.(task.id, { plannedEndDate: e.target.value })}
                                                  className="w-[85px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-gray-600 outline-none focus:border-indigo-400"
                                                />
                                              </div>
                                            </div>

                                            {/* Actual */}
                                            <div className="flex flex-col px-3 items-center justify-center min-w-[120px]">
                                              <span className="text-[9px] text-gray-400 font-bold mb-0.5">實際 ({calcWorkingDays(task.actualStartDate, task.actualEndDate)} 天)</span>
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="date"
                                                  value={task.actualStartDate || ''}
                                                  onChange={e => onUpdateTask?.(task.id, { actualStartDate: e.target.value })}
                                                  className="w-[85px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-gray-600 outline-none focus:border-indigo-400"
                                                />
                                                <span className="text-gray-300">-</span>
                                                <input
                                                  type="date"
                                                  value={task.actualEndDate || ''}
                                                  onChange={e => onUpdateTask?.(task.id, { actualEndDate: e.target.value })}
                                                  className="w-[85px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-gray-600 outline-none focus:border-indigo-400"
                                                />
                                              </div>
                                            </div>

                                            {/* Assignee */}
                                            <div className="px-3 min-w-[90px] flex justify-center">
                                              <select
                                                value={task.assigneeId || ''}
                                                onChange={e => onUpdateTask?.(task.id, { assigneeId: e.target.value ? parseInt(e.target.value) : undefined })}
                                                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-gray-700 w-full"
                                              >
                                                <option value="">未指派</option>
                                                {users.map(u => (
                                                  <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* Status */}
                                            <div className="px-3 min-w-[90px] flex justify-center">
                                              <select
                                                value={task.status || '待辦'}
                                                onChange={e => onUpdateTask?.(task.id, { status: e.target.value })}
                                                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-gray-700 font-bold w-full"
                                              >
                                                {Object.keys(statusConfig).map(st => (
                                                  <option key={st} value={st}>{st}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div className="pl-3">
                                              <NodeTypeTag type="task" />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}

                                {phaseTasks.length === 0 && !snapshot.isDraggingOver && (
                                  <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-gray-300 italic">
                                    <ArrowRightLeft className="w-3 h-3" /> 可拖曳任務至此
                                  </div>
                                )}

                                {/* Gate nodes */}
                                <div className="space-y-0.5 pt-0.5">
                                  {phaseGates.map(gate => {
                                    const statusCfg = gate.gateStatus
                                      ? gateStatusConfig[gate.gateStatus] ?? gateStatusConfig.PENDING
                                      : gateStatusConfig.PENDING;
                                    return (
                                      <div key={gate.id} className="flex items-center gap-3 px-4 py-1.5 ml-4 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 group/gate">
                                        <div className="h-5 w-5 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                                          <ShieldCheck className="w-3 h-3 text-amber-700" />
                                        </div>
                                        <span className="text-xs font-black text-amber-900 flex-1">
                                          Gate → {gate.phaseName}
                                        </span>
                                        <NodeTypeTag type="gate" />
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusCfg.color}`}>
                                          {statusCfg.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {visibleProjects.length === 0 && (
          <div className="p-16 text-center text-gray-300">
            <FolderOpen className="w-12 h-12 mx-auto mb-3" />
            <p className="font-bold text-gray-400">尚無專案資料</p>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
