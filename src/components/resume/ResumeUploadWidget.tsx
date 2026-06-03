'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, Sparkles, Edit3, Eye, Download, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/common/Toast';

interface ResumeUploadWidgetProps {
  candidateId?: string;
  onSummaryGenerated?: (summary: string) => void;
  onAutoFillTriggered?: () => void;
  className?: string;
  compact?: boolean;
}

interface ResumeData {
  filename: string;
  uploadedAt: string;
  summary: string | null;
  hasFile: boolean;
}

const ACCEPTED = '.pdf,.doc,.docx';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ResumeUploadWidget({ 
  candidateId, 
  onSummaryGenerated, 
  onAutoFillTriggered,
  className = '',
  compact = false 
}: ResumeUploadWidgetProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [existingResume, setExistingResume] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    
    if (selectedFile.size > MAX_SIZE) {
      toast('File must be under 5MB', 'error');
      return;
    }
    
    if (!selectedFile.type.match(/(pdf|msword|wordprocessingml)/)) {
      toast('Please upload PDF, DOC, or DOCX files only', 'error');
      return;
    }
    
    setFile(selectedFile);
  }, [toast]);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  // Upload and process resume
  const handleUpload = async () => {
    if (!file || !candidateId) {
      toast('Missing file or candidate ID', 'error');
      return;
    }
    
    setUploading(true);
    setProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      console.log('Uploading resume for candidate:', candidateId);
      
      const response = await fetch(`/api/candidates/${candidateId}/resume`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setExistingResume({
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          summary: result.summary,
          hasFile: true
        });
        
        setSummaryText(result.summary || '');
        setFile(null);
        
        if (result.summary && onSummaryGenerated) {
          onSummaryGenerated(result.summary);
        }
        
        toast('Resume uploaded and processed successfully', 'success');
        
        // Clear file input
        if (inputRef.current) inputRef.current.value = '';
        
      } else {
        const error = await response.json().catch(() => null);
        toast(error?.error || 'Upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast('Upload failed', 'error');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const clear = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Resume</p>
                {existingResume ? (
                  <p className="text-xs text-zinc-500">{existingResume.filename}</p>
                ) : (
                  <p className="text-xs text-zinc-500">No resume uploaded</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {existingResume?.summary && onAutoFillTriggered && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAutoFillTriggered}
                  className="flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-fill
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                Upload
              </Button>
            </div>
          </div>
          
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                : file
                ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileText className="h-12 w-12 text-green-600" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                  <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                
              <div className="flex gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={uploading || !candidateId}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      {processing ? 'Processing...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload & Process
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); clear(); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {!candidateId && (
                <p className="text-xs text-red-500 mt-2">
                  No candidate ID provided
                </p>
              )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    Drop your resume here or click to browse
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    PDF, DOC, DOCX — max 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Resume */}
      {existingResume && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Current Resume</p>
                  <p className="text-sm text-zinc-500">{existingResume.filename}</p>
                  <p className="text-xs text-zinc-400">
                    Uploaded {new Date(existingResume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {existingResume.summary && onAutoFillTriggered && (
                  <Button
                    size="sm"
                    onClick={onAutoFillTriggered}
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-fill Form
                  </Button>
                )}
              </div>
            </div>

            {/* Resume Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">AI-Generated Summary</p>
              </div>
              
              {existingResume.summary ? (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {existingResume.summary}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">No summary available</span>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                    Upload a new resume to generate an AI summary
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}