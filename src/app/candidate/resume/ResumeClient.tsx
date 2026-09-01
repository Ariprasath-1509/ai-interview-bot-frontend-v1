"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle2, Loader2, Eye, Sparkles, FileCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/components/common/Toast";

const ACCEPTED = ".pdf,.doc,.docx";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ResumeClient() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast("File must be under 5MB", "error");
      return;
    }
    setFile(f);
    setUploaded(false);

    // Preview for PDF
    if (f.type === "application/pdf") {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("/api/candidates/resume", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploaded(true);
        toast("Resume uploaded successfully", "success");
      } else {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Upload failed", "error");
      }
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Upload Panel Card */}
      <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Resume Upload & Verification
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
            PDF, DOC, DOCX • Max 5MB
          </span>
        </div>

        <div className="p-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 relative overflow-hidden ${
              file
                ? uploaded
                  ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : "border-purple-500/50 bg-purple-500/5 dark:bg-purple-500/10"
                : "border-[var(--border)] bg-[var(--surface-subtle)]/40 hover:border-purple-500/50 hover:bg-purple-500/5"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md transition-transform group-hover:scale-105">
                  {uploaded ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-bounce" />
                  ) : (
                    <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-xs font-extrabold text-[var(--text-primary)] shadow-2xs">
                    <FileCheck className="h-3.5 w-3.5 text-purple-500" />
                    {file.name}
                  </span>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || "Document"}
                  </p>
                </div>

                {uploaded ? (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      Uploaded Successfully
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clear(); }}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Replace
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      disabled={uploading}
                      className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-xs shadow-2xs transition-all hover:scale-105 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading Resume…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Confirm & Save Resume
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clear(); }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs transition-transform group-hover:scale-110">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    Drop your resume here or <span className="text-purple-600 dark:text-purple-400 underline underline-offset-2">click to browse</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] font-medium">
                    Supports PDF, DOC, DOCX files up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Document Preview Card */}
      {preview && (
        <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 overflow-hidden">
          <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Interactive Document Preview
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" />
              PDF Live Reader
            </span>
          </div>
          <div className="p-2 bg-[var(--surface-subtle)]">
            <iframe
              src={preview}
              className="h-[600px] w-full rounded-xl border border-[var(--border)] bg-white shadow-inner"
              title="Resume preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}