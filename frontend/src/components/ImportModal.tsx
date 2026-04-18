import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onImportSuccess: () => void;
}

type Status = 'idle' | 'uploading' | 'success' | 'error';

export default function ImportModal({
  isOpen, onClose, projectId, projectName, onImportSuccess
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState<{ phasesCreated?: number; tasksCreated?: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setMessage('');
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setStatus('error');
      setMessage('Only .xlsx files are supported.');
      return;
    }
    setFile(f);
    setStatus('idle');
    setMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch((import.meta as any).env.BASE_URL + `api/projects/${projectId}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setSummary({ phasesCreated: data.phasesCreated, tasksCreated: data.tasksCreated });
        setMessage(data.message || 'Import successful.');
        onImportSuccess();
      } else {
        setStatus('error');
        setMessage(data.error || 'Import failed.');
      }
    } catch {
      setStatus('error');
      setMessage('Cannot connect to server.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Import WBS from Excel</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target: {projectName}</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="mx-6 mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 font-bold leading-relaxed">
                <span className="font-black uppercase tracking-wide">Important:</span> Import is only allowed for <span className="font-black">empty projects</span> (no existing phases or tasks). If data already exists, the import will be blocked.
                <br /><br />
                <span className="font-black">Required columns:</span> WBS ID · Activity Name · Scheduled Start · Scheduled End · Responsible Role · Predecessors
              </div>
            </div>

            {/* Drop Zone */}
            <div className="p-6">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInput.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragging ? 'border-indigo-500 bg-indigo-50' :
                  file     ? 'border-green-400 bg-green-50' :
                             'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInput} type="file" accept=".xlsx" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {file ? (
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-green-100 rounded-xl text-green-600">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <p className="font-black text-slate-800 text-sm">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-slate-100 rounded-xl text-slate-400">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="font-black text-slate-600 text-sm">Drag & drop your .xlsx file here</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or click to browse</p>
                  </div>
                )}
              </div>

              {/* Result messages */}
              {status === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-2xl flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-green-700 font-bold">
                    <p className="font-black">Import Complete!</p>
                    <p>Phases created: <span className="font-black">{summary?.phasesCreated}</span></p>
                    <p>Tasks created: <span className="font-black">{summary?.tasksCreated}</span></p>
                  </div>
                </div>
              )}
              {status === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-bold leading-relaxed">{message}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                {status === 'success' ? 'CLOSE' : 'CANCEL'}
              </button>
              {status !== 'success' && (
                <button
                  onClick={handleUpload}
                  disabled={!file || status === 'uploading'}
                  className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-40 flex items-center gap-2 uppercase tracking-widest"
                >
                  {status === 'uploading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> IMPORTING...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> IMPORT WBS</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
