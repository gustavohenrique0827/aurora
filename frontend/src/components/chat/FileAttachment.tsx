interface FileAttachmentProps {
  file: File;
  onRemove: () => void;
}

/** Preview chip for the one image about to be sent — Aurora CORE now has a real vision
 * path (imageBase64 on ChatSendPayload → passthroughBinaryImages in n8n), so this is a
 * live "about to attach" state, not a dead-end anymore. */
export function FileAttachment({ file, onRemove }: FileAttachmentProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-jarvis-cyan/30 bg-jarvis-cyan/10 px-2.5 py-1.5 text-xs text-jarvis-cyanBright">
      <span className="max-w-[160px] truncate">{file.name}</span>
      <button type="button" onClick={onRemove} className="text-jarvis-cyanBright/70 hover:text-jarvis-cyanBright">
        ×
      </button>
    </div>
  );
}
