"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Sparkles,
  Download,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/common/Toast";

export interface InitialResume {
  filename: string | null;
  summary: string | null;
  uploadedAt: string | null;
}

interface ResumeUploadWidgetProps {
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  initialResume?: InitialResume | null;
  onSummaryGenerated?: (summary: string) => void;
  onAutoFillTriggered?: () => void;
  onUploadComplete?: () => void;
  onDownload?: () => void;
  className?: string;
  compact?: boolean;
}

const ACCEPTED = ".pdf,.doc,.docx";
const MAX_SIZE = 5 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (/(pdf|msword|wordprocessingml)/.test(mime)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ResumeUploadWidget({
  candidateId,
  candidateName,
  candidateEmail,
  initialResume,
  onSummaryGenerated,
  onAutoFillTriggered,
  onUploadComplete,
  onDownload,
  className = "",
  compact = false,
}: ResumeUploadWidgetProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [existingResume, setExistingResume] = useState<InitialResume | null>(initialResume ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setExistingResume(initialResume ?? null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [candidateId, initialResume]);

  const handleFile = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;

      if (selectedFile.size > MAX_SIZE) {
        toast("File must be under 5MB", "error");
        return;
      }

      if (!isAcceptedFile(selectedFile)) {
        toast("Please upload PDF, DOC, or DOCX files only", "error");
        return;
      }

      setFile(selectedFile);
    },
    [toast]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file || !candidateId) {
      toast("Missing file or candidate", "error");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch(`/api/candidates/${candidateId}/resume`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast((result?.error as string) || "Upload failed", "error");
        return;
      }

      const summary = (result?.summary as string) || existingResume?.summary || null;

      setExistingResume({
        filename: (result?.filename as string) || file.name,
        uploadedAt: new Date().toISOString(),
        summary,
      });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      if (summary && onSummaryGenerated) {
        onSummaryGenerated(summary);
      }
      onUploadComplete?.();
      toast("Resume uploaded and processed successfully", "success");
    } catch (error) {
      console.error("Upload error:", error);
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (compact) {
    return (
      <div className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Resume</p>
              <p className="truncate text-xs text-zinc-500">
                {existingResume?.filename ?? "No resume uploaded"}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-3 w-3" />
            Upload
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>
    );
  }

  const hasExisting = !!existingResume?.filename;

  return (
    <div className={`space-y-5 ${className}`}>
      {(candidateName || candidateEmail) && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#6D28D9]/20 bg-gradient-to-r from-[#6D28D9]/10 via-[#7C3AED]/5 to-transparent p-4 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-white shadow-xs">
            <User className="h-5.5 w-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-base text-[var(--text-primary)]">
              {candidateName ?? "Candidate"}
            </p>
            {candidateEmail && (
              <p className="truncate text-xs font-medium text-[var(--text-secondary)] mt-0.5">{candidateEmail}</p>
            )}
          </div>
          {hasExisting && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Resume on file
            </span>
          )}
        </div>
      )}

      {hasExisting && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)]/60 p-5 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[var(--text-primary)]">Current resume</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--text-primary)] break-all">{existingResume?.filename}</p>
                <p className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  Uploaded {formatDate(existingResume?.uploadedAt)}
                </p>
              </div>
            </div>
            {onDownload && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[#6D28D9] hover:text-[#6D28D9] font-bold text-xs shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </div>

          {existingResume?.summary && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[#6D28D9] dark:text-purple-400" />
                  AI Summary
                </span>
                {onAutoFillTriggered && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onAutoFillTriggered}
                    className="h-7 text-xs font-bold text-[#6D28D9] hover:bg-[#6D28D9]/10 cursor-pointer"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Auto-fill
                  </Button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto text-xs leading-relaxed font-medium text-[var(--text-primary)] whitespace-pre-wrap pr-1">
                {existingResume.summary}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
          {hasExisting ? "Replace resume" : "Upload resume"}
        </p>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`group cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all duration-200 ${
            dragActive
              ? "border-[#6D28D9] bg-[#6D28D9]/10"
              : file
              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[#6D28D9]/60 hover:bg-[#6D28D9]/5"
          } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-9 w-9 animate-spin text-[#6D28D9] dark:text-purple-400" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Uploading and generating summary…
              </p>
              <p className="text-xs text-[var(--text-secondary)]">This may take a few seconds</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">{file.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!candidateId}
                  className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload &amp; Process
                </Button>
                <Button type="button" variant="outline" onClick={clear} className="rounded-xl cursor-pointer">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!candidateId && (
                <p className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No candidate selected
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">
                  Drop resume here or <span className="text-[#6D28D9] dark:text-purple-400 underline">click to browse</span>
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">PDF, DOC, or DOCX — max 5 MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
