import React, { useRef, useState } from "react";
import { Upload, FileJson, FileCode, Download, Trash2, AlertTriangle, Link as LinkIcon, Loader2 } from "lucide-react";
import { useData } from "../../../context/DataContext";

const ImportContent = ({ onOpenJsonEditor, onCloseModal, resetData, onExport }) => {
  const { processICSContent, importJsonData, importICSFromUrl } = useData();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const icsInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const handleFileImport = async (e, processor, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = processor(text, true); 
      if (result.success) {
        alert(`Successfully added ${result.count} events.`);
        onCloseModal();
      } else {
        alert(result.error || `Failed to parse ${fileType} file.`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to read file.");
    }
    e.target.value = "";
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
        const result = await importICSFromUrl(url);
        if (result.success) {
            alert(`Successfully added ${result.count} events.`);
            setUrl("");
            onCloseModal();
        } else {
            alert(result.error || "Failed to import from URL");
        }
    } catch(e) {
        alert("An error occurred during import.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
         <h4 className="px-1 text-heading mb-2">Import / Export</h4>
         
        
         <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-secondary px-1">
                Import from URL
            </label>
            <div className="flex gap-2">
                <input 
                    type="url" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="https://canvas.instructure.com/feed/..." 
                    className="input-base flex-1 text-sm"
                />
                <button 
                    onClick={handleUrlImport}
                    disabled={!url || isLoading}
                    className="btn-base btn-primary shrink-0 w-10 flex items-center justify-center"
                    title="Import Calendar from URL"
                >
                    {isLoading ? <Loader2 className="icon-xs animate-spin" /> : <LinkIcon className="icon-xs" />}
                </button>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-2 pt-2 border-t border-divider">
            
            <input
              type="file"
              accept=".ics"
              ref={icsInputRef}
              className="hidden"
              onChange={(e) => handleFileImport(e, processICSContent, "ICS")}
            />
            <button
              onClick={() => icsInputRef.current?.click()}
              className="btn-base btn-secondary"
            >
              <Upload className="icon-xs" /> Import ICS File
            </button>
       
            <button
              onClick={onExport}
              className="btn-base btn-secondary"
            >
              <Download className="icon-xs" /> Export Schedule (ICS)
            </button>
    
       
            <input
              type="file"
              accept=".json"
              ref={jsonInputRef}
              className="hidden"
              onChange={(e) => handleFileImport(e, importJsonData, "JSON")}
            />
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="btn-base btn-secondary"
            >
              <FileJson className="icon-xs" /> Import JSON Backup
            </button>
          </div>
    
          <button
            onClick={onOpenJsonEditor}
            className="w-full btn-base btn-secondary text-secondary mt-2"
          >
            <FileCode className="icon-xs" /> Edit Raw Data (JSON)
          </button>
      </div>
      
     
      <div className="pt-4 border-t border-divider space-y-2">
         <h4 className="px-1 text-heading text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="icon-xs" /> Danger Zone
         </h4>
         <button
            onClick={resetData}
            className="w-full btn-base btn-danger-soft justify-start"
         >
            <Trash2 className="icon-xs" /> Reset All Data
         </button>
         <p className="text-[10px] text-secondary leading-tight px-1">
            Permanently delete all tasks and settings.
         </p>
      </div>
    </div>
  );
};

export default ImportContent;