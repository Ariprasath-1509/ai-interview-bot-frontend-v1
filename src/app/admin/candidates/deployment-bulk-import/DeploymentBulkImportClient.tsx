'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Users, FileSpreadsheet } from 'lucide-react';

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        setError('Please select an Excel (.xlsx) file');
        return;
      }
      setFile(selectedFile);
      setError(null);
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Import Deployment Data</h1>
        <p className="text-gray-600">Upload Excel file to update deployment information for multiple candidates</p>
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Excel Template
          </Button>
        </div>
      </div>

      {/* File Upload Section */}
      {!importResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Select an Excel (.xlsx) file with deployment data. Required columns: No., Emp ID (optional), Name, Contact Number, Official Mail ID, Personal Mail ID, YOE, Technology, Client Name, Deployed Date (YYYY-MM-DD), Mentor (optional)
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
                {uploading ? 'Processing...' : 'Upload & Import'}
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

      {/* Import Results */}
      {importResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold">{importResult.totalRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Success</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.successCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-600">{importResult.warningCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Failures</p>
                    <p className="text-2xl font-bold text-red-600">{importResult.failureCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Import Details</CardTitle>
              <CardDescription>
                Review the status of each deployment record
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {importResult.details.map((detail, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 p-3 rounded border ${
                      detail.status === 'SUCCESS' ? 'bg-green-50 border-green-200' :
                      detail.status === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-red-50 border-red-200'
                    }`}
                  >
                    <Badge 
                      variant="outline"
                      className="mt-0.5 shrink-0"
                    >
                      Row {detail.rowNumber}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {detail.name && (
                          <span className="text-sm font-medium">{detail.name}</span>
                        )}
                        {detail.email && (
                          <span className="text-xs text-gray-600">{detail.email}</span>
                        )}
                        {detail.empId && (
                          <Badge variant="outline" className="text-xs">{detail.empId}</Badge>
                        )}
                      </div>
                      {detail.clientName && detail.deployedDate && (
                        <div className="text-xs text-gray-600 mb-1">
                          {detail.clientName} • {detail.deployedDate}
                          {detail.mentor && ` • Mentor: ${detail.mentor}`}
                        </div>
                      )}
                      <p className={`text-sm ${
                        detail.status === 'SUCCESS' ? 'text-green-700' :
                        detail.status === 'WARNING' ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {detail.message}
                      </p>
                    </div>
                    {detail.status === 'SUCCESS' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                    {detail.status === 'WARNING' && <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />}
                    {detail.status === 'ERROR' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Import More Deployments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
