import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Paperclip, Users, FileText, Download, Trash2, Plus 
} from 'lucide-react';
import Select from 'react-select';

export default function EntityDetails() {
  const { targetType = '', targetId = '' } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'details' | 'team' | 'attachments'>('details');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Entity Data
  const [entityData, setEntityData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  // Team Data
  const [teamMembers, setTeamMembers] = useState<any[]>([]); // For Project
  
  // Attachments Data
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) { navigate('/login'); return; }
    setCurrentUser(JSON.parse(userJson));
    fetchAllUsers();
    fetchEntityData();
    fetchAttachments();
  }, [targetType, targetId, navigate]);

  const fetchAllUsers = async () => {
    const res = await fetch('http://localhost:8080/api/users');
    if (res.ok) setAllUsers(await res.json());
  };

  const fetchEntityData = async () => {
    try {
      if (targetType === 'PROJECT') {
        const res = await fetch(`http://localhost:8080/api/projects/${targetId}`);
        if (res.ok) setEntityData(await res.json());

        const mRes = await fetch(`http://localhost:8080/api/projects/${targetId}/members`);
        if (mRes.ok) setTeamMembers(await mRes.json());
      } else if (targetType === 'TASK') {
        const res = await fetch(`http://localhost:8080/api/tasks/${targetId}`);
        if (res.ok) setEntityData(await res.json());
      } else if (targetType === 'PHASE') {
        // Phase is virtual. ID format: projectId-phaseName
        const [pId, ...pNames] = targetId.split('-');
        const phaseName = pNames.join('-');
        const res = await fetch(`http://localhost:8080/api/projects/${pId}`);
        if (res.ok) {
          const p = await res.json();
          setEntityData({ id: targetId, name: `[Phase] ${phaseName}`, project: p });
          // Fetch members of the project as Phase context members
          const mRes = await fetch(`http://localhost:8080/api/projects/${pId}/members`);
          if (mRes.ok) setTeamMembers(await mRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/attachments?targetType=${targetType}&targetId=${targetId}`);
      if (res.ok) setAttachments(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetType', targetType);
    formData.append('targetId', targetId);
    if (currentUser) {
      formData.append('uploaderId', String(currentUser.id));
    }

    try {
      const res = await fetch('http://localhost:8080/api/attachments', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newAtt = await res.json();
        setAttachments([newAtt, ...attachments]);
      } else {
        alert('上傳失敗');
      }
    } catch (err) {
      console.error('上傳錯誤', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (id: number) => {
    // Open in new tab or trigger download
    window.open(`http://localhost:8080/api/attachments/${id}/download`, '_blank');
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!confirm('確定刪除此附件？')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/attachments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAttachments(attachments.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('刪除失敗', err);
    }
  };

  // Team Management (Project Level)
  const handleAddMember = async (userId: number) => {
    if (targetType !== 'PROJECT') return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${targetId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectRole: 'Member' })
      });
      if (res.ok) setTeamMembers([...teamMembers, await res.json()]);
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (userId: number) => {
    if (targetType !== 'PROJECT' || !confirm('從專案中移除此成員？')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${targetId}/members/${userId}`, { method: 'DELETE' });
      if (res.ok) setTeamMembers(teamMembers.filter(m => m.userId !== userId));
    } catch (err) { console.error(err); }
  };

  // Save details function wrapper dummy 
  const saveDetails = () => alert("儲存詳情功能可在這裡擴充");

  const getActiveTitle = () => {
    if (!entityData) return '載入中...';
    if (targetType === 'PROJECT') return `[專案] ${entityData.name}`;
    if (targetType === 'PHASE') return entityData.name;
    if (targetType === 'TASK') return `[任務] ${entityData.title}`;
    return 'Details';
  };

  const memberOptions = allUsers
    .filter(u => !teamMembers.some(m => m.userId === u.id))
    .map(u => ({ value: u.id, label: `${u.name} (${u.email})` }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center text-indigo-900">
          詳細維護介面
          <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg">
            {getActiveTitle()}
          </span>
        </h1>
      </header>

      <div className="bg-white border-b px-6 flex space-x-1 shrink-0">
        {[
          { key: 'details', label: '基本資訊', icon: FileText },
          { key: 'team', label: '團隊成員', icon: Users },
          { key: 'attachments', label: '附件檔案', icon: Paperclip },
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

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'details' && entityData && (
            <div className="bg-white p-6 border rounded-2xl shadow-sm space-y-4">
              <h2 className="font-black text-lg text-gray-800 border-b pb-2">基本資訊</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(entityData).map(([key, val]) => {
                  if (typeof val === 'object' || key === 'id') return null;
                  return (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg border">
                      <p className="text-[10px] font-black uppercase text-gray-400">{key}</p>
                      <p className="font-bold text-gray-800 text-sm mt-1">{String(val)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={saveDetails} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                  儲存變更
                </button>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-white p-6 border rounded-2xl shadow-sm space-y-4">
              <h2 className="font-black text-lg text-gray-800 border-b pb-2 flex justify-between">
                <span>團隊成員管理</span>
                <span className="text-sm font-normal text-gray-400">{targetType === 'PROJECT' ? '可新增/移除專案成員' : '唯讀：顯示相關成員'}</span>
              </h2>

              {targetType === 'PROJECT' && (
                <div className="mb-4">
                   <label className="block text-xs font-black text-gray-500 mb-2">加入新成員</label>
                   <Select
                    placeholder="搜尋系統使用者..."
                    options={memberOptions}
                    onChange={(opt) => opt && handleAddMember(opt.value)}
                    isClearable
                    value={null}
                   />
                </div>
              )}

              <div className="space-y-2">
                 {targetType === 'PROJECT' || targetType === 'PHASE' ? teamMembers.map(member => {
                    const u = allUsers.find(user => user.id === member.userId);
                    return (
                      <div key={member.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                             {u?.name.charAt(0) || '?'}
                           </div>
                           <div>
                             <p className="text-sm font-bold">{u?.name || 'Unknown'}</p>
                             <p className="text-xs text-gray-400">{u?.email || '-'}</p>
                           </div>
                        </div>
                        {targetType === 'PROJECT' && (
                          <button onClick={() => handleRemoveMember(member.userId)} className="text-gray-400 hover:text-red-500 p-2 rounded hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                 }) : (
                   <p className="text-gray-500 text-sm">任務 ({entityData?.title}) 目前綁定 Assignee ID: {entityData?.assigneeId || '無'}</p>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="bg-white p-6 border rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="font-black text-lg text-gray-800">附件與檔案</h2>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center hover:bg-indigo-100"
                >
                  <Plus className="w-4 h-4 mr-1" /> 上傳新檔案
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                         <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-800 group-hover:text-indigo-600 transition-colors">
                          {att.originalFileName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {(att.fileSize / 1024).toFixed(1)} KB • 上傳時間: {new Date(att.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(att.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="下載檔案">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteAttachment(att.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="刪除檔案">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm">目前尚無附件</p>
                    <p className="text-xs">點擊右上方按鈕上傳檔案</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
