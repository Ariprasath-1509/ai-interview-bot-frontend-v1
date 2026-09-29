'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Building2,
  Briefcase,
  Users,
  Target,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
  Search,
  Sparkles,
  Layers,
  Filter,
  FileText,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHero, StatCard } from '@/components/common/AppUi';
import { Badge } from '@/components/ui/badge';
import {
  entityBranchLabel,
  defaultStaffBranch,
  entityBranchBadgeClass,
  isStaffReadRole,
  isStaffAdminRole,
  resolveFormBranch,
} from '@/lib/staffRoles';
import { formatDate } from '@/lib/formatDate';
import { useBranchOptions } from '@/hooks/useBranchOptions';

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
  branch?: string;
  benchReviewed: boolean;
  recruitmentReviewed: boolean;
  createdAt: string;
  docId?: string;
  jdFileName?: string;
  skillRequirements?: SkillRequirement[];
}

interface SkillRequirement {
  skillSet: string;
  positions: PositionRequirement[];
}

interface PositionRequirement {
  candidatesNeeded: number;
  minYoeRequired: number;
  source: 'BENCH_B2B' | 'MARKET';
  id?: string;
}

type PositionWithOwner = PositionRequirement & { _ownerClient: Client; skillSet: string; posId: string };

interface ClientFormData {
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
  branch: string;
  skillRequirements: SkillRequirement[];
}

interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  skillSet: string;
  yoePortrayed: number;
  rating: string;
  candidateStatus: string;
  noOfInterviews: number;
  matchScore: number;
  matchRationale: string;
  strengths: string[];
  concerns: string[];
  lastInterviewDate: string;
  lastVerdict: string;
  avgScore: number;
}

const emptyForm: ClientFormData = {
  clientName: '',
  jdRole: '',
  jdDescription: '',
  positionsVacant: 0,
  marketCandidatesNeeded: 0,
  benchB2bCandidatesNeeded: 0,
  status: 'ACTIVE',
  branch: 'DEVELOPMENT',
  skillRequirements: [],
};

export default function ClientsClient({ userRole, userBranch }: { userRole: string; userBranch?: string }) {
  const router = useRouter();
  const { options: branchOptions } = useBranchOptions();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Active workspace modal & position selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form & Modals
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [useSkillBasedRequirements, setUseSkillBasedRequirements] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Position edit state within details
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPosValues, setEditPosValues] = useState<{ candidatesNeeded: number; minYoeRequired: number; source: string } | null>(null);

  // Candidate Matching
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<CandidateMatch[]>([]);
  const [matchSource, setMatchSource] = useState<'BENCH_B2B' | 'MARKET'>('BENCH_B2B');
  const [showMatches, setShowMatches] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Super Admin AI Cache Stats
  const [cacheClearLoading, setCacheClearLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ cachedCount?: number } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [skillOptions, setSkillOptions] = useState<{ value: string; label: string }[]>([]);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdminRole = isStaffAdminRole(userRole);
  const showEntityBranch = isStaffReadRole(userRole);
  const staffDefaultBranch = defaultStaffBranch(userRole, userBranch);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const skillLabels = Object.fromEntries(skillOptions.map((s) => [s.value, s.label]));

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

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingClient(null);
    setFormData({ ...emptyForm, branch: staffDefaultBranch });
    setJdFile(null);
    setUseSkillBasedRequirements(false);
  }, [staffDefaultBranch]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/clients/matching/cache/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setCacheStats({ cachedCount: data.cachedCount ?? 0 });
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all AI matching caches? This will force fresh AI analysis on next match.'))
      return;
    setCacheClearLoading(true);
    try {
      const res = await fetch('/api/clients/matching/cache/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCacheStats({ cachedCount: 0 });
        setToast({ message: `Cache cleared (${data.clearedCount ?? 0} entries). Refreshing matches...`, type: 'success' });
        if (showMatches && selectedPositionId) {
          triggerMatching(matchSource);
        }
      } else {
        setToast({ message: 'Failed to clear cache. Only SUPER_ADMIN can perform this action.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to clear cache. Network error.', type: 'error' });
    } finally {
      setCacheClearLoading(false);
    }
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showForm) {
          e.preventDefault();
          resetForm();
        } else if (drawerOpen) {
          setDrawerOpen(false);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, drawerOpen, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      ...formData,
      branch: resolveFormBranch(userRole, userBranch, formData.branch),
    };
    const wasEditing = !!editingClient;
    const url = editingClient ? `/api/recruiter/clients/${editingClient.id}` : '/api/recruiter/clients';
    const method = editingClient ? 'PUT' : 'POST';
    try {
      let res;
      if (jdFile) {
        const fd = new FormData();
        fd.append('client', JSON.stringify(payload));
        fd.append('jdFile', jdFile);
        res = await fetch(url, { method, body: fd, credentials: 'include' });
      } else {
        res = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        await fetchClients();
        resetForm();
        setToast({ message: wasEditing ? 'Client updated successfully.' : 'Client created successfully.', type: 'success' });
      } else {
        let detail = `Save failed (${res.status})`;
        try {
          const err = await res.json();
          if (err?.error && typeof err.error === 'string') detail = err.error;
        } catch {
          /* ignore */
        }
        setToast({ message: detail, type: 'error' });
      }
    } catch (e) {
      console.error('Failed to save client:', e);
      setToast({ message: 'Save failed. Network error.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = clients.find((c) => c.id === id);
    const idsToDelete = target
      ? clients.filter((c) => c.clientName === target.clientName && c.status === target.status).map((c) => c.id)
      : [id];

    const label = target?.clientName ?? 'this client';
    const plural = idsToDelete.length > 1 ? ` (${idsToDelete.length} duplicate records)` : '';
    if (!confirm(`Delete ${label}${plural}?`)) return;

    try {
      await Promise.all(idsToDelete.map((did) => fetch(`/api/recruiter/clients/${did}`, { method: 'DELETE' })));
      if (idsToDelete.includes(selectedId ?? '')) {
        setSelectedId(null);
        setDrawerOpen(false);
      }
      await fetchClients();
      setToast({ message: 'Client deleted.', type: 'success' });
    } catch (e) {
      console.error('Failed to delete client:', e);
      setToast({ message: 'Failed to delete client.', type: 'error' });
    }
  };

  const handleDownloadCurrentJd = async () => {
    if (!editingClient) return;
    try {
      const res = await fetch(`/api/recruiter/clients/${editingClient.id}/jd-file`, { credentials: 'include' });
      if (!res.ok) {
        setToast({ message: 'No JD file is stored for this client.', type: 'error' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = (editingClient.jdFileName || 'job-description').replace(/[^a-zA-Z0-9._\- ]+/g, '_');
      a.download = safe;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: 'Failed to download JD.', type: 'error' });
    }
  };

  const openEditForm = (client: Client) => {
    setJdFile(null);
    setEditingClient(client);
    setFormData({
      clientName: client.clientName,
      jdRole: client.jdRole,
      jdDescription: client.jdDescription,
      positionsVacant: client.positionsVacant,
      marketCandidatesNeeded: client.marketCandidatesNeeded,
      benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded,
      status: client.status,
      branch: client.branch ?? 'DEVELOPMENT',
      skillRequirements: client.skillRequirements || [],
    });
    setUseSkillBasedRequirements((client.skillRequirements || []).length > 0);
    setShowForm(true);
  };

  const addSkillRequirement = () => {
    setFormData({
      ...formData,
      skillRequirements: [
        ...formData.skillRequirements,
        {
          skillSet: skillOptions[0]?.value ?? '',
          positions: [{ candidatesNeeded: 1, minYoeRequired: 3, source: 'BENCH_B2B' }],
        },
      ],
    });
  };

  const removeSkillRequirement = (index: number) => {
    setFormData({
      ...formData,
      skillRequirements: formData.skillRequirements.filter((_, i) => i !== index),
    });
  };

  const updateSkillRequirement = (index: number, field: keyof SkillRequirement, value: any) => {
    const updated = [...formData.skillRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, skillRequirements: updated });
  };

  const addPositionRequirement = (skillIndex: number) => {
    const updated = [...formData.skillRequirements];
    updated[skillIndex].positions.push({ candidatesNeeded: 1, minYoeRequired: 3, source: 'BENCH_B2B' });
    setFormData({ ...formData, skillRequirements: updated });
  };

  const removePositionRequirement = (skillIndex: number, posIndex: number) => {
    const updated = [...formData.skillRequirements];
    updated[skillIndex].positions = updated[skillIndex].positions.filter((_, i) => i !== posIndex);
    setFormData({ ...formData, skillRequirements: updated });
  };

  const updatePositionRequirement = (
    skillIndex: number,
    posIndex: number,
    field: keyof PositionRequirement,
    value: any
  ) => {
    const updated = [...formData.skillRequirements];
    updated[skillIndex].positions[posIndex] = { ...updated[skillIndex].positions[posIndex], [field]: value };
    setFormData({ ...formData, skillRequirements: updated });
  };

  const openClientWorkspace = (clientId: string, positionId?: string) => {
    setSelectedId(clientId);
    setSelectedPositionId(positionId ?? null);
    setShowMatches(false);
    setMatchResults([]);
    setDrawerOpen(true);
  };

  const triggerMatching = async (source: 'BENCH_B2B' | 'MARKET') => {
    if (!selectedPositionId || !selectedPosition) return;
    setMatchSource(source);
    setMatchingLoading(true);
    setShowMatches(true);
    try {
      const res = await fetch('/api/recruiter/matching/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: selectedPositionClient?.id,
          source,
          maxCandidates: 10,
          skillSet: selectedPosition.skillSet,
          minYoeRequired: selectedPosition.minYoeRequired,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatchResults(data.matches ?? []);
      } else {
        setMatchResults([]);
      }
    } catch {
      setMatchResults([]);
    } finally {
      setMatchingLoading(false);
    }
  };

  const createInterviewFromMatch = (candidate: CandidateMatch) => {
    if (!selectedClient) return;
    const params = new URLSearchParams({
      candidateId: candidate.candidateId,
      clientId: selectedClient.id,
      engineerEmail: candidate.candidateEmail,
      engineerName: candidate.candidateName,
      jdTitle: selectedClient.jdRole,
      suggestedMode: 'SCREENING',
    });
    router.push(`/admin/interviews/create?${params.toString()}`);
  };

  // Resolve selected client and position data
  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const selectedPositionData = selectedClient
    ? (() => {
        const sameNameClients = clients.filter((c) => c.clientName === selectedClient.clientName);
        for (const client of sameNameClients) {
          for (const skillReq of client.skillRequirements || []) {
            for (const pos of skillReq.positions) {
              const posId = pos.id || `${client.id}-${skillReq.skillSet}-${pos.minYoeRequired}-${pos.source}`;
              if (posId === selectedPositionId) {
                return {
                  position: { ...pos, skillSet: skillReq.skillSet, clientId: client.id, posId },
                  client: client,
                };
              }
            }
          }
        }
        return null;
      })()
    : null;

  const selectedPosition = selectedPositionData?.position ?? null;
  const selectedPositionClient = selectedPositionData?.client ?? selectedClient;

  // Filter clients by search & status
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      !search ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.jdRole.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? c.status === 'ACTIVE' : c.status !== 'ACTIVE');
    return matchesSearch && matchesStatus;
  });

  // Group filtered clients by name & status
  const groupedClients = filteredClients.reduce((acc, client) => {
    const key = `${client.clientName}-${client.status}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(client);
    return acc;
  }, {} as Record<string, Client[]>);

  const activeGroups = Object.entries(groupedClients).filter(([key]) => key.endsWith('-ACTIVE'));
  const inactiveGroups = Object.entries(groupedClients).filter(([key]) => !key.endsWith('-ACTIVE'));
  
  const totalBench = clients.reduce((s, c) => s + c.benchB2bCandidatesNeeded, 0);
  const totalMarket = clients.reduce((s, c) => s + c.marketCandidatesNeeded, 0);
  const totalPositionsCount = clients.reduce((s, c) => {
    if (c.skillRequirements && c.skillRequirements.length > 0) {
      return s + c.skillRequirements.reduce((sum, sr) => sum + sr.positions.reduce((pSum, p) => pSum + p.candidatesNeeded, 0), 0);
    }
    return s + (c.positionsVacant || 0);
  }, 0);

  // Position editing & deletion handlers inside detail view
  const handleDeletePosition = async (pos: PositionWithOwner) => {
    if (!pos.id) return;
    if (!confirm('Delete this position requirement?')) return;
    try {
      const response = await fetch(`/api/recruiter/clients/${pos._ownerClient.id}/positions/${pos.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok || response.status === 204) {
        await fetchClients();
        setToast({ message: 'Position deleted.', type: 'success' });
      } else {
        setToast({ message: 'Failed to delete position.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error deleting position.', type: 'error' });
    }
  };

  const handleSavePosition = async (pos: PositionWithOwner) => {
    if (!editPosValues) return;
    try {
      const ownerClient = pos._ownerClient;
      const updatedSkillRequirements = (ownerClient.skillRequirements || []).map((sr) => {
        if (sr.skillSet === pos.skillSet) {
          const updatedPositions = sr.positions.map((p) => {
            const currentPosId = p.id || `${ownerClient.id}-${sr.skillSet}-${p.minYoeRequired}-${p.source}`;
            if (currentPosId === pos.posId) {
              return { ...p, ...editPosValues };
            }
            return p;
          });
          return { ...sr, positions: updatedPositions };
        }
        return sr;
      });

      const payload = {
        clientName: ownerClient.clientName,
        jdRole: ownerClient.jdRole,
        jdDescription: ownerClient.jdDescription,
        positionsVacant: ownerClient.positionsVacant,
        marketCandidatesNeeded: ownerClient.marketCandidatesNeeded,
        benchB2bCandidatesNeeded: ownerClient.benchB2bCandidatesNeeded,
        status: ownerClient.status,
        skillRequirements: updatedSkillRequirements,
      };

      const res = await fetch(`/api/recruiter/clients/${ownerClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingPositionId(null);
        setEditPosValues(null);
        await fetchClients();
        setToast({ message: 'Position updated.', type: 'success' });
      } else {
        setToast({ message: 'Failed to update position.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error updating position.', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading client portal..." />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-purple-950/90 text-purple-200 border border-purple-800/60 shadow-purple-900/20'
              : 'bg-red-950/90 text-red-200 border border-red-800/60 shadow-red-900/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-purple-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner - Create Interview Theme */}
      <PageHero
        icon={Building2}
        title="Client Directory & Open Roles"
        description="Manage client organizations, track vacancy positions, store JD documentation, and perform precision AI-powered candidate matching."
        variant="purple"
      />

      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
          {isSuperAdmin && cacheStats && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] border-l border-[var(--border)] pl-3">
              <Info className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Cached AI matches: {cacheStats.cachedCount} clients
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              onClick={handleClearCache}
              disabled={cacheClearLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs transition-all hover:bg-[var(--surface-subtle)] disabled:opacity-50"
            >
              {cacheClearLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              Clear AI Cache
            </button>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Client
          </button>
        </div>
      </div>

      {/* Modern Glowing Stat Cards */}
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Clients" value={clients.length} accent="purple" icon={Building2} />
        <StatCard title="Total Vacant Positions" value={totalPositionsCount} accent="indigo" icon={Target} />
        <StatCard title="Bench / B2B Needed" value={totalBench} accent="emerald" icon={Users} />
        <StatCard title="Market Needed" value={totalMarket} accent="amber" icon={Briefcase} />
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="panel-card p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            placeholder="Search by client name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          <div className="inline-flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border)]">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Full-Width Client Grid View */}
      {filteredClients.length === 0 ? (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs p-12 text-center">
          <Building2 className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No clients match your filter</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto font-medium">
            Try adjusting your search criteria or click "Add Client" to add a new organization.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Clients */}
          {activeGroups.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  Active Clients ({activeGroups.reduce((sum, [, cls]) => sum + cls.length, 0)})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeGroups.map(([key, clientGroup]) => (
                  <ClientCardFeedItem
                    key={key}
                    clients={clientGroup}
                    onOpenWorkspace={openClientWorkspace}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onDownloadJd={handleDownloadCurrentJd}
                    showBranchBadge={showEntityBranch}
                    skillLabels={skillLabels}
                    isAdminRole={isAdminRole}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Clients */}
          {inactiveGroups.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  Inactive Clients ({inactiveGroups.reduce((sum, [, cls]) => sum + cls.length, 0)})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {inactiveGroups.map(([key, clientGroup]) => (
                  <ClientCardFeedItem
                    key={key}
                    clients={clientGroup}
                    onOpenWorkspace={openClientWorkspace}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onDownloadJd={handleDownloadCurrentJd}
                    showBranchBadge={showEntityBranch}
                    skillLabels={skillLabels}
                    isAdminRole={isAdminRole}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE & AI MATCHING CENTERED MODAL DIALOG */}
      {drawerOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="panel-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="panel-header panel-header-accent-purple p-6 text-[var(--text-primary)] shrink-0 relative flex items-center justify-between rounded-t-2xl border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">{selectedClient.clientName} Workspace</h2>
                  <p className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-2 mt-0.5">
                    <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                    {selectedClient.jdRole}
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedClient.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-700 text-zinc-300'}`}>
                      {selectedClient.status}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable Workspace */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Active Position Info Banner (If position selected) */}
              {selectedPosition ? (
                <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                        Active Target Position
                      </span>
                      <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
                        {selectedPosition.skillSet}
                        <Badge className="text-xs font-bold border-purple-500/30 bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          {selectedPosition.minYoeRequired}+ YOE Required
                        </Badge>
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                        Source: <strong className="text-[var(--text-primary)]">{selectedPosition.source === 'BENCH_B2B' ? 'Bench/B2B' : 'Market'}</strong> • Needed:{' '}
                        <strong className="text-[var(--text-primary)]">{selectedPosition.candidatesNeeded} candidate(s)</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPositionId(null)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold underline"
                    >
                      Clear Position
                    </button>
                  </div>

                  {/* AI Matching CTA Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => triggerMatching('BENCH_B2B')}
                      disabled={matchingLoading}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      {matchingLoading && matchSource === 'BENCH_B2B' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4" />
                      )}
                      Match Bench / B2B
                    </button>
                    <button
                      onClick={() => triggerMatching('MARKET')}
                      disabled={matchingLoading}
                      className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      {matchingLoading && matchSource === 'MARKET' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-purple-200" />
                      )}
                      Match Market
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel-card p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] text-center">
                  <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-[var(--text-primary)]">Select a position below to run AI candidate matching</p>
                </div>
              )}

              {/* AI Matching Results */}
              {showMatches && (
                <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      AI Candidates for {matchSource === 'BENCH_B2B' ? 'Bench/B2B' : 'Market'}
                      {!matchingLoading && <Badge variant="outline" className="text-xs font-semibold">{matchResults.length} matches</Badge>}
                    </h4>
                    <button onClick={() => setShowMatches(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {matchingLoading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-3" />
                      <p className="text-sm font-bold text-[var(--text-primary)]">Evaluating candidate database with AI...</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Analyzing skill overlap, YOE, and interview track record</p>
                    </div>
                  ) : matchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-secondary)] font-medium">
                      No matching candidates met the threshold for this position.
                    </div>
                  ) : (
                    <MatchResultsBySkill matches={matchResults} onCreateInterview={createInterviewFromMatch} />
                  )}
                </div>
              )}

              {/* Skill Requirements Directory */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Position Requirements Directory</span>
                  <button onClick={() => openEditForm(selectedClient)} className="text-purple-600 dark:text-purple-400 hover:underline text-[11px] font-bold">
                    Manage Skills
                  </button>
                </h4>

                {selectedClient.skillRequirements && selectedClient.skillRequirements.length > 0 ? (
                  <div className="space-y-3">
                    {selectedClient.skillRequirements.map((sr, idx) => (
                      <div key={idx} className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            {skillLabels[sr.skillSet] ?? sr.skillSet}
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sr.positions.map((pos, pIdx) => {
                            const posId = pos.id || `${selectedClient.id}-${sr.skillSet}-${pos.minYoeRequired}-${pos.source}`;
                            const isSelected = selectedPositionId === posId;
                            const isEditing = editingPositionId === posId;
                            const posWithOwner: PositionWithOwner = {
                              ...pos,
                              _ownerClient: selectedClient,
                              skillSet: sr.skillSet,
                              posId,
                            };

                            return (
                              <div
                                key={pIdx}
                                className={`rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30'
                                    : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:border-purple-300/40'
                                }`}
                              >
                                {isEditing && editPosValues ? (
                                  <div className="space-y-2 text-xs">
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={editPosValues.candidatesNeeded}
                                        onChange={(e) =>
                                          setEditPosValues({ ...editPosValues, candidatesNeeded: parseInt(e.target.value) || 1 })
                                        }
                                        className="w-full rounded-lg border border-[var(--border)] p-1 bg-[var(--surface)] text-[var(--text-primary)]"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={editPosValues.minYoeRequired}
                                        onChange={(e) =>
                                          setEditPosValues({ ...editPosValues, minYoeRequired: parseFloat(e.target.value) || 0 })
                                        }
                                        className="w-full rounded-lg border border-[var(--border)] p-1 bg-[var(--surface)] text-[var(--text-primary)]"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <select
                                        value={editPosValues.source}
                                        onChange={(e) => setEditPosValues({ ...editPosValues, source: e.target.value })}
                                        className="w-full rounded-lg border border-[var(--border)] p-1 bg-[var(--surface)] text-[var(--text-primary)]"
                                      >
                                        <option value="BENCH_B2B">Bench/B2B</option>
                                        <option value="MARKET">Market</option>
                                      </select>
                                      <button
                                        onClick={() => handleSavePosition(posWithOwner)}
                                        className="rounded bg-emerald-600 px-2 text-white hover:bg-emerald-700"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingPositionId(null);
                                          setEditPosValues(null);
                                        }}
                                        className="rounded bg-zinc-200 px-2 dark:bg-zinc-700"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => {
                                        setSelectedPositionId(posId);
                                        setShowMatches(false);
                                      }}
                                      className="text-left flex-1 min-w-0"
                                    >
                                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        {pos.minYoeRequired}+ YOE
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${pos.source === 'BENCH_B2B' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'}`}>
                                          {pos.source === 'BENCH_B2B' ? 'Bench' : 'Market'}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                                        {pos.candidatesNeeded} position(s) vacant
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingPositionId(posId);
                                          setEditPosValues({
                                            candidatesNeeded: pos.candidatesNeeded,
                                            minYoeRequired: pos.minYoeRequired,
                                            source: pos.source,
                                          });
                                        }}
                                        className="p-1 text-[var(--text-secondary)] hover:text-purple-600 rounded hover:bg-[var(--surface)]"
                                        title="Edit position"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {isAdminRole && (
                                        <button
                                          onClick={() => handleDeletePosition(posWithOwner)}
                                          className="p-1 text-[var(--text-secondary)] hover:text-red-600 rounded hover:bg-[var(--surface)]"
                                          title="Delete position"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="panel-card p-4 text-xs text-[var(--text-secondary)] font-medium rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)]">
                    Legacy client setup ({selectedClient.benchB2bCandidatesNeeded} Bench / {selectedClient.marketCandidatesNeeded} Market needed).
                    Click "Manage Skills" to update to skill-based position specs.
                  </div>
                )}
              </div>

              {/* Job Description Text */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Job Description</span>
                  {selectedClient.jdFileName && (
                    <button onClick={handleDownloadCurrentJd} className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold">
                      <Download className="h-3 w-3" /> {selectedClient.jdFileName}
                    </button>
                  )}
                </h4>
                <div className="panel-card p-4 text-xs text-[var(--text-primary)] leading-relaxed rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] max-h-48 overflow-y-auto whitespace-pre-wrap font-medium">
                  {selectedClient.jdDescription || 'No detailed job description text specified.'}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium pt-1">
                  Created: {formatDate(selectedClient.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Add / Edit Client) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="panel-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)]" role="dialog" aria-modal="true">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {editingClient ? 'Edit Client Profile' : 'Add New Client Organization'}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Configure client metadata, JD document, and skill requirements.</p>
                </div>
              </div>
              <button onClick={resetForm} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="field">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Client Name *</span>
                  <input
                    required
                    placeholder="e.g. Acme Corporation"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </label>

                <label className="field">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Primary Job Role *</span>
                  <input
                    required
                    placeholder="e.g. Senior Full Stack Engineer"
                    value={formData.jdRole}
                    onChange={(e) => setFormData({ ...formData, jdRole: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </label>
              </div>

              <label className="field">
                <span className="text-xs font-bold text-[var(--text-primary)]">Job Description Text *</span>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste or write full job description summary…"
                  value={formData.jdDescription}
                  onChange={(e) => setFormData({ ...formData, jdDescription: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 leading-relaxed min-h-[100px]"
                />
              </label>

              <label className="field">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Upload JD Document (PDF / DOCX) — Optional
                </span>
                {editingClient && (
                  <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--surface-subtle)] p-2.5 text-xs text-[var(--text-secondary)] font-medium">
                    <span>
                      Stored file: <strong className="text-[var(--text-primary)]">{editingClient.jdFileName || 'None'}</strong>
                    </span>
                    {editingClient.jdFileName && (
                      <button
                        type="button"
                        onClick={handleDownloadCurrentJd}
                        className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-bold"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  className="input-base text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/10 file:px-3 file:py-1 file:text-xs file:font-bold file:text-purple-700 dark:file:text-purple-300"
                />
                {jdFile && <p className="text-xs text-emerald-600 font-bold mt-1">Selected file: {jdFile.name}</p>}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="field">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Status</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-bold focus:border-purple-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>

                {isSuperAdmin ? (
                  <label className="field">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Branch</span>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-bold focus:border-purple-500"
                    >
                      {branchOptions.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Branch</span>
                    <input
                      readOnly
                      disabled
                      value={entityBranchLabel(editingClient ? formData.branch : staffDefaultBranch)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] p-2.5 text-sm font-bold opacity-70"
                    />
                  </label>
                )}
              </div>

              {/* Skill Requirements Builder Toggle */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSkillBasedRequirements}
                    onChange={(e) => {
                      setUseSkillBasedRequirements(e.target.checked);
                      if (!e.target.checked) setFormData({ ...formData, skillRequirements: [] });
                    }}
                    className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    Use Skill-Based Position Specs (Recommended)
                  </span>
                </label>

                {useSkillBasedRequirements && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Skills & Position Breakdowns</h4>
                      <button
                        type="button"
                        onClick={addSkillRequirement}
                        className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Skill
                      </button>
                    </div>

                    {formData.skillRequirements.map((skill, skillIndex) => (
                      <div key={skillIndex} className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Skill Set</label>
                            <select
                              value={skill.skillSet}
                              onChange={(e) => updateSkillRequirement(skillIndex, 'skillSet', e.target.value)}
                              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2 text-xs font-bold w-full"
                            >
                              {skillOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSkillRequirement(skillIndex)}
                            className="text-red-500 hover:text-red-700 mt-5 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Positions inside Skill */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)]">Position Details</span>
                            <button
                              type="button"
                              onClick={() => addPositionRequirement(skillIndex)}
                              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Tier
                            </button>
                          </div>

                          {skill.positions.map((pos, posIndex) => (
                            <div key={posIndex} className="grid grid-cols-4 gap-2 items-center rounded-xl bg-[var(--surface-subtle)] p-2.5 text-xs">
                              <div>
                                <label className="text-[10px] text-[var(--text-secondary)] block font-medium">Positions</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={pos.candidatesNeeded}
                                  onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'candidatesNeeded', parseInt(e.target.value) || 1)}
                                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs p-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--text-secondary)] block font-medium">Min YOE</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={pos.minYoeRequired}
                                  onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'minYoeRequired', parseFloat(e.target.value) || 0)}
                                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs p-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--text-secondary)] block font-medium">Source</label>
                                <select
                                  value={pos.source}
                                  onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'source', e.target.value)}
                                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs p-1"
                                >
                                  <option value="BENCH_B2B">Bench/B2B</option>
                                  <option value="MARKET">Market</option>
                                </select>
                              </div>
                              <div className="flex justify-end pt-3">
                                <button
                                  type="button"
                                  onClick={() => removePositionRequirement(skillIndex, posIndex)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Individual Full-Width Client Card Component - Styled with Create Interview theme */
function ClientCardFeedItem({
  clients,
  onOpenWorkspace,
  onEdit,
  onDelete,
  onDownloadJd,
  showBranchBadge,
  skillLabels,
  isAdminRole,
}: {
  clients: Client[];
  onOpenWorkspace: (clientId: string, positionId?: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onDownloadJd: (client: Client) => void;
  showBranchBadge: boolean;
  skillLabels: Record<string, string>;
  isAdminRole: boolean;
}) {
  const client = clients[0];
  const allSkillRequirements = clients.flatMap((c) => c.skillRequirements || []);
  const hasSkillRequirements = allSkillRequirements.length > 0;

  return (
    <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30 flex flex-col justify-between p-6">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-purple-500/20 shrink-0">
              {client.clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] transition-colors flex items-center gap-2">
                {client.clientName}
                {showBranchBadge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${entityBranchBadgeClass(client.branch)}`}>
                    {entityBranchLabel(client.branch)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5 mt-0.5">
                <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                {client.jdRole}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                client.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {client.status}
            </span>
            <button
              onClick={() => onEdit(client)}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-purple-600 transition-colors"
              title="Edit Client"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            {isAdminRole && (
              <button
                onClick={() => onDelete(client.id)}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-600 transition-colors"
                title="Delete Client"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Requirements Summary Pills */}
        {hasSkillRequirements ? (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Position Specs:</div>
            <div className="flex flex-wrap gap-2">
              {allSkillRequirements.map((sr, idx) => {
                const totalSkillPositions = sr.positions.reduce((acc, p) => acc + p.candidatesNeeded, 0);
                const firstPos = sr.positions[0];
                const posId = firstPos ? (firstPos.id || `${client.id}-${sr.skillSet}-${firstPos.minYoeRequired}-${firstPos.source}`) : undefined;

                return (
                  <button
                    key={idx}
                    onClick={() => onOpenWorkspace(client.id, posId)}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition-all hover:border-purple-500 hover:bg-purple-500/10"
                  >
                    <Layers className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    <span>{skillLabels[sr.skillSet] ?? sr.skillSet}</span>
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                      {totalSkillPositions} pos
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] pt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-emerald-500" /> Bench: {client.benchB2bCandidatesNeeded}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-purple-500" /> Market: {client.marketCandidatesNeeded}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2">
          {client.jdFileName ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <FileText className="h-3.5 w-3.5" /> JD Document Stored
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">No JD File Attached</span>
          )}
        </div>

        <button
          onClick={() => onOpenWorkspace(client.id)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer"
        >
          View Workspace & AI Matching <Sparkles className="h-3.5 w-3.5 text-purple-200" />
        </button>
      </div>
    </div>
  );
}

/* Match Results Component with Skill Grouping */
function MatchResultsBySkill({
  matches,
  onCreateInterview,
}: {
  matches: CandidateMatch[];
  onCreateInterview: (candidate: CandidateMatch) => void;
}) {
  const skillGroups = matches.reduce((groups, match) => {
    const skillMatch = match.matchRationale.match(/\[(.*?)\]/);
    const skillKey = skillMatch ? skillMatch[1] : 'General Matches';
    if (!groups[skillKey]) groups[skillKey] = [];
    groups[skillKey].push(match);
    return groups;
  }, {} as Record<string, CandidateMatch[]>);

  const keys = Object.keys(skillGroups);

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
      {keys.map((skillKey) => (
        <div key={skillKey} className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="panel-header panel-header-accent-purple px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">{skillKey}</h4>
            <span className="text-[11px] text-[var(--text-secondary)] font-bold">{skillGroups[skillKey].length} candidate(s)</span>
          </div>
          <div className="p-3 space-y-3 bg-[var(--surface)]">
            {skillGroups[skillKey].map((candidate) => (
              <CandidateMatchCard key={candidate.candidateId} candidate={candidate} onCreateInterview={onCreateInterview} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Individual Candidate Match Card */
function CandidateMatchCard({
  candidate,
  onCreateInterview,
}: {
  candidate: CandidateMatch;
  onCreateInterview: (candidate: CandidateMatch) => void;
}) {
  const scorePercent = Math.round(candidate.matchScore * 100);

  return (
    <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 space-y-3 hover:border-purple-400/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[var(--text-primary)]">{candidate.candidateName}</p>
          <p className="text-xs text-[var(--text-secondary)] font-medium">{candidate.candidateEmail}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge
              className={`text-[10px] font-bold px-2 py-0.5 border ${
                candidate.rating === 'ASSET'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : candidate.rating === 'MEDIUM'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
              }`}
            >
              {candidate.rating}
            </Badge>
            <span className="text-xs text-[var(--text-secondary)] font-semibold">
              {candidate.skillSet} • {candidate.yoePortrayed} yrs exp
            </span>
          </div>
        </div>

        {/* Score Badge */}
        <div
          className={`flex flex-col items-center justify-center rounded-xl px-3 py-1.5 font-black text-sm shrink-0 shadow-xs ${
            scorePercent >= 80
              ? 'bg-emerald-600 text-white'
              : scorePercent >= 60
              ? 'bg-amber-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{scorePercent}%</span>
          <span className="text-[9px] font-bold uppercase opacity-90">Match</span>
        </div>
      </div>

      {/* Strengths & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {candidate.strengths && candidate.strengths.length > 0 && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Key Strengths
            </p>
            <ul className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5 font-medium leading-snug">
              {candidate.strengths.slice(0, 2).map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {candidate.concerns && candidate.concerns.length > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Areas to Watch
            </p>
            <ul className="text-[11px] text-amber-600 dark:text-amber-400 space-y-0.5 font-medium leading-snug">
              {candidate.concerns.slice(0, 2).map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Match Rationale */}
      {candidate.matchRationale && (
        <p className="text-xs text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2.5 leading-relaxed font-medium">
          {candidate.matchRationale}
        </p>
      )}

      {/* Action */}
      <button
        onClick={() => onCreateInterview(candidate)}
        className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5 text-purple-200" /> Create Interview for {candidate.candidateName}
      </button>
    </div>
  );
}
