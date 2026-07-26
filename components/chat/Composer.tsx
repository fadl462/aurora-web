"use client";

import { useRef, useState } from "react";
import { ApiError, extractFileText } from "@/lib/api";

interface AttachedFile {
  name: string;
  status: "uploading" | "ready" | "error";
  extractedText?: string;
  truncated?: boolean;
  errorMessage?: string;
}

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string, attachmentNames: string[]) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  function submit() {
    if (disabled) return;
    const stillUploading = attachments.some((a) => a.status === "uploading");
    if (stillUploading) return;
    if (!value.trim() && attachments.length === 0) return;

    // Real extracted content gets folded into what's actually sent to
    // the backend — this is the part that was previously fake (only
    // the filename was ever sent, never the file's content).
    const readyAttachments = attachments.filter((a) => a.status === "ready" && a.extractedText);
    const attachmentBlocks = readyAttachments
      .map((a) => {
        const truncNote = a.truncated ? " (truncated to the first ~12,000 characters)" : "";
        return `[Attached file: ${a.name}${truncNote}]\n${a.extractedText}`;
      })
      .join("\n\n---\n\n");

    const finalContent = attachmentBlocks
      ? `${attachmentBlocks}${value.trim() ? `\n\n---\n\n${value.trim()}` : ""}`
      : value;

    onSend(finalContent, attachments.map((a) => a.name));
    setValue("");
    setAttachments([]);
    requestAnimationFrame(autoGrow);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    for (const file of files) {
      setAttachments((prev) => [...prev, { name: file.name, status: "uploading" }]);
      try {
        const result = await extractFileText(file);
        setAttachments((prev) =>
          prev.map((a) =>
            a.name === file.name && a.status === "uploading"
              ? { ...a, status: "ready", extractedText: result.text, truncated: result.truncated }
              : a,
          ),
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.name === file.name && a.status === "uploading"
              ? {
                  ...a,
                  status: "error",
                  errorMessage: err instanceof ApiError ? err.message : "Couldn't read this file.",
                }
              : a,
          ),
        );
      }
    }
  }

  const hasUploading = attachments.some((a) => a.status === "uploading");

  return (
    <div className="px-7 pb-[22px] pt-3">
      <div className="mx-auto max-w-[760px] rounded-lg border border-border bg-surface px-4 pb-2.5 pt-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span
                key={i}
                className={`flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1.5 text-[12px] font-medium ${
                  a.status === "error" ? "border-warning/40 bg-warning/10 text-warning" : "border-border bg-surface-raised"
                }`}
                title={a.status === "error" ? a.errorMessage : a.status === "ready" ? `${a.extractedText?.length ?? 0} characters read` : "Reading file…"}
              >
                {a.status === "uploading" ? <SpinnerIcon /> : a.status === "error" ? <WarningIcon /> : <DocIcon />}
                {a.name}
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${a.name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-text-faint hover:bg-surface-hover hover:text-text"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? "Connecting to Aurora…" : "Message Aurora — attach a file, or type / for commands"}
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[120px] w-full resize-none bg-transparent text-[14px] leading-normal text-text placeholder:text-text-faint focus:outline-none disabled:cursor-not-allowed"
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.json,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.sql,.sh,.rs,.swift,.kt,.html,.css,.yaml,.yml,.xml"
          className="hidden"
          onChange={handleFiles}
          disabled={disabled}
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Attach a document, spreadsheet, presentation, or code file"
              className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <PaperclipIcon />
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[12px] text-text-muted">
              Research mode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
          <button
            onClick={submit}
            disabled={disabled || hasUploading || (!value.trim() && attachments.length === 0)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-accent transition-colors hover:bg-[#6C99FF] disabled:cursor-default disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth={2.5}>
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
