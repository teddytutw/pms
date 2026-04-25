import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Users, Paperclip, Download, Trash2, Package, UserPlus, Image, X
} from 'lucide-react';
import Select from 'react-select';
import DeliverableModal from './DeliverableModal';

interface TaskDetailViewProps {
  targetType: 'PROJECT' | 'PHASE' | 'TASK' | null;
  targetId: string | number | null;
  onUpdateSuccess?: () => void;
  allUsers: User[];
  allRoles: Role[];
  refreshKey?: number;
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

export default function TaskDetailView({ targetType, targetId, onUpdateSuccess, allUsers, allRoles, refreshKey }: TaskDetailViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);

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
  const [projectPhases, setProjectPhases] = useState<string[]>([]);

  // Teams tab state
  interface TeamMember { id: number; userId: number; userName: string; responsibility: string; }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeamUserId, setNewTeamUserId] = useState<number | null>(null);
  const [newTeamRole, setNewTeamRole] = useState<'Owner' | 'Member'>('Member');
  const [autoAssigning, setAutoAssigning] = useState(false);

  // Deliverables tab state
  const [activityDeliverables, setActivityDeliverables] = useState<any[]>([]);
  const [deliverableNames, setDeliverableNames] = useState<Record<number, string>>({});
  const [allWorkflows, setAllWorkflows] = useState<any[]>([]);
  const [allDelTypes, setAllDelTypes] = useState<any[]>([]);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<number | null>(null);
  const [showDelModal, setShowDelModal] = useState(false);
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<any[]>([]);

  const plannedDuration = calcWorkingDays(form.plannedStartDate, form.plannedEndDate);
  const actualDuration = calcWorkingDays(form.actualStartDate, form.actualEndDate);

  useEffect(() => {
    if (targetType && targetId) {
      fetchData();
    } else {
      resetForm();
    }
  }, [targetType, targetId, refreshKey]);

  const resetForm = () => {
    setForm({
      activityId: '', activityType: '', activityName: '', ownerId: '',
      responsibleRoles: [], plannedStartDate: '', plannedEndDate: '',
      actualStartDate: '', actualEndDate: '', description: '',
      budget: '', status: '', currentPhase: '', projectYear: '',
    });
    setAttachments([]);
    setCoverImagePath(null);
    setRoleMembers({ BPM: '', MIPM: '', SQE: '', ENG: '', PUR: '', DQA: '', ERD: '' });
    setActivityDeliverables([]);
    setDeliverableNames({});
    setShowLinkSearch(false);
    setLinkSearch('');
    setLinkResults([]);
    setTeamMembers([]);
    setNewTeamUserId(null);
    setNewTeamRole('Member');
    setProjectPhases([]);
  };

  const fetchData = async () => {
    try {
      const BASE = (import.meta as any).env.BASE_URL;
      // Fetch attachments + deliverable metadata in parallel
      const [, adRes, wfRes, dtRes, teamRes] = await Promise.all([
        fetch(BASE + `api/attachments?targetType=${targetType}&targetId=${targetId}`).then(r => r.json()).then(setAttachments),
        fetch(BASE + `api/activity-deliverables?targetType=${targetType}&targetId=${targetId}`),
        fetch(BASE + 'api/workflows'),
        fetch(BASE + 'api/deliverable-types'),
        fetch(BASE + `api/activity-teams?targetType=${targetType}&targetId=${targetId}`),
      ]);
      if (teamRes.ok) setTeamMembers(await teamRes.json());
      if (adRes.ok) {
        const ads = await adRes.json();
        setActivityDeliverables(ads);
        if (ads.length > 0) {
          const nameMap: Record<number, string> = {};
          await Promise.all(ads.map(async (ad: any) => {
            const r = await fetch(BASE + `api/deliverables/${ad.deliverableId}`);
            if (r.ok) { const d = await r.json(); nameMap[ad.deliverableId] = d.name; }
          }));
          setDeliverableNames(nameMap);
        } else {
          setDeliverableNames({});
        }
      }
      if (wfRes.ok) setAllWorkflows(await wfRes.json());
      if (dtRes.ok) setAllDelTypes(await dtRes.json());

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
          setCoverImagePath(d.coverImagePath || null);
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
          if (d.projectId) {
            const pr = await fetch((import.meta as any).env.BASE_URL + `api/phases/project/${d.projectId}`);
            if (pr.ok) {
              const phData = await pr.json();
              setProjectPhases(phData.map((p: any) => p.phaseName).filter(Boolean));
            }
          }
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !targetId) return;
    setCoverUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await fetch(BASE_URL + `api/projects/${targetId}/cover`, { method: 'POST', body: formData });
    if (res.ok) {
      const updated = await res.json();
      setCoverImagePath(updated.coverImagePath || null);
    } else {
      alert('封面圖片上傳失敗');
    }
    setCoverUploading(false);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleDeleteCover = async () => {
    if (!confirm('確定移除封面圖片？') || !targetId) return;
    const res = await fetch(BASE_URL + `api/projects/${targetId}/cover`, { method: 'DELETE' });
    if (res.ok) setCoverImagePath(null);
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

  const BASE_URL = (import.meta as any).env.BASE_URL;

  const handleCreateDeliverable = async () => {
    try {
      const userJson = localStorage.getItem('currentUser');
      const userId = userJson ? JSON.parse(userJson).id : null;
      const res = await fetch(BASE_URL + 'api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Deliverable', createdBy: userId }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('POST /api/deliverables failed:', res.status, errText);
        alert(`建立 Deliverable 失敗 (${res.status}): ${errText}`);
        return;
      }
      const d = await res.json();
      const adRes = await fetch(BASE_URL + 'api/activity-deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId: String(targetId), deliverableId: d.id }),
      });
      if (!adRes.ok) {
        const errText = await adRes.text();
        console.error('POST /api/activity-deliverables failed:', adRes.status, errText);
        alert(`連結 Activity Deliverable 失敗 (${adRes.status}): ${errText}`);
        return;
      }
      setSelectedDeliverableId(d.id);
      setShowDelModal(true);
      fetchData();
    } catch (e) {
      console.error('handleCreateDeliverable error:', e);
      alert(`錯誤: ${e}`);
    }
  };

  const handleSearchDeliverables = async (kw: string) => {
    if (!kw.trim()) { setLinkResults([]); return; }
    const res = await fetch(BASE_URL + `api/deliverables?keyword=${encodeURIComponent(kw)}`);
    if (res.ok) setLinkResults(await res.json());
  };

  const handleLinkDeliverable = async (deliverableId: number) => {
    await fetch(BASE_URL + 'api/activity-deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetId: String(targetId), deliverableId }),
    });
    setShowLinkSearch(false);
    setLinkSearch('');
    setLinkResults([]);
    fetchData();
  };

  const handleUnlinkDeliverable = async (adId: number) => {
    if (!confirm('Remove this deliverable link?')) return;
    await fetch(BASE_URL + `api/activity-deliverables/${adId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddTeamMember = async () => {
    if (!newTeamUserId) return;
    const res = await fetch(BASE_URL + 'api/activity-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetId: String(targetId), userId: newTeamUserId, responsibility: newTeamRole }),
    });
    if (res.ok) {
      setNewTeamUserId(null);
      setNewTeamRole('Member');
      const fresh = await fetch(BASE_URL + `api/activity-teams?targetType=${targetType}&targetId=${targetId}`);
      if (fresh.ok) setTeamMembers(await fresh.json());
    } else {
      const txt = await res.text();
      alert(txt || '新增失敗');
    }
  };

  const handleRemoveTeamMember = async (id: number) => {
    await fetch(BASE_URL + `api/activity-teams/${id}`, { method: 'DELETE' });
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleAutoAssign = async () => {
    if (!targetId) return;
    setAutoAssigning(true);
    try {
      const res = await fetch(BASE_URL + `api/activity-teams/auto-assign?projectId=${targetId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`已指派 ${data.assigned} 筆成員至各 activities`);
      } else {
        alert('Auto assign 失敗');
      }
    } finally {
      setAutoAssigning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden border-l border-gray-100 font-sans">
      <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 shrink-0">
        {[
          { id: 'details', label: 'Details', icon: FileText },
          ...(targetType === 'PROJECT' ? [{ id: 'team', label: '專案維護', icon: Users }] : []),
          { id: 'attachments', label: 'Files', icon: Paperclip },
          { id: 'deliverables', label: 'Deliverables', icon: Package },
          { id: 'teams', label: 'Teams', icon: UserPlus }
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
               <div className="flex flex-col">
                 <label className={labelCls}>ID</label>
                 <div className="text-[9px] font-mono text-slate-400">#{targetId}</div>
               </div>
             </div>

             {/* Cover image — PROJECT only */}
             {targetType === 'PROJECT' && (
               <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="relative shrink-0">
                   {coverImagePath ? (
                     <img
                       src={BASE_URL + `api/projects/${targetId}/cover`}
                       alt="cover"
                       onClick={() => setShowCoverLightbox(true)}
                       className="w-16 h-16 rounded-xl object-cover border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                     />
                   ) : (
                     <div className="w-16 h-16 rounded-xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-300">
                       <Image className="w-5 h-5" />
                     </div>
                   )}
                   {coverImagePath && (
                     <button
                       onClick={handleDeleteCover}
                       className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow"
                     >
                       <X className="w-2.5 h-2.5" />
                     </button>
                   )}
                 </div>
                 <div className="flex flex-col gap-1.5 min-w-0">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">封面圖片</span>
                   <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                   <button
                     onClick={() => coverInputRef.current?.click()}
                     disabled={coverUploading}
                     className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-all"
                   >
                     {coverUploading ? '上傳中...' : coverImagePath ? '更換' : '上傳圖片'}
                   </button>
                 </div>
               </div>
             )}

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
               <div className="grid grid-cols-2 gap-2">
                 <div><label className={labelCls}>Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}><option value="TODO">TODO</option><option value="PROG">PROG</option><option value="DONE">DONE</option><option value="OVR">OVR</option></select></div>
                 <div><label className={labelCls}>Phase</label>
                   <select value={form.currentPhase} onChange={e => setForm({...form, currentPhase: e.target.value})} className={inputCls}>
                     <option value="">— Common Tasks —</option>
                     {projectPhases.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                 </div>
               </div>
             )}
             {targetType === 'PROJECT' && (
                <><div><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={`${inputCls} resize-none`} /></div>
                <div><label className={labelCls}>Budget</label><input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className={inputCls} /></div></>
             )}
          </div>
        )}
        {activeTab === 'team' && targetType === 'PROJECT' && (
          <div className="space-y-3">
             <div className="flex justify-end">
               <button onClick={handleAutoAssign} disabled={autoAssigning}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black hover:bg-emerald-700 disabled:opacity-50 transition">
                 <UserPlus className="w-3 h-3" />
                 {autoAssigning ? 'Assigning…' : 'Auto assign to activities'}
               </button>
             </div>
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
        {activeTab === 'deliverables' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={handleCreateDeliverable}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-[9px] font-black hover:bg-indigo-700">
                + New
              </button>
              <button onClick={() => setShowLinkSearch(v => !v)}
                className="px-3 py-1 border border-indigo-300 text-indigo-600 rounded text-[9px] font-black hover:bg-indigo-50">
                + Link
              </button>
            </div>
            {showLinkSearch && (
              <div className="border border-indigo-200 rounded-lg p-2 bg-white space-y-1">
                <input
                  value={linkSearch}
                  onChange={e => { setLinkSearch(e.target.value); handleSearchDeliverables(e.target.value); }}
                  placeholder="Search deliverables…"
                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {linkResults.map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center text-xs p-1 hover:bg-indigo-50 rounded">
                    <span className="font-medium truncate">{d.name}</span>
                    <button onClick={() => handleLinkDeliverable(d.id)}
                      className="text-indigo-600 font-black text-[9px] ml-2 shrink-0">Link</button>
                  </div>
                ))}
                {linkResults.length === 0 && linkSearch && (
                  <p className="text-[9px] text-slate-400 text-center py-1">No results.</p>
                )}
              </div>
            )}
            <div className="space-y-1">
              {activityDeliverables.map((ad: any) => (
                <div key={ad.id}
                  className="flex items-center justify-between p-2 border border-slate-100 rounded-lg bg-slate-50/50 group hover:border-indigo-200">
                  <button
                    onClick={() => { setSelectedDeliverableId(ad.deliverableId); setShowDelModal(true); }}
                    className="text-[11px] font-bold text-indigo-700 hover:underline text-left truncate">
                    {deliverableNames[ad.deliverableId] || `Deliverable #${ad.deliverableId}`}
                  </button>
                  <button onClick={() => handleUnlinkDeliverable(ad.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {activityDeliverables.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-4">No deliverables linked.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-3">
            {/* Member table */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-[9px] font-black text-slate-400 uppercase">使用者姓名</th>
                  <th className="text-left py-2 px-2 text-[9px] font-black text-slate-400 uppercase">Responsibility</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {teamMembers.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-[10px] text-slate-400">尚無成員</td></tr>
                )}
                {teamMembers.map(m => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                    <td className="py-2 px-2 font-medium text-slate-700">{m.userName || `User #${m.userId}`}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${m.responsibility === 'Owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {m.responsibility}
                      </span>
                    </td>
                    <td className="py-2 text-right pr-1">
                      <button onClick={() => handleRemoveTeamMember(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add member row */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <div className="flex-1">
                <Select
                  options={allUsers.map(u => ({ value: u.id, label: u.name }))}
                  value={allUsers.map(u => ({ value: u.id, label: u.name })).find(o => o.value === newTeamUserId) || null}
                  onChange={o => setNewTeamUserId(o ? o.value : null)}
                  placeholder="選擇使用者…"
                  isClearable
                  styles={{ control: b => ({ ...b, minHeight: '28px', fontSize: '11px' }) }}
                  menuPosition="fixed"
                />
              </div>
              <select
                value={newTeamRole}
                onChange={e => setNewTeamRole(e.target.value as 'Owner' | 'Member')}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="Owner">Owner</option>
                <option value="Member">Member</option>
              </select>
              <button onClick={handleAddTeamMember} disabled={!newTeamUserId}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black hover:bg-indigo-700 disabled:opacity-40">
                新增
              </button>
            </div>
          </div>
        )}
      </div>

      {showDelModal && selectedDeliverableId && (
        <DeliverableModal
          deliverableId={selectedDeliverableId}
          onClose={() => { setShowDelModal(false); setSelectedDeliverableId(null); fetchData(); }}
          allWorkflows={allWorkflows}
          allTypes={allDelTypes}
        />
      )}

      {/* Cover image lightbox */}
      {showCoverLightbox && coverImagePath && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => setShowCoverLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all"
            onClick={() => setShowCoverLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={BASE_URL + `api/projects/${targetId}/cover`}
            alt="封面圖片"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
