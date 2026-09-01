'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/common/Toast';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { FileText, Upload, Download, Eye, Sparkles, TrendingUp, Users, Briefcase, X, FileDown, UserCheck, UserPlus, ChevronRight, ChevronLeft, Layers, Filter, Calendar, Building2, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadCandidateReview } from '@/lib/downloadPdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHero, StatCard } from '@/components/common/AppUi';

import {
  CandidatesMainTable,
  DeployedCandidatesTable,
  CandidateEditDialog,
  type CandidateEditForm,
} from '@/app/admin/candidates/CandidatesDirectoryTable';
import { isStaffReadRole } from '@/lib/staffRoles';
import { useBranchOptions } from '@/hooks/useBranchOptions';

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
  active?: boolean | null;
}

interface Props { role: string; features?: Record<string, boolean>; }
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
  yoePortrayed: '',
  yop: '',
  interviewMentorName: '',
  clientName: '',
  branch: 'DEVELOPMENT',
});

function getEffectiveInterviewCount(candidate: Candidate): number {
  return Math.max(candidate.noOfInterviews ?? 0, candidate.systemInterviewCount ?? 0);
}

export default function CandidatesClient({ role, features = {} }: Props) {
  const clientsEnabled = features.CLIENTS !== false;
  const { options: branchOptions } = useBranchOptions();
  const [selectedParent, setSelectedParent] = useState<TreeParent>('all');
  // If clients feature is disabled, always stay on 'all' view
  const effectiveParent: TreeParent = !clientsEnabled ? 'all' : selectedParent;
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
    skillSet: '', yoePortrayed: '', yop: '', noOfInterviews: '',
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
    if (!addForm.contactNumber.trim() || (!clientsEnabled ? false : (!addForm.batch.trim() || !addForm.source)) || !addForm.skillSet) {
      toast('Contact number, skill set are required' + (clientsEnabled ? ', along with batch and source' : ''), 'error');
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

  const handleToggleActive = async (candidate: Candidate) => {
    const deactivating = candidate.active !== false;
    const confirmed = await confirm({
      title: deactivating ? `Delete ${candidate.name}?` : `Reactivate ${candidate.name}?`,
      message: deactivating
        ? 'This is a soft delete — the candidate record is kept, but they will no longer be able to log in. You can reactivate them later.'
        : 'The candidate will be able to log in again.',
      confirmLabel: deactivating ? 'Delete' : 'Reactivate',
      variant: deactivating ? 'danger' : 'default',
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !deactivating }),
      });

      if (res.ok) {
        toast(deactivating ? 'Candidate deactivated' : 'Candidate reactivated', 'success');
        fetchCandidates();
      } else {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? 'Failed to update candidate', 'error');
      }
    } catch {
      toast('Error updating candidate', 'error');
    }
  };

  const treeData = effectiveParent === 'deployed'
      ? deployedTreeFiltered
      : effectiveParent === 'matched'
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



        <div className={`grid gap-4 ${clientsEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
          <div className="panel-card p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-[var(--surface)] shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">All Candidates</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{allCandidates.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          {clientsEnabled && (
            <div className="panel-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-[var(--surface)] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Matched</p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{matchedCandidates.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {clientsEnabled && (
            <div className="panel-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-[var(--surface)] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Deployed</p>
                  <p className="text-2xl font-extrabold text-[#6D28D9] dark:text-purple-400 mt-0.5">{deployedCandidates.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-[#6D28D9] dark:text-purple-400">
                  <Briefcase className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Container at Top */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 relative z-20">
          <div className="panel-header panel-header-accent-indigo rounded-t-2xl flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Filter Candidates
            </h2>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Search and filter candidates across pipeline</span>
          </div>

          <div className="p-5">
            {effectiveParent !== 'deployed' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Search</label>
                  <input
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 px-3.5 font-medium focus:border-[#6D28D9] focus:outline-none"
                      placeholder="Search by name, email, or batch…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Skill</label>
                  <Select value={filterSkill || "ALL"} onValueChange={(val) => setFilterSkill(val === "ALL" ? "" : val)}>
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                      <SelectValue placeholder="All Skills" />
                    </SelectTrigger>
                    <SelectContent className="max-h-44 z-50">
                      <SelectItem value="ALL" className="text-xs font-semibold">All Skills</SelectItem>
                      {skillOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs font-semibold">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Source</label>
                  <Select value={filterSource || "ALL"} onValueChange={(val) => setFilterSource(val === "ALL" ? "" : val)}>
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent className="max-h-44 z-50">
                      <SelectItem value="ALL" className="text-xs font-semibold">All Sources</SelectItem>
                      <SelectItem value="B2B" className="text-xs font-semibold">B2B</SelectItem>
                      <SelectItem value="BENCH" className="text-xs font-semibold">Bench</SelectItem>
                      <SelectItem value="MARKET" className="text-xs font-semibold">Market</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Status</label>
                  <Select value={filterStatus || "ALL"} onValueChange={(val) => setFilterStatus(val === "ALL" ? "" : val)}>
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-44 z-50">
                      <SelectItem value="ALL" className="text-xs font-semibold">All Statuses</SelectItem>
                      <SelectItem value="RFD" className="text-xs font-semibold">RFD</SelectItem>
                      <SelectItem value="WFD" className="text-xs font-semibold">WFD</SelectItem>
                      <SelectItem value="DOB" className="text-xs font-semibold">DOB</SelectItem>
                      <SelectItem value="TRAINING" className="text-xs font-semibold">Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Rating</label>
                  <Select value={filterRating || "ALL"} onValueChange={(val) => setFilterRating(val === "ALL" ? "" : val)}>
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                      <SelectValue placeholder="All Ratings" />
                    </SelectTrigger>
                    <SelectContent className="max-h-44 z-50">
                      <SelectItem value="ALL" className="text-xs font-semibold">All Ratings</SelectItem>
                      <SelectItem value="ASSET" className="text-xs font-semibold">Asset</SelectItem>
                      <SelectItem value="MEDIUM" className="text-xs font-semibold">Medium</SelectItem>
                      <SelectItem value="LIABILITY" className="text-xs font-semibold">Liability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Search Deployed Candidates</label>
                <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 px-3.5 font-medium focus:border-[#6D28D9] focus:outline-none"
                    placeholder="Search deployed candidates by name, email, client, emp id..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Top-aligned Full-width Tree Navigation Card */}
        <div className="panel-card flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden w-full">
          {/* ALL CANDIDATES Accordion Header */}
          <button
            type="button"
            aria-expanded={openTreeGroups.all}
            onClick={() => {
              setSelectedParent('all');
              setSelectedSubParent('ALL');
              toggleTreeGroup('all');
            }}
            className="flex w-full items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)]/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
          >
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.all ? 'rotate-90' : ''}`} />
            <span className="flex-1">ALL CANDIDATES ({allCandidates.length})</span>
          </button>
          {openTreeGroups.all && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--surface)] border-b border-[var(--border)]">
              {allStatusGroups.map(group => (
                <button
                  type="button"
                  key={`all-${group}`}
                  onClick={() => {
                    setSelectedParent('all');
                    setSelectedSubParent(group);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedParent === 'all' && selectedSubParent === group
                      ? 'bg-[#6D28D9] text-white shadow-xs'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[#6D28D9]/10 hover:text-[#6D28D9]'
                  }`}
                >
                  {group === 'ALL' ? 'All' : group} ({allStatusCounts[group] ?? 0})
                </button>
              ))}
            </div>
          )}

          {clientsEnabled && (
            <>
              {/* MATCHED CANDIDATES Accordion Header */}
              <button
                type="button"
                aria-expanded={openTreeGroups.matched}
                onClick={() => {
                  setSelectedParent('matched');
                  setSelectedSubParent('ALL');
                  toggleTreeGroup('matched');
                }}
                className="flex w-full items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)]/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
              >
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.matched ? 'rotate-90' : ''}`} />
                <span className="flex-1">MATCHED CANDIDATES ({matchedCandidates.length})</span>
              </button>
              {openTreeGroups.matched && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--surface)] border-b border-[var(--border)]">
                  {matchedSubGroups.map(group => (
                    <button
                      type="button"
                      key={`matched-${group}`}
                      onClick={() => {
                        setSelectedParent('matched');
                        setSelectedSubParent(group);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedParent === 'matched' && selectedSubParent === group
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-emerald-500/10 hover:text-emerald-600'
                      }`}
                    >
                      {group.replaceAll('_', ' ')}
                    </button>
                  ))}
                </div>
              )}

              {/* DEPLOYED CANDIDATES Accordion Header */}
              <button
                type="button"
                aria-expanded={openTreeGroups.deployed}
                onClick={() => {
                  setSelectedParent('deployed');
                  setSelectedSubParent('ALL');
                  toggleTreeGroup('deployed');
                }}
                className="flex w-full items-center gap-2 bg-[var(--surface-subtle)]/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
              >
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${openTreeGroups.deployed ? 'rotate-90' : ''}`} />
                <span className="flex-1">DEPLOYED CANDIDATES ({deployedCandidates.length})</span>
              </button>
              {openTreeGroups.deployed && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--surface)]">
                  {deployedClientGroups.map(group => (
                    <button
                      type="button"
                      key={`deployed-${group}`}
                      onClick={() => {
                        setSelectedParent('deployed');
                        setSelectedSubParent(group);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedParent === 'deployed' && selectedSubParent === group
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-purple-500/10 hover:text-purple-600'
                      }`}
                    >
                      {group === 'ALL' ? 'All Clients' : group}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons & Main Table Container */}
        <div className="w-full space-y-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              {canAddCandidate && effectiveParent !== 'deployed' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddDialog(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Candidate
                  </button>
                  {clientsEnabled && (
                    <button
                      type="button"
                      onClick={() => { setShowMarketCandidateDialog(true); setMarketCreated(null); setMarketForm({ name: '', email: '', contactNumber: '', branch: 'DEVELOPMENT' }); }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#6D28D9] bg-[#6D28D9]/10 px-3.5 py-2 text-xs font-bold text-[#6D28D9] dark:text-purple-300 shadow-2xs transition-all hover:bg-[#6D28D9] hover:text-white cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Market Candidate
                    </button>
                  )}
                </>
              )}
              {effectiveParent === "deployed" && (
                <button
                  type="button"
                  onClick={() => setShowBulkImportDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Bulk Import
                </button>
              )}
            </div>
          </div>

              {effectiveParent !== "deployed" ? (
                  <div className="panel-card min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs transition-all duration-200 relative z-20">
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
                          onToggleActive: handleToggleActive,
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
                        clientsEnabled={clientsEnabled}
                        recordsCount={treeData.length}
                        headerTitle="Candidate Directory"
                    />
                  </div>
              ) : (
                  <div className="panel-card min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs transition-all duration-200 relative z-20">
                    <DeployedCandidatesTable
                        data={treeData}
                        endingDeploymentId={endingDeployment}
                        handlers={{
                          onViewHistory: handleViewHistory,
                          onEndDeployment: handleEndDeployment,
                        }}
                        recordsCount={treeData.length}
                        headerTitle="Deployed Candidates Directory"
                    />
                    {treeData.length === 0 && (
                        <div className="mt-6 border-t border-[var(--border)] pt-6 text-center">
                          <Briefcase className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-40" />
                          <p className="text-sm font-medium text-[var(--text-secondary)]">No deployed candidates found.</p>
                        </div>
                    )}
                  </div>
              )}
        </div>

        {/* Candidate Edit Dialog */}
        <CandidateEditDialog
          isOpen={!!editingId}
          role={role}
          editForm={editForm}
          setEditForm={setEditForm}
          saving={saving}
          onSave={() => editingId && saveEdit(editingId)}
          onCancel={() => setEditingId(null)}
          clientsEnabled={clientsEnabled}
        />

        {/* Resume Upload Dialog */}
        <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <DialogContent className="max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xl">
            <DialogHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:text-purple-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-extrabold text-[var(--text-primary)] text-left">
                      {selectedCandidate?.resumeFilename ? "Replace Resume" : "Upload Resume"}
                    </DialogTitle>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5 text-left">
                      Upload on behalf of the candidate. The file is parsed and an AI summary is generated automatically.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResumeDialog(false)}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 px-1">
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
          <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xl">
            <DialogHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:text-purple-400">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-[var(--text-primary)]">Deployment History</DialogTitle>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                    View client deployment timeline and assignment details.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner message="Loading deployment history..." />
                </div>
              ) : deploymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {deploymentHistory.map((history) => (
                    <div
                      key={history.id}
                      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:border-[#6D28D9]/40 hover:shadow-md space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-extrabold text-base text-[var(--text-primary)] flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-[#6D28D9] dark:text-purple-400 shrink-0" />
                              {history.clientName}
                            </h4>
                            <span
                              className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${
                                history.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${history.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'}`} />
                              {history.status}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-[var(--text-secondary)] pt-0.5">
                            {history.empId && (
                              <span className="font-mono bg-[var(--surface-subtle)] text-[var(--text-primary)] px-2 py-0.5 rounded-md border border-[var(--border)] font-bold text-[11px]">
                                {history.empId}
                              </span>
                            )}
                            {history.empId && history.candidateName && <span>•</span>}
                            {history.candidateName && (
                              <span className="font-semibold text-[var(--text-primary)]">{history.candidateName}</span>
                            )}
                            {history.candidateEmail && (
                              <span className="text-[var(--text-secondary)]">({history.candidateEmail})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-3.5">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-[#6D28D9] dark:text-purple-400" />
                            Deployed Date
                          </span>
                          <p className="text-sm font-extrabold text-[var(--text-primary)]">
                            {new Date(history.deployedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-[#6D28D9] dark:text-purple-400" />
                            End Date
                          </span>
                          <p className="text-sm font-extrabold text-[var(--text-primary)]">
                            {history.endDate ? (
                              new Date(history.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Currently Active
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] opacity-60">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-secondary)]">No deployment history found.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowHistoryDialog(false)}
                className="bg-[var(--surface-subtle)] active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Candidate Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) closeAddDialog(); else setShowAddDialog(true); }}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xl">
            <DialogHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-extrabold text-[var(--text-primary)] text-left">Add New Candidate</DialogTitle>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5 text-left">
                      Fields marked <span className="text-rose-500 font-bold">*</span> are required. At least one email must be provided.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddDialog}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DialogHeader>

            {createdCredentials ? (
              <div className="space-y-4 py-4 px-1">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-200">Candidate created successfully</p>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-0.5">Credentials emailed if an address was provided. Save them below.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 divide-y divide-[var(--border)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Username (Email)</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{createdCredentials.username}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Temporary Password</span>
                    <span className="font-mono font-bold text-sm text-[#6D28D9] dark:text-purple-400">{createdCredentials.password}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> The password cannot be retrieved later — share it with the candidate now.
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={closeAddDialog} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs px-5 py-2 cursor-pointer">Done</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto py-4 px-1 flex-1">
                {/* Basic Information */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400 mb-3">
                    <div className="h-3 w-1 bg-[#6D28D9] rounded-full" />
                    Basic Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Full Name <span className="text-rose-500">*</span></Label>
                      <Input placeholder="Enter candidate's full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Official Email</Label>
                      <Input type="email" placeholder="official@company.com" value={addForm.officialEmail} onChange={(e) => setAddForm((f) => ({ ...f, officialEmail: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Personal Email</Label>
                      <Input type="email" placeholder="personal@email.com" value={addForm.personalEmail} onChange={(e) => setAddForm((f) => ({ ...f, personalEmail: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Contact Number <span className="text-rose-500">*</span></Label>
                      <Input placeholder="+91 98765 43210" value={addForm.contactNumber} onChange={(e) => setAddForm((f) => ({ ...f, contactNumber: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Organization Details — hidden when CLIENTS feature is disabled */}
                {clientsEnabled && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                    <div className="h-3 w-1 bg-emerald-500 rounded-full" />
                    Organization Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Batch (DOH) <span className="text-rose-500">*</span></Label>
                      <Input placeholder="e.g., 2024-01" value={addForm.batch} onChange={(e) => setAddForm((f) => ({ ...f, batch: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Batch Mentor</Label>
                      <Input placeholder="Mentor name" value={addForm.batchMentor} onChange={(e) => setAddForm((f) => ({ ...f, batchMentor: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Interview Mentor</Label>
                      <Input placeholder="Mentor name" value={addForm.interviewMentorName} onChange={(e) => setAddForm((f) => ({ ...f, interviewMentorName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Source <span className="text-rose-500">*</span></Label>
                      <Select value={addForm.source} onValueChange={(val) => setAddForm((f) => ({ ...f, source: val }))}>
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="B2B">B2B</SelectItem>
                          <SelectItem value="BENCH">Bench</SelectItem>
                          <SelectItem value="MARKET">Market</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Status</Label>
                      <Select value={addForm.candidateStatus} onValueChange={(val) => setAddForm((f) => ({ ...f, candidateStatus: val }))}>
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRAINING">Training</SelectItem>
                          <SelectItem value="RFD">RFD</SelectItem>
                          <SelectItem value="WFD">WFD</SelectItem>
                          <SelectItem value="DOB">DOB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Rating</Label>
                      <Select value={addForm.rating || 'NONE'} onValueChange={(val) => setAddForm((f) => ({ ...f, rating: val === 'NONE' ? '' : val }))}>
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="ASSET">Asset</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LIABILITY">Liability</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Branch <span className="text-rose-500">*</span></Label>
                      <Select value={addForm.branch} onValueChange={(val) => setAddForm((f) => ({ ...f, branch: val }))}>
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((b) => (
                            <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                )}

                {/* Skills & Experience */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">
                    <div className="h-3 w-1 bg-purple-500 rounded-full" />
                    Skills &amp; Experience
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Skill Set <span className="text-rose-500">*</span></Label>
                      <Select value={addForm.skillSet} onValueChange={(val) => setAddForm((f) => ({ ...f, skillSet: val }))}>
                        <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {skillOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Client Name</Label>
                      <Input placeholder="Current/target client name" value={addForm.clientName} onChange={(e) => setAddForm((f) => ({ ...f, clientName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">YOE</Label>
                      <Input type="number" step="0.1" placeholder="e.g., 5.0" value={addForm.yoePortrayed} onChange={(e) => setAddForm((f) => ({ ...f, yoePortrayed: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">Year of Passing</Label>
                      <Input type="number" placeholder="e.g., 2020" value={addForm.yop} onChange={(e) => setAddForm((f) => ({ ...f, yop: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeAddDialog}
                    disabled={creatingCandidate}
                    className="bg-[var(--surface-subtle)] active:scale-[0.98] transition-all duration-150 cursor-pointer font-bold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddCandidate}
                    disabled={creatingCandidate}
                    className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all px-4 py-2"
                  >
                    {creatingCandidate ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
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
          <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xl">
            <DialogHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-extrabold text-[var(--text-primary)] text-left">Add Market Candidate</DialogTitle>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5 text-left">
                      External candidate — credentials are inactive until an interview is scheduled.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowMarketCandidateDialog(false); setMarketCreated(null); }}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DialogHeader>

            {marketCreated ? (
              <div className="space-y-4 py-4 px-1">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-200">Market candidate created</p>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-0.5">Login credentials will be activated when an interview is scheduled.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 divide-y divide-[var(--border)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Email</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{marketCreated.email}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Password</span>
                    <span className="font-mono font-bold text-sm text-[#6D28D9] dark:text-purple-400">{marketCreated.generatedPassword}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Credentials have been emailed. Save the password — it cannot be retrieved later.
                </div>
                <Button className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs py-2.5 cursor-pointer" onClick={() => { setShowMarketCandidateDialog(false); setMarketCreated(null); }}>Done</Button>
              </div>
            ) : (
              <div className="space-y-4 py-4 px-1 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-primary)]">Name <span className="text-rose-500">*</span></Label>
                    <Input
                      type="text"
                      value={marketForm.name}
                      onChange={e => setMarketForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-primary)]">Email <span className="text-rose-500">*</span></Label>
                    <Input
                      type="email"
                      value={marketForm.email}
                      onChange={e => setMarketForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="candidate@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-primary)]">Phone</Label>
                    <Input
                      type="tel"
                      value={marketForm.contactNumber}
                      onChange={e => setMarketForm(f => ({ ...f, contactNumber: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-primary)]">Branch <span className="text-rose-500">*</span></Label>
                    <Select value={marketForm.branch} onValueChange={(val) => setMarketForm((f) => ({ ...f, branch: val }))}>
                      <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm h-10 font-medium focus:border-[#6D28D9]">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchOptions.map((b) => (
                          <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
                  <Button variant="secondary" className="bg-[var(--surface-subtle)] font-bold text-xs cursor-pointer" onClick={() => setShowMarketCandidateDialog(false)}>Cancel</Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all px-4 py-2"
                    onClick={() => void handleCreateMarketCandidate()}
                    disabled={creatingMarket || !marketForm.name.trim() || !marketForm.email.trim()}
                  >
                    {creatingMarket ? <><Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />Creating…</> : 'Create Candidate'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}