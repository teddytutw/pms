import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Trash2, Save, Edit2 } from 'lucide-react';

interface TypeField {
  id?: number;
  typeId?: number;
  fieldName: string;
  fieldType: string;
  fieldOptions: string;
  fieldOrder: number;
}

interface DeliverableType {
  id: number;
  name: string;
  description?: string;
  fields?: TypeField[];
}

const FIELD_TYPES = ['TEXT', 'DATE', 'SELECT', 'NUMBER'];
const BASE = (import.meta as any).env.BASE_URL;

export default function DeliverableTypeManagement() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<DeliverableType[]>([]);
  const [selected, setSelected] = useState<DeliverableType | null>(null);
  const [fields, setFields] = useState<TypeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE + 'api/deliverable-types');
      if (res.ok) setTypes(await res.json());
    } finally { setLoading(false); }
  };

  const fetchFields = async (typeId: number) => {
    const res = await fetch(BASE + `api/deliverable-types/${typeId}/fields`);
    if (res.ok) setFields(await res.json());
  };

  const selectType = async (t: DeliverableType) => {
    setSelected(t);
    setEditName(t.name);
    setEditDesc(t.description || '');
    await fetchFields(t.id);
  };

  const handleCreate = async () => {
    const res = await fetch(BASE + 'api/deliverable-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Type', description: '' }),
    });
    if (res.ok) { await fetchTypes(); }
  };

  const handleSaveType = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(BASE + `api/deliverable-types/${selected.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    setSaving(false);
    fetchTypes();
    setSelected(prev => prev ? { ...prev, name: editName, description: editDesc } : null);
  };

  const handleDeleteType = async () => {
    if (!selected || !confirm(`刪除類型 "${selected.name}"？（將同時刪除此類型的所有欄位定義）`)) return;
    await fetch(BASE + `api/deliverable-types/${selected.id}`, { method: 'DELETE' });
    setSelected(null); setFields([]);
    fetchTypes();
  };

  const handleAddField = () => {
    setFields(prev => [...prev, { fieldName: '', fieldType: 'TEXT', fieldOptions: '', fieldOrder: prev.length + 1 }]);
  };

  const handleFieldChange = (idx: number, key: keyof TypeField, value: string | number) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };

  const handleSaveField = async (idx: number) => {
    if (!selected) return;
    const f = fields[idx];
    if (!f.fieldName.trim()) { alert('欄位名稱不能為空'); return; }
    if (f.id) {
      // Update existing field
      await fetch(BASE + `api/deliverable-types/fields/${f.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
    } else {
      // Create new field
      const res = await fetch(BASE + `api/deliverable-types/${selected.id}/fields`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, typeId: selected.id }),
      });
      if (res.ok) {
        const created = await res.json();
        setFields(prev => prev.map((ff, i) => i === idx ? created : ff));
      }
    }
  };

  const handleDeleteField = async (idx: number) => {
    const f = fields[idx];
    if (f.id) {
      await fetch(BASE + `api/deliverable-types/fields/${f.id}`, { method: 'DELETE' });
    }
    setFields(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="p-2 mr-4 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Package className="w-6 h-6 mr-2 text-indigo-600" />
        <h1 className="text-xl font-bold text-indigo-900">Deliverable Types</h1>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-white border-r flex flex-col shrink-0 shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Types</span>
            <button onClick={handleCreate} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">載入中...</div>
            ) : types.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">尚無類型，點擊 New 建立</div>
            ) : (
              types.map(t => (
                <button key={t.id} onClick={() => selectType(t)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-indigo-50 transition ${selected?.id === t.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                  <div className="font-bold text-slate-800 text-sm truncate">{t.name}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Type Info */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-indigo-500" /> Type Info
                  </h2>
                  <button onClick={handleDeleteType} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded">
                    <Trash2 className="w-3 h-3" /> Delete Type
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
                  <button onClick={handleSaveType} disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                    <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-slate-800 text-lg">Custom Fields</h2>
                  <button onClick={handleAddField} className="flex items-center gap-1 px-3 py-1.5 border border-indigo-300 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition">
                    <Plus className="w-3 h-3" /> Add Field
                  </button>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                    No custom fields. Click "Add Field" to define.
                  </div>
                )}

                <div className="space-y-3">
                  {fields.map((f, idx) => (
                    <div key={idx} className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50/50">
                      <div className="flex gap-2 items-center">
                        <input value={f.fieldName} onChange={e => handleFieldChange(idx, 'fieldName', e.target.value)}
                          placeholder="Field name..."
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                        <select value={f.fieldType} onChange={e => handleFieldChange(idx, 'fieldType', e.target.value)}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white">
                          {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => handleSaveField(idx)} title="Save field"
                          className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteField(idx)} title="Delete field"
                          className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {f.fieldType === 'SELECT' && (
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Options (comma separated)
                          </label>
                          <input
                            value={(() => {
                              try { return JSON.parse(f.fieldOptions || '[]').join(', '); } catch { return f.fieldOptions || ''; }
                            })()}
                            onChange={e => {
                              const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              handleFieldChange(idx, 'fieldOptions', JSON.stringify(opts));
                            }}
                            placeholder="e.g. Option A, Option B, Option C"
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300">
            <div className="text-center space-y-2">
              <Package className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm font-bold">Select a Type to edit</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
