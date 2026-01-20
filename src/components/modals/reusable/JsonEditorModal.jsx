import React from "react";
import { Save } from "lucide-react";
import Modal from "../../ui/Modal";
import { UI_THEME } from "../../../utils/constants";


import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";


const Editor = CodeEditor.default || CodeEditor;

const JsonEditorModal = ({ isOpen, onClose, text, setText, onSave }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raw Data Editor">
      <div className={`flex flex-col ${UI_THEME.LAYOUT.EDITOR_HEIGHT}`}>
        <div className={`flex-1 w-full rounded-xl overflow-hidden relative ${UI_THEME.BORDERS.BASE} ${UI_THEME.SURFACE.MODAL_BG}`}>
          <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <Editor
              value={text}
              onValueChange={(code) => setText(code)}
              highlight={(code) =>
                Prism.highlight(
                  code,
                  Prism.languages.json || Prism.languages.javascript,
                  "json",
                )
              }
              padding={16}
              className={`font-mono text-xs ${UI_THEME.TEXT.PRIMARY}`}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
                minHeight: "100%",
              }}
              textareaClassName="focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 shrink-0">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${UI_THEME.BUTTON.GHOST}`}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className={`px-6 py-2 text-sm flex items-center gap-2 font-bold rounded-lg ${UI_THEME.BUTTON.PRIMARY}`}
          >
            <Save className={UI_THEME.ICON.SIZE_SM} /> Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default JsonEditorModal;