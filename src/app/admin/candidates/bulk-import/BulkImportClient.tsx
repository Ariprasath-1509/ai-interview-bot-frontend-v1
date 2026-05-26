'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Users, FileSpreadsheet } from 'lucide-react';

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
}

export default function BulkImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkImportResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      });

      const result = await response.json();

      if (result.ok === false) {
        setError(result.error || 'Import failed');
        return;
      }

      setImportResult(result);
    } catch (err) {
      setError('Failed to process import. Please try again.');
      console.error('Import error:', err);
    } finally {
      setProcessing(false);
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
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Import Candidates</h1>
        <p className="text-gray-600">Upload Excel file to import B2B and Bench candidates with automatic credential generation</p>
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => window.open('/api/admin/bulk-import/template', '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Excel Template
          </Button>
        </div>
      </div>

      {/* File Upload Section */}
      {!validationResult && !importResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Select an Excel (.xlsx) file with candidate data. Required fields are marked with * in the template. At least one email (Official or Personal) must be provided.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                  <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

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
                    <p className="text-sm text-gray-600">Total Rows</p>
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
                    <p className="text-sm text-gray-600">Valid Rows</p>
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
                    <p className="text-sm text-gray-600">Error Rows</p>
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
                        <span className="text-sm text-gray-500">({error.value})</span>
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
                    <p className="text-sm text-gray-500 mt-2">
                      ... and {validationResult.credentialPreviews.length - 10} more candidates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleConfirmImport}
              disabled={!validationResult.canProceed || processing}
              className="flex-1"
            >
              {processing ? 'Creating Accounts...' : `Confirm Import (${validationResult.validRows} candidates)`}
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
                    <p className="text-sm text-gray-600">Successfully Created</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.successCount}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Failed</p>
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
        </div>
      )}
    </div>
  );
}