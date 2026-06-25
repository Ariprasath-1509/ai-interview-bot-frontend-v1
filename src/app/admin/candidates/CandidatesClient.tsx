'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { FileText, Upload, Download, Eye, Sparkles, TrendingUp, Users, Briefcase, X, FileDown, UserCheck, UserPlus, ChevronRight, ChevronLeft } from 'lucide-react';
import { downloadCandidateReview } from '@/lib/downloadPdf';
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
import { isStaffReadRole } from '@/lib/staffRoles';

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
  branch?: string | null;
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

type AddCandidateForm = {
  name: string;
  officialEmail: string;
  personalEmail: string;
  contactNumber: string;
  batch: string;
  batchMentor: string;
  source: string;
  candidateStatus: string;
  rating: string;
  skillSet: string;
  yoeActual: string;
  yoePortrayed: string;
  yop: string;
  interviewMentorName: string;
  clientName: string;
  branch: string;
};

const emptyAddForm = (): AddCandidateForm => ({
  name: '',
  officialEmail: '',
  personalEmail: '',
  contactNumber: '',
  batch: '',
  batchMentor: '',
  source: '',
  candidateStatus: 'TRAINING',
  rating: '',
  skillSet: '',
  yoeActual: '',
  yoePortrayed: '',
  yop: '',
  interviewMentorName: '',
  clientName: '',
  branch: 'DEVELOPMENT',
});

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
    interviewMentorName: '', clientName: '', branch: 'DEVELOPMENT',
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<AddCandidateForm>(emptyAddForm);
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showMarketCandidateDialog, setShowMarketCandidateDialog] = useState(false);
  const [marketForm, setMarketForm] = useState({ name: '', email: '', contactNumber: '', branch: 'DEVELOPMENT' });
  const [creatingMarket, setCreatingMarket] = useState(false);
  const [marketCreated, setMarketCreated] = useState<{ email: string; generatedPassword: string } | null>(null);
  const [skillOptions, setSkillOptions] = useState<{ value: string; label: string }[]>([]);
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

  const handleCreateMarketCandidate = async () => {
    if (!marketForm.name.trim() || !marketForm.email.trim()) {
      toast('Name and email are required', 'error');
      return;
    }
    setCreatingMarket(true);
    try {
      const res = await fetch('/api/candidates/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(marketForm),
      });
      if (res.ok) {
        const data = await res.json();
        setMarketCreated({ email: data.email, generatedPassword: data.generatedPassword });
        fetchCandidates();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? 'Failed to create market candidate', 'error');
      }
    } catch {
      toast('Error creating market candidate', 'error');
    } finally {
      setCreatingMarket(false);
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
    fetchDeployedCandidates();
  }, [selectedParent]);

  useEffect(() => {
    fetch('/api/admin/master-data/lookups/SKILL_SET')
        .then((r) => r.json())
        .then((json) => {
          const entries: { code: string; label: string }[] = json?.data ?? json ?? [];
          if (Array.isArray(entries) && entries.length > 0) {
            setSkillOptions(entries.map((e) => ({ value: e.code, label: e.label })));
          }
        })
        .catch(() => {});
  }, []);

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
  const allStatusCounts = allCandidates.reduce<Record<string, number>>((acc, c) => {
    const key = c.candidateStatus || 'UNKNOWN';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, { ALL: allCandidates.length });
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
      branch: c.branch ?? 'DEVELOPMENT',
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
        if (editForm.branch) payload.branch = editForm.branch;
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
  const canAddCandidate = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const handleAddCandidate = async () => {
    if (!addForm.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    if (!addForm.officialEmail.trim() && !addForm.personalEmail.trim()) {
      toast('Official or personal email is required', 'error');
      return;
    }
    if (!addForm.contactNumber.trim() || !addForm.batch.trim() || !addForm.source || !addForm.skillSet) {
      toast('Contact number, batch, source, and skill set are required', 'error');
      return;
    }

    setCreatingCandidate(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        officialEmail: addForm.officialEmail.trim() || null,
        personalEmail: addForm.personalEmail.trim() || null,
        contactNumber: addForm.contactNumber.trim(),
        batch: addForm.batch.trim(),
        batchMentor: addForm.batchMentor.trim() || null,
        source: addForm.source,
        candidateStatus: addForm.candidateStatus || 'TRAINING',
        rating: addForm.rating || null,
        skillSet: addForm.skillSet,
        yoeActual: addForm.yoeActual ? parseFloat(addForm.yoeActual) : null,
        yoePortrayed: addForm.yoePortrayed ? parseFloat(addForm.yoePortrayed) : null,
        yop: addForm.yop ? parseInt(addForm.yop, 10) : null,
        interviewMentorName: addForm.interviewMentorName.trim() || null,
        clientName: addForm.clientName.trim() || null,
        branch: addForm.branch || 'DEVELOPMENT',
      };

      const res = await fetch('/api/auth/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? 'Failed to create candidate', 'error');
        return;
      }

      setCreatedCredentials({
        username: data.username ?? '',
        password: data.password ?? '',
      });
      toast('Candidate created successfully.', 'success');
      await fetchCandidates();
    } catch {
      toast('Error creating candidate', 'error');
    } finally {
      setCreatingCandidate(false);
    }
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setAddForm(emptyAddForm());
    setCreatedCredentials(null);
  };

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
      } catch {}
      return next;
    });
  }, []);

  const toggleMasterPane = useCallback(() => {
    setMasterPaneCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('cand-master-pane', next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
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
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem('cand-master-pane') === '1') {
        setMasterPaneCollapsed(true);
      }
    } catch {}
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

        {/* Tree View Structure Wrapper */}
        <div className="card flex min-h-0 flex-1 flex-col overflow-hidden w-full min-w-0 max-w-full">
          <div
              className={`grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-1 transition-[grid-template-columns] duration-200 ease-out ${
                  masterPaneCollapsed
                      ? 'xl:grid-cols-[2.75rem_minmax(0,1fr)]'
                      : 'xl:grid-cols-[240px_minmax(0,1fr)]'
              }`}
          >
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-200 dark:border-zinc-800">
              {!masterPaneCollapsed && (
                  <div className="hidden shrink-0 items-center justify-end border-b border-zinc-200 bg-zinc-50/70 px-1 py-1 dark:border-zinc-800 dark:bg-zinc-900/50 xl:flex">
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
                  <div className="hidden shrink-0 flex-col items-center border-b border-zinc-200 bg-zinc-50/70 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 xl:flex">
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

              <div className={`min-h-0 flex-1 overflow-y-auto ${masterPaneCollapsed ? 'xl:hidden' : ''}`}>
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
                            {' '}
                            <span className="text-zinc-400">({allStatusCounts[group] ?? 0})</span>
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

            {/* Main Dashboard Panel Content */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-6 space-y-4">
              {selectedParent !== 'deployed' ? (
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
                        {skillOptions.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
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
                  {canAddCandidate && selectedParent !== 'deployed' && (
                    <>
                      <Button
                          onClick={() => setShowAddDialog(true)}
                          className="h-8 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Add Candidate
                      </Button>
                      <Button
                          onClick={() => { setShowMarketCandidateDialog(true); setMarketCreated(null); setMarketForm({ name: '', email: '', contactNumber: '', branch: 'DEVELOPMENT' }); }}
                          className="h-8 bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Market Candidate
                      </Button>
                    </>
                  )}
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
                        showBranchColumn={isStaffReadRole(role)}
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
                        </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Resume Upload Dialog */}
        <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <DialogContent className="max-w-2xl dark:bg-zinc-950">
            <DialogHeader className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-left text-xl">
                    {selectedCandidate?.resumeFilename ? "Replace Resume" : "Upload Resume"}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Upload on behalf of the candidate. The file is parsed and an AI summary is generated automatically.
                  </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowResumeDialog(false)}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6 pt-2">
              {selectedCandidate && (
                  <ResumeUploadWidget
                      candidateId={selectedCandidate.id}
                      candidateName={selectedCandidate.name}
                      candidateEmail={selectedCandidate.officialEmail || selectedCandidate.personalEmail || selectedCandidate.email}
                      initialResume={{
                        filename: selectedCandidate.resumeFilename ?? null,
                        summary: selectedCandidate.resumeSummary ?? null,
                        uploadedAt: selectedCandidate.resumeUploadedAt ?? null,
                      }}
                      onDownload={() => handleDownloadResume(selectedCandidate.id, selectedCandidate.resumeFilename || "resume.pdf")}
                      onUploadComplete={() => {
                        fetchCandidates();
                        setShowResumeDialog(false);
                      }}
                  />
              )}
            </div>
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

        {/* Add Candidate Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) closeAddDialog(); else setShowAddDialog(true); }}>
          <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg">
                  <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Add New Candidate
              </DialogTitle>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Fields marked <span className="text-red-500 font-semibold">*</span> are required. At least one email must be provided.
              </p>
            </DialogHeader>

            {createdCredentials ? (
              <div className="space-y-4 p-1">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">Candidate created successfully</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">Credentials emailed if an address was provided. Save them below.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Username (Email)</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{createdCredentials.username}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Temporary Password</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{createdCredentials.password}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> The password cannot be retrieved later — share it with the candidate now.
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={closeAddDialog} className="bg-emerald-600 hover:bg-emerald-700">Done</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-1">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-3 w-1 bg-blue-500 rounded-full"></div>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2 grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name <span className="text-red-500">*</span></span>
                      <input className={`${inputCls}`} placeholder="Enter candidate's full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Official Email</span>
                      <input className={inputCls} type="email" placeholder="official@company.com" value={addForm.officialEmail} onChange={(e) => setAddForm((f) => ({ ...f, officialEmail: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Personal Email</span>
                      <input className={inputCls} type="email" placeholder="personal@email.com" value={addForm.personalEmail} onChange={(e) => setAddForm((f) => ({ ...f, personalEmail: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Contact Number <span className="text-red-500">*</span></span>
                      <input className={inputCls} placeholder="+91 98765 43210" value={addForm.contactNumber} onChange={(e) => setAddForm((f) => ({ ...f, contactNumber: e.target.value }))} />
                    </label>
                  </div>
                </div>

                {/* Organization Details */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-3 w-1 bg-emerald-500 rounded-full"></div>
                    Organization Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Batch (DOH) <span className="text-red-500">*</span></span>
                      <input className={inputCls} placeholder="e.g., 2024-01" value={addForm.batch} onChange={(e) => setAddForm((f) => ({ ...f, batch: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Batch Mentor</span>
                      <input className={inputCls} placeholder="Mentor name" value={addForm.batchMentor} onChange={(e) => setAddForm((f) => ({ ...f, batchMentor: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Interview Mentor</span>
                      <input className={inputCls} placeholder="Mentor name" value={addForm.interviewMentorName} onChange={(e) => setAddForm((f) => ({ ...f, interviewMentorName: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Source <span className="text-red-500">*</span></span>
                      <select className={inputCls} value={addForm.source} onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))}>
                        <option value="">Select source</option>
                        <option value="B2B">B2B</option>
                        <option value="BENCH">Bench</option>
                        <option value="MARKET">Market</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
                      <select className={inputCls} value={addForm.candidateStatus} onChange={(e) => setAddForm((f) => ({ ...f, candidateStatus: e.target.value }))}>
                        <option value="TRAINING">Training</option>
                        <option value="RFD">RFD</option>
                        <option value="WFD">WFD</option>
                        <option value="DOB">DOB</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rating</span>
                      <select className={inputCls} value={addForm.rating} onChange={(e) => setAddForm((f) => ({ ...f, rating: e.target.value }))}>
                        <option value="">None</option>
                        <option value="ASSET">Asset</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LIABILITY">Liability</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Branch <span className="text-red-500">*</span></span>
                      <select className={inputCls} value={addForm.branch} onChange={(e) => setAddForm((f) => ({ ...f, branch: e.target.value }))}>
                        <option value="DEVELOPMENT">Development</option>
                        <option value="TESTING">Testing</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Skills & Experience */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-3 w-1 bg-purple-500 rounded-full"></div>
                    Skills &amp; Experience
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Skill Set <span className="text-red-500">*</span></span>
                      <select className={inputCls} value={addForm.skillSet} onChange={(e) => setAddForm((f) => ({ ...f, skillSet: e.target.value }))}>
                        <option value="">Select skill</option>
                        {skillOptions.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Client Name</span>
                      <input className={inputCls} placeholder="Current/target client name" value={addForm.clientName} onChange={(e) => setAddForm((f) => ({ ...f, clientName: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">YOE Actual</span>
                      <input className={inputCls} type="number" step="0.1" placeholder="e.g., 3.5" value={addForm.yoeActual} onChange={(e) => setAddForm((f) => ({ ...f, yoeActual: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">YOE Portrayed</span>
                      <input className={inputCls} type="number" step="0.1" placeholder="e.g., 5.0" value={addForm.yoePortrayed} onChange={(e) => setAddForm((f) => ({ ...f, yoePortrayed: e.target.value }))} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Year of Passing</span>
                      <input className={inputCls} type="number" placeholder="e.g., 2020" value={addForm.yop} onChange={(e) => setAddForm((f) => ({ ...f, yop: e.target.value }))} />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Button variant="outline" onClick={closeAddDialog} disabled={creatingCandidate}>Cancel</Button>
                  <Button onClick={handleAddCandidate} disabled={creatingCandidate} className="bg-emerald-600 hover:bg-emerald-700">
                    {creatingCandidate ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>Creating…</>
                    ) : (
                      <><UserPlus className="mr-2 h-4 w-4" />Create Candidate</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Market Candidate Dialog */}
        <Dialog open={showMarketCandidateDialog} onOpenChange={(open) => { if (!open) { setShowMarketCandidateDialog(false); setMarketCreated(null); } else setShowMarketCandidateDialog(true); }}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
                <div className="bg-violet-100 dark:bg-violet-900/30 p-1.5 rounded-lg">
                  <UserPlus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                Add Market Candidate
              </DialogTitle>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                External candidate — credentials are inactive until an interview is scheduled.
              </p>
            </DialogHeader>

            {marketCreated ? (
              <div className="space-y-4 p-1">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">Market candidate created</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">Login credentials will be activated when an interview is scheduled.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Email</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{marketCreated.email}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Password</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{marketCreated.generatedPassword}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Credentials have been emailed. Save the password — it cannot be retrieved later.
                </div>
                <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => { setShowMarketCandidateDialog(false); setMarketCreated(null); }}>Done</Button>
              </div>
            ) : (
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      className={inputCls}
                      value={marketForm.name}
                      onChange={e => setMarketForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </label>
                  <label className="col-span-2 grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email <span className="text-red-500">*</span></span>
                    <input
                      type="email"
                      className={inputCls}
                      value={marketForm.email}
                      onChange={e => setMarketForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="candidate@example.com"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</span>
                    <input
                      type="tel"
                      className={inputCls}
                      value={marketForm.contactNumber}
                      onChange={e => setMarketForm(f => ({ ...f, contactNumber: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Branch <span className="text-red-500">*</span></span>
                    <select
                      className={inputCls}
                      value={marketForm.branch}
                      onChange={e => setMarketForm(f => ({ ...f, branch: e.target.value }))}
                    >
                      <option value="DEVELOPMENT">Development</option>
                      <option value="TESTING">Testing</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowMarketCandidateDialog(false)}>Cancel</Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={() => void handleCreateMarketCandidate()}
                    disabled={creatingMarket || !marketForm.name.trim() || !marketForm.email.trim()}
                  >
                    {creatingMarket ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />Creating…</> : 'Create Candidate'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}