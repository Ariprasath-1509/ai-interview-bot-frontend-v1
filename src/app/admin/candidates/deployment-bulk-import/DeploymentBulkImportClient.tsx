'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Users, FileSpreadsheet, Building2, Loader2, X, FileCheck, Sparkles } from 'lucide-react';

interface DeploymentDetail {
  rowNumber: number;
  empId: string | null;
  name?: string | null;
  email: string;
  clientName: string;
  deployedDate: string;
  mentor: string | null;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}

interface ImportResponse {
  totalRows: number;
  successCount: number;
  warningCount: number;
  failureCount: number;
  details: DeploymentDetail[];
}

export default function DeploymentBulkImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please select an Excel (.xlsx) file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setImportResult(null);
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

      const response = await fetch('/api/admin/candidates/deployment/bulk-import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Upload failed');
        return;
      }

      setImportResult(result);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setImportResult(null);
    setError(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const downloadTemplate = () => {
    const headers = ['No.', 'Emp ID', 'Name', 'Contact Number', 'Official Mail ID', 'Personal Mail ID', 'YOE', 'Technology', 'Client Name', 'Deployed Date', 'Mentor'];
    const sampleData = [
      ['1', 'EMP001', 'John Doe', '9876543210', 'john@company.com', 'john@personal.com', '5', 'Java + SB', 'TechCorp', '2024-01-15', 'Jane Smith'],
      ['2', '', 'Alice Brown', '9876543211', 'alice@company.com', 'alice@personal.com', '3', 'React JS', 'StartupXYZ', '2024-02-01', '']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="w-full space-y-6 animate-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 h-48 w-48 -mr-12 -mt-12 rounded-full bg-gradient-to-br from-[#6D28D9]/10 via-[#7C3AED]/5 to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-white shadow-md shadow-purple-500/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Bulk Import Deployment Data</h1>
              <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                Upload Excel file to update deployment information for multiple candidates
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6D28D9]/30 bg-[#6D28D9]/10 px-4 py-2.5 text-xs font-bold text-[#6D28D9] dark:text-purple-300 shadow-2xs transition-all hover:bg-[#6D28D9] hover:text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Download className="h-4 w-4" />
            Download Excel Template
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      {!importResult && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95]" />
          <CardHeader className="pb-4 border-b border-[var(--border)]">
            <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[var(--text-primary)]">
              <Upload className="h-5 w-5 text-[#6D28D9]" />
              Upload Excel File
            </CardTitle>
            <CardDescription className="text-xs font-medium text-[var(--text-secondary)]">
              Select an Excel (.xlsx) file with deployment data. Required columns: No., Emp ID (optional), Name, Contact Number, Official Mail ID, Personal Mail ID, YOE, Technology, Client Name, Deployed Date (YYYY-MM-DD), Mentor (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
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
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ready to process</p>
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

            <Button 
              type="button"
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="w-full rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] py-3 text-xs font-bold text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Uploading &amp; Processing...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Upload &amp; Process</>
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

      {/* Import Results */}
      {importResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Total Rows</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">{importResult.totalRows}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Success</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{importResult.successCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Warnings</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{importResult.warningCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-[var(--surface)] p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Failures</p>
                <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{importResult.failureCount}</p>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[var(--border)]">
              <CardTitle className="text-base font-extrabold text-[var(--text-primary)]">Import Details</CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)]">
                Review the status of each deployment record
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                {importResult.details.map((detail, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border text-xs transition-all ${
                      detail.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200' :
                      detail.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200' :
                      'bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Badge 
                        variant="outline"
                        className="mt-0.5 shrink-0 rounded-lg font-bold"
                      >
                        Row {detail.rowNumber}
                      </Badge>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {detail.name && (
                            <span className="font-extrabold text-[var(--text-primary)] text-xs">{detail.name}</span>
                          )}
                          {detail.email && (
                            <span className="font-medium text-[var(--text-secondary)] text-xs">{detail.email}</span>
                          )}
                          {detail.empId && (
                            <span className="font-mono text-[10px] font-bold bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">{detail.empId}</span>
                          )}
                        </div>
                        {detail.clientName && detail.deployedDate && (
                          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            {detail.clientName} • {detail.deployedDate}
                            {detail.mentor && ` • Mentor: ${detail.mentor}`}
                          </div>
                        )}
                        <p className={`font-bold ${
                          detail.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' :
                          detail.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          {detail.message}
                        </p>
                      </div>
                    </div>
                    {detail.status === 'SUCCESS' && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                    {detail.status === 'WARNING' && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
                    {detail.status === 'ERROR' && <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex pt-2">
            <Button variant="secondary" onClick={resetForm} className="flex-1 rounded-xl bg-[var(--surface-subtle)] font-bold text-xs cursor-pointer py-2.5">
              Import More Deployments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
