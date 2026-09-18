'use client';

import { useMemo, useState } from 'react';
import { entityBranchLabel, defaultStaffBranch } from '@/lib/staffRoles';
import { useBranchOptions } from '@/hooks/useBranchOptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Users, FileSpreadsheet, FileText } from 'lucide-react';
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
      if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        setError('Please select an Excel (.xlsx) file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setValidationResult(null);
      setImportResult(null);
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
        setError((result.errors?.[0]) || 'Import failed');
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

    await Promise.all(
      Array.from({ length: Math.min(RESUME_UPLOAD_CONCURRENCY, jobs.length) }, () => worker())
    );

    setUploadingResumes(false);
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
    <div className="w-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Import Candidates</h1>
        <p className="text-zinc-600">Upload Excel file to import B2B and Bench candidates with automatic credential generation</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/admin/bulk-import/template?clientsEnabled=${clientsEnabled}`, '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Excel Template
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <p className="font-medium mb-1">Resume naming convention</p>
          <p>Name each resume file with the candidate&apos;s email address so it auto-matches to the right row — e.g. <span className="font-mono">john.doe@company.com.pdf</span> or <span className="font-mono">jane@gmail.com.docx</span>. Files that don&apos;t match any email can be assigned manually after upload.</p>
        </div>
      </div>

      {/* File Upload Section */}
      {!validationResult && !importResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Select the candidate roster (.xlsx) and optionally drop resume files below. At least one email (Official or Personal) must be provided per row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Step 1 — Candidate roster (.xlsx)</p>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Branch for imported candidates
                  {isSuperAdmin ? (
                    <select
                      className="input-base max-w-xs"
                      value={importBranch}
                      onChange={(e) => setImportBranch(e.target.value)}
                    >
                      {branchOptions.map((b) => (
                        <option key={b.code} value={b.code}>{b.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input readOnly disabled value={entityBranchLabel(staffDefaultBranch)} className="input-base max-w-xs opacity-70" />
                  )}
                </label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {file && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-sm text-zinc-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Step 2 — Resumes <span className="font-normal text-zinc-500">(optional, up to {MAX_RESUME_FILES} files)</span>
                </p>
                <BulkResumeDropzone files={resumeFiles} onFilesChange={setResumeFiles} maxFiles={MAX_RESUME_FILES} />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? 'Validating...' : 'Upload & Validate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Results */}
      {validationResult && !importResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-zinc-600">Total Rows</p>
                    <p className="text-2xl font-bold">{validationResult.totalRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-zinc-600">Valid Rows</p>
                    <p className="text-2xl font-bold text-green-600">{validationResult.validRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-zinc-600">Error Rows</p>
                    <p className="text-2xl font-bold text-red-600">{validationResult.errorRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Validation Errors */}
          {validationResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Validation Issues ({validationResult.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant={error.severity === 'ERROR' ? 'destructive' : 'secondary'}>
                        Row {error.rowNumber}
                      </Badge>
                      <span className="text-sm font-medium">{error.field}:</span>
                      <span className="text-sm">{error.message}</span>
                      {error.value && (
                        <span className="text-sm text-zinc-500">({error.value})</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Credential Preview */}
          {validationResult.credentialPreviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Credential Preview (First 10)</CardTitle>
                <CardDescription>
                  These login credentials will be generated for the candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Username</th>
                        <th className="text-left p-2">Password</th>
                        <th className="text-left p-2">Source</th>
                        <th className="text-left p-2">Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.credentialPreviews.slice(0, 10).map((preview, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{preview.name}</td>
                          <td className="p-2 font-mono text-xs">{preview.username}</td>
                          <td className="p-2 font-mono text-xs">{preview.generatedPassword}</td>
                          <td className="p-2">
                            <Badge variant="outline">{preview.source}</Badge>
                          </td>
                          <td className="p-2">{preview.batch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validationResult.credentialPreviews.length > 10 && (
                    <p className="text-sm text-zinc-500 mt-2">
                      ... and {validationResult.credentialPreviews.length - 10} more candidates
                    </p>
                  )}
                </div>
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
          <div className="flex gap-4">
            <Button
              onClick={handleConfirmImport}
              disabled={!validationResult.canProceed || processing || uploadingResumes}
              className="flex-1"
            >
              {processing
                ? 'Creating Accounts...'
                : uploadingResumes
                ? 'Uploading Resumes...'
                : validationResult.canProceed
                ? `Confirm Import (${validationResult.validRows} candidates)`
                : 'Fix validation errors to import'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.successCount > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Import {importResult.successCount > 0 ? 'Completed' : 'Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-zinc-600">Successfully Created</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.successCount}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-zinc-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{importResult.errorCount}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Import Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  {importResult.successCount > 0 && (
                    <Button 
                      onClick={handleDownloadCredentials}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Login Credentials ({importResult.successCount} accounts)
                    </Button>
                  )}
                  <Button variant="outline" onClick={resetForm}>
                    Import More Candidates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {resumeUploadResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume Uploads
                  {uploadingResumes && (
                    <span className="text-sm font-normal text-zinc-500">— uploading…</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Row</th>
                        <th className="text-left p-2">Candidate</th>
                        <th className="text-left p-2">File</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumeUploadResults.map((r) => (
                        <tr key={r.rowNumber} className="border-b">
                          <td className="p-2">
                            <Badge variant="outline">Row {r.rowNumber}</Badge>
                          </td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 font-mono text-xs truncate max-w-[200px]">{r.filename}</td>
                          <td className="p-2">
                            {r.status === 'uploading' && (
                              <Badge variant="secondary">Uploading…</Badge>
                            )}
                            {r.status === 'uploaded' && (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Uploaded</Badge>
                            )}
                            {r.status === 'failed' && (
                              <span className="flex flex-col gap-1">
                                <Badge variant="destructive">Failed</Badge>
                                {r.error && <span className="text-xs text-red-600">{r.error}</span>}
                                <a
                                  href={`/admin/candidates/${r.candidateId}`}
                                  className="text-xs text-blue-600 underline"
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}