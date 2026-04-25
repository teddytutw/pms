import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Paperclip, Users, FileText, Download, Trash2, Plus, Save, ShieldCheck, Zap,
  Image, Upload, X
} from 'lucide-react';
import Select from 'react-select';

// ─── Types ────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  username?: string;
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

// ─── Helpers ──────────────────────────────────────────────────

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

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";
const readonlyCls = "w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono cursor-not-allowed";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1";

// ─── Main Component ───────────────────────────────────────────
export default function EntityDetails() {
  const { targetType = '', targetId = '' } = useParams();
  const navigate = useNavigate();

  // Tabs: details | team | attachments (team only for PROJECT)
  const tabs = [
    { key: 'details', label: '基本資訊', icon: FileText },
    ...(targetType === 'PROJECT' ? [{ key: 'team', label: '專案成員', icon: Users }] : []),
    { key: 'attachments', label: '附件檔案', icon: Paperclip },
  ] as { key: string; label: string; icon: any }[];

  const [activeTab, setActiveTab] = useState('details');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);

  // ── Activity Form State ──────────────────────────────────────
  const [form, setForm] = useState({
    // read-only metadata
    activityId: '',
    activityType: '',
    activityName: '',
    // editable
    ownerId: '' as string | number,
    responsibleRoles: [] as string[],
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    // extra for PROJECT
    description: '',
    budget: '',
    status: '',
    currentPhase: '',
    isTemplate: false,
  });

  // Project members by role — fully dynamic, keyed by role name from /api/responsible-roles
  const [roleMembers, setRoleMembers] = useState<Record<string, number | ''>>({});


  // Parent project roles (for single-select in PHASE/TASK)
  const [parentProjectRoles, setParentProjectRoles] = useState<string[]>([]);

  // ── Phase tracking (for PHASE type) ─────────────────────────
  const [phaseDbId, setPhaseDbId] = useState<number | null>(null);

  // ── Derived durations ────────────────────────────────────────
  const plannedDuration = calcWorkingDays(form.plannedStartDate, form.plannedEndDate);
  const actualDuration = calcWorkingDays(form.actualStartDate, form.actualEndDate);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) { navigate('/login'); return; }
    setCurrentUser(JSON.parse(userJson));
    fetchAllUsers();
    fetchRoles();
    fetchEntityData();
    fetchAttachments();
  }, [targetType, targetId]);

  const fetchAllUsers = async () => {
    const res = await fetch((import.meta as any).env.BASE_URL + 'api/users');
    if (res.ok) setAllUsers(await res.json());
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + 'api/responsible-roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEntityData = async () => {
    try {
      const userJson = localStorage.getItem('currentUser');
      const loggedInUser = userJson ? JSON.parse(userJson) : null;
      const isSysAdmin = loggedInUser?.role === 'OWNER';

      if (targetId === 'new') {
        if (targetType === 'PROJECT') {
          setCanEdit(true);
          setForm({
            activityId: 'new',
            activityType: 'PROJECT',
            activityName: '',
            ownerId: loggedInUser?.id ?? '',
            responsibleRoles: [],
            plannedStartDate: '',
            plannedEndDate: '',
            actualStartDate: '',
            actualEndDate: '',
            description: '',
            budget: '',
            status: 'ACTIVE',
            currentPhase: '',
            isTemplate: false,
          });
        }
        return;
      }

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
            isTemplate: d.isTemplate || false,
          });
          setCoverImagePath(d.coverImagePath || null);
          // Load dynamic role assignments from the new endpoint
          const rmRes = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams/project-roles?projectId=${targetId}`);
          if (rmRes.ok) {
            const rmData: Record<string, number> = await rmRes.json();
            const mapped: Record<string, number | ''> = {};
            Object.entries(rmData).forEach(([role, uid]) => { mapped[role] = uid || ''; });
            setRoleMembers(mapped);
          }
          // 系統管理員可直接編輯；否則檢查是否為 project team Owner
          if (isSysAdmin) {
            setCanEdit(true);
          } else if (loggedInUser?.id) {
            const teamRes = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams?targetType=PROJECT&targetId=${targetId}`);
            if (teamRes.ok) {
              const members: any[] = await teamRes.json();
              setCanEdit(members.some(m => m.userId === loggedInUser.id && m.responsibility === 'Owner'));
            }
          }
        }
      } else if (targetType === 'PHASE') {
        // targetId = "projectId-phaseName"
        const dashIdx = targetId.indexOf('-');
        const projectId = targetId.substring(0, dashIdx);
        const phaseName = targetId.substring(dashIdx + 1);
        const res = await fetch(
          `/api/phases/project/${projectId}/name/${encodeURIComponent(phaseName)}`
        );
        if (res.ok) {
          const d = await res.json();
          setPhaseDbId(d.id);
          setForm({
            activityId: String(d.id),
            activityType: 'PHASE',
            activityName: phaseName,
            ownerId: d.ownerId || '',
            responsibleRoles: d.responsibleRoles ? d.responsibleRoles.split(',').filter(Boolean) : [],
            plannedStartDate: d.plannedStartDate || '',
            plannedEndDate: d.plannedEndDate || '',
            actualStartDate: d.actualStartDate || '',
            actualEndDate: d.actualEndDate || '',
            description: d.comments || '',
            budget: '',
            status: d.gateStatus || '',
            currentPhase: '',
            isTemplate: false,
          });

          // Fetch project roles to populate dropdown
          const pRes = await fetch((import.meta as any).env.BASE_URL + `api/projects/${projectId}`);
          if (pRes.ok) {
            const p = await pRes.json();
            setParentProjectRoles(p.responsibleRoles ? p.responsibleRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : []);
          }
          // 系統管理員可直接編輯；否則檢查是否為 project team Owner
          if (isSysAdmin) {
            setCanEdit(true);
          } else if (loggedInUser?.id) {
            const teamRes = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams?targetType=PROJECT&targetId=${projectId}`);
            if (teamRes.ok) {
              const members: any[] = await teamRes.json();
              setCanEdit(members.some(m => m.userId === loggedInUser.id && m.responsibility === 'Owner'));
            }
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
            isTemplate: false,
          });

          // Fetch project roles to populate dropdown
          const pRes = await fetch((import.meta as any).env.BASE_URL + `api/projects/${d.projectId}`);
          if (pRes.ok) {
            const p = await pRes.json();
            setParentProjectRoles(p.responsibleRoles ? p.responsibleRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : []);
          }
          // 系統管理員可直接編輯；否則檢查是否為 project team Owner
          if (isSysAdmin) {
            setCanEdit(true);
          } else if (loggedInUser?.id && d.projectId) {
            const teamRes = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams?targetType=PROJECT&targetId=${d.projectId}`);
            if (teamRes.ok) {
              const members: any[] = await teamRes.json();
              setCanEdit(members.some(m => m.userId === loggedInUser.id && m.responsibility === 'Owner'));
            }
          }
        }
      }
    } catch (e) {
      console.error('fetchEntityData error:', e);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/attachments?targetType=${targetType}&targetId=${targetId}`);
      if (res.ok) setAttachments(await res.json());
    } catch (e) { console.error(e); }
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    // 新建專案時 Owner 為必填
    if (targetType === 'PROJECT' && !form.ownerId) {
      setSaveMsg('✗ Owner（負責人）為必填欄位');
      return;
    }
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
          isTemplate: form.isTemplate,
        };
        const method = targetId === 'new' ? 'POST' : 'PUT';
        const url = targetId === 'new' 
          ? (import.meta as any).env.BASE_URL + `api/projects` 
          : (import.meta as any).env.BASE_URL + `api/projects/${targetId}`;
          
        const res = await fetch(url, {
          method: method, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const respData = await res.json();
          setSaveMsg('✓ 儲存成功');
          if (targetId === 'new') {
            navigate(`/details/PROJECT/${respData.id}`, { replace: true });
          }
        } else {
          setSaveMsg('✗ 儲存失敗');
        }
        // Also save dynamic role members via new endpoint
        const roleBody: Record<string, number | null> = {};
        Object.entries(roleMembers).forEach(([r, uid]) => { roleBody[r] = uid ? Number(uid) : null; });
        await fetch((import.meta as any).env.BASE_URL + `api/activity-teams/project-roles?projectId=${targetId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleBody),
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
      setSaveMsg('✓ 儲存成功');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg('✗ 儲存失敗');
      console.error(e);
    }
    setSaving(false);
  };

  // ── Auto Assign ─────────────────────────────────────────────
  const handleAutoAssign = () => {
    if (targetType !== 'PROJECT') return;
    setShowAutoAssignConfirm(true);
  };

  const confirmAutoAssign = async () => {
    setShowAutoAssignConfirm(false);
    setAutoAssigning(true);
    try {
      const res = await fetch(
        (import.meta as any).env.BASE_URL + `api/activity-teams/auto-assign?projectId=${targetId}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const data = await res.json();
        setSaveMsg(`✓ 已自動指派 ${data.assigned} 筆成員至 Activities`);
        setTimeout(() => setSaveMsg(''), 4000);
      } else {
        const errText = await res.text();
        console.error('Auto assign error:', errText);
        setSaveMsg('✗ 自動指派失敗');
      }
    } catch (e) {
      setSaveMsg('✗ 自動指派失敗');
      console.error(e);
    }
    setAutoAssigning(false);
  };

  // ── Cover Image ───────────────────────────────────────────────
  const BASE_URL = (import.meta as any).env.BASE_URL;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || targetId === 'new') return;
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
    if (!confirm('確定移除封面圖片？') || targetId === 'new') return;
    const res = await fetch(BASE_URL + `api/projects/${targetId}/cover`, { method: 'DELETE' });
    if (res.ok) setCoverImagePath(null);
  };

  // ── Upload/Delete Attachment ──────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('targetType', targetType);
    formData.append('targetId', targetId);
    if (currentUser) formData.append('uploaderId', String(currentUser.id));
    const res = await fetch((import.meta as any).env.BASE_URL + 'api/attachments', { method: 'POST', body: formData });
    if (res.ok) setAttachments([await res.json(), ...attachments]);
    else alert('上傳失敗');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!confirm('確定刪除此附件？')) return;
    const res = await fetch((import.meta as any).env.BASE_URL + `api/attachments/${id}`, { method: 'DELETE' });
    if (res.ok) setAttachments(attachments.filter(a => a.id !== id));
  };

  // ── Multi-select role options ─────────────────────────────────
  const roleOptions = roles.map(r => ({ value: r.roleName, label: r.roleName }));
  const selectedRoles = roleOptions.filter(o => form.responsibleRoles.includes(o.value));


  // ── Page title ────────────────────────────────────────────────
  const typeLabel: Record<string, string> = { PROJECT: '專案', PHASE: '階段', TASK: '任務' };
  const typeColor: Record<string, string> = {
    PROJECT: 'bg-indigo-100 text-indigo-700',
    PHASE:   'bg-violet-100 text-violet-700',
    TASK:    'bg-slate-100  text-slate-600',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          詳細維護介面
          <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${typeColor[targetType] || 'bg-gray-100 text-gray-600'}`}>
            {typeLabel[targetType] || targetType}
          </span>
          <span className="text-gray-400 text-sm font-normal truncate max-w-xs">
            {form.activityName || '載入中...'}
          </span>
        </h1>
        {/* Save button in header */}
        <div className="ml-auto flex items-center gap-3">
          {saveMsg && activeTab !== 'details' && (
            <span className={`text-sm font-bold ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {saveMsg}
            </span>
          )}
          {activeTab === 'team' && canEdit && (
            <>
              <button
                onClick={handleAutoAssign}
                disabled={autoAssigning || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm"
                title="依專案成員指派，自動將各角色人員加入對應 Activities 的 Teams（Responsibility = Owner）"
              >
                <Zap className="w-4 h-4" />
                {autoAssigning ? '指派中...' : 'Auto Assign to Activities'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? '儲存中...' : '儲存成員'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="bg-white border-b px-6 flex space-x-1 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
        {/* Role management shortcut */}
        <button
          onClick={() => navigate('/roles')}
          className="ml-auto flex items-center px-4 py-2 my-1.5 text-xs font-bold text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all self-center"
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          團隊角色維護
        </button>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 p-6 pb-48 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ═══ DETAILS TAB ═══ */}
          {activeTab === 'details' && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/60 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-black text-gray-800 text-base">Activity 基本資訊</h2>
                  {canEdit
                    ? <p className="text-xs text-gray-400 mt-0.5">修改後請按右方「Save」儲存變更</p>
                    : <p className="text-xs text-amber-500 font-bold mt-0.5">唯讀檢視 — 僅 Project Team 中 Owner 可編輯</p>
                  }
                </div>
                <div className="flex items-center gap-3">
                  {saveMsg && (
                    <span className={`text-sm font-bold ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                      {saveMsg}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Cover Image (PROJECT only) */}
                {targetType === 'PROJECT' && (
                  <div className="flex items-start gap-5 pb-5 border-b">
                    <div className="relative shrink-0">
                      {coverImagePath && targetId !== 'new' ? (
                        <img
                          src={BASE_URL + `api/projects/${targetId}/cover`}
                          alt="封面"
                          onClick={() => setShowCoverLightbox(true)}
                          className="w-28 h-28 rounded-2xl object-cover border border-gray-200 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-300">
                          <Image className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">無封面</span>
                        </div>
                      )}
                      {coverImagePath && canEdit && (
                        <button
                          onClick={handleDeleteCover}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md transition-all"
                          title="移除封面圖片"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">專案封面圖片</p>
                      {canEdit && <p className="text-xs text-gray-400">建議尺寸 400×400px，最大 5MB，支援 JPG / PNG / WebP</p>}
                      {canEdit && (
                        <>
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverUpload}
                          />
                          <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={coverUploading || targetId === 'new'}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-all w-fit"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {coverUploading ? '上傳中...' : coverImagePath ? '更換圖片' : '上傳圖片'}
                          </button>
                          {targetId === 'new' && (
                            <p className="text-[10px] text-amber-500 font-bold">請先儲存專案後再上傳封面圖片</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 1: ID + Type (read-only) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Activity ID</label>
                    <div className={readonlyCls}>{form.activityId || '—'}</div>
                  </div>
                  <div>
                    <label className={labelCls}>Activity Type</label>
                    <div className={`${readonlyCls} flex items-center gap-2`}>
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${typeColor[targetType] || ''}`}>
                        {form.activityType || targetType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Name */}
                <div>
                  <label className={labelCls}>Activity Name *</label>
                  <input
                    type="text"
                    value={form.activityName}
                    onChange={e => setForm({ ...form, activityName: e.target.value })}
                    disabled={targetType === 'PHASE' || !canEdit}
                    className={targetType === 'PHASE' || !canEdit ? readonlyCls : inputCls}
                    placeholder="輸入名稱..."
                  />
                </div>

                {/* Row 3: Owner */}
                <div>
                  <label className={labelCls}>
                    Owner (負責人){targetType === 'PROJECT' && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <Select
                    options={allUsers.map(u => ({ value: u.id, label: `${u.name}${u.email ? ` (${u.email})` : ''}` }))}
                    value={allUsers.map(u => ({ value: u.id, label: `${u.name}${u.email ? ` (${u.email})` : ''}` }))
                      .find(o => o.value === Number(form.ownerId)) || null}
                    onChange={o => setForm({ ...form, ownerId: o ? o.value : '' })}
                    isClearable
                    isDisabled={!canEdit}
                    placeholder="選擇負責人..."
                    styles={{ control: (b) => ({ ...b, borderColor: '#e5e7eb', minHeight: '38px', fontSize: '14px' }) }}
                    menuPosition="fixed"
                    menuPlacement="auto"
                  />
                </div>

                {/* Row 4: Responsible Roles */}
                <div>
                  <label className={labelCls}>
                    負責角色 {targetType === 'PROJECT' ? '(可複選)' : '(單選)'}
                  </label>
                  {targetType === 'PROJECT' ? (
                    <Select
                      isMulti
                      options={roleOptions}
                      value={selectedRoles}
                      onChange={opts => setForm({ ...form, responsibleRoles: opts.map(o => o.value) })}
                      isDisabled={!canEdit}
                      placeholder="選擇負責角色..."
                      styles={{ control: (b) => ({ ...b, borderColor: '#e5e7eb', fontSize: '14px' }) }}
                      menuPosition="fixed"
                      menuPlacement="auto"
                    />
                  ) : (
                    <Select
                      options={parentProjectRoles.map(r => ({ value: r, label: r }))}
                      value={form.responsibleRoles.length > 0 ? { value: form.responsibleRoles[0], label: form.responsibleRoles[0] } : null}
                      onChange={o => setForm({ ...form, responsibleRoles: o ? [o.value] : [] })}
                      isClearable
                      isDisabled={!canEdit}
                      placeholder="選擇負責角色..."
                      styles={{ control: (b) => ({ ...b, borderColor: '#e5e7eb', fontSize: '14px' }) }}
                      menuPosition="fixed"
                      menuPlacement="auto"
                    />
                  )}
                </div>

                {/* Row 5: Planned Start / End / Duration */}
                <div>
                  <p className="text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">規劃時間</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>開始日期</label>
                      <input type="date" value={form.plannedStartDate}
                        onChange={e => setForm({ ...form, plannedStartDate: e.target.value })}
                        disabled={!canEdit}
                        className={!canEdit ? readonlyCls : inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>結束日期</label>
                      <input type="date" value={form.plannedEndDate}
                        onChange={e => setForm({ ...form, plannedEndDate: e.target.value })}
                        disabled={!canEdit}
                        className={!canEdit ? readonlyCls : inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Duration (工作天)</label>
                      <div className={`${readonlyCls} text-center font-bold`}>
                        {plannedDuration > 0 ? `${plannedDuration} 天` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 6: Actual Start / End / Duration */}
                <div>
                  <p className="text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">實際時間</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>開始日期</label>
                      <input type="date" value={form.actualStartDate}
                        onChange={e => setForm({ ...form, actualStartDate: e.target.value })}
                        disabled={!canEdit}
                        className={!canEdit ? readonlyCls : inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>結束日期</label>
                      <input type="date" value={form.actualEndDate}
                        onChange={e => setForm({ ...form, actualEndDate: e.target.value })}
                        disabled={!canEdit}
                        className={!canEdit ? readonlyCls : inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Duration (工作天)</label>
                      <div className={`${readonlyCls} text-center font-bold`}>
                        {actualDuration > 0 ? `${actualDuration} 天` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extra for PROJECT only */}
                {targetType === 'PROJECT' && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <label className={labelCls}>專案描述</label>
                      <textarea value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        disabled={!canEdit}
                        rows={3} className={`${!canEdit ? readonlyCls : inputCls} resize-none`} placeholder="描述專案目標..." />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>狀態 (Status)</label>
                        <select value={form.status}
                          onChange={e => setForm({ ...form, status: e.target.value })}
                          disabled={!canEdit}
                          className={!canEdit ? readonlyCls : inputCls}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                          <option value="DELETED">DELETED</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>預算 (Budget)</label>
                        <input type="number" value={form.budget}
                          onChange={e => setForm({ ...form, budget: e.target.value })}
                          disabled={!canEdit}
                          className={!canEdit ? readonlyCls : inputCls} placeholder="0" />
                      </div>
                      <div>
                        <label className={labelCls}>Is template</label>
                        <select value={form.isTemplate ? 'Yes' : 'No'}
                          onChange={e => setForm({ ...form, isTemplate: e.target.value === 'Yes' })}
                          disabled={!canEdit}
                          className={!canEdit ? readonlyCls : inputCls}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extra for PHASE */}
                {targetType === 'PHASE' && (
                  <div className="border-t pt-4">
                    <label className={labelCls}>備注 (Comments)</label>
                    <textarea value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      disabled={!canEdit}
                      rows={3} className={`${!canEdit ? readonlyCls : inputCls} resize-none`} placeholder="階段備注..." />
                  </div>
                )}

                {/* Extra for TASK */}
                {targetType === 'TASK' && (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <label className={labelCls}>任務狀態</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={!canEdit} className={!canEdit ? readonlyCls : inputCls}>
                        <option value="待辦">待辦</option>
                        <option value="進行中">進行中</option>
                        <option value="已完成">已完成</option>
                        <option value="逾期">逾期</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>所屬 Phase</label>
                      <div className={readonlyCls}>{form.currentPhase || '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TEAM TAB (PROJECT only) ═══ */}
          {activeTab === 'team' && targetType === 'PROJECT' && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/60 border-b">
                <h2 className="font-black text-gray-800 text-base">專案成員指派</h2>
                <p className="text-xs text-gray-400 mt-0.5">依角色指派專案 Team Member，修改後請按右上角「儲存成員」</p>
              </div>
              <div className="p-6 space-y-4">
                {roles.length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <p className="font-bold text-sm text-gray-400">尚未定義任何角色</p>
                    <p className="text-xs mt-1">請先至「負責角色定義維護」新增角色</p>
                  </div>
                ) : (
                  roles.map(r => (
                    <div key={r.roleName} className="grid grid-cols-4 items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-center py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black truncate" title={r.roleName}>{r.roleName}</span>
                      </div>
                      <div className="col-span-3">
                        <Select
                          options={[{ value: '', label: '— 未指派 —' }, ...allUsers.map(u => ({ value: String(u.id), label: u.name }))]}
                          value={
                            roleMembers[r.roleName]
                              ? { value: String(roleMembers[r.roleName]), label: allUsers.find(u => u.id === Number(roleMembers[r.roleName]))?.name || '—' }
                              : { value: '', label: '— 未指派 —' }
                          }
                          onChange={o => setRoleMembers(prev => ({ ...prev, [r.roleName]: o?.value ? Number(o.value) : '' }))}
                          isDisabled={!canEdit}
                          placeholder="選擇成員..."
                          styles={{ control: (b) => ({ ...b, borderColor: '#e5e7eb', fontSize: '14px' }) }}
                          menuPosition="fixed"
                          menuPlacement="auto"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══ ATTACHMENTS TAB ═══ */}
          {activeTab === 'attachments' && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/60">
                <div>
                  <h2 className="font-black text-gray-800 text-base">附件與檔案</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{attachments.length} 個附件</p>
                </div>
                {canEdit && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 transition-all"
                    >
                      <Plus className="w-4 h-4" /> 上傳新檔案
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  </>
                )}
              </div>
              <div className="p-6">
                {attachments.length === 0 ? (
                  <div className="text-center py-16 text-gray-300 border-2 border-dashed rounded-xl">
                    <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm text-gray-400">目前尚無附件</p>
                    <p className="text-xs mt-1">點擊右上方按鈕上傳</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 group">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{att.originalFileName}</p>
                            <p className="text-[10px] text-gray-400">{(att.fileSize / 1024).toFixed(1)} KB · {new Date(att.uploadedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => window.open(`/api/attachments/${att.id}/download`, '_blank')}
                            className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg" title="下載">
                            <Download className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleDeleteAttachment(att.id)}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="刪除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Auto Assign Confirm Modal ── */}
      {showAutoAssignConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAutoAssignConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Auto Assign to Activities</h3>
                <p className="text-xs text-gray-400">確認執行自動指派</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              將依「專案成員指派」中各角色的人員，自動加入本專案所有 Activities 的 Teams 欄位，並設定 Responsibility 為 <strong>Owner</strong>。
              <br /><span className="text-gray-400 text-xs mt-1 block">※ 已加入者不會重複新增。</span>
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAutoAssignConfirm(false)}
                className="flex-1 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmAutoAssign}
                className="flex-1 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> 確認執行
              </button>
            </div>
          </div>
        </div>
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
