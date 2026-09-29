'use client';

import { useMemo, useState } from 'react';
import { entityBranchLabel, defaultStaffBranch } from '@/lib/staffRoles';
import { useBranchOptions } from '@/hooks/useBranchOptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Users, FileSpreadsheet, FileText, Sparkles, Loader2, X, FileCheck } from 'lucide-react';
import { BulkResumeDropzone } from '@/components/resume/BulkResumeDropzone';
import { uploadResumeForCandidate } from '@/lib/uploadResume';
import { matchResumesToRows, type RowResumeMatch } from '@/lib/resumeMatching';

interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value: string;
  severity: 'ERROR' | 'WARNING';
}

interface CredentialPreview {
  rowNumber: number;
  name: string;
  username: string;
  generatedPassword: string;
  source: string;
  batch: string;
  officialEmail?: string;
  personalEmail?: string;
}

interface BulkImportResponse {
  sessionId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  credentialPreviews: CredentialPreview[];
  canProceed: boolean;
  createdAt: string;
}

interface ImportResult {
  ok: boolean;
  message: string;
  successCount: number;
  errorCount: number;
  errors: string[];
  sessionId: string;
  createdCandidates?: { rowNumber: number; candidateId: string }[];
  /** Only present on failure (confirmBulkImport's catch paths) — the actual reason the whole
   *  batch was rejected, e.g. a duplicate email on one row. `errors` stays empty in that case. */
  error?: string;
}

interface ResumeUploadRowResult {
  rowNumber: number;
  candidateId: string;
  name: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'failed';
  error?: string;
}

const RESUME_UPLOAD_CONCURRENCY = 4;
const MAX_RESUME_FILES = 20;

function fileKey(f: File): string {
  return `${f.name}:${f.size}`;
}

export default function BulkImportClient({ userRole, userBranch, clientsEnabled = true }: { userRole: string; userBranch?: string; clientsEnabled?: boolean }) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const staffDefaultBranch = defaultStaffBranch(userRole, userBranch);
  const { options: branchOptions } = useBranchOptions();
  const [importBranch, setImportBranch] = useState<string>(staffDefaultBranch);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkImportResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please select an Excel (.xlsx) file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setValidationResult(null);
    setImportResult(null);
  };

  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [manualAssignments, setManualAssignments] = useState<Map<number, File>>(new Map());
  const [resumeUploadResults, setResumeUploadResults] = useState<ResumeUploadRowResult[]>([]);
  const [uploadingResumes, setUploadingResumes] = useState(false);

  const resumeMatch = useMemo(() => {
    if (!validationResult) return { rows: [] as RowResumeMatch[], unmatchedFiles: [] as File[] };
    const rows = validationResult.credentialPreviews.map((p) => ({
      rowNumber: p.rowNumber,
      name: p.name,
      officialEmail: p.officialEmail,
      personalEmail: p.personalEmail,
    }));
    return matchResumesToRows(rows, resumeFiles, manualAssignments);
  }, [validationResult, resumeFiles, manualAssignments]);

  const assignFileToRow = (rowNumber: number, file: File | null) => {
    setManualAssignments((prev) => {
      const next = new Map(prev);
      if (file) next.set(rowNumber, file);
      else next.delete(rowNumber);
      return next;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processSelectedFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/auth/candidates/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (result.ok === false) {
        setError(result.error || 'Upload failed');
        return;
      }

      setValidationResult(result);
      // Row numbers can shift if this is a re-upload after fixing validation errors — clear
      // manual assignments (keyed by row number) so a stale pick can't land on the wrong row.
      // Auto-matching re-runs from scratch against the new rows; dropped files stay in state.
      setManualAssignments(new Map());
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult?.sessionId) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/candidates/bulk-confirm/${validationResult.sessionId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSuperAdmin ? { branch: importBranch } : { branch: staffDefaultBranch }),
      });

      const result: ImportResult = await response.json();

      if (result.ok === false) {
        setError(result.error || 'Import failed');
        return;
      }

      setImportResult(result);
      setProcessing(false);

      if (result.createdCandidates?.length) {
        const names = new Map(validationResult.credentialPreviews.map((p) => [p.rowNumber, p.name]));
        await uploadMatchedResumes(result.createdCandidates, names);
      }
    } catch (err) {
      setError('Failed to process import. Please try again.');
      console.error('Import error:', err);
    } finally {
      setProcessing(false);
    }
  };

  /** Runs after candidates are created — uploads each row's resolved resume file (if any) to its
   *  newly created candidate, bounded-concurrency so ai-service/Tika don't get hit all at once.
   *  Independent per row: one failure doesn't block the rest, and candidates are already committed
   *  by this point either way. */
  const uploadMatchedResumes = async (
    createdCandidates: { rowNumber: number; candidateId: string }[],
    names: Map<number, string>
  ) => {
    const candidateByRow = new Map(createdCandidates.map((c) => [c.rowNumber, c.candidateId]));
    const jobs = resumeMatch.rows
      .filter((r) => r.file && candidateByRow.has(r.rowNumber))
      .map((r) => ({
        rowNumber: r.rowNumber,
        candidateId: candidateByRow.get(r.rowNumber) as string,
        file: r.file as File,
        name: names.get(r.rowNumber) ?? `Row ${r.rowNumber}`,
      }));

    if (jobs.length === 0) return;

    setUploadingResumes(true);
    setResumeUploadResults(
      jobs.map((j) => ({
        rowNumber: j.rowNumber,
        candidateId: j.candidateId,
        name: j.name,
        filename: j.file.name,
        status: 'uploading' as const,
      }))
    );

    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const uploadResult = await uploadResumeForCandidate(job.candidateId, job.file);
        setResumeUploadResults((prev) =>
          prev.map((r) =>
            r.rowNumber === job.rowNumber
              ? { ...r, status: uploadResult.ok ? 'uploaded' : 'failed', error: uploadResult.ok ? undefined : uploadResult.error }
              : r
          )
        );
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(RESUME_UPLOAD_CONCURRENCY, jobs.length) }, () => worker())
      );
    } finally {
      // uploadResumeForCandidate never throws (it catches its own errors), but guard anyway so an
      // unexpected failure can't leave rows stuck showing "Uploading…" forever.
      setUploadingResumes(false);
    }
  };

  const handleDownloadCredentials = async () => {
    if (!importResult?.sessionId) return;

    try {
      const response = await fetch(`/api/auth/candidates/bulk-download/${importResult.sessionId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorResult = await response.json();
        setError(errorResult.error || 'Download failed');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `login_credentials_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download credentials file');
      console.error('Download error:', err);
    }
  };

  const resetForm = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setError(null);
    setResumeFiles([]);
    setManualAssignments(new Map());
    setResumeUploadResults([]);
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="w-full space-y-6 animate-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 h-48 w-48 -mr-12 -mt-12 rounded-full bg-gradient-to-br from-[#6D28D9]/10 via-[#7C3AED]/5 to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-white shadow-md shadow-purple-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Bulk Import Candidates</h1>
              <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                Upload Excel file to import B2B and Bench candidates with automatic credential generation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.open(`/api/admin/bulk-import/template?clientsEnabled=${clientsEnabled}`, '_blank')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6D28D9]/30 bg-[#6D28D9]/10 px-4 py-2.5 text-xs font-bold text-[#6D28D9] dark:text-purple-300 shadow-2xs transition-all hover:bg-[#6D28D9] hover:text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Download className="h-4 w-4" />
            Download Excel Template
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <p className="font-medium mb-1">Resume naming convention</p>
          <p>Name each resume file with the candidate&apos;s email address so it auto-matches to the right row — e.g. <span className="font-mono">john.doe@company.com.pdf</span> or <span className="font-mono">jane@gmail.com.docx</span>. Files that don&apos;t match any email can be assigned manually after upload.</p>
        </div>
      </div>

      {/* File Upload Section */}
      {!validationResult && !importResult && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95]" />
          <CardHeader className="pb-4 border-b border-[var(--border)]">
            <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[var(--text-primary)]">
              <Upload className="h-5 w-5 text-[#6D28D9]" />
              Upload Excel File
            </CardTitle>
            <CardDescription className="text-xs font-medium text-[var(--text-secondary)]">
              Select an Excel (.xlsx) file with candidate data. Required fields are marked with <span className="text-rose-500 font-bold">*</span> in the template. At least one email (Official or Personal) must be provided.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {/* Branch Selection */}
            <div className="space-y-1.5 max-w-sm">
              <Label className="text-xs font-bold text-[var(--text-primary)]">Branch for imported candidates</Label>
              {isSuperAdmin ? (
                <Select value={importBranch} onValueChange={setImportBranch}>
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly disabled value={entityBranchLabel(staffDefaultBranch)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium opacity-80" />
              )}
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#6D28D9] bg-[#6D28D9]/10 scale-[1.005]'
                  : 'border-[#6D28D9]/30 bg-[#6D28D9]/5 hover:border-[#6D28D9] hover:bg-[#6D28D9]/10'
              }`}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="h-7 w-7" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[var(--text-primary)]">{file.name}</span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ready to validate</p>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] dark:text-purple-300">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Click to upload or drag and drop</p>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">Supports Microsoft Excel files (.xlsx)</p>
                  </div>
                </>
              )}
            </div>

            {/* Resumes (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[var(--text-primary)]">
                Resumes <span className="font-normal text-[var(--text-secondary)]">(optional, up to {MAX_RESUME_FILES} files)</span>
              </Label>
              <BulkResumeDropzone files={resumeFiles} onFilesChange={setResumeFiles} maxFiles={MAX_RESUME_FILES} />
            </div>

            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] py-3 text-xs font-bold text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Validating Excel File...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Upload &amp; Validate</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs font-semibold text-rose-700 dark:text-rose-300 shadow-sm">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && !importResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Total Rows</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">{validationResult.totalRows}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Valid Rows</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{validationResult.validRows}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Error Rows</p>
                <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{validationResult.errorRows}</p>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationResult.errors.length > 0 && (
            <Card className="rounded-2xl border border-rose-500/20 bg-[var(--surface)] shadow-md overflow-hidden">
              <CardHeader className="pb-3 border-b border-[var(--border)]">
                <CardTitle className="flex items-center gap-2 text-base font-extrabold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                  Validation Issues ({validationResult.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {validationResult.errors.map((errorItem, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/15 bg-rose-500/5 text-xs text-[var(--text-primary)]">
                      <Badge variant={errorItem.severity === 'ERROR' ? 'destructive' : 'secondary'} className="rounded-lg font-bold">
                        Row {errorItem.rowNumber}
                      </Badge>
                      <span className="font-bold text-[var(--text-primary)]">{errorItem.field}:</span>
                      <span>{errorItem.message}</span>
                      {errorItem.value && (
                        <span className="text-[var(--text-secondary)] font-mono">({errorItem.value})</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Credential Preview */}
          {validationResult.credentialPreviews.length > 0 && (
            <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-[var(--border)]">
                <CardTitle className="text-base font-extrabold text-[var(--text-primary)]">Credential Preview (First 10)</CardTitle>
                <CardDescription className="text-xs text-[var(--text-secondary)]">
                  These login credentials will be generated for the candidates
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left font-bold text-[var(--text-secondary)]">
                        <th className="p-3">Name</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Source</th>
                        <th className="p-3">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {validationResult.credentialPreviews.slice(0, 10).map((preview, index) => (
                        <tr key={index} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                          <td className="p-3 font-bold text-[var(--text-primary)]">{preview.name}</td>
                          <td className="p-3 font-mono font-medium text-[var(--text-primary)]">{preview.username}</td>
                          <td className="p-3 font-mono font-bold text-[#6D28D9] dark:text-purple-400">{preview.generatedPassword}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 font-bold text-[10px] text-purple-700 dark:text-purple-300 border border-purple-500/20">{preview.source}</span>
                          </td>
                          <td className="p-3 font-medium text-[var(--text-secondary)]">{preview.batch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validationResult.credentialPreviews.length > 10 && (
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-3">
                    ... and {validationResult.credentialPreviews.length - 10} more candidates
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resume matching preview — only shown after validation, only when files were dropped */}
          {resumeFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume Matching
              </CardTitle>
              <CardDescription>
                Files matched automatically by email in filename. Assign any unmatched files manually before confirming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeFiles.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Row</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Matched Resume</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumeMatch.rows.map((match) => {
                        const preview = validationResult.credentialPreviews.find((p) => p.rowNumber === match.rowNumber);
                        const options =
                          match.status === 'conflict'
                            ? match.conflictFiles ?? []
                            : match.status === 'none'
                            ? resumeMatch.unmatchedFiles
                            : [];
                        return (
                          <tr key={match.rowNumber} className="border-b">
                            <td className="p-2">
                              <Badge variant="outline">Row {match.rowNumber}</Badge>
                            </td>
                            <td className="p-2">{preview?.name ?? '—'}</td>
                            <td className="p-2">
                              {match.file ? (
                                <span className="flex items-center gap-1.5 text-xs">
                                  <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                  <span className="truncate max-w-[220px]">{match.file.name}</span>
                                </span>
                              ) : options.length > 0 ? (
                                <select
                                  className="input-base text-xs"
                                  value=""
                                  onChange={(e) => {
                                    const selected = options.find((f) => fileKey(f) === e.target.value);
                                    if (selected) assignFileToRow(match.rowNumber, selected);
                                  }}
                                >
                                  <option value="">Assign a file…</option>
                                  {options.map((f) => (
                                    <option key={fileKey(f)} value={fileKey(f)}>{f.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-zinc-400">No file provided</span>
                              )}
                            </td>
                            <td className="p-2">
                              {match.status === 'auto' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Matched</Badge>}
                              {match.status === 'manual' && (
                                <span className="flex items-center gap-2">
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Assigned</Badge>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-500 underline"
                                    onClick={() => assignFileToRow(match.rowNumber, null)}
                                  >
                                    clear
                                  </button>
                                </span>
                              )}
                              {match.status === 'conflict' && <Badge variant="destructive">Conflict — pick one</Badge>}
                              {match.status === 'none' && <Badge variant="secondary">No resume</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {resumeMatch.unmatchedFiles.length > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {resumeMatch.unmatchedFiles.length} file(s) didn&apos;t auto-match any row — assign them above or they&apos;ll be left unattached.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" onClick={resetForm} className="bg-[var(--surface-subtle)] font-bold text-xs cursor-pointer px-5">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!validationResult.canProceed || processing || uploadingResumes}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer py-2.5 flex items-center justify-center gap-2"
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating Accounts...</>
              ) : uploadingResumes ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Uploading Resumes...</>
              ) : validationResult.canProceed ? (
                <><CheckCircle className="h-4 w-4" />Confirm Import ({validationResult.validRows} candidates)</>
              ) : (
                'Fix validation errors to import'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-[var(--border)]">
            <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[var(--text-primary)]">
              {importResult.successCount > 0 ? (
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              )}
              Import {importResult.successCount > 0 ? 'Completed Successfully' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Successfully Created</p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{importResult.successCount}</p>
              </div>
              <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Failed</p>
                <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{importResult.errorCount}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Import Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {importResult.errors.map((err, index) => (
                    <p key={index} className="text-xs text-rose-700 dark:text-rose-300 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 font-medium">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {importResult.successCount > 0 && (
                <Button
                  onClick={handleDownloadCredentials}
                  className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 px-5 py-2.5"
                >
                  <Download className="h-4 w-4" />
                  Download Login Credentials ({importResult.successCount} accounts)
                </Button>
              )}
              <Button variant="secondary" onClick={resetForm} className="bg-[var(--surface-subtle)] font-bold text-xs cursor-pointer px-5">
                Import More Candidates
              </Button>
            </div>

            {resumeUploadResults.length > 0 && (
              <div className="pt-4 border-t border-[var(--border)] space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                  <FileText className="h-4 w-4" />
                  Resume Uploads
                  {uploadingResumes && (
                    <span className="text-xs font-normal text-[var(--text-secondary)]">— uploading…</span>
                  )}
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left font-bold text-[var(--text-secondary)]">
                        <th className="p-3">Row</th>
                        <th className="p-3">Candidate</th>
                        <th className="p-3">File</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {resumeUploadResults.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                          <td className="p-3">
                            <Badge variant="outline">Row {r.rowNumber}</Badge>
                          </td>
                          <td className="p-3 font-bold text-[var(--text-primary)]">{r.name}</td>
                          <td className="p-3 font-mono text-[var(--text-secondary)] truncate max-w-[200px]">{r.filename}</td>
                          <td className="p-3">
                            {r.status === 'uploading' && (
                              <Badge variant="secondary">Uploading…</Badge>
                            )}
                            {r.status === 'uploaded' && (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Uploaded</Badge>
                            )}
                            {r.status === 'failed' && (
                              <span className="flex flex-col gap-1">
                                <Badge variant="destructive">Failed</Badge>
                                {r.error && <span className="text-[10px] text-rose-600 dark:text-rose-400">{r.error}</span>}
                                <a
                                  href={`/admin/candidates/${r.candidateId}`}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 underline"
                                >
                                  Add resume from profile →
                                </a>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}