"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
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
    <div className="max-w-2xl space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          file
            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
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
          <div className="flex flex-col items-center gap-3">
            {uploaded ? (
              <CheckCircle size={40} className="text-emerald-500" />
            ) : (
              <FileText size={40} className="text-emerald-600 dark:text-emerald-400" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex gap-2">
              {!uploaded && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={uploading}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <X size={14} className="inline mr-1" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Drop your resume here or click to browse
              </p>
              <p className="mt-1 text-xs text-zinc-400">PDF, DOC, DOCX — max 5MB</p>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview */}
      {preview && (
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
          <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</p>
          </div>
          <iframe src={preview} className="h-[500px] w-full" title="Resume preview" />
        </div>
      )}
    </div>
  );
}