import React, { useRef } from "react";
import { Upload, FileJson, FileCode } from "lucide-react";
import { useData } from "../../../context/DataContext";

const ImportContent = ({ onOpenJsonEditor, onCloseModal }) => {
  const { processICSContent, importJsonData } = useData();
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
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
          <Upload className="icon-xs" /> Add ICS
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
          <FileJson className="icon-xs" /> Add JSON
        </button>
      </div>

      <button
        onClick={onOpenJsonEditor}
        className="w-full btn-base btn-secondary text-secondary"
      >
        <FileCode className="icon-xs" /> Edit Raw JSON
      </button>
      <p className="text-[10px] text-center leading-tight text-muted">
        Files are added to existing schedule.
      </p>
    </div>
  );
};

export default ImportContent;