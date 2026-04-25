import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, Plus, Trash2, ChevronUp, ChevronDown, Save, Edit2 } from 'lucide-react';

interface WorkflowStep {
  id: number;
  workflowId: number;
  stepName: string;
  stepOrder: number;
  description?: string;
}

interface Workflow {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  steps: WorkflowStep[];
}

const BASE = (import.meta as any).env.BASE_URL;

export default function WorkflowManagement() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newStepName, setNewStepName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE + 'api/workflows');
      if (res.ok) { const data = await res.json(); setWorkflows(data); }
    } finally { setLoading(false); }
  };

  const selectWorkflow = (wf: Workflow) => {
    setSelected(wf);
    setEditName(wf.name);
    setEditDesc(wf.description || '');
    setSteps([...(wf.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder));
  };

  const handleCreate = async () => {
    const res = await fetch(BASE + 'api/workflows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Workflow', description: '' }),
    });
    if (res.ok) { await fetchWorkflows(); }
  };

  const handleSaveWorkflow = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(BASE + `api/workflows/${selected.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    setSaving(false);
    await fetchWorkflows();
    setSelected(prev => prev ? { ...prev, name: editName, description: editDesc } : null);
  };

  const handleDeleteWorkflow = async () => {
    if (!selected || !confirm(`刪除 Workflow "${selected.name}"？`)) return;
    await fetch(BASE + `api/workflows/${selected.id}`, { method: 'DELETE' });
    setSelected(null);
    setSteps([]);
    fetchWorkflows();
  };

  const handleAddStep = async () => {
    if (!selected || !newStepName.trim()) return;
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.stepOrder)) : 0;
    const res = await fetch(BASE + `api/workflows/${selected.id}/steps`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepName: newStepName.trim(), stepOrder: maxOrder + 1 }),
    });
    if (res.ok) {
      setNewStepName('');
      const updated = await fetch(BASE + 'api/workflows').then(r => r.json());
      setWorkflows(updated);
      const freshWf = updated.find((w: Workflow) => w.id === selected.id);
      if (freshWf) { setSteps([...freshWf.steps].sort((a, b) => a.stepOrder - b.stepOrder)); }
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    await fetch(BASE + `api/workflows/steps/${stepId}`, { method: 'DELETE' });
    setSteps(prev => prev.filter(s => s.id !== stepId));
    fetchWorkflows();
  };

  const handleMoveStep = async (idx: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;

    const a = { ...newSteps[idx] };
    const b = { ...newSteps[swapIdx] };
    const tempOrder = a.stepOrder;
    a.stepOrder = b.stepOrder;
    b.stepOrder = tempOrder;

    await Promise.all([
      fetch(BASE + `api/workflows/steps/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }),
      fetch(BASE + `api/workflows/steps/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }),
    ]);
    newSteps[idx] = b;
    newSteps[swapIdx] = a;
    setSteps([...newSteps].sort((x, y) => x.stepOrder - y.stepOrder));
    fetchWorkflows();
  };

  const handleStepNameChange = async (step: WorkflowStep, name: string) => {
    const updated = { ...step, stepName: name };
    setSteps(prev => prev.map(s => s.id === step.id ? updated : s));
    await fetch(BASE + `api/workflows/steps/${step.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
    });
    fetchWorkflows();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <GitBranch className="w-6 h-6 mr-2 text-indigo-600" />
        <h1 className="text-xl font-bold text-indigo-900">Workflow Management</h1>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel — Workflow List */}
        <div className="w-72 bg-white border-r flex flex-col shrink-0 shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Workflows</span>
            <button onClick={handleCreate} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">載入中...</div>
            ) : workflows.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">尚無 Workflow，點擊 New 建立</div>
            ) : (
              workflows.map(wf => (
                <button key={wf.id} onClick={() => selectWorkflow(wf)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-indigo-50 transition group ${selected?.id === wf.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                  <div className="font-bold text-slate-800 text-sm truncate">{wf.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{wf.steps?.length || 0} steps</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel — Workflow Editor */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Workflow Info Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-indigo-500" /> Workflow Info
                  </h2>
                  <button onClick={handleDeleteWorkflow} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none" />
                  </div>
                  <button onClick={handleSaveWorkflow} disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                    <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Steps Editor Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="font-black text-slate-800 text-lg">Approval Steps</h2>
                <div className="space-y-2">
                  {steps.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                      No steps yet. Add your first step below.
                    </div>
                  )}
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50 group">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        defaultValue={step.stepName}
                        onBlur={e => { if (e.target.value !== step.stepName) handleStepNameChange(step, e.target.value); }}
                        className="flex-1 px-2 py-1 text-sm border-b border-transparent hover:border-indigo-200 focus:border-indigo-400 focus:outline-none bg-transparent font-medium"
                      />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleMoveStep(idx, 'up')} disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMoveStep(idx, 'down')} disabled={idx === steps.length - 1}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteStep(step.id)} className="p-1 text-red-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Step */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <input value={newStepName} onChange={e => setNewStepName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                    placeholder="New step name (e.g. Review, Approved)..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                  <button onClick={handleAddStep} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1 transition">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300">
            <div className="text-center space-y-2">
              <GitBranch className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm font-bold">Select a Workflow to edit</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
