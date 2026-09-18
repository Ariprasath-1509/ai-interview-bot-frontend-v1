"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED = ".pdf,.doc,.docx";
const MAX_SIZE = 5 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (/(pdf|msword|wordprocessingml)/.test(mime)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
}

interface BulkResumeDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
}

/** Multi-file drag-drop resume picker — same accept/size rules as ResumeUploadWidget, but for a
 *  batch. Purely presentational: it only collects and validates File objects. Nothing here uploads
 *  anything — the caller decides when/where each file actually gets sent. */
export function BulkResumeDropzone({ files, onFilesChange, maxFiles = 20, className = "" }: BulkResumeDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const rejects: string[] = [];
      const accepted: File[] = [];
      const existingKeys = new Set(files.map((f) => `${f.name}:${f.size}`));

      for (const file of Array.from(incoming)) {
        const key = `${file.name}:${file.size}`;
        if (existingKeys.has(key)) continue; // dedupe re-drops of the same file
        if (file.size > MAX_SIZE) {
          rejects.push(`${file.name} — over 5MB`);
          continue;
        }
        if (!isAcceptedFile(file)) {
          rejects.push(`${file.name} — must be PDF, DOC, or DOCX`);
          continue;
        }
        accepted.push(file);
        existingKeys.add(key);
      }

      const combined = [...files, ...accepted];
      if (combined.length > maxFiles) {
        rejects.push(`Only the first ${maxFiles} files were kept (${maxFiles}-file batch limit)`);
      }
      setRejected(rejects);
      onFilesChange(combined.slice(0, maxFiles));
    },
    [files, maxFiles, onFilesChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          dragActive
            ? "border-blue-400 bg-blue-50/80 dark:bg-blue-950/20"
            : "border-zinc-300 bg-zinc-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-blue-600"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
            <Upload className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              Drop resume files here or click to browse
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              PDF, DOC, or DOCX — max 5 MB each, up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {rejected.length > 0 && (
        <div className="mt-2 space-y-1">
          {rejected.map((msg, i) => (
            <p key={i} className="text-xs text-red-600">{msg}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate">{file.name}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="!h-6 !w-6 shrink-0 p-0 text-zinc-400 hover:text-red-600"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
