import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, Plus, Trash2, Search } from 'lucide-react';
import DeliverableModal from '../components/DeliverableModal';

interface Deliverable {
  id: number;
  name: string;
  typeId: number | null;
  createdAt: string;
}
interface DelType { id: number; name: string; }

const BASE = (import.meta as any).env.BASE_URL;

export default function DeliverableManagement() {
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [types, setTypes] = useState<DelType[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [delRes, typeRes, wfRes] = await Promise.all([
        fetch(BASE + 'api/deliverables'),
        fetch(BASE + 'api/deliverable-types'),
        fetch(BASE + 'api/workflows'),
      ]);
      if (delRes.ok) setDeliverables(await delRes.json());
      if (typeRes.ok) setTypes(await typeRes.json());
      if (wfRes.ok) setWorkflows(await wfRes.json());
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE + `api/deliverables?keyword=${encodeURIComponent(keyword.trim())}`);
      if (res.ok) setDeliverables(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleNew = async () => {
    const userJson = localStorage.getItem('currentUser');
    const userId = userJson ? JSON.parse(userJson).id : null;
    try {
      const res = await fetch(BASE + 'api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Deliverable', createdBy: userId }),
      });
      if (res.ok) {
        const d = await res.json();
        await fetchAll();
        setSelectedId(d.id);
        setShowModal(true);
      } else {
        alert(`建立失敗 (${res.status})`);
      }
    } catch (e) {
      alert(`錯誤: ${e}`);
    }
  };

  const handleDelete = async (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`刪除 "${name}"？`)) return;
    const res = await fetch(BASE + `api/deliverables/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeliverables(prev => prev.filter(d => d.id !== id));
    } else if (res.status === 409) {
      alert('此 Deliverable 已連結至 Activities，無法刪除。');
    } else {
      alert(`刪除失敗 (${res.status})`);
    }
  };

  const typeName = (typeId: number | null) =>
    typeId ? (types.find(t => t.id === typeId)?.name ?? '—') : '—';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Archive className="w-6 h-6 mr-2 text-indigo-600" />
        <h1 className="text-xl font-bold text-indigo-900">Deliverables</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Toolbar */}
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 bg-white flex items-center gap-1.5 text-slate-500 transition"
              >
                <Search className="w-4 h-4" />
              </button>
              {keyword && (
                <button
                  onClick={() => { setKeyword(''); fetchAll(); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-slate-400 hover:bg-gray-50 bg-white transition"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Type</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Created</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">載入中…</td></tr>
                ) : deliverables.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10">
                      <Archive className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                      <p className="text-slate-400 text-sm">No deliverables found.</p>
                    </td>
                  </tr>
                ) : (
                  deliverables.map(d => (
                    <tr
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setShowModal(true); }}
                      className="border-b border-slate-50 hover:bg-indigo-50/40 group cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <span className="font-bold text-indigo-700 text-sm group-hover:underline">{d.name}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{typeName(d.typeId)}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={e => handleDelete(d.id, d.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-400 text-right">{deliverables.length} deliverable(s)</p>
        </div>
      </main>

      {showModal && selectedId && (
        <DeliverableModal
          deliverableId={selectedId}
          onClose={() => { setShowModal(false); setSelectedId(null); fetchAll(); }}
          allWorkflows={workflows}
          allTypes={types}
        />
      )}
    </div>
  );
}
