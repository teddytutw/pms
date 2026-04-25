import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Trash2, ArrowLeft, ShieldCheck, 
  Edit2, X, Check, KeyRound, AlertCircle, Upload, Search, Download, CheckCircle, ArrowUp, ArrowDown
} from 'lucide-react';
import Select from 'react-select';
import * as xlsx from 'xlsx';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  bu?: string;
  factory?: string;
  jobRole?: string;
  dept?: string;
  enabled?: boolean;
}

interface ActivityTeamMember {
  id: number;
  targetType: string;
  targetId: string;
  userId: number;
  responsibility: string;
  userName?: string;
}

interface Project {
  id: number;
  name: string;
  ownerId: number;
}

const emptyForm = { name: '', username: '', email: '', role: 'MEMBER', password: '', bu: '', factory: '', jobRole: '', dept: '', enabled: true };

export default function TeamManagement() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<ActivityTeamMember[]>([]);
  const [addUserId, setAddUserId] = useState<number | null>(null);
  const [addResponsibility, setAddResponsibility] = useState<'Owner' | 'Member'>('Member');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  // User CRUD states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'project'>('system');

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);

  // Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState<{status: 'success'|'error', msg: string}[] | null>(null);

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) { navigate('/login'); return; }
    setCurrentUser(JSON.parse(userJson));
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        fetch((import.meta as any).env.BASE_URL + 'api/projects'),
        fetch((import.meta as any).env.BASE_URL + 'api/users')
      ]);
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData);
        if (pData.length > 0) setSelectedProjectId(pData[0].id);
      }
      if (userRes.ok) setAllUsers(await userRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetch((import.meta as any).env.BASE_URL + `api/activity-teams?targetType=PROJECT&targetId=${selectedProjectId}`)
        .then(res => res.json())
        .then(setTeamMembers)
        .catch(console.error);
    }
  }, [selectedProjectId]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const isOwner = currentUser && (
    (currentProject && currentProject.ownerId === currentUser.id) ||
    teamMembers.some(m => m.userId === currentUser.id && m.responsibility === 'Owner')
  );

  const handleCreateUser = async () => {
    setFormError('');
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('姓名與電子郵件為必填欄位'); return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + 'api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newUser = await res.json();
        setAllUsers([...allUsers, newUser]);
        setIsCreating(false);
        setFormData(emptyForm);
      } else {
        const err = await res.json();
        setFormError(err.message || '建立失敗');
      }
    } catch { setFormError('無法連線至伺服器'); }
    setIsSubmitting(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        setAllUsers(allUsers.map(u => u.id === updated.id ? updated : u));
        const stored = localStorage.getItem('currentUser');
        if (stored && JSON.parse(stored).id === updated.id) {
          localStorage.setItem('currentUser', JSON.stringify(updated));
          setCurrentUser(updated);
        }
        setEditingUser(null);
        setFormData(emptyForm);
      } else {
        const err = await res.json();
        setFormError(err.message || '更新失敗');
      }
    } catch { setFormError('無法連線至伺服器'); }
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`確定要從系統中永久刪除使用者「${userName}」嗎？\n此操作無法復原！`)) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) setAllUsers(allUsers.filter(u => u.id !== userId));
    } catch (err) { console.error(err); }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ 
      name: user.name, 
      username: user.username || '', 
      email: user.email, 
      role: user.role, 
      password: '',
      bu: user.bu || '',
      factory: user.factory || '',
      jobRole: user.jobRole || '',
      dept: user.dept || '',
      enabled: user.enabled !== false
    });
    setFormError('');
    setIsCreating(false);
  };

  const cancelForm = () => {
    setEditingUser(null);
    setIsCreating(false);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleAddMember = async () => {
    if (!selectedProjectId || !addUserId) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'PROJECT',
          targetId: String(selectedProjectId),
          userId: addUserId,
          responsibility: addResponsibility
        })
      });
      if (res.ok) {
        const added = await res.json();
        const u = allUsers.find(u => u.id === addUserId);
        setTeamMembers([...teamMembers, { ...added, userName: u?.name }]);
        setAddUserId(null);
        setAddResponsibility('Member');
      } else {
        const msg = await res.text();
        alert(msg || '加入失敗');
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('確定要將此成員從專案中移除嗎？')) return;
    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/activity-teams/${memberId}`, { method: 'DELETE' });
      if (res.ok) setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    } catch (err) { console.error(err); }
  };

  // === Excel Batch Import ===
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportLogs(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      const logs: {status: 'success'|'error', msg: string}[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue; 
        
        const payload = {
          username: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          email: String(row[2] || '').trim(),
          bu: String(row[3] || '').trim(),
          factory: String(row[4] || '').trim(),
          jobRole: String(row[5] || '').trim(),
          dept: String(row[6] || '').trim(),
          role: String(row[7] || '').trim() || 'MEMBER',
          password: String(row[8] || '').trim(),
          enabled: row[9] !== undefined ? String(row[9]).toLowerCase() !== 'false' : true
        };
        
        if (!payload.username || !payload.name) {
          logs.push({ status: 'error', msg: `第 ${i+1} 列：帳號與姓名為必填，已略過` });
          continue;
        }

        try {
          const res = await fetch((import.meta as any).env.BASE_URL + 'api/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          if (res.ok) {
            logs.push({ status: 'success', msg: `成功匯入：${payload.username} (${payload.name})` });
          } else {
            const err = await res.json();
            logs.push({ status: 'error', msg: `匯入失敗 [${payload.username}]：${err.message || '未知錯誤'}` });
          }
        } catch (err) {
          logs.push({ status: 'error', msg: `連線錯誤 [${payload.username}]` });
        }
      }
      setImportLogs(logs);
      fetchData(); 
    } catch (err) {
      alert('處理 Excel 發生錯誤，請確認檔案格式是否正確。');
    }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    // 匯出當前畫面上的過濾與排序結果
    const header = ['登入帳號', '姓名', '電子郵件', 'BU', 'Factory', 'Role', 'Dept', '系統角色', '密碼', 'enable'];
    const data = filteredAndSortedUsers.map(u => [
      u.username,
      u.name,
      u.email,
      u.bu || '',
      u.factory || '',
      u.jobRole || '',
      u.dept || '',
      u.role || 'MEMBER',
      '', // 為了安全性，不匯出資料庫內的雜湊密碼
      u.enabled !== false ? 'true' : 'false'
    ]);
    
    data.unshift(header);
    
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "System Users");
    
    // 觸發瀏覽器下載
    xlsx.writeFile(wb, "system_users_export.xlsx");
  };

  // === Filtering & Sorting ===
  const requestSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedUsers = [...allUsers]
    .filter(u => {
      const term = searchTerm.trim().toLowerCase();
      if (term === '' || term === '*') return true;
      
      return u.name.toLowerCase().includes(term) ||
             (u.username && u.username.toLowerCase().includes(term)) ||
             (u.email && u.email.toLowerCase().includes(term)) ||
             (u.dept && u.dept.toLowerCase().includes(term)) ||
             (u.bu && u.bu.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const aVal = String(a[key] || '').toLowerCase();
      const bVal = String(b[key] || '').toLowerCase();
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const memberOptions = allUsers
    .filter(u => u.enabled !== false && !teamMembers.some(m => m.userId === u.id))
    .map(u => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const responsibilityOptions = [
    { value: 'Owner' as const, label: 'Owner（可編輯）' },
    { value: 'Member' as const, label: 'Member（唯讀）' },
  ];

  const roleOptions = [
    { value: 'OWNER', label: '系統管理員 (OWNER)' },
    { value: 'MEMBER', label: '一般成員 (MEMBER)' },
  ];

  const enableOptions = [
    { value: true, label: '啟用 (Enabled)' },
    { value: false, label: '停用 (Disabled)' },
  ];

  const SortIcon = ({ columnKey }: { columnKey: keyof User }) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowDown className="w-3 h-3 opacity-20 ml-1 inline-block" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 ml-1 inline-block" /> : <ArrowDown className="w-3 h-3 text-indigo-600 ml-1 inline-block" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="h-16 bg-white border-b flex items-center px-6 justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center">
          <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" /> 使用者與團隊管理中心
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {isOwner && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 您是此專案負責人
            </span>
          )}
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
            {currentUser?.name.charAt(0)}
          </div>
        </div>
      </header>

      <div className="bg-white border-b px-6">
        <div className="flex space-x-1 max-w-[1400px] mx-auto">
          {[
            { key: 'system', label: '系統使用者管理', icon: Users },
            { key: 'project', label: '專案成員管理', icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* === TAB：系統使用者管理 === */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="搜尋姓名、帳號、部門、BU..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white text-sm font-bold w-64 transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" /> 匯出清單
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm shadow-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" /> {isImporting ? '處理中...' : '批次匯入帳號'}
                  </button>
                  <button
                    onClick={() => { setIsCreating(true); setEditingUser(null); setFormData(emptyForm); setFormError(''); }}
                    className="flex items-center px-5 py-2 flex-shrink-0 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> 建立系統帳號
                  </button>
                </div>
              </div>

              {/* 新增 / 編輯表單 */}
              {(isCreating || editingUser) && (
                <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-md">
                  <h3 className="font-black text-indigo-900 mb-4 flex items-center">
                    {isCreating ? <><UserPlus className="w-4 h-4 mr-2" /> 建立新系統使用者</> : <><Edit2 className="w-4 h-4 mr-2" /> 編輯使用者資料</>}
                  </h3>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">登入帳號 *</label>
                      <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">姓名 *</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">電子郵件 *</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold disabled:opacity-50" />
                    </div>
                    
                    {/* Organization Fields */}
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">BU (Max 10)</label>
                      <input type="text" maxLength={10} value={formData.bu} onChange={e => setFormData({ ...formData, bu: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Factory (Max 10)</label>
                      <input type="text" maxLength={10} value={formData.factory} onChange={e => setFormData({ ...formData, factory: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Dept (Max 10)</label>
                      <input type="text" maxLength={10} value={formData.dept} onChange={e => setFormData({ ...formData, dept: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Role / Title (Max 10)</label>
                      <input type="text" maxLength={10} value={formData.jobRole} onChange={e => setFormData({ ...formData, jobRole: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" placeholder="Manager等" />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">帳號狀態 (啟用/停用)</label>
                      <Select options={enableOptions} value={enableOptions.find(o => o.value === formData.enabled)} onChange={o => setFormData({ ...formData, enabled: o?.value ?? true })} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">系統登入角色</label>
                      <Select options={roleOptions} value={roleOptions.find(o => o.value === formData.role)} onChange={o => setFormData({ ...formData, role: o?.value || 'MEMBER' })} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center">
                        <KeyRound className="w-3 h-3 mr-1" /> 密碼 {editingUser ? '(留空則不變更)' : '(預設：123456)'}
                      </label>
                      <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold" placeholder={editingUser ? '留空則不更改密碼' : '預設為 123456'} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                    <button onClick={cancelForm} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all flex items-center">
                      <X className="w-4 h-4 mr-1" /> 取消
                    </button>
                    <button onClick={isCreating ? handleCreateUser : handleUpdateUser} disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow transition-all active:scale-95 flex items-center disabled:opacity-60">
                      <Check className="w-4 h-4 mr-1" /> {isSubmitting ? '處理中...' : (isCreating ? '確認建立' : '儲存修改')}
                    </button>
                  </div>
                </div>
              )}

              {/* 使用者列表 */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>人員 / 帳號 <SortIcon columnKey="name" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('email')}>Email <SortIcon columnKey="email" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('bu')}>BU <SortIcon columnKey="bu" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('dept')}>Dept <SortIcon columnKey="dept" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('jobRole')}>職稱 <SortIcon columnKey="jobRole" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('enabled')}>狀態 <SortIcon columnKey="enabled" /></th>
                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('role')}>系統角色 <SortIcon columnKey="role" /></th>
                        <th className="px-4 py-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {filteredAndSortedUsers.map(user => (
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.enabled === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${user.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                  {user.name} 
                                  <span className="text-[10px] text-gray-400">({user.username})</span>
                                  {currentUser?.id === user.id && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-black">我</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{user.email}</td>
                          <td className="px-4 py-3 text-gray-800 font-bold text-xs">{user.bu || '-'}</td>
                          <td className="px-4 py-3 text-gray-800 font-bold text-xs">{user.dept || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{user.jobRole || '-'}</td>
                          <td className="px-4 py-3">
                            {user.enabled !== false ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700 border border-green-200">Active</span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-gray-200 text-gray-600 border border-gray-300">Disabled</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${user.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEdit(user)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="編輯">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteUser(user.id, user.name)} disabled={currentUser?.id === user.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="刪除">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAndSortedUsers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-bold">找不到相符的使用者資料</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === TAB：專案成員管理 === */}
          {activeTab === 'project' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">專案成員管理</h2>
                <p className="text-sm text-gray-400 mt-0.5">為各專案指派團隊成員。被停用的系統帳號無法指派至新專案。</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-sm">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">選擇管理的專案</label>
                <Select
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  value={selectedProjectId ? { value: selectedProjectId, label: projects.find(p => p.id === selectedProjectId)?.name } : null}
                  onChange={(opt) => setSelectedProjectId(opt?.value || null)}
                />
              </div>

              {isOwner && (
                <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center">
                    <UserPlus className="w-4 h-4 mr-2" /> 從系統使用者中加入成員
                  </h4>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">選擇帳號（僅顯示啟用中）</label>
                      <Select
                        placeholder="搜尋姓名或電子郵件..."
                        options={memberOptions}
                        onChange={(opt) => setAddUserId(opt?.value ?? null)}
                        isClearable
                        value={memberOptions.find(o => o.value === addUserId) || null}
                      />
                    </div>
                    <div className="w-52">
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Responsibility</label>
                      <Select
                        options={responsibilityOptions}
                        value={responsibilityOptions.find(o => o.value === addResponsibility)}
                        onChange={(opt) => setAddResponsibility(opt?.value ?? 'Member')}
                        isSearchable={false}
                      />
                    </div>
                    <button
                      onClick={handleAddMember}
                      disabled={!addUserId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" /> 加入
                    </button>
                  </div>
                  {memberOptions.length === 0 && allUsers.length > 0 && (
                    <p className="text-xs text-indigo-400 mt-2">所有啟用中的系統使用者均已加入此專案。</p>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-gray-50">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">當前成員 ({teamMembers.length} 人)</h3>
                </div>
                <div className="divide-y">
                  {teamMembers.map(member => {
                    const u = allUsers.find(user => user.id === member.userId);
                    const isThisOwner = member.responsibility === 'Owner';
                    const isProjectOwner = currentProject && u && currentProject.ownerId === u.id;
                    const displayName = u?.name || member.userName || `User #${member.userId}`;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-lg ${isThisOwner ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              {displayName}
                              {isProjectOwner && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black">專案負責人</span>}
                              {u?.enabled === false && <span className="bg-gray-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black">停用中</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u?.email}</p>
                            <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-0.5 ${isThisOwner ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                              {member.responsibility}
                            </span>
                          </div>
                        </div>
                        {isOwner && (
                          <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="從專案移除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {teamMembers.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-bold">此專案尚無成員</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Import Logs Modal */}
      {importLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-indigo-900 flex items-center text-lg">
                <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" /> 批次匯入結果
              </h3>
              <button onClick={() => setImportLogs(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 font-mono text-xs space-y-2">
              <div className="flex gap-4 mb-4 font-sans font-bold">
                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 flex-1">
                  成功: {importLogs.filter(l => l.status === 'success').length} 筆
                </div>
                <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200 flex-1">
                  失敗: {importLogs.filter(l => l.status === 'error').length} 筆
                </div>
              </div>
              {importLogs.map((log, i) => (
                <div key={i} className={`p-2.5 rounded-lg border flex gap-3 ${log.status === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  {log.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{log.msg}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setImportLogs(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
