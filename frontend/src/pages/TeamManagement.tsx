import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Trash2, ArrowLeft, ShieldCheck, 
  Edit2, X, Check, KeyRound, AlertCircle
} from 'lucide-react';
import Select from 'react-select';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ProjectMember {
  id: number;
  userId: number;
  projectRole: string;
}

interface Project {
  id: number;
  name: string;
  ownerId: number;
}

// 空白使用者表單
const emptyForm = { name: '', email: '', role: 'MEMBER', password: '' };

export default function TeamManagement() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  // 使用者 CRUD 的狀態
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'project'>('system');

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) { navigate('/login'); return; }
    setCurrentUser(JSON.parse(userJson));
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        fetch('http://localhost:8080/api/projects'),
        fetch('http://localhost:8080/api/users')
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
      fetch(`http://localhost:8080/api/projects/${selectedProjectId}/members`)
        .then(res => res.json())
        .then(setTeamMembers)
        .catch(console.error);
    }
  }, [selectedProjectId]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const isOwner = currentUser && currentProject && currentProject.ownerId === currentUser.id;

  // === 系統使用者 CRUD ===
  const handleCreateUser = async () => {
    setFormError('');
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('姓名與電子郵件為必填欄位'); return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/users', {
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
      const res = await fetch(`http://localhost:8080/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        setAllUsers(allUsers.map(u => u.id === updated.id ? updated : u));
        // 若更新的是當前登入者，同步 localStorage
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
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) setAllUsers(allUsers.filter(u => u.id !== userId));
    } catch (err) { console.error(err); }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, password: '' });
    setFormError('');
    setIsCreating(false);
  };

  const cancelForm = () => {
    setEditingUser(null);
    setIsCreating(false);
    setFormData(emptyForm);
    setFormError('');
  };

  // === 專案成員管理 ===
  const handleAddMember = async (userId: number) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${selectedProjectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectRole: 'Member' })
      });
      if (res.ok) setTeamMembers([...teamMembers, await res.json()]);
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedProjectId || !confirm('確定要將此成員從專案中移除嗎？')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${selectedProjectId}/members/${userId}`, { method: 'DELETE' });
      if (res.ok) setTeamMembers(teamMembers.filter(m => m.userId !== userId));
    } catch (err) { console.error(err); }
  };

  const memberOptions = allUsers
    .filter(u => !teamMembers.some(m => m.userId === u.id))
    .map(u => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const roleOptions = [
    { value: 'OWNER', label: '系統管理員 (OWNER)' },
    { value: 'MEMBER', label: '一般成員 (MEMBER)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
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

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex space-x-1 max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto space-y-6">

          {/* === TAB：系統使用者管理 === */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-gray-900">系統使用者清單</h2>
                  <p className="text-sm text-gray-400 mt-0.5">在此建立、修改或刪除系統帳號，完成後即可在專案中指派該人員。</p>
                </div>
                <button
                  onClick={() => { setIsCreating(true); setEditingUser(null); setFormData(emptyForm); setFormError(''); }}
                  className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> 建立新使用者
                </button>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">姓名 *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold transition-all"
                        placeholder="例：王小明"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">電子郵件 *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        disabled={!!editingUser}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold transition-all disabled:opacity-50"
                        placeholder="example@pms.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">系統角色</label>
                      <Select
                        options={roleOptions}
                        value={roleOptions.find(o => o.value === formData.role)}
                        onChange={o => setFormData({ ...formData, role: o?.value || 'MEMBER' })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">
                        <span className="flex items-center"><KeyRound className="w-3 h-3 mr-1" /> 密碼 {editingUser ? '(留空則不變更)' : '(預設：123456)'}</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl outline-none text-sm font-bold transition-all"
                        placeholder={editingUser ? '留空則不更改密碼' : '預設為 123456'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                    <button onClick={cancelForm} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all flex items-center">
                      <X className="w-4 h-4 mr-1" /> 取消
                    </button>
                    <button
                      onClick={isCreating ? handleCreateUser : handleUpdateUser}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow transition-all active:scale-95 flex items-center disabled:opacity-60"
                    >
                      <Check className="w-4 h-4 mr-1" /> {isSubmitting ? '處理中...' : (isCreating ? '確認建立' : '儲存修改')}
                    </button>
                  </div>
                </div>
              )}

              {/* 使用者列表 */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="divide-y">
                  {allUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center space-x-4">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${user.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            {user.name}
                            {currentUser?.id === user.id && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-black">我</span>}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${user.role === 'OWNER' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                          {user.role}
                        </span>
                        <button
                          onClick={() => startEdit(user)}
                          className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="編輯使用者"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={currentUser?.id === user.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title={currentUser?.id === user.id ? '無法刪除自己' : '永久刪除使用者'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {allUsers.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-bold">尚無任何系統使用者</p>
                      <p className="text-xs mt-1">點擊上方「建立新使用者」開始建立</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === TAB：專案成員管理 === */}
          {activeTab === 'project' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">專案成員管理</h2>
                <p className="text-sm text-gray-400 mt-0.5">為各專案指派團隊成員。成員須先在系統使用者中建立。</p>
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
                  <Select
                    placeholder="搜尋系統使用者名稱或電子郵件..."
                    options={memberOptions}
                    onChange={(opt) => opt && handleAddMember(opt.value)}
                    isClearable
                    value={null}
                  />
                  {memberOptions.length === 0 && allUsers.length > 0 && (
                    <p className="text-xs text-indigo-400 mt-2">所有系統使用者均已加入此專案。</p>
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
                    const isMemberOwner = currentProject && u && currentProject.ownerId === u.id;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-lg ${isMemberOwner ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {u?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              {u?.name}
                              {isMemberOwner && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black">OWNER</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u?.email}</p>
                            <p className="text-xs text-indigo-600 font-bold mt-0.5">{member.projectRole}</p>
                          </div>
                        </div>
                        {isOwner && !isMemberOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="從專案移除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isMemberOwner && <span className="text-xs text-gray-300 italic px-2">負責人不可移除</span>}
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
    </div>
  );
}
