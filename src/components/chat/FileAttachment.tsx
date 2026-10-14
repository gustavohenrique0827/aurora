import { FileText, Image as ImageIcon } from "lucide-react";

interface FileAttachmentProps {
  file: File;
  onRemove: () => void;
}

/** Preview chip for the one attachment about to be sent — Aurora CORE has a real vision
 * path for images (imageBase64 → passthroughBinaryImages in n8n) and a Gemini-summary
 * path for PDFs (documentBase64), so this is a live "about to attach" state either way. */
export function FileAttachment({ file, onRemove }: FileAttachmentProps) {
  const isPdf = file.type === "application/pdf";
  const Icon = isPdf ? FileText : ImageIcon;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-jarvis-cyan/30 bg-jarvis-cyan/10 px-2.5 py-1.5 text-xs text-jarvis-cyanBright">
      <Icon size={13} className="shrink-0" />
      <span className="max-w-[160px] truncate">{file.name}</span>
      <button type="button" onClick={onRemove} className="text-jarvis-cyanBright/70 hover:text-jarvis-cyanBright">
        ×
      </button>
    </div>
  );
}
