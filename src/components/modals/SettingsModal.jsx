import React, { useState } from 'react';
import { Merge, ArrowRightLeft, Trash2, LogOut, Save, Download, RefreshCw, Copy, Check, Info } from 'lucide-react';
import Modal from '../ui/Modal';

const SettingsModal = ({
  isOpen,
  onClose,
  classColors,
  setClassColors,
  mergeSource,
  setMergeSource,
  mergeTarget,
  setMergeTarget,
  mergeClasses,
  deleteClass,
  resetAllData,
  showJsonEdit,
  setShowJsonEdit,
  jsonEditText,
  setJsonEditText,
  handleJsonSave,
  handleICSExport,
  // Sync
  syncCode,
  syncStatus,
  createSyncSession,
  joinSyncSession,
  leaveSyncSession
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Data Management">
        <div className="space-y-8">
          
          {/* SYNC SECTION */}
          <section className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
             <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Peer-to-Peer Sync (WebRTC)</h4>
             
             {!syncCode ? (
                <div className="space-y-3">
                   <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                      Connect devices directly. Data is sent straight between devices and <strong>never stored on the server</strong>. 
                      <span className="block mt-1 italic opacity-80">Both devices must stay online to keep the connection.</span>
                   </p>
                   <div className="flex gap-2">
                      <button onClick={createSyncSession} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors">Start Session</button>
                      <div className="flex-1 flex gap-2">
                          <input 
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                            placeholder="CODE"
                            className="w-full min-w-0 p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 uppercase font-mono bg-white dark:bg-slate-700 dark:text-white"
                          />
                          <button onClick={() => joinSyncSession(joinCodeInput)} disabled={joinCodeInput.length < 6} className="px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50">Join</button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="text-center space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-slate-500 uppercase font-bold">Session Code</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${syncStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {syncStatus === 'connected' ? 'Connected' : 'Waiting...'}
                            </span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest">{syncCode}</span>
                            <button onClick={handleCopy} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1"><Info className="w-3 h-3" /> Do not close this tab while syncing.</p>
                    </div>
                    <button onClick={leaveSyncSession} className="text-xs text-red-500 hover:text-red-600 hover:underline">Disconnect & End Session</button>
                </div>
             )}
          </section>

          <section className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-100 dark:border-slate-600">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Merge className="w-4 h-4 text-purple-500" /> Merge Classes</h4>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                <select value={mergeSource} onChange={e => setMergeSource(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"><option value="">Merge from...</option>{Object.keys(classColors).map(cls => <option key={cls} value={cls}>{cls}</option>)}</select>
                <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"><option value="">Merge into...</option>{Object.keys(classColors).filter(c => c !== mergeSource).map(cls => <option key={cls} value={cls}>{cls}</option>)}</select>
            </div>
            <button onClick={mergeClasses} disabled={!mergeSource || !mergeTarget} className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50">Merge & Clean Up</button>
          </section>

          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Classes & Colors</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {Object.keys(classColors).map(cls => (
                    <div key={cls} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg group">
                        <div className="flex items-center gap-3"><div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm ring-2 ring-slate-100 cursor-pointer"><input type="color" value={classColors[cls]} onChange={(e) => setClassColors(prev => ({ ...prev, [cls]: e.target.value }))} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer" /></div><span className="font-medium text-sm dark:text-slate-200">{cls}</span></div>
                        <button onClick={() => deleteClass(cls)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
          </section>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <button onClick={handleICSExport} className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> Export as ICS</button>
            <button onClick={resetAllData} className="w-full py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium"><LogOut className="w-4 h-4" /> Reset All Data</button>
          </div>
        </div>
      </Modal>

      {/* JSON Edit Modal can be reused here if accessed from settings */}
      <Modal isOpen={showJsonEdit} onClose={() => setShowJsonEdit(false)} title="Raw Data Editor">
        <div className="flex flex-col h-full">
          <textarea value={jsonEditText} onChange={(e) => setJsonEditText(e.target.value)} className="flex-1 w-full p-4 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl outline-none resize-none dark:text-slate-200" />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowJsonEdit(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleJsonSave} className="px-6 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 font-bold shadow-md"><Save className="w-4 h-4" /> Save Changes</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;