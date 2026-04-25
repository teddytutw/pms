import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, GitBranch, Paperclip, MapPin, Download, Trash2, Plus, CheckCircle } from 'lucide-react';
import Select from 'react-select';

interface Props {
  deliverableId: number;
  onClose: () => void;
  allWorkflows: WFDef[];
  allTypes: DelType[];
}
interface WFDef { id: number; name: string; steps: WFStep[]; }
interface WFStep { id: number; stepName: string; stepOrder: number; }
interface DelType { id: number; name: string; }
interface TypeField { id: number; fieldName: string; fieldType: string; fieldOptions: string; }
interface DWF {
  id: number;
  workflowId: number;
  workflowName: string;
  currentStepId: number | null;
  steps: WFStep[];
  log: LogEntry[];
}
interface LogEntry { id: number; stepId: number; action: string; actionAt: string; comments: string; }
interface WhereUsed { id: number; targetType: string; targetId: string; activityName?: string; rootProjectId?: number; rootProjectName?: string; }
interface Attachment { id: number; originalFileName: string; fileSize: number; }

const BASE = (import.meta as any).env.BASE_URL;
const labelCls = "block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1";
const inputCls = "w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium";

const TABS = [
  { id: 'details',   label: 'Details',    icon: FileText  },
  { id: 'workflow',  label: 'Workflow',   icon: GitBranch },
  { id: 'files',     label: 'Files',      icon: Paperclip },
  { id: 'whereused', label: 'Where Used', icon: MapPin    },
];

export default function DeliverableModal({ deliverableId, onClose, allWorkflows, allTypes }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');

  // Details
  const [form, setForm] = useState({ name: '', description: '', typeId: null as number | null });
  const [typeFields, setTypeFields] = useState<TypeField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Workflow
  const [dwfList, setDwfList] = useState<DWF[]>([]);
  const [selectedWfId, setSelectedWfId] = useState<number | null>(null);

  // Files
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Where Used
  const [whereUsed, setWhereUsed] = useState<WhereUsed[]>([]);

  useEffect(() => { fetchAll(); }, [deliverableId]);

  useEffect(() => {
    if (form.typeId) fetchTypeFields(form.typeId);
    else setTypeFields([]);
  }, [form.typeId]);

  const fetchAll = async () => {
    const [delRes, dwfRes, attRes, wuRes] = await Promise.all([
      fetch(BASE + `api/deliverables/${deliverableId}`),
      fetch(BASE + `api/deliverables/${deliverableId}/workflows`),
      fetch(BASE + `api/attachments?targetType=DELIVERABLE&targetId=${deliverableId}`),
      fetch(BASE + `api/deliverables/${deliverableId}/where-used`),
    ]);
    if (delRes.ok) {
      const d = await delRes.json();
      setForm({ name: d.name || '', description: d.description || '', typeId: d.typeId || null });
      const fvMap: Record<number, string> = {};
      (d.fieldValues || []).forEach((fv: any) => { fvMap[fv.fieldDefId] = fv.fieldValue || ''; });
      setFieldValues(fvMap);
    }
    if (dwfRes.ok) setDwfList(await dwfRes.json());
    if (attRes.ok) setAttachments(await attRes.json());
    if (wuRes.ok) setWhereUsed(await wuRes.json());
  };

  const fetchTypeFields = async (typeId: number) => {
    const res = await fetch(BASE + `api/deliverable-types/${typeId}/fields`);
    if (res.ok) setTypeFields(await res.json());
  };

  const refreshWorkflows = async () => {
    const res = await fetch(BASE + `api/deliverables/${deliverableId}/workflows`);
    if (res.ok) setDwfList(await res.json());
  };

  const handleSave = async () => {
    setSaving(true);
    const fvList = typeFields.map(f => ({ fieldDefId: f.id, fieldValue: fieldValues[f.id] || '' }));
    await fetch(BASE + `api/deliverables/${deliverableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, fieldValues: fvList }),
    });
    setSaving(false);
  };

  const handleTypeChange = (typeId: number | null) => {
    setForm(f => ({ ...f, typeId }));
    setFieldValues({});
    setTypeFields([]);
  };

  const handleAddWorkflow = async () => {
    if (!selectedWfId) return;
    const userJson = localStorage.getItem('currentUser');
    const actionBy = userJson ? JSON.parse(userJson).id : null;
    await fetch(BASE + `api/deliverables/${deliverableId}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: selectedWfId, actionBy }),
    });
    setSelectedWfId(null);
    await refreshWorkflows();
  };

  const handleRemoveWorkflow = async (dwId: number) => {
    if (!confirm('Remove this workflow from the deliverable?')) return;
    await fetch(BASE + `api/deliverables/workflows/${dwId}`, { method: 'DELETE' });
    setDwfList(dwfList.filter(dw => dw.id !== dwId));
  };

  const handleAdvance = async (dwId: number, action: string) => {
    const userJson = localStorage.getItem('currentUser');
    const actionBy = userJson ? JSON.parse(userJson).id : null;
    await fetch(BASE + `api/deliverables/workflows/${dwId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, actionBy }),
    });
    await refreshWorkflows();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('targetType', 'DELIVERABLE');
    formData.append('targetId', String(deliverableId));
    const userJson = localStorage.getItem('currentUser');
    if (userJson) formData.append('uploaderId', JSON.parse(userJson).id);
    const res = await fetch(BASE + 'api/attachments', { method: 'POST', body: formData });
    if (res.ok) {
      const newAtt = await res.json();
      setAttachments(prev => [newAtt, ...prev]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (attId: number) => {
    if (!confirm('Delete file?')) return;
    const res = await fetch(BASE + `api/attachments/${attId}`, { method: 'DELETE' });
    if (res.ok) setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const handleGoToWBS = (item: WhereUsed) => {
    onClose();
    navigate(`/dashboard?projectId=${item.rootProjectId}`);
  };

  const typeOptions = allTypes.map(t => ({ value: t.id, label: t.name }));
  const wfOptions = allWorkflows
    .filter(wf => !dwfList.find(dw => dw.workflowId === wf.id))
    .map(wf => ({ value: wf.id, label: wf.name }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-black text-slate-800 text-sm truncate">{form.name || 'Deliverable'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-tighter transition-all border-b-2 ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Details ── */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <Select
                  options={typeOptions}
                  value={typeOptions.find(o => o.value === form.typeId) || null}
                  onChange={o => handleTypeChange(o ? o.value : null)}
                  isClearable placeholder="Select type..."
                  styles={{ control: b => ({ ...b, minHeight: '32px', fontSize: '11px' }) }}
                  menuPosition="fixed"
                />
              </div>

              {typeFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <p className={labelCls}>Custom Fields</p>
                  {typeFields.map(field => (
                    <div key={field.id}>
                      <label className={labelCls}>{field.fieldName}</label>
                      {field.fieldType === 'SELECT' ? (
                        <select
                          value={fieldValues[field.id] || ''}
                          onChange={e => setFieldValues(fv => ({ ...fv, [field.id]: e.target.value }))}
                          className={inputCls}>
                          <option value="">—</option>
                          {(() => { try { return JSON.parse(field.fieldOptions || '[]'); } catch { return []; } })()
                            .map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.fieldType === 'DATE' ? 'date' : field.fieldType === 'NUMBER' ? 'number' : 'text'}
                          value={fieldValues[field.id] || ''}
                          onChange={e => setFieldValues(fv => ({ ...fv, [field.id]: e.target.value }))}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'SAVE'}
                </button>
              </div>
            </div>
          )}

          {/* ── Workflow ── */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {/* Attach workflow */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select
                    options={wfOptions}
                    value={wfOptions.find(o => o.value === selectedWfId) || null}
                    onChange={o => setSelectedWfId(o ? o.value : null)}
                    placeholder="Attach a workflow…"
                    styles={{ control: b => ({ ...b, minHeight: '32px', fontSize: '11px' }) }}
                    menuPosition="fixed"
                  />
                </div>
                <button onClick={handleAddWorkflow} disabled={!selectedWfId}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black hover:bg-indigo-700 disabled:opacity-40 shrink-0">
                  <Plus className="w-3 h-3" /> Attach
                </button>
              </div>

              {dwfList.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-6">No workflows attached.</p>
              )}

              {dwfList.map(dw => {
                const currentIdx = dw.steps.findIndex(s => s.id === dw.currentStepId);
                const isStepDone = (s: WFStep) =>
                  dw.currentStepId === null || s.stepOrder < (dw.steps[currentIdx]?.stepOrder ?? Infinity);

                return (
                  <div key={dw.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">{dw.workflowName}</span>
                      <button onClick={() => handleRemoveWorkflow(dw.id)} className="text-red-300 hover:text-red-500 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress bubbles + connector lines */}
                    <div className="flex items-center">
                      {dw.steps.map((s, i) => (
                        <React.Fragment key={s.id}>
                          <div title={s.stepName}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0
                              ${dw.currentStepId === null ? 'bg-green-500 text-white' :
                                isStepDone(s) ? 'bg-indigo-600 text-white' :
                                s.id === dw.currentStepId ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-400' :
                                'bg-slate-100 text-slate-400'}`}>
                            {i + 1}
                          </div>
                          {i < dw.steps.length - 1 && (
                            <div className="flex-1 h-0.5 bg-slate-200 min-w-1" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Step name labels */}
                    <div className="flex gap-1 flex-wrap">
                      {dw.steps.map(s => (
                        <span key={s.id}
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded
                            ${s.id === dw.currentStepId ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                          {s.stepName}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    {dw.currentStepId === null ? (
                      <div className="flex items-center gap-1 text-green-600 text-[10px] font-black">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleAdvance(dw.id, 'APPROVE')}
                          className="px-3 py-1 bg-green-500 text-white rounded text-[9px] font-black hover:bg-green-600">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleAdvance(dw.id, 'REJECT')}
                          className="px-3 py-1 bg-red-400 text-white rounded text-[9px] font-black hover:bg-red-500">
                          ✗ Reject
                        </button>
                      </div>
                    )}

                    {/* Audit log */}
                    {dw.log && dw.log.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <p className={labelCls}>History</p>
                        {dw.log.slice(0, 5).map(l => (
                          <div key={l.id} className="flex items-center gap-2 text-[9px] text-slate-400">
                            <span className={`font-black ${l.action === 'APPROVE' ? 'text-green-500' : l.action === 'REJECT' ? 'text-red-400' : 'text-indigo-400'}`}>
                              {l.action}
                            </span>
                            <span>{new Date(l.actionAt).toLocaleDateString()}</span>
                            {l.comments && <span className="italic truncate">{l.comments}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Files ── */}
          {activeTab === 'files' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={labelCls}>{attachments.length} Files</span>
                <button onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 text-[9px] font-black uppercase">Upload +</button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              {attachments.map(att => (
                <div key={att.id} className="flex items-center justify-between p-2 border border-slate-50 rounded bg-slate-50/50 group">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-700 truncate">{att.originalFileName}</p>
                    <p className="text-[8px] text-slate-400">{(att.fileSize / 1024).toFixed(1)} K</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => window.open(BASE + `api/attachments/${att.id}/download`, '_blank')}
                      className="p-1 text-indigo-400"><Download className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {attachments.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-4">No files uploaded.</p>
              )}
            </div>
          )}

          {/* ── Where Used ── */}
          {activeTab === 'whereused' && (
            <div>
              {whereUsed.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-6">Not linked to any activity.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase">Type</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase">Activity</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase">Root Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whereUsed.map(item => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-indigo-50">
                        <td className="px-3 py-2 text-[9px] font-black text-slate-500">{item.targetType}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleGoToWBS(item)}
                            className="text-indigo-600 text-xs font-bold underline hover:text-indigo-800">
                            {item.activityName || `${item.targetType} #${item.targetId}`}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          {item.rootProjectName
                            ? <button onClick={() => handleGoToWBS(item)}
                                className="text-indigo-600 text-xs font-bold underline hover:text-indigo-800">
                                {item.rootProjectName}
                              </button>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
