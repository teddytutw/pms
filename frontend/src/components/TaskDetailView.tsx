import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Users, Paperclip, Download, Trash2 
} from 'lucide-react';
import Select from 'react-select';

interface TaskDetailViewProps {
  targetType: 'PROJECT' | 'PHASE' | 'TASK' | null;
  targetId: string | number | null;
  onUpdateSuccess?: () => void;
  allUsers: User[];
  allRoles: Role[];
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Role {
  id: number;
  roleName: string;
}

interface Attachment {
  id: number;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
}

const ROLE_KEYS = ['BPM', 'MIPM', 'SQE', 'ENG', 'PUR', 'DQA', 'ERD'] as const;
type RoleKey = typeof ROLE_KEYS[number];

const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => ({ value: String(2020 + i), label: String(2020 + i) }));

const calcWorkingDays = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let days = 0, cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const inputCls = "w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium";
const labelCls = "block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1";

export default function TaskDetailView({ targetType, targetId, onUpdateSuccess, allUsers, allRoles }: TaskDetailViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    activityId: '',
    activityType: '',
    activityName: '',
    ownerId: '' as string | number,
    responsibleRoles: [] as string[],
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    description: '',
    budget: '',
    status: '',
    currentPhase: '',
    projectYear: '',
  });

  const [roleMembers, setRoleMembers] = useState<Record<RoleKey, number | ''>>({
    BPM: '', MIPM: '', SQE: '', ENG: '', PUR: '', DQA: '', ERD: '',
  });

  const [phaseDbId, setPhaseDbId] = useState<number | null>(null);

  const plannedDuration = calcWorkingDays(form.plannedStartDate, form.plannedEndDate);
  const actualDuration = calcWorkingDays(form.actualStartDate, form.actualEndDate);

  useEffect(() => {
    if (targetType && targetId) {
      fetchData();
    } else {
      resetForm();
    }
  }, [targetType, targetId]);

  const resetForm = () => {
    setForm({
      activityId: '', activityType: '', activityName: '', ownerId: '',
      responsibleRoles: [], plannedStartDate: '', plannedEndDate: '',
      actualStartDate: '', actualEndDate: '', description: '',
      budget: '', status: '', currentPhase: '', projectYear: '',
    });
    setAttachments([]);
    setRoleMembers({ BPM: '', MIPM: '', SQE: '', ENG: '', PUR: '', DQA: '', ERD: '' });
  };

  const fetchData = async () => {
    try {
      await fetch((import.meta as any).env.BASE_URL + `api/attachments?targetType=${targetType}&targetId=${targetId}`).then(r => r.json()).then(setAttachments);

      if (targetType === 'PROJECT') {
        const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${targetId}`);
        if (res.ok) {
          const d = await res.json();
          setForm({
            activityId: String(d.id),
            activityType: 'PROJECT',
            activityName: d.name || '',
            ownerId: d.ownerId || '',
            responsibleRoles: d.responsibleRoles ? d.responsibleRoles.split(',').filter(Boolean) : [],
            plannedStartDate: d.plannedStartDate || '',
            plannedEndDate: d.plannedEndDate || '',
            actualStartDate: d.actualStartDate || '',
            actualEndDate: d.actualEndDate || '',
            description: d.description || '',
            budget: d.budget != null ? String(d.budget) : '',
            status: d.status || 'ACTIVE',
            currentPhase: d.currentPhase || '',
            projectYear: d.projectYear || '',
          });
          setRoleMembers({
            BPM:  d.bpmUserId  || '',
            MIPM: d.mipmUserId || '',
            SQE:  d.sqeUserId  || '',
            ENG:  d.engUserId  || '',
            PUR:  d.purUserId  || '',
            DQA:  d.dqaUserId  || '',
            ERD:  d.erdUserId  || '',
          });
        }
      } else if (targetType === 'PHASE') {
        let pid, pname;
        if (typeof targetId === 'string' && targetId.includes('-')) {
            const parts = targetId.split('-');
            pid = parts[0];
            pname = parts.slice(1).join('-');
        } else {
            const res = await fetch((import.meta as any).env.BASE_URL + `api/phases/${targetId}`);
            if (res.ok) {
                const d = await res.json();
                pid = d.projectId;
                pname = d.phaseName;
            }
        }
        if (pid && pname) {
            const res = await fetch((import.meta as any).env.BASE_URL + `api/phases/project/${pid}/name/${encodeURIComponent(pname)}`);
            if (res.ok) {
              const d = await res.json();
              setPhaseDbId(d.id);
              setForm(prev => ({
                ...prev,
                activityId: String(d.id),
                activityType: 'PHASE',
                activityName: pname,
                ownerId: d.ownerId || '',
                responsibleRoles: d.responsibleRoles ? d.responsibleRoles.split(',').filter(Boolean) : [],
                plannedStartDate: d.plannedStartDate || '',
                plannedEndDate: d.plannedEndDate || '',
                actualStartDate: d.actualStartDate || '',
                actualEndDate: d.actualEndDate || '',
                description: d.comments || '',
                status: d.gateStatus || '',
              }));
            }
        }
      } else if (targetType === 'TASK') {
        const res = await fetch((import.meta as any).env.BASE_URL + `api/tasks/${targetId}`);
        if (res.ok) {
          const d = await res.json();
          setForm({
            activityId: String(d.id),
            activityType: 'TASK',
            activityName: d.title || '',
            ownerId: d.ownerId || '',
            responsibleRoles: d.responsibleRoles ? d.responsibleRoles.split(',').filter(Boolean) : [],
            plannedStartDate: d.plannedStartDate || '',
            plannedEndDate: d.plannedEndDate || '',
            actualStartDate: d.actualStartDate || '',
            actualEndDate: d.actualEndDate || '',
            description: '',
            budget: '',
            status: d.status || '',
            currentPhase: d.phase || '',
            projectYear: '',
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const rolesStr = form.responsibleRoles.join(',');
      const dur = String(plannedDuration);
      const aDur = String(actualDuration);

      if (targetType === 'PROJECT') {
        const body = {
          name: form.activityName,
          description: form.description,
          ownerId: form.ownerId || null,
          responsibleRoles: rolesStr,
          plannedStartDate: form.plannedStartDate || null,
          plannedEndDate: form.plannedEndDate || null,
          plannedDuration: dur,
          actualStartDate: form.actualStartDate || null,
          actualEndDate: form.actualEndDate || null,
          actualDuration: aDur,
          budget: form.budget ? parseFloat(form.budget) : null,
          status: form.status || 'ACTIVE',
          currentPhase: form.currentPhase,
          projectYear: form.projectYear,
          bpmUserId:  roleMembers.BPM  || null,
          mipmUserId: roleMembers.MIPM || null,
          sqeUserId:  roleMembers.SQE  || null,
          engUserId:  roleMembers.ENG  || null,
          purUserId:  roleMembers.PUR  || null,
          dqaUserId:  roleMembers.DQA  || null,
          erdUserId:  roleMembers.ERD  || null,
        };
        await fetch((import.meta as any).env.BASE_URL + `api/projects/${targetId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else if (targetType === 'PHASE' && phaseDbId) {
        const body = {
          ownerId: form.ownerId || null,
          responsibleRoles: rolesStr,
          plannedStartDate: form.plannedStartDate || null,
          plannedEndDate: form.plannedEndDate || null,
          plannedDuration: dur,
          actualStartDate: form.actualStartDate || null,
          actualEndDate: form.actualEndDate || null,
          actualDuration: aDur,
          comments: form.description,
        };
        await fetch((import.meta as any).env.BASE_URL + `api/phases/${phaseDbId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else if (targetType === 'TASK') {
        const body = {
          title: form.activityName,
          ownerId: form.ownerId || null,
          responsibleRoles: rolesStr,
          plannedStartDate: form.plannedStartDate || null,
          plannedEndDate: form.plannedEndDate || null,
          plannedDuration: dur,
          actualStartDate: form.actualStartDate || null,
          actualEndDate: form.actualEndDate || null,
          actualDuration: aDur,
          status: form.status || null,
          phase: form.currentPhase || null,
        };
        await fetch((import.meta as any).env.BASE_URL + `api/tasks/${targetId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setSaveMsg('√');
      onUpdateSuccess?.();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg('X');
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('targetType', targetType || '');
    formData.append('targetId', String(targetId));
    const userJson = localStorage.getItem('currentUser');
    if (userJson) formData.append('uploaderId', JSON.parse(userJson).id);
    
    const res = await fetch((import.meta as any).env.BASE_URL + 'api/attachments', { method: 'POST', body: formData });
    if (res.ok) setAttachments([await res.json(), ...attachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!targetType) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-white">
        <FileText className="w-12 h-12 mb-4 opacity-10" />
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Select WBS item to view details</p>
      </div>
    );
  }

  const roleOptions = allRoles.map(r => ({ value: r.roleName, label: r.roleName }));

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden border-l border-gray-100 font-sans">
      <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 shrink-0">
        {[
          { id: 'details', label: 'Details', icon: FileText },
          ...(targetType === 'PROJECT' ? [{ id: 'team', label: 'Team', icon: Users }] : []),
          { id: 'attachments', label: 'Files', icon: Paperclip }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-tighter transition-all border-b-2 ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
           {saveMsg && <span className="text-[10px] font-black text-indigo-600">{saveMsg}</span>}
           <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-3 py-1 rounded text-[9px] font-black hover:bg-indigo-700 disabled:opacity-50">SAVE</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === 'details' && (
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-3">
               <div><label className={labelCls}>Type</label><div className="text-[9px] font-black px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase">{targetType}</div></div>
               <div><label className={labelCls}>ID</label><div className="text-[9px] font-mono text-slate-400">#{targetId}</div></div>
             </div>
             {targetType === 'PROJECT' && (
               <div><label className={labelCls}>Project Year</label>
                 <Select 
                   options={YEAR_OPTIONS} 
                   value={YEAR_OPTIONS.find(o => o.value === form.projectYear) || null} 
                   onChange={o => setForm({...form, projectYear: o ? o.value : ''})} 
                   isClearable 
                   placeholder="Select Year..." 
                   styles={{ control: b => ({ ...b, minHeight: '30px', fontSize: '11px' }) }} 
                   menuPosition="fixed" 
                 />
               </div>
             )}
             <div><label className={labelCls}>Name</label><input type="text" value={form.activityName} onChange={e => setForm({...form, activityName: e.target.value})} className={inputCls} /></div>
             <div><label className={labelCls}>Owner</label>
               <Select options={allUsers.map(u => ({ value: u.id, label: u.name }))} value={allUsers.map(u => ({ value: u.id, label: u.name })).find(o => o.value === Number(form.ownerId)) || null} onChange={o => setForm({ ...form, ownerId: o ? o.value : '' })} isClearable placeholder="-" styles={{ control: b => ({ ...b, minHeight: '30px', fontSize: '11px' }) }} menuPosition="fixed" /></div>
             <div><label className={labelCls}>Roles</label>
               {targetType === 'PROJECT' ? (
                  <Select isMulti options={roleOptions} value={roleOptions.filter(o => form.responsibleRoles.includes(o.value))} onChange={opts => setForm({ ...form, responsibleRoles: opts.map(o => o.value) })} placeholder="-" styles={{ control: b => ({ ...b, fontSize: '11px' }) }} menuPosition="fixed" />
               ) : (
                  <Select options={roleOptions} value={roleOptions.find(o => form.responsibleRoles.includes(o.value)) || null} onChange={o => setForm({ ...form, responsibleRoles: o ? [o.value] : [] })} isClearable placeholder="-" styles={{ control: b => ({ ...b, fontSize: '11px' }) }} menuPosition="fixed" />
                )}</div>
             <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                <div><label className={labelCls}>PL Start</label><input type="date" value={form.plannedStartDate} onChange={e => setForm({...form, plannedStartDate: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>PL End</label><input type="date" value={form.plannedEndDate} onChange={e => setForm({...form, plannedEndDate: e.target.value})} className={inputCls} /></div>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                <div><label className={labelCls}>ACT Start</label><input type="date" value={form.actualStartDate} onChange={e => setForm({...form, actualStartDate: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>ACT End</label><input type="date" value={form.actualEndDate} onChange={e => setForm({...form, actualEndDate: e.target.value})} className={inputCls} /></div>
             </div>
             {targetType === 'TASK' && (
                <div><label className={labelCls}>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}><option value="TODO">TODO</option><option value="PROG">PROG</option><option value="DONE">DONE</option><option value="OVR">OVR</option></select></div>
             )}
             {targetType === 'PROJECT' && (
                <><div><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={`${inputCls} resize-none`} /></div>
                <div><label className={labelCls}>Budget</label><input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className={inputCls} /></div></>
             )}
          </div>
        )}
        {activeTab === 'team' && targetType === 'PROJECT' && (
          <div className="space-y-3">
             {ROLE_KEYS.map(role => (
               <div key={role}><label className={labelCls}>{role}</label><Select options={[{ value: '', label: 'None' }, ...allUsers.map(u => ({ value: String(u.id), label: u.name }))]} value={roleMembers[role] ? { value: String(roleMembers[role]), label: allUsers.find(u => u.id === Number(roleMembers[role]))?.name || '' } : null} onChange={o => setRoleMembers(prev => ({ ...prev, [role]: o?.value ? Number(o.value) : '' }))} styles={{ control: b => ({ ...b, fontSize: '11px', minHeight: '30px' }) }} menuPosition="fixed" /></div>
             ))}
          </div>
        )}
        {activeTab === 'attachments' && (
          <div className="space-y-2">
             <div className="flex justify-between items-center"><span className={labelCls}>{attachments.length} Files</span><button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 text-[9px] font-black uppercase">Upload +</button></div>
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
             {attachments.map(att => (
               <div key={att.id} className="flex items-center justify-between p-2 border border-slate-50 rounded bg-slate-50/50 group">
                  <div className="min-w-0"><p className="text-[10px] font-bold text-slate-700 truncate">{att.originalFileName}</p><p className="text-[8px] text-slate-400">{(att.fileSize/1024).toFixed(1)}K</p></div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => window.open((import.meta as any).env.BASE_URL + `api/attachments/${att.id}/download`, '_blank')} className="p-1 text-indigo-400"><Download className="w-3 h-3" /></button><button onClick={async () => { if(confirm('Delete?')) { const res = await fetch((import.meta as any).env.BASE_URL+`api/attachments/${att.id}`, {method:'DELETE'}); if(res.ok) setAttachments(attachments.filter(a => a.id !== att.id)); } }} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button></div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
