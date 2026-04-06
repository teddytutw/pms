import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShieldCheck } from 'lucide-react';

interface Role {
  id: number;
  roleName: string;
}

export default function RoleManagement() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/responsible-roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error('Fetch roles error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch('http://localhost:8080/api/responsible-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: newRoleName.trim() }),
      });
      if (res.ok) {
        setNewRoleName('');
        fetchRoles();
      }
    } catch (e) {
      console.error('Add role error:', e);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('確定要刪除此角色定義？')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/responsible-roles/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchRoles();
    } catch (e) {
      console.error('Delete role error:', e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center text-indigo-900">
          <ShieldCheck className="w-6 h-6 mr-2 text-indigo-600" />
          負責角色定義維護
        </h1>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Add Form */}
          <div className="bg-white p-6 border rounded-2xl shadow-sm">
            <h2 className="font-black text-lg text-gray-800 mb-4">新增角色定義</h2>
            <form onSubmit={handleAddRole} className="flex gap-2">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="例如: BPM, MIPM, SQE..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> 新增
              </button>
            </form>
          </div>

          {/* List Table */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <h2 className="font-black text-lg text-gray-800 p-6 border-b bg-gray-50/50">角色列表</h2>
            <div className="divide-y">
              {loading ? (
                <div className="p-10 text-center text-gray-400">載入中...</div>
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-xs">
                        {role.id}
                      </div>
                      <span className="font-bold text-gray-700">{role.roleName}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg group-hover:opacity-100 transition-all"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-400">
                  目前尚無角色定義
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
