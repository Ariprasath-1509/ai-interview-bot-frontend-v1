'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { FileText, Upload, Download, Eye, Sparkles, TrendingUp, Users, Briefcase, X, FileDown, UserCheck } from 'lucide-react';
import { downloadCandidateReview } from '@/lib/downloadPdf';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHero, StatCard } from '@/components/common/AppUi';
import {
  CandidatesMainTable,
  DeployedCandidatesTable,
  type CandidateEditForm,
} from '@/app/admin/candidates/CandidatesDirectoryTable';

export interface Candidate {
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
  systemInterviewCount?: number | null;
  empId?: string | null;
  deployedClientName?: string | null;
  deployedDate?: string | null;
  mentor?: string | null;
  batchMentor?: string | null;
  interviewMentorName?: string | null;
  clientName?: string | null;
}

interface Props { role: string; }
type TreeParent = 'all' | 'matched' | 'deployed';

type ImportDetail = {
  row?: number;
  status?: 'SUCCESS' | 'WARNING' | 'FAILED' | string;
  name?: string;
  email?: string;
  message?: string;
};

type ImportResult = {
  successCount: number;
  warningCount: number;
  failureCount: number;
  details?: ImportDetail[];
};

function getEffectiveInterviewCount(candidate: Candidate): number {
  return Math.max(candidate.noOfInterviews ?? 0, candidate.systemInterviewCount ?? 0);
}

export default function CandidatesClient({ role }: Props) {
  const [selectedParent, setSelectedParent] = useState<TreeParent>('all');
  const [selectedSubParent, setSelectedSubParent] = useState<string>('ALL');
  const [openTreeGroups, setOpenTreeGroups] = useState<Record<TreeParent, boolean>>({
    all: true,
    matched: true,
    deployed: true,
  });
  const [masterPaneCollapsed, setMasterPaneCollapsed] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [deployedCandidates, setDeployedCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CandidateEditForm>({
    name: '', email: '', officialEmail: '', personalEmail: '', contactNumber: '',
    batch: '', batchMentor: '', source: '', candidateStatus: '', rating: '',
    skillSet: '', yoeActual: '', yoePortrayed: '', yop: '', noOfInterviews: '',
    interviewMentorName: '', clientName: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState<Array<{
    id: string;
    clientName: string;
    status: string;
    empId?: string;
    candidateName?: string;
    candidateEmail?: string;
    deployedDate: string;
    endDate?: string;
    mentor?: string;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [endingDeployment, setEndingDeployment] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
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
    const t = setTimeout(() => {
      fetchCandidates();
      if (selectedParent === 'deployed') {
        fetchDeployedCandidates();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [selectedParent]);

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

  const allCandidates = candidates.filter(c => {
    // Exclude DEPLOYED candidates from all non-deployed views
    if (c.candidateStatus === 'DEPLOYED') return false;
    
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.batch?.toLowerCase().includes(q);
    const matchesSkill = !filterSkill || c.skillSet === filterSkill;
    const matchesSource = !filterSource || c.source === filterSource;
    const matchesStatus = !filterStatus || c.candidateStatus === filterStatus;
    const matchesRating = !filterRating || c.rating === filterRating;
    return matchesSearch && matchesSkill && matchesSource && matchesStatus && matchesRating;
  });

  const matchedCandidates = allCandidates.filter(c => (c.systemInterviewCount ?? 0) > 0);
  const effectiveBandFor = (candidate: Candidate) => {
    const count = getEffectiveInterviewCount(candidate);
    if (count >= 7) return 'REVIEW_NEEDED';
    if (count >= 5) return 'HIGH_ATTEMPTS';
    if (count >= 3) return 'ELIGIBLE';
    return 'EARLY_STAGE';
  };

  const allStatusGroups = ['ALL', ...Array.from(new Set(allCandidates.map(c => c.candidateStatus || 'UNKNOWN')))];
  const matchedSubGroups = ['ALL', 'ELIGIBLE', 'HIGH_ATTEMPTS', 'REVIEW_NEEDED', 'EARLY_STAGE'];
  const deployedClientGroups = ['ALL', ...Array.from(new Set(deployedCandidates.map(c => c.deployedClientName || 'UNASSIGNED')))];

  const deployedFilteredBySearch = deployedCandidates.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    return Boolean(
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.deployedClientName?.toLowerCase().includes(q) ||
      c.empId?.toLowerCase().includes(q)
    );
  });

  const allTreeFiltered = selectedSubParent === 'ALL'
    ? allCandidates
    : allCandidates.filter(c => (c.candidateStatus || 'UNKNOWN') === selectedSubParent);

  const matchedTreeFiltered = selectedSubParent === 'ALL'
    ? matchedCandidates
    : matchedCandidates.filter(c => effectiveBandFor(c) === selectedSubParent);

  const deployedTreeFiltered = selectedSubParent === 'ALL'
    ? deployedFilteredBySearch
    : deployedFilteredBySearch.filter(c => (c.deployedClientName || 'UNASSIGNED') === selectedSubParent);

  function startEdit(c: Candidate) {
    setEditingId(c.id);
    setEditForm({
      name: c.name ?? '',
      email: c.email ?? '',
      officialEmail: c.officialEmail ?? '',
      personalEmail: c.personalEmail ?? '',
      contactNumber: c.contactNumber ?? '',
      batch: c.batch ?? '',
      batchMentor: c.batchMentor ?? '',
      source: c.source ?? '',
      candidateStatus: c.candidateStatus ?? '',
      rating: c.rating ?? '',
      skillSet: c.skillSet ?? '',
      yoeActual: c.yoeActual?.toString() ?? '',
      yoePortrayed: c.yoePortrayed?.toString() ?? '',
      yop: c.yop?.toString() ?? '',
      noOfInterviews: c.noOfInterviews?.toString() ?? '0',
      interviewMentorName: c.interviewMentorName ?? '',
      clientName: c.clientName ?? '',
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.name) payload.name = editForm.name;
      if (editForm.contactNumber !== '') payload.contactNumber = editForm.contactNumber;
      if (editForm.officialEmail !== '') payload.officialEmail = editForm.officialEmail;
      if (editForm.personalEmail !== '') payload.personalEmail = editForm.personalEmail;
      if (editForm.batch !== '') payload.batch = editForm.batch;
      if (editForm.batchMentor !== '') payload.batchMentor = editForm.batchMentor;
      if (editForm.rating) payload.rating = editForm.rating;
      if (editForm.candidateStatus) payload.candidateStatus = editForm.candidateStatus;
      if (editForm.skillSet) payload.skillSet = editForm.skillSet;
      if (editForm.yoeActual !== '') payload.yoeActual = parseFloat(editForm.yoeActual);
      if (editForm.yoePortrayed !== '') payload.yoePortrayed = parseFloat(editForm.yoePortrayed);
      if (editForm.yop !== '') payload.yop = parseInt(editForm.yop);
      if (editForm.noOfInterviews !== '') payload.noOfInterviews = parseInt(editForm.noOfInterviews);
      if (editForm.interviewMentorName !== '') payload.interviewMentorName = editForm.interviewMentorName;
      if (editForm.clientName !== '') payload.clientName = editForm.clientName;
      if (role === 'SUPER_ADMIN') {
        if (editForm.source) payload.source = editForm.source;
        if (editForm.email) payload.email = editForm.email;
      }

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

  const treeData = selectedParent === 'deployed'
    ? deployedTreeFiltered
    : selectedParent === 'matched'
      ? matchedTreeFiltered
      : allTreeFiltered;

  const toggleTreeGroup = useCallback((key: TreeParent) => {
    setOpenTreeGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(`cand-nav-${key}`, next[key] ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleMasterPane = useCallback(() => {
    setMasterPaneCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('cand-master-pane', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const keys: TreeParent[] = ['all', 'matched', 'deployed'];
        setOpenTreeGroups((prev) => {
          const next = { ...prev };
          for (const k of keys) {
            const v = localStorage.getItem(`cand-nav-${k}`);
            if (v !== null) next[k] = v === '1';
          }
          return next;
        });
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (localStorage.getItem('cand-master-pane') === '1') {
          setMasterPaneCollapsed(true);
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (loading) return <LoadingSpinner message="Loading candidates..." />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 w-full min-w-0 max-w-full animate-in">
      <PageHero
        icon={Users}
        title="Candidate Directory"
        description="Browse, filter, and manage candidates across pipeline, matched, and deployed groups."
        variant="teal"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="All Candidates" value={allCandidates.length} accent="blue" icon={Users} />
        <StatCard title="Matched" value={matchedCandidates.length} accent="emerald" icon={UserCheck} />
        <StatCard title="Deployed" value={deployedCandidates.length} accent="purple" icon={Briefcase} />
      </div>

      {/* Tree View */}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden w-full min-w-0 max-w-full">
        <div
          className={`grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-1 transition-[grid-template-columns] duration-200 ease-out ${
            masterPaneCollapsed
              ? 'lg:grid-cols-[2.75rem_minmax(0,1fr)]'
              : 'lg:grid-cols-[280px_minmax(0,1fr)]'
          }`}
        >
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-200 dark:border-zinc-800">
            {!masterPaneCollapsed && (
              <div className="hidden shrink-0 items-center justify-end border-b border-zinc-200 bg-zinc-50/70 px-1 py-1 dark:border-zinc-800 dark:bg-zinc-900/50 lg:flex">
                <button
                  type="button"
                  onClick={toggleMasterPane}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Collapse candidate list"
                  title="Collapse list"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
            {masterPaneCollapsed && (
              <div className="hidden shrink-0 flex-col items-center border-b border-zinc-200 bg-zinc-50/70 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 lg:flex">
                <button
                  type="button"
                  onClick={toggleMasterPane}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Expand candidate list"
                  title="Expand list"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className={`min-h-0 flex-1 overflow-y-auto ${masterPaneCollapsed ? 'lg:hidden' : ''}`}>
            <button
              type="button"
              aria-expanded={openTreeGroups.all}
              onClick={() => toggleTreeGroup('all')}
              className="flex w-full items-center gap-2 border-b border-zinc-200 bg-zinc-50/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-900/70"
            >
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.all ? 'rotate-90' : ''}`} />
              <span className="flex-1">All Candidates ({allCandidates.length})</span>
            </button>
            {openTreeGroups.all && (
              <div className="border-b border-zinc-200 dark:border-zinc-800">
                {allStatusGroups.map(group => (
                  <button
                    type="button"
                    key={`all-${group}`}
                    onClick={() => {
                      setSelectedParent('all');
                      setSelectedSubParent(group);
                    }}
                    className={`w-full text-left px-6 py-2.5 text-sm transition-colors ${
                      selectedParent === 'all' && selectedSubParent === group
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    {group === 'ALL' ? 'All' : group}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              aria-expanded={openTreeGroups.matched}
              onClick={() => toggleTreeGroup('matched')}
              className="flex w-full items-center gap-2 border-b border-zinc-200 bg-zinc-50/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-900/70"
            >
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.matched ? 'rotate-90' : ''}`} />
              <span className="flex-1">Matched Candidates ({matchedCandidates.length})</span>
            </button>
            {openTreeGroups.matched && (
              <div className="border-b border-zinc-200 dark:border-zinc-800">
                {matchedSubGroups.map(group => (
                  <button
                    type="button"
                    key={`matched-${group}`}
                    onClick={() => {
                      setSelectedParent('matched');
                      setSelectedSubParent(group);
                    }}
                    className={`w-full text-left px-6 py-2.5 text-sm transition-colors ${
                      selectedParent === 'matched' && selectedSubParent === group
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    {group.replaceAll('_', ' ')}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              aria-expanded={openTreeGroups.deployed}
              onClick={() => toggleTreeGroup('deployed')}
              className="flex w-full items-center gap-2 border-b border-zinc-200 bg-zinc-50/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-900/70"
            >
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.deployed ? 'rotate-90' : ''}`} />
              <span className="flex-1">Deployed Candidates ({deployedCandidates.length})</span>
            </button>
            {openTreeGroups.deployed && (
              <div>
                {deployedClientGroups.map(group => (
                  <button
                    type="button"
                    key={`deployed-${group}`}
                    onClick={() => {
                      setSelectedParent('deployed');
                      setSelectedSubParent(group);
                    }}
                    className={`w-full text-left px-6 py-2.5 text-sm transition-colors ${
                      selectedParent === 'deployed' && selectedSubParent === group
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    {group === 'ALL' ? 'All' : group}
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-6 space-y-4">
            {selectedParent !== 'deployed' ? (
              <>
                <div className="card p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                    <div className="md:col-span-2">
                      <input
                        className={inputCls}
                        placeholder="Search by name, email, or batch…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select className={inputCls} value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
                      <option value="">All Skills</option>
                      <option value="JAVA_SB">Java + SB</option>
                      <option value="JFSR">JFSR</option>
                      <option value="REACT_JS">React JS</option>
                      <option value="ANGULAR">Angular</option>
                      <option value="PYTHON">Python</option>
                      <option value="QA_ENGINEER">QA Engineer</option>
                      <option value="PLAYWRIGHT_AUTOMATION">Playwright</option>
                    </select>
                    <select className={inputCls} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                      <option value="">All Sources</option>
                      <option value="B2B">B2B</option>
                      <option value="BENCH">Bench</option>
                      <option value="MARKET">Market</option>
                    </select>
                    <select className={inputCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="RFD">RFD</option>
                      <option value="WFD">WFD</option>
                      <option value="DOB">DOB</option>
                      <option value="TRAINING">Training</option>
                    </select>
                    <select className={inputCls} value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
                      <option value="">All Ratings</option>
                      <option value="ASSET">Asset</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LIABILITY">Liability</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-6">
                <input
                  className={inputCls}
                  placeholder="Search deployed candidates by name, email, client, emp id..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{treeData.length}</span> candidate
                {treeData.length !== 1 ? "s" : ""} found
              </div>
              <div className="flex items-center gap-2">
                {selectedParent === "deployed" && (
                  <Button
                    onClick={() => setShowBulkImportDialog(true)}
                    className="h-8 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    Bulk Import
                  </Button>
                )}
                <button
                  type="button"
                  onClick={selectedParent === "deployed" ? fetchDeployedCandidates : fetchCandidates}
                  className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Refresh
                </button>
              </div>
            </div>

            {selectedParent !== "deployed" ? (
              <div className="card min-w-0 p-4">
                <CandidatesMainTable
                  data={treeData}
                  role={role}
                  editingId={editingId}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  saving={saving}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  handlers={{
                    onStartEdit: startEdit,
                    onResumeUpload: handleResumeUpload,
                    onDownloadResume: handleDownloadResume,
                    onCreateInterview: handleCreateInterview,
                    onViewHistory: handleViewHistory,
                    onDownloadPdf: async (id, name) => {
                      setDownloadingPdf(id);
                      try {
                        const result = await downloadCandidateReview(id, name);
                        if (!result.success) toast(result.error!, 'error');
                      } finally {
                        setDownloadingPdf(null);
                      }
                    },
                  }}
                  selectSmCls={selectSmCls}
                />
              </div>
            ) : (
              <div className="card min-w-0 overflow-hidden p-4">
                <DeployedCandidatesTable
                  data={treeData}
                  endingDeploymentId={endingDeployment}
                  handlers={{
                    onViewHistory: handleViewHistory,
                    onEndDeployment: handleEndDeployment,
                  }}
                />
                {treeData.length === 0 && (
                  <div className="mt-6 border-t border-zinc-200 pt-6 text-center dark:border-zinc-800">
                    <Briefcase className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No deployed candidates found.</p>
                    <Button onClick={() => setShowBulkImportDialog(true)} variant="outline" className="mt-4">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Deployments
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
                        {importResult.details?.map((detail, idx: number) => (
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
              {deploymentHistory.map((history) => (
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
