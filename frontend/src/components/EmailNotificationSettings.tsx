import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, Save, ToggleLeft, ToggleRight } from 'lucide-react';

interface EmailTemplate {
  id: number;
  ruleId: string;
  ruleName: string;
  subject: string;
  body: string;
  enabled: boolean;
}

interface PreviewResult {
  subject: string;
  body: string;
}

const VARIABLE_HINTS = [
  { key: '{{recipientName}}', desc: '收件人姓名' },
  { key: '{{taskTitle}}', desc: '任務名稱' },
  { key: '{{projectName}}', desc: '所屬專案名稱' },
  { key: '{{phaseName}}', desc: '所屬 Phase 名稱' },
  { key: '{{plannedStartDate}}', desc: '計畫開始日' },
  { key: '{{plannedEndDate}}', desc: '計畫結束日' },
  { key: '{{daysBefore}}', desc: '距開始幾天（RULE-1）' },
  { key: '{{daysOverdue}}', desc: '已逾期幾天（RULE-2/3）' },
  { key: '{{taskUrl}}', desc: '任務頁面直接連結' },
];

export default function EmailNotificationSettings() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState<string | null>('RULE-1');
  const [previewModal, setPreviewModal] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    fetch('/pms/api/email-templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const updateField = (ruleId: string, field: keyof EmailTemplate, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.ruleId === ruleId ? { ...t, [field]: value } : t));
  };

  const handleSave = async (ruleId: string) => {
    const t = templates.find(t => t.ruleId === ruleId);
    if (!t) return;
    setSaving(ruleId);
    try {
      const res = await fetch(`/pms/api/email-templates/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: t.subject, body: t.body, enabled: t.enabled }),
      });
      if (res.ok) {
        showToast(`${t.ruleName} 已儲存`);
      } else {
        showToast('儲存失敗', false);
      }
    } catch {
      showToast('儲存失敗', false);
    }
    setSaving(null);
  };

  const handlePreview = async (ruleId: string) => {
    setPreviewing(ruleId);
    try {
      const res = await fetch('/pms/api/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewModal(data);
      } else {
        showToast('預覽失敗', false);
      }
    } catch {
      showToast('預覽失敗', false);
    }
    setPreviewing(null);
  };

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm font-bold">載入中...</div>;
  }

  return (
    <div className="space-y-4 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-lg text-sm font-bold text-white
          ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Variable hints */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 overflow-hidden">
        <button
          onClick={() => setShowHints(h => !h)}
          className="w-full px-5 py-3 flex items-center justify-between text-blue-700 font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors"
        >
          <span>可用變數說明</span>
          {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showHints && (
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {VARIABLE_HINTS.map(h => (
              <div key={h.key} className="flex items-center gap-2 text-xs">
                <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{h.key}</code>
                <span className="text-slate-500">{h.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rule cards */}
      {templates.sort((a, b) => a.ruleId.localeCompare(b.ruleId)).map(t => (
        <div key={t.ruleId}
          className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-colors
            ${t.enabled ? 'border-slate-100' : 'border-slate-200 opacity-70'}`}>

          {/* Card header */}
          <div
            className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpanded(e => e === t.ruleId ? null : t.ruleId)}
          >
            <div className={`w-2 h-2 rounded-full ${t.enabled ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <div className="flex-1 min-w-0">
              <div className="font-black text-slate-800 text-sm">{t.ruleName}</div>
              <div className="text-xs text-slate-400 font-medium truncate mt-0.5">{t.ruleId}</div>
            </div>
            {/* Toggle */}
            <button
              onClick={e => { e.stopPropagation(); updateField(t.ruleId, 'enabled', !t.enabled); }}
              className="text-slate-400 hover:text-indigo-500 transition-colors"
              title={t.enabled ? '停用此規則' : '啟用此規則'}
            >
              {t.enabled
                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                : <ToggleLeft className="w-7 h-7" />}
            </button>
            {expanded === t.ruleId ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {/* Expanded body */}
          {expanded === t.ruleId && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">主旨</label>
                <input
                  type="text"
                  value={t.subject}
                  onChange={e => updateField(t.ruleId, 'subject', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">內文</label>
                <textarea
                  rows={7}
                  value={t.body}
                  onChange={e => updateField(t.ruleId, 'body', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-y font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => handlePreview(t.ruleId)}
                  disabled={previewing === t.ruleId}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {previewing === t.ruleId ? '載入中...' : '預覽'}
                </button>
                <button
                  onClick={() => handleSave(t.ruleId)}
                  disabled={saving === t.ruleId}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving === t.ruleId ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800">Email 預覽（範例資料）</h3>
              <button onClick={() => setPreviewModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">主旨</div>
                <div className="text-sm font-bold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{previewModal.subject}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">內文</div>
                <pre className="text-sm text-slate-700 bg-slate-50 px-4 py-3 rounded-xl whitespace-pre-wrap font-sans">{previewModal.body}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
