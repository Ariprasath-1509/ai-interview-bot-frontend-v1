'use client';

import { useState, useEffect } from 'react';
import { Pagination, usePagination } from '@/components/common/Pagination';
import { SkeletonTable } from '@/components/common/Skeleton';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { FileText, Upload, Download, Eye, Sparkles, TrendingUp, Users, Briefcase, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Candidate {
  id: string;
  name: string;
  email: string;
  contactNumber: string | null;
  officialEmail: string | null;
  personalEmail: string | null;
  batch: string | null;
  source: string | null;
  candidateStatus: string | null;
  rating: string | null;
  skillSet: string | null;
  yoeActual: number | null;
  yoePortrayed: number | null;
  noOfInterviews: number | null;
  yop: number | null;
  resumeFilename?: string | null;
  resumeSummary?: string | null;
  resumeUploadedAt?: string | null;
  empId?: string | null;
  deployedClientName?: string | null;
  deployedDate?: string | null;
  mentor?: string | null;
  batchMentor?: string | null;
  interviewMentorName?: string | null;
  clientName?: string | null;
}

const SKILL_LABEL: Record<string, string> = { JAVA_SB: 'Java + SB', JFSR: 'JFSR', REACT_JS: 'React JS' };
const SOURCE_LABEL: Record<string, string> = { B2B: 'B2B', BENCH: 'Bench', MARKET: 'Market' };

const RATING_BADGE: Record<string, string> = {
  ASSET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  LIABILITY: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50',
};

const STATUS_BADGE: Record<string, string> = {
  RFD: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  WFD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  DOB: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  TRAINING: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/50',
  DEPLOYED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50',
};

export default function CandidatesClient() {
  const [activeTab, setActiveTab] = useState<'all' | 'deployed'>('all');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [deployedCandidates, setDeployedCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: '', candidateStatus: '', noOfInterviews: '' });
  const [saving, setSaving] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState<Record<string, any[]>>({});
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [endingDeployment, setEndingDeployment] = useState<string | null>(null);
  const { confirm } = useConfirm();

  const { toast } = useToast();

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates?search=');
      if (res.ok) {
        const candidatesData = await res.json();
        setCandidates(candidatesData);
      }
    } catch (e) {
      console.error('Failed to fetch candidates:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployedCandidates = async () => {
    try {
      const res = await fetch('/api/admin/candidates/deployment');
      if (res.ok) {
        setDeployedCandidates(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch deployed candidates:', e);
    }
  };

  useEffect(() => { 
    fetchCandidates(); 
    if (activeTab === 'deployed') {
      fetchDeployedCandidates();
    }
  }, [activeTab]);

  const handleResumeUpload = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
      setShowResumeDialog(true);
    }
  };

  const handleCreateInterview = (candidate: Candidate) => {
    const params = new URLSearchParams({
      candidateId: candidate.id,
      engineerEmail: candidate.email,
      engineerName: candidate.name || '',
    });
    
    if (candidate.resumeSummary) {
      params.append('resumeSummary', candidate.resumeSummary);
    }
    
    window.location.href = `/admin/interviews/create?${params.toString()}`;
  };

  const handleDownloadResume = async (candidateId: string, filename: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/resume/download`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast('Failed to download resume', 'error');
      }
    } catch (error) {
      toast('Error downloading resume', 'error');
    }
  };

  const filtered = candidates.filter(c => {
    // Exclude DEPLOYED candidates from All Candidates tab
    if (c.candidateStatus === 'DEPLOYED') return false;
    
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.batch?.toLowerCase().includes(q);
    const matchesSkill = !filterSkill || c.skillSet === filterSkill;
    const matchesSource = !filterSource || c.source === filterSource;
    const matchesStatus = !filterStatus || c.candidateStatus === filterStatus;
    const matchesRating = !filterRating || c.rating === filterRating;
    return matchesSearch && matchesSkill && matchesSource && matchesStatus && matchesRating;
  });

  function startEdit(c: Candidate) {
    setEditingId(c.id);
    setEditForm({
      rating: c.rating ?? '',
      candidateStatus: c.candidateStatus ?? '',
      noOfInterviews: c.noOfInterviews?.toString() ?? '0',
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.rating) payload.rating = editForm.rating;
      if (editForm.candidateStatus) payload.candidateStatus = editForm.candidateStatus;
      if (editForm.noOfInterviews !== '') payload.noOfInterviews = parseInt(editForm.noOfInterviews);

      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingId(null);
        fetchCandidates();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? 'Failed to update candidate');
      }
    } catch {
      alert('Error updating candidate');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'input-base';
  const selectSmCls = 'px-2 py-1 text-xs border rounded-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500';

  const handleBulkImportDeployment = async (file: File) => {
    setUploadingFile(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/admin/candidates/deployment/bulk-import', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        toast(`Imported ${result.successCount} deployments successfully`, 'success');
        fetchDeployedCandidates();
      } else {
        toast('Failed to import deployments', 'error');
      }
    } catch (e) {
      toast('Error uploading file', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Emp ID', 'Email', 'Client Name', 'Deployed Date', 'Mentor'];
    const sample = ['EMP001', 'john@company.com', 'TechCorp', '2024-01-15', 'Jane Smith'];
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewHistory = async (candidateId: string) => {
    setLoadingHistory(true);
    setShowHistoryDialog(true);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/deployment-history`);
      if (res.ok) {
        const history = await res.json();
        setDeploymentHistory(history);
      } else {
        toast('Failed to load deployment history', 'error');
      }
    } catch (e) {
      toast('Error loading deployment history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEndDeployment = async (candidateId: string, candidateName: string) => {
    const confirmed = await confirm({
      title: `End deployment for ${candidateName}?`,
      message: 'This will move the candidate back to B2B (RFD status) and mark the deployment as completed.',
      confirmLabel: 'End Deployment',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    setEndingDeployment(candidateId);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/end-deployment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        toast('Deployment ended successfully', 'success');
        fetchDeployedCandidates();
      } else {
        toast('Failed to end deployment', 'error');
      }
    } catch (e) {
      toast('Error ending deployment', 'error');
    } finally {
      setEndingDeployment(null);
    }
  };

  const { page, totalPages, paginated, setPage } = usePagination(
    activeTab === 'all' ? filtered : deployedCandidates, 
    15
  );

  if (loading) return <LoadingSpinner message="Loading candidates..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Candidates</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage candidate profiles and deployments</p>
        </div>
        {activeTab === 'deployed' && (
          <Button
            onClick={() => setShowBulkImportDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import Deployments
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            All Candidates
          </button>
          <button
            onClick={() => setActiveTab('deployed')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'deployed'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Briefcase className="w-4 h-4 inline mr-2" />
            Deployed Candidates
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Search & Filters */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <input
                  className={inputCls}
                  placeholder="Search by name, email, or batch…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className={inputCls} value={filterSkill} onChange={e => setFilterSkill(e.target.value)}>
                <option value="">All Skills</option>
                <option value="JAVA_SB">Java + SB</option>
                <option value="JFSR">JFSR</option>
                <option value="REACT_JS">React JS</option>
              </select>
              <select className={inputCls} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                <option value="">All Sources</option>
                <option value="B2B">B2B</option>
                <option value="BENCH">Bench</option>
                <option value="MARKET">Market</option>
              </select>
              <select className={inputCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="RFD">RFD</option>
                <option value="WFD">WFD</option>
                <option value="DOB">DOB</option>
                <option value="TRAINING">Training</option>
              </select>
              <select className={inputCls} value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                <option value="">All Ratings</option>
                <option value="ASSET">Asset</option>
                <option value="MEDIUM">Medium</option>
                <option value="LIABILITY">Liability</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filtered.length}</span> candidate{filtered.length !== 1 ? 's' : ''} found
            </div>
            <button 
              onClick={fetchCandidates} 
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Refresh
            </button>
          </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Name</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Contact</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Batch</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Batch Mentor</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Source</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Skill</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">YOE (A/P)</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">YOP</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Resume</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Rating</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Interviews</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Interview Mentor</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Client</th>
              <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Matching</th>
              <th className="px-3 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {paginated.length > 0 ? paginated.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="px-3 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{c.name || '—'}</div>
                  <div className="text-[11px] text-zinc-400">{c.email}</div>
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                  {c.contactNumber || '—'}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{c.batch || '—'}</td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{c.batchMentor || '—'}</td>
                <td className="px-3 py-3">
                  {c.source ? (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {SOURCE_LABEL[c.source] ?? c.source}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-3">
                  {c.skillSet ? (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {SKILL_LABEL[c.skillSet] ?? c.skillSet}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                  {c.yoeActual != null ? `${c.yoeActual} / ${c.yoePortrayed ?? '—'}` : '—'}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{c.yop ?? '—'}</td>
                
                {/* Resume Column */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {c.resumeFilename ? (
                      <>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <FileText className="h-3 w-3 mr-1" />
                          Resume
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadResume(c.id, c.resumeFilename!)}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResumeUpload(c.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 h-6 px-2"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </td>

                {/* Editable fields */}
                {editingId === c.id ? (
                  <>
                    <td className="px-3 py-3">
                      <select className={selectSmCls} value={editForm.candidateStatus} onChange={e => setEditForm(p => ({ ...p, candidateStatus: e.target.value }))}>
                        <option value="">—</option>
                        <option value="RFD">RFD</option>
                        <option value="WFD">WFD</option>
                        <option value="DOB">DOB</option>
                        <option value="TRAINING">Training</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select className={selectSmCls} value={editForm.rating} onChange={e => setEditForm(p => ({ ...p, rating: e.target.value }))}>
                        <option value="">—</option>
                        <option value="ASSET">Asset</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LIABILITY">Liability</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number" min="0" className={`${selectSmCls} w-16`}
                        value={editForm.noOfInterviews}
                        onChange={e => setEditForm(p => ({ ...p, noOfInterviews: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={saving}
                          className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {saving ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-3">
                      {c.candidateStatus ? (
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_BADGE[c.candidateStatus] ?? ''}`}>
                          {c.candidateStatus}
                        </span>
                      ) : <span className="text-zinc-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {c.rating ? (
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${RATING_BADGE[c.rating] ?? ''}`}>
                          {c.rating}
                        </span>
                      ) : <span className="text-zinc-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-mono">
                      {c.noOfInterviews ?? 0}
                    </td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{c.interviewMentorName || '—'}</td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{c.clientName || '—'}</td>
                    <td className="px-3 py-3">
                      <a
                        href="/admin/clients/matching"
                        className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                      >
                        View Matches
                      </a>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewHistory(c.id)}
                          className="text-purple-600 dark:text-purple-400 hover:underline text-xs font-medium"
                        >
                          History
                        </button>
                        {c.resumeSummary && (
                          <button
                            onClick={() => handleCreateInterview(c)}
                            className="text-green-600 dark:text-green-400 hover:underline text-xs font-medium flex items-center gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Interview
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No candidates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>
      ) : (
        <>
          {/* Deployed Candidates Tab */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deployedCandidates.length}</span> deployed candidate{deployedCandidates.length !== 1 ? 's' : ''}
            </div>
            <button 
              onClick={fetchDeployedCandidates} 
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Deployed Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">No.</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Emp ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Official Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Personal Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">YOE</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Technology</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Client Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Deployed Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Mentor</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {deployedCandidates.length > 0 ? deployedCandidates.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-4">
                        {c.empId ? (
                          <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{c.empId}</span>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name || '—'}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{c.email}</div>
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs">{c.contactNumber || '—'}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs">{c.officialEmail || '—'}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs">{c.personalEmail || '—'}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs font-mono">{c.yoeActual ?? '—'}</td>
                      <td className="px-4 py-4">
                        {c.skillSet ? (
                          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {SKILL_LABEL[c.skillSet] ?? c.skillSet}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{c.deployedClientName || '—'}</div>
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs">
                        {c.deployedDate ? new Date(c.deployedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 text-xs">{c.mentor || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewHistory(c.id)}
                            className="text-xs h-8 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            History
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEndDeployment(c.id, c.name || 'Candidate')}
                            disabled={endingDeployment === c.id}
                            className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {endingDeployment === c.id ? 'Ending...' : 'End Deployment'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center">
                        <Briefcase className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No deployed candidates found.</p>
                        <Button
                          onClick={() => setShowBulkImportDialog(true)}
                          variant="outline"
                          className="mt-4"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import Deployments
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Resume Upload Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Upload Resume - {selectedCandidate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <ResumeUploadWidget
              candidateId={selectedCandidate.id}
              onSummaryGenerated={() => {
                fetchCandidates();
                toast('Resume processed successfully', 'success');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Deployment Dialog */}
      <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Bulk Import Deployment Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full p-2 mt-0.5">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    <strong>Template Format:</strong> Emp ID, Email, Client Name, Deployed Date (YYYY-MM-DD), Mentor (optional)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Candidates will be matched by email (official or personal). Only existing candidates can be deployed.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors bg-zinc-50 dark:bg-zinc-900/50">
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkImportDeployment(file);
                }}
                className="hidden"
                id="deployment-file-upload"
                disabled={uploadingFile}
              />
              <label
                htmlFor="deployment-file-upload"
                className={`cursor-pointer inline-flex flex-col items-center ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingFile ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                ) : (
                  <Upload className="h-12 w-12 text-blue-500 mb-3" />
                )}
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {uploadingFile ? 'Uploading...' : 'Click to upload Excel file'}
                </span>
                <span className="text-xs text-zinc-500 mt-1">Supports .xlsx and .csv formats</span>
              </label>
            </div>

            {importResult && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300">{importResult.successCount}</div>
                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">Success</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{importResult.warningCount}</div>
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">Warnings</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-red-700 dark:text-red-300">{importResult.failureCount}</div>
                    <div className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">Failed</div>
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import Details</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">Row</th>
                          <th className="px-4 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
                          <th className="px-4 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {importResult.details?.map((detail: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-400">{detail.row}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                                detail.status === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                detail.status === 'WARNING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {detail.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                              {detail.name || detail.email || detail.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deployment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Deployment History</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <div className="text-sm text-zinc-500">Loading history...</div>
              </div>
            </div>
          ) : deploymentHistory.length > 0 ? (
            <div className="space-y-3">
              {deploymentHistory.map((history, idx) => (
                <div 
                  key={history.id} 
                  className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:shadow-md transition-shadow bg-white dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{history.clientName}</h4>
                        <Badge 
                          variant={history.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={history.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                        >
                          {history.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {history.empId && <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{history.empId}</span>}
                        {history.empId && ' • '}
                        {history.candidateName} <span className="text-zinc-400">({history.candidateEmail})</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Deployed Date</span>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {new Date(history.deployedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">End Date</span>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {history.endDate ? new Date(history.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (
                          <span className="text-green-600 dark:text-green-400">Currently Active</span>
                        )}
                      </div>
                    </div>
                    {history.mentor && (
                      <div className="col-span-2">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Mentor</span>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{history.mentor}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No deployment history found.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
