'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Briefcase, Users, Target, Edit2, Trash2, X, TrendingUp, Upload, Download, ChevronRight, ChevronLeft, Minus, Loader2, CheckCircle, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
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

interface ClientFormData {
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
  skillRequirements: SkillRequirement[];
}

interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  skillSet: string;
  yoeActual: number;
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
  clientName: '', jdRole: '', jdDescription: '',
  positionsVacant: 0, marketCandidatesNeeded: 0, benchB2bCandidatesNeeded: 0, status: 'ACTIVE',
  skillRequirements: [],
};

export default function ClientsClient({ userRole }: { userRole: string }) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<CandidateMatch[]>([]);
  const [matchSource, setMatchSource] = useState<'BENCH_B2B' | 'MARKET'>('BENCH_B2B');
  const [showMatches, setShowMatches] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [useSkillBasedRequirements, setUseSkillBasedRequirements] = useState(false);
  const [cacheClearLoading, setCacheClearLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ cachedCount?: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [masterListCollapsed, setMasterListCollapsed] = useState(false);
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const SKILL_OPTIONS = [
    { value: 'JAVA_SB', label: 'Java + Spring Boot' },
    { value: 'JFSR', label: 'Java Full Stack React' },
    { value: 'REACT_JS', label: 'React JS' },
    { value: 'ANGULAR', label: 'Angular' },
    { value: 'PYTHON', label: 'Python' },
    { value: 'QA_ENGINEER', label: 'QA Engineer' },
    { value: 'PLAYWRIGHT_AUTOMATION', label: 'Playwright Automation' },
  ];

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingClient(null);
    setFormData(emptyForm);
    setJdFile(null);
    setUseSkillBasedRequirements(false);
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        // Auto-select first client if none selected
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/clients/matching/cache/stats')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setCacheStats({ cachedCount: data.cachedCount ?? 0 }); })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const toggleMasterList = useCallback(() => {
    setMasterListCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('clients-master-pane', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (localStorage.getItem('clients-master-pane') === '1') {
          setMasterListCollapsed(true);
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all AI matching caches? This will force fresh AI analysis on next match.')) return;
    setCacheClearLoading(true);
    try {
      const res = await fetch('/api/clients/matching/cache/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCacheStats({ cachedCount: 0 });
        setToast({ message: `Cache cleared (${data.clearedCount ?? 0} entries). Refreshing matches...`, type: 'success' });
        // Refetch matching results if currently showing matches
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
    if (!showForm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); resetForm(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wasEditing = !!editingClient;
    const url = editingClient ? `/api/recruiter/clients/${editingClient.id}` : '/api/recruiter/clients';
    const method = editingClient ? 'PUT' : 'POST';
    try {
      let res;
      if (jdFile) {
        const fd = new FormData();
        fd.append('client', JSON.stringify(formData));
        fd.append('jdFile', jdFile);
        res = await fetch(url, { method, body: fd, credentials: 'include' });
      } else {
        res = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      if (res.ok) {
        await fetchClients();
        resetForm();
        setToast({ message: wasEditing ? 'Client updated.' : 'Client created.', type: 'success' });
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
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    try {
      const res = await fetch(`/api/recruiter/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) setSelectedId(null);
        await fetchClients();
      }
    } catch (e) { console.error('Failed to delete client:', e); }
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
      clientName: client.clientName, jdRole: client.jdRole, jdDescription: client.jdDescription,
      positionsVacant: client.positionsVacant, marketCandidatesNeeded: client.marketCandidatesNeeded,
      benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded, status: client.status,
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
          skillSet: 'JAVA_SB',
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

  const updatePositionRequirement = (skillIndex: number, posIndex: number, field: keyof PositionRequirement, value: any) => {
    const updated = [...formData.skillRequirements];
    updated[skillIndex].positions[posIndex] = { ...updated[skillIndex].positions[posIndex], [field]: value };
    setFormData({ ...formData, skillRequirements: updated });
  };

  const toggleSelect = (clientId: string, positionId?: string) => {
    if (positionId) {
      setSelectedPositionId(prev => prev === positionId ? null : positionId);
      setSelectedId(clientId);
    } else {
      setSelectedId(prev => {
        if (prev === clientId) return null;
        setShowMatches(false);
        setMatchResults([]);
        setSelectedPositionId(null);
        return clientId;
      });
    }
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
          minYoeRequired: selectedPosition.minYoeRequired
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

  const selectedClient = clients.find(c => c.id === selectedId) ?? null;
  
  // Find selected position across all clients with same name, and return the actual client record too
  const selectedPositionData = selectedClient ? (() => {
    // Get all clients with same name
    const sameNameClients = clients.filter(c => c.clientName === selectedClient.clientName);
    // Flatten all positions from all skill requirements
    for (const client of sameNameClients) {
      for (const skillReq of (client.skillRequirements || [])) {
        for (const pos of skillReq.positions) {
          const posId = pos.id || `${client.id}-${skillReq.skillSet}-${pos.minYoeRequired}-${pos.source}`;
          if (posId === selectedPositionId) {
            return { 
              position: { ...pos, skillSet: skillReq.skillSet, clientId: client.id, posId },
              client: client // Return the actual client record that owns this position
            };
          }
        }
      }
    }
    return null;
  })() : null;
  
  const selectedPosition = selectedPositionData?.position ?? null;
  const selectedPositionClient = selectedPositionData?.client ?? selectedClient;

  const filteredClients = clients.filter(c =>
    !search || c.clientName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by client name and status only - merge all records with same client name
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

  if (loading) return <LoadingSpinner message="Loading clients..." />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 w-full min-w-0 max-w-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-400 hover:text-zinc-600"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
          {isSuperAdmin && cacheStats && (
            <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Info className="h-3 w-3" /> Cached matches: {cacheStats.cachedCount} clients
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <button
              onClick={handleClearCache}
              disabled={cacheClearLoading}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors duration-200 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              {cacheClearLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Clear AI Cache
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Clients', value: clients.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Bench / B2B Needed', value: totalBench, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Market Needed', value: totalMarket, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-4">
            <div className={`rounded-lg p-2.5 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Tree + Detail */}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden w-full min-w-0 max-w-full">
        <div
          className={`grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-1 transition-[grid-template-columns] duration-200 ease-out ${
            masterListCollapsed
              ? 'lg:grid-cols-[2.75rem_minmax(0,1fr)]'
              : 'lg:grid-cols-[320px_minmax(0,1fr)]'
          }`}
        >
          {/* Left: Tree List */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-200 dark:border-zinc-800">
            {!masterListCollapsed && (
              <div className="hidden shrink-0 items-center justify-end border-b border-zinc-200 bg-zinc-50/70 px-1 py-1 dark:border-zinc-800 dark:bg-zinc-900/50 lg:flex">
                <button
                  type="button"
                  onClick={toggleMasterList}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Collapse client list"
                  title="Collapse list"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
            {masterListCollapsed && (
              <div className="hidden shrink-0 flex-col items-center border-b border-zinc-200 bg-zinc-50/70 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 lg:flex">
                <button
                  type="button"
                  onClick={toggleMasterList}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Expand client list"
                  title="Expand list"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${masterListCollapsed ? 'lg:hidden' : ''}`}>
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <input
                className="input-base text-sm"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeGroups.length > 0 && (
                <TreeGroup label={`Active (${activeGroups.reduce((sum, [, clients]) => sum + clients.length, 0)})`} defaultOpen>
                  {activeGroups.map(([key, clientGroup]) => (
                    <ClientTreeNode
                      key={key}
                      clients={clientGroup}
                      selectedClientId={selectedId}
                      selectedPositionId={selectedPositionId}
                      onSelect={toggleSelect}
                      onEdit={openEditForm}
                      onRefresh={fetchClients}
                    />
                  ))}
                </TreeGroup>
              )}
              {inactiveGroups.length > 0 && (
                <TreeGroup label={`Inactive (${inactiveGroups.reduce((sum, [, clients]) => sum + clients.length, 0)})`} defaultOpen={false}>
                  {inactiveGroups.map(([key, clientGroup]) => (
                    <ClientTreeNode
                      key={key}
                      clients={clientGroup}
                      selectedClientId={selectedId}
                      selectedPositionId={selectedPositionId}
                      onSelect={toggleSelect}
                      onEdit={openEditForm}
                      onRefresh={fetchClients}
                    />
                  ))}
                </TreeGroup>
              )}
              {filteredClients.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-400">No clients found</div>
              )}
            </div>
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedPosition ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-6">
                {/* Position Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {selectedClient?.clientName}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {selectedPosition.skillSet} • {selectedPosition.minYoeRequired}+ Years
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className={selectedPosition.source === 'BENCH_B2B' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}>
                        {selectedPosition.source === 'BENCH_B2B' ? 'Bench/B2B' : 'Market'}
                      </Badge>
                      <span className="text-xs text-zinc-500">{selectedPosition.candidatesNeeded} positions</span>
                    </div>
                  </div>
                </div>

                {/* AI Matching Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => triggerMatching('BENCH_B2B')}
                    disabled={matchingLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-orange-600 hover:to-amber-600 disabled:opacity-50"
                  >
                    {matchingLoading && matchSource === 'BENCH_B2B' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    Match Bench/B2B
                  </button>
                  <button
                    onClick={() => triggerMatching('MARKET')}
                    disabled={matchingLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
                  >
                    {matchingLoading && matchSource === 'MARKET' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    Match Market
                  </button>
                </div>

                {/* AI Matching Results */}
                {showMatches && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {matchSource === 'BENCH_B2B' ? 'Bench/B2B' : 'Market'} Matches
                        {!matchingLoading && <Badge variant="outline" className="text-xs">{matchResults.length} found</Badge>}
                      </h4>
                      <button onClick={() => setShowMatches(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {matchingLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-xs text-zinc-500">AI is finding matches...</p>
                        </div>
                      </div>
                    ) : matchResults.length === 0 ? (
                      <div className="text-center py-6 text-sm text-zinc-500">
                        No matching candidates found for this position.
                      </div>
                    ) : (
                      <MatchResultsBySkill matches={matchResults} onCreateInterview={createInterviewFromMatch} />
                    )}
                  </div>
                )}

                {/* Client Details */}
                {selectedPositionClient && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Client Details</h4>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                      <p><span className="font-medium">Role:</span> {selectedPositionClient.jdRole}</p>
                      <p><span className="font-medium">Status:</span> <Badge className="ml-1">{selectedPositionClient.status}</Badge></p>
                      {selectedPositionClient.jdDescription && (
                        <div>
                          <p className="font-medium mb-1">Description:</p>
                          <p className="text-xs bg-zinc-50 dark:bg-zinc-900 rounded p-2">{selectedPositionClient.jdDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedClient ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-6">
                {/* Client Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {selectedClient.clientName}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {selectedClient.jdRole}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${selectedClient.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {selectedClient.status}
                    </span>
                    <button onClick={() => openEditForm(selectedClient)} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(selectedClient.id)} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                    <Target className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedClient.positionsVacant}</p>
                    <p className="text-xs text-zinc-500">Positions</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                    <Users className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedClient.benchB2bCandidatesNeeded}</p>
                    <p className="text-xs text-zinc-500">Bench/B2B</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                    <Users className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedClient.marketCandidatesNeeded}</p>
                    <p className="text-xs text-zinc-500">Market</p>
                  </div>
                </div>

                {/* Hint to select a position */}
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Select a position from the tree to run AI matching.
                </div>

                {/* JD File */}
                {selectedClient.jdFileName && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-4 py-2.5">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">{selectedClient.jdFileName}</span>
                  </div>
                )}

                {/* Review Status */}
                <div className="flex gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selectedClient.benchReviewed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {selectedClient.benchReviewed ? '✓ Bench Reviewed' : '○ Bench Pending'}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selectedClient.recruitmentReviewed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {selectedClient.recruitmentReviewed ? '✓ Recruitment Reviewed' : '○ Recruitment Pending'}
                  </span>
                </div>

                {/* Job Description */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Job Description</h4>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {selectedClient.jdDescription || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  Created: {new Date(selectedClient.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center text-center p-6">
                <div>
                  <Building2 className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Click a position to view details and find matches</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" role="dialog" aria-modal="true">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={resetForm} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Client Name', field: 'clientName', placeholder: 'Acme Corp' },
                { label: 'Job Role', field: 'jdRole', placeholder: 'Senior Java Developer' },
              ].map(({ label, field, placeholder }) => (
                <label key={field} className="field">
                  {label}
                  <input
                    required
                    placeholder={placeholder}
                    value={formData[field as keyof Pick<ClientFormData, "clientName" | "jdRole">]}
                    onChange={(e) =>
                      setFormData({ ...formData, [field]: e.target.value } as ClientFormData)
                    }
                    className="input-base"
                  />
                </label>
              ))}
              <label className="field">
                Job Description
                <textarea
                  required
                  rows={5}
                  placeholder="Enter detailed job description…"
                  value={formData.jdDescription}
                  onChange={(e) => setFormData({ ...formData, jdDescription: e.target.value })}
                  className="input-base min-h-[120px]"
                />
              </label>
              <label className="field">
                <span className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> JD file (PDF/DOCX) — optional
                </span>
                {editingClient && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {editingClient.jdFileName ? (
                      <span>
                        Current file:{' '}
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{editingClient.jdFileName}</span>
                      </span>
                    ) : (
                      <span>No JD file stored for this client yet.</span>
                    )}
                    <button
                      type="button"
                      onClick={handleDownloadCurrentJd}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-blue-300 dark:hover:bg-zinc-700"
                    >
                      <Download className="h-3.5 w-3.5" /> Download current JD
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  className="input-base text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {editingClient
                    ? 'Choose a file and click Update Client to replace the stored JD. Text in Job Description above is saved separately.'
                    : 'Attach a JD document to store with this client (optional).'}
                </p>
                {jdFile && <p className="text-xs text-emerald-600 mt-1">New file: {jdFile.name}</p>}
              </label>
              <label className="field">
                Status
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-base">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              {/* Skill-based Requirements Toggle */}
              <div className="field">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useSkillBasedRequirements}
                    onChange={(e) => {
                      setUseSkillBasedRequirements(e.target.checked);
                      if (!e.target.checked) {
                        setFormData({ ...formData, skillRequirements: [] });
                      }
                    }}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Use skill-based position requirements
                  </span>
                </label>
                <p className="text-xs text-zinc-500 mt-1">
                  Enable to specify different skill sets with varying YOE requirements and candidate counts
                </p>
              </div>

              {/* Legacy Fields (when skill-based is disabled) - Hidden during creation, shown only for editing legacy clients */}
              {!useSkillBasedRequirements && editingClient && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Legacy mode: Enable skill-based requirements for better candidate matching
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Positions Vacant', field: 'positionsVacant' },
                      { label: 'Bench / B2B Needed', field: 'benchB2bCandidatesNeeded' },
                      { label: 'Market Needed', field: 'marketCandidatesNeeded' },
                    ].map(({ label, field }) => (
                      <label key={field} className="field">
                        {label}
                        <input
                          type="number" min="0" required placeholder="0"
                          value={formData[field as keyof Pick<ClientFormData, "positionsVacant" | "benchB2bCandidatesNeeded" | "marketCandidatesNeeded">]}
                          onChange={(e) =>
                            setFormData(
                              { ...formData, [field]: parseInt(e.target.value) || 0 } as ClientFormData,
                            )
                          }
                          className="input-base"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill-based Requirements */}
              {useSkillBasedRequirements && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Skill Requirements</h4>
                    <button
                      type="button"
                      onClick={addSkillRequirement}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-3 w-3" /> Add Skill
                    </button>
                  </div>

                  {formData.skillRequirements.map((skill, skillIndex) => (
                    <div key={skillIndex} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Skill Set</label>
                          <select
                            value={skill.skillSet}
                            onChange={(e) => updateSkillRequirement(skillIndex, 'skillSet', e.target.value)}
                            className="input-base text-sm font-medium w-full"
                          >
                            {SKILL_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSkillRequirement(skillIndex)}
                          className="text-red-500 hover:text-red-700 ml-3 mt-5"
                          title="Remove this skill requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Position Requirements</span>
                          <button
                            type="button"
                            onClick={() => addPositionRequirement(skillIndex)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" /> Add Position
                          </button>
                        </div>

                        {skill.positions.map((position, posIndex) => (
                          <div key={posIndex} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">Candidates</label>
                              <input
                                type="number"
                                min="1"
                                value={position.candidatesNeeded}
                                onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'candidatesNeeded', parseInt(e.target.value) || 1)}
                                className="input-base text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">Min YOE</label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={position.minYoeRequired}
                                onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'minYoeRequired', parseFloat(e.target.value) || 0)}
                                className="input-base text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">Source</label>
                              <select
                                value={position.source}
                                onChange={(e) => updatePositionRequirement(skillIndex, posIndex, 'source', e.target.value)}
                                className="input-base text-sm w-full"
                              >
                                <option value="BENCH_B2B">Bench/B2B</option>
                                <option value="MARKET">Market</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePositionRequirement(skillIndex, posIndex)}
                              className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Remove this position"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        {skill.positions.length === 0 && (
                          <div className="text-center py-3 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded">
                            No positions added. Click "Add Position" above.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {formData.skillRequirements.length === 0 && (
                    <div className="text-center py-6 text-sm text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                      No skill requirements added. Click "Add Skill" to get started.
                    </div>
                  )}
                </div>
              )}
              
              {/* Force skill-based for new clients */}
              {!editingClient && !useSkillBasedRequirements && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Enable skill-based requirements to specify detailed position needs for better candidate matching.
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700">
                  {editingClient ? 'Update Client' : 'Create Client'}
                </button>
                <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Collapsible Tree Group */
function TreeGroup({ label, defaultOpen, children }: { label: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {label}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/* Hierarchical Client Tree Node */
function ClientTreeNode({ clients, selectedClientId, selectedPositionId, onSelect, onEdit, onRefresh }: {
  clients: Client[];
  selectedClientId: string | null;
  selectedPositionId: string | null;
  onSelect: (clientId: string, positionId?: string) => void;
  onEdit: (client: Client) => void;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const client = clients[0];
  const isAnySelected = clients.some(c => c.id === selectedClientId);
  
  // Merge all skill requirements from all client records with same name
  const allSkillRequirements = clients.flatMap(c => c.skillRequirements || []);
  const hasSkillRequirements = allSkillRequirements.length > 0;
  const needsSkillSetup = !hasSkillRequirements && clients.some(c => c.benchB2bCandidatesNeeded > 0 || c.marketCandidatesNeeded > 0);

  // Group positions by skill set - merge from all client records
  const groupedSkills = hasSkillRequirements ? 
    allSkillRequirements.reduce((acc, skillReq) => {
      const skillKey = skillReq.skillSet;
      if (!acc[skillKey]) {
        acc[skillKey] = [];
      }
      acc[skillKey].push(...skillReq.positions);
      return acc;
    }, {} as Record<string, PositionRequirement[]>) : {};

  const handleDeleteSkill = async (skillSet: string) => {
    const SKILL_LABELS: Record<string, string> = { 
      JAVA_SB: 'Java + Spring Boot', 
      JFSR: 'Java Full Stack React', 
      REACT_JS: 'React JS',
      ANGULAR: 'Angular',
      PYTHON: 'Python',
      QA_ENGINEER: 'QA Engineer',
      PLAYWRIGHT_AUTOMATION: 'Playwright Automation'
    };
    
    const skillLabel = SKILL_LABELS[skillSet] || skillSet;
    if (!confirm(`Remove "${skillLabel}" skill requirement from ${client.clientName}?`)) return;
    
    try {
      // Remove all instances of this skill (in case of duplicates)
      const updatedSkillRequirements = (client.skillRequirements || []).filter(sr => sr.skillSet !== skillSet);
      
      console.log('Original skills:', client.skillRequirements);
      console.log('Updated skills:', updatedSkillRequirements);
      
      const updatedClient = {
        clientName: client.clientName,
        jdRole: client.jdRole,
        jdDescription: client.jdDescription,
        positionsVacant: client.positionsVacant,
        marketCandidatesNeeded: client.marketCandidatesNeeded,
        benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded,
        status: client.status,
        skillRequirements: updatedSkillRequirements
      };
      
      console.log('Sending update request for client:', client.id);
      
      const response = await fetch(`/api/recruiter/clients/${client.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updatedClient)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        console.log('Successfully deleted skill');
        // Trigger a refresh of the clients list
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        
        if (response.status === 401) {
          alert('Unauthorized: You need ADMIN privileges to modify clients');
        } else {
          alert(`Failed to remove skill requirement: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error removing skill:', error);
      alert('Network error: Failed to remove skill requirement');
    }
  };

  return (
    <div>
      {/* Client Name Row */}
      <div className={`flex items-center transition-colors border-b border-zinc-100 dark:border-zinc-800/50 ${
        isAnySelected ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
      }`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left px-4 py-3 pl-6 flex items-center gap-3"
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate flex items-center gap-2 ${
              isAnySelected ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-900 dark:text-zinc-100'
            }`}>
              {client.clientName}
              {needsSkillSetup && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Setup Needed
                </span>
              )}
            </div>
          </div>
        </button>
        
        {/* Edit Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(client);
          }}
          className="mr-3 p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          title={needsSkillSetup ? 'Setup skill requirements' : 'Edit client details'}
        >
          {needsSkillSetup ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <Edit2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Distinct Skills with Grouped Positions (when expanded) */}
      {expanded && Object.entries(groupedSkills).map(([skillSet, positions]) => (
        <DistinctSkillTreeNode
          key={`${client.id}-${skillSet}`}
          client={client}
          skillSet={skillSet}
          positions={positions}
          selectedPositionId={selectedPositionId}
          onSelect={onSelect}
          onDeleteSkill={handleDeleteSkill}
        />
      ))}
      
      {/* Show legacy mode indicator when expanded but no skill requirements */}
      {expanded && !hasSkillRequirements && (
        <div className="px-4 py-2.5 pl-12 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <span>Legacy mode: {client.benchB2bCandidatesNeeded} Bench/B2B, {client.marketCandidatesNeeded} Market</span>
            <button
              onClick={() => onEdit(client)}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Setup Skills
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Distinct Skill Tree Node - Groups positions by YOE and source */
function DistinctSkillTreeNode({ client, skillSet, positions, selectedPositionId, onSelect, onDeleteSkill }: {
  client: Client;
  skillSet: string;
  positions: PositionRequirement[];
  selectedPositionId: string | null;
  onSelect: (clientId: string, positionId?: string) => void;
  onDeleteSkill: (skillSet: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ candidatesNeeded: number; minYoeRequired: number; source: string } | null>(null);
  
  const SKILL_LABELS: Record<string, string> = { 
    JAVA_SB: 'Java + Spring Boot', 
    JFSR: 'Java Full Stack React', 
    REACT_JS: 'React JS',
    ANGULAR: 'Angular',
    PYTHON: 'Python',
    QA_ENGINEER: 'QA Engineer',
    PLAYWRIGHT_AUTOMATION: 'Playwright Automation'
  };

  const totalPositions = positions.reduce((sum, pos) => sum + pos.candidatesNeeded, 0);

  const handleEditPosition = (pos: PositionRequirement, posId: string) => {
    setEditingPosition(posId);
    setEditValues({
      candidatesNeeded: pos.candidatesNeeded,
      minYoeRequired: pos.minYoeRequired,
      source: pos.source
    });
  };

  const handleSavePosition = async (posId: string) => {
    if (!editValues) return;
    
    try {
      // Find the position in the client's skill requirements
      const skillReq = client.skillRequirements?.find(sr => sr.skillSet === skillSet);
      if (!skillReq) return;
      
      const updatedPositions = skillReq.positions.map(p => {
        const currentPosId = p.id || `${client.id}-${skillSet}-${p.minYoeRequired}-${p.source}`;
        if (currentPosId === posId) {
          return { ...p, ...editValues };
        }
        return p;
      });
      
      const updatedSkillRequirements = (client.skillRequirements || []).map(sr => {
        if (sr.skillSet === skillSet) {
          return { ...sr, positions: updatedPositions };
        }
        return sr;
      });
      
      const updatedClient = {
        clientName: client.clientName,
        jdRole: client.jdRole,
        jdDescription: client.jdDescription,
        positionsVacant: client.positionsVacant,
        marketCandidatesNeeded: client.marketCandidatesNeeded,
        benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded,
        status: client.status,
        skillRequirements: updatedSkillRequirements
      };
      
      const response = await fetch(`/api/recruiter/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedClient)
      });
      
      if (response.ok) {
        setEditingPosition(null);
        setEditValues(null);
        window.location.reload();
      } else {
        alert('Failed to update position');
      }
    } catch (error) {
      console.error('Error updating position:', error);
      alert('Network error: Failed to update position');
    }
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditValues(null);
  };

  return (
    <div>
      {/* Skill Row */}
      <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left px-4 py-2.5 pl-12 flex items-center gap-2"
        >
          <ChevronRight className={`h-3 w-3 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {SKILL_LABELS[skillSet] ?? skillSet}
          </span>
          <span className="text-[10px] text-zinc-400">({totalPositions} total positions)</span>
        </button>
        
        {/* Delete Skill Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSkill(skillSet);
          }}
          className="mr-3 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          title={`Remove ${SKILL_LABELS[skillSet] ?? skillSet} skill requirement`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Individual Position Requirements (when expanded) */}
      {expanded && positions.map((pos, idx) => {
        const posId = pos.id || `${client.id}-${skillSet}-${pos.minYoeRequired}-${pos.source}-${idx}`;
        const isSelected = selectedPositionId === posId;
        const isEditing = editingPosition === posId;
        
        return (
          <div
            key={posId}
            className={`w-full text-left px-4 py-2.5 pl-20 flex items-center gap-3 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 ${
              isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
            }`}
          >
            {isEditing && editValues ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={editValues.candidatesNeeded}
                  onChange={(e) => setEditValues({ ...editValues, candidatesNeeded: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 text-xs border border-zinc-300 rounded dark:bg-zinc-800 dark:border-zinc-600"
                  placeholder="Count"
                />
                <span className="text-[10px] text-zinc-400">pos •</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editValues.minYoeRequired}
                  onChange={(e) => setEditValues({ ...editValues, minYoeRequired: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs border border-zinc-300 rounded dark:bg-zinc-800 dark:border-zinc-600"
                  placeholder="YOE"
                />
                <span className="text-[10px] text-zinc-400">YOE •</span>
                <select
                  value={editValues.source}
                  onChange={(e) => setEditValues({ ...editValues, source: e.target.value })}
                  className="px-2 py-1 text-xs border border-zinc-300 rounded dark:bg-zinc-800 dark:border-zinc-600"
                >
                  <option value="BENCH_B2B">Bench/B2B</option>
                  <option value="MARKET">Market</option>
                </select>
                <button
                  onClick={() => handleSavePosition(posId)}
                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  title="Save changes"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSelect(client.id, posId)}
                  className="flex-1 min-w-0"
                >
                  <div className={`text-xs truncate ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {pos.minYoeRequired}+ YOE • {pos.candidatesNeeded} {pos.candidatesNeeded === 1 ? 'position' : 'positions'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {pos.source === 'BENCH_B2B' ? 'Bench/B2B' : 'Market'}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditPosition(pos, posId);
                  }}
                  className="p-1 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                  title="Edit position"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Match Results Component with Skill Grouping */
function MatchResultsBySkill({ matches, onCreateInterview }: {
  matches: CandidateMatch[];
  onCreateInterview: (candidate: CandidateMatch) => void;
}) {
  // Group matches by skill requirement (from rationale)
  const skillGroups = matches.reduce((groups, match) => {
    const skillMatch = match.matchRationale.match(/\[(.*?)\]/);
    const skillKey = skillMatch ? skillMatch[1] : 'General';
    
    if (!groups[skillKey]) groups[skillKey] = [];
    groups[skillKey].push(match);
    return groups;
  }, {} as Record<string, CandidateMatch[]>);

  const hasSkillGroups = Object.keys(skillGroups).length > 1 || !skillGroups['General'];

  if (!hasSkillGroups) {
    // No skill-based grouping, show flat list
    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {matches.map(candidate => (
          <CandidateMatchCard key={candidate.candidateId} candidate={candidate} onCreateInterview={onCreateInterview} />
        ))}
      </div>
    );
  }

  // Show skill-based groupings
  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {Object.entries(skillGroups).map(([skillKey, skillMatches]) => (
        <div key={skillKey} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">{skillKey}</h4>
            <p className="text-xs text-zinc-500">{skillMatches.length} candidate{skillMatches.length !== 1 ? 's' : ''} found</p>
          </div>
          <div className="p-3 space-y-3">
            {skillMatches.map(candidate => (
              <CandidateMatchCard key={candidate.candidateId} candidate={candidate} onCreateInterview={onCreateInterview} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Individual Candidate Match Card */
function CandidateMatchCard({ candidate, onCreateInterview }: {
  candidate: CandidateMatch;
  onCreateInterview: (candidate: CandidateMatch) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      {/* Candidate Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{candidate.candidateName}</p>
          <p className="text-xs text-zinc-500">{candidate.candidateEmail}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge className={`text-[10px] px-1.5 py-0 ${candidate.rating === 'ASSET' ? 'bg-emerald-100 text-emerald-800' : candidate.rating === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
              {candidate.rating}
            </Badge>
            <span className="text-[10px] text-zinc-500">{candidate.skillSet} • {candidate.yoeActual}y</span>
          </div>
        </div>
        <div className={`text-lg font-bold px-2 py-0.5 rounded-lg ${candidate.matchScore >= 0.8 ? 'text-emerald-700 bg-emerald-50' : candidate.matchScore >= 0.6 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'}`}>
          {Math.round(candidate.matchScore * 100)}%
        </div>
      </div>

      {/* Strengths & Concerns */}
      <div className="grid grid-cols-2 gap-2">
        {candidate.strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-emerald-700 flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3" /> Strengths
            </p>
            <ul className="text-[11px] text-emerald-600 space-y-0.5">
              {candidate.strengths.slice(0, 2).map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        )}
        {candidate.concerns.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-amber-700 flex items-center gap-1 mb-1">
              <AlertCircle className="h-3 w-3" /> Concerns
            </p>
            <ul className="text-[11px] text-amber-600 space-y-0.5">
              {candidate.concerns.slice(0, 2).map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Rationale */}
      {candidate.matchRationale && (
        <p className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded p-2 line-clamp-2">
          {candidate.matchRationale}
        </p>
      )}

      {/* Action */}
      <button
        onClick={() => onCreateInterview(candidate)}
        className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Create Interview
      </button>
    </div>
  );
}
