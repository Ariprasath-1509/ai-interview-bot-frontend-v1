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
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 px-4 py-3 dark:border-indigo-900/30 dark:from-indigo-950/30 dark:to-violet-950/20">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
              {candidateName ?? "Candidate"}
            </p>
            {candidateEmail && (
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{candidateEmail}</p>
            )}
          </div>
          {hasExisting && (
            <Badge className="ml-auto shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Resume on file
            </Badge>
          )}
        </div>
      )}

      {hasExisting && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Current resume</p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{existingResume?.filename}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Uploaded {formatDate(existingResume?.uploadedAt)}
                </p>
              </div>
            </div>
            {onDownload && (
              <Button size="sm" variant="outline" onClick={onDownload} className="shrink-0">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </div>

          {existingResume?.summary && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI summary</p>
                {onAutoFillTriggered && (
                  <Button size="sm" variant="ghost" onClick={onAutoFillTriggered} className="h-7 text-xs">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Auto-fill
                  </Button>
                )}
              </div>
              <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {existingResume.summary}
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {hasExisting ? "Replace resume" : "Upload resume"}
        </p>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            dragActive
              ? "border-blue-400 bg-blue-50/80 dark:bg-blue-950/20"
              : file
              ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
              : "border-zinc-300 bg-zinc-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-blue-600"
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
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Uploading and generating summary…
              </p>
              <p className="text-xs text-zinc-500">This may take a few seconds</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{file.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!candidateId} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload &amp; Process
                </Button>
                <Button variant="outline" onClick={clear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!candidateId && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No candidate selected
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
                <Upload className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  Drop resume here or click to browse
                </p>
                <p className="mt-1 text-sm text-zinc-500">PDF, DOC, or DOCX — max 5 MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
