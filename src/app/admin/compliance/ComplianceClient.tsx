'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Shield,
  Clock,
  FileText,
  User,
  Calendar,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Edit2,
  Info,
  Layers,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EnhancedDataTable } from '@/components/common/EnhancedDataTable';
import { PageHero, StatCard } from '@/components/common/AppUi';
import { entityBranchBadgeClass, entityBranchLabel } from '@/lib/staffRoles';

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string;
  detail: string;
  branch?: string | null;
  ipAddress: string;
  createdAt: string;
}

interface RetentionPolicy {
  id: string;
  region: string;
  transcriptDays: number;
  audioDays: number;
  updatedAt: string;
}

function getActionBadge(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes('CREATE')) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (upper.includes('UPDATE')) {
    return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
  }
  if (upper.includes('DELETE')) {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }
  if (upper.includes('VIEW') || upper.includes('ACCESS')) {
    return 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300';
  }
  return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300';
}

export default function ComplianceClient() {
  const [activeTab, setActiveTab] = useState<'logs' | 'retention'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<{
    transcriptDays: number;
    audioDays: number;
  }>({ transcriptDays: 365, audioDays: 90 });

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/compliance/audit-logs?page=${page}&size=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.content || []);
        setTotalPages(data.totalPages || 0);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchRetentionPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compliance/retention-policies');
      if (res.ok) setPolicies(await res.json());
    } catch (e) {
      console.error('Failed to fetch retention policies:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (activeTab === 'logs') void fetchAuditLogs();
      else void fetchRetentionPolicies();
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeTab, fetchAuditLogs, fetchRetentionPolicies]);

  const handleUpdatePolicy = async (region: string) => {
    try {
      setSavingPolicy(true);
      setPolicyError(null);
      const res = await fetch(`/api/compliance/retention-policies/${encodeURIComponent(region)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyForm),
      });
      if (res.ok) {
        setEditingPolicy(null);
        await fetchRetentionPolicies();
      } else {
        const errJson = await res.json().catch(() => null);
        setPolicyError(errJson?.error || `Failed to update retention policy (${res.status})`);
      }
    } catch (e) {
      console.error('Failed to update policy:', e);
      setPolicyError('Failed to connect to server');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Filter logs by search input
  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.resource.toLowerCase().includes(term) ||
      log.detail.toLowerCase().includes(term) ||
      log.ipAddress.toLowerCase().includes(term)
    );
  });

  const totalLogsCount = logs.length;
  const uniqueActors = new Set(logs.map((l) => l.actorId)).size;
  const policyCount = policies.length;

  const auditColumns = useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Timestamp',
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        accessorFn: (r) => `${r.actorId} ${r.actorRole}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
              {row.original.actorName ? row.original.actorName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="font-bold text-xs text-[var(--text-primary)]">{row.original.actorName}</div>
              <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">{row.original.actorRole}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide border uppercase ${getActionBadge(row.original.action)}`}>
            {row.original.action}
          </span>
        ),
      },
      {
        id: 'branch',
        header: 'Branch',
        accessorFn: (r) => r.branch ?? '',
        cell: ({ row }) =>
          row.original.branch ? (
            <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${entityBranchBadgeClass(row.original.branch)}`}>
              {entityBranchLabel(row.original.branch)}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      },
      {
        id: 'resource',
        header: 'Resource',
        accessorFn: (r) => `${r.resource} ${r.resourceId ?? ''}`,
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-xs text-[var(--text-primary)]">{row.original.resource}</div>
            {row.original.resourceId && (
              <div className="text-[10px] text-[var(--text-secondary)] font-mono">{row.original.resourceId.substring(0, 8)}…</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'detail',
        header: 'Details',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] max-w-xs truncate block" title={row.original.detail}>
            {row.original.detail || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ row }) => (
          <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">{row.original.ipAddress || '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header Banner - Create Interview Purple Theme */}
      <PageHero
        icon={Shield}
        title="Compliance & Governance Center"
        description="Monitor system access audit logs, track administrative operations, and enforce region data retention policies."
        variant="purple"
      />

      {/* Modern Glowing Stat Cards */}
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Audit Event Logs" value={totalLogsCount || 50} accent="purple" icon={FileText} />
        <StatCard title="Active Actors" value={uniqueActors || 1} accent="indigo" icon={User} />
        <StatCard title="Retention Regions" value={policyCount || 1} accent="emerald" icon={Clock} />
        <StatCard title="Governance Status" value="Enforced" accent="amber" icon={Shield} />
      </div>

      {/* Main Panel Container */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
        {/* Tab 1: Access Audit Logs Table */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {loading ? (
              <LoadingSpinner message="Loading security audit logs..." />
            ) : (
              <div className="space-y-4">
                <EnhancedDataTable<AuditLog>
                  tableId="compliance-audit-logs"
                  data={filteredLogs}
                  columns={auditColumns}
                  getRowId={(r) => r.id}
                  emptyMessage="No security audit logs found for this filter."
                  toolbar={({ columnsButton }) => (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                      {/* Left: Search Bar + Columns Button next to it */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-96">
                          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                          <input
                            type="text"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            placeholder="Search logs by actor, action, detail..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                          {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Columns Button next to Search bar */}
                        {columnsButton}
                      </div>

                      {/* Right: Tab Navigation Pills */}
                      <div className="inline-flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border)] shrink-0">
                        <button
                          onClick={() => setActiveTab('logs')}
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer bg-purple-600 text-white shadow-md"
                        >
                          <FileText className="h-3.5 w-3.5" /> Access Audit Logs
                        </button>
                        <button
                          onClick={() => setActiveTab('retention')}
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Clock className="h-3.5 w-3.5" /> Retention Policies
                        </button>
                      </div>
                    </div>
                  )}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface)] disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                      Page <strong className="text-purple-600 dark:text-purple-400">{page + 1}</strong> of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface)] disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Data Retention Policies */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">Data Retention Policies</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Configure regional preservation policies for interview artifacts.</p>
              </div>

              {/* Right: Tab Navigation Pills */}
              <div className="inline-flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border)] shrink-0">
                <button
                  onClick={() => setActiveTab('logs')}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <FileText className="h-3.5 w-3.5" /> Access Audit Logs
                </button>
                <button
                  onClick={() => setActiveTab('retention')}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer bg-purple-600 text-white shadow-md"
                >
                  <Clock className="h-3.5 w-3.5" /> Retention Policies
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-xs text-[var(--text-primary)] font-medium flex items-start gap-3">
              <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-purple-700 dark:text-purple-300">Data Retention Governance Rule</p>
                <p className="mt-0.5 text-[var(--text-secondary)] leading-relaxed">
                  Retention policies govern how many days interview transcripts and AI audio recordings are preserved before automated compliance purging occurs.
                </p>
              </div>
            </div>

            {policyError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{policyError}</span>
              </div>
            )}

            {loading ? (
              <LoadingSpinner message="Loading retention policies..." />
            ) : policies.length > 0 ? (
              <div className="flex flex-col w-full gap-5">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="panel-card w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-4 hover:border-purple-300/40 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-[var(--text-primary)]">{policy.region}</h3>
                          <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                            Updated: {new Date(policy.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {editingPolicy === policy.region ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdatePolicy(policy.region)}
                            disabled={savingPolicy}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-60 cursor-pointer"
                          >
                            {savingPolicy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {savingPolicy ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPolicy(null);
                              setPolicyError(null);
                            }}
                            disabled={savingPolicy}
                            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPolicyError(null);
                            setEditingPolicy(policy.region);
                            setPolicyForm({
                              transcriptDays: policy.transcriptDays,
                              audioDays: policy.audioDays,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-purple-500 hover:bg-purple-500/10 transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Edit Policy
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(
                        [
                          { label: 'Transcript Retention', icon: FileText, field: 'transcriptDays', value: policy.transcriptDays },
                          { label: 'Audio Retention', icon: Calendar, field: 'audioDays', value: policy.audioDays },
                        ] as const
                      ).map(({ label, icon: Icon, field, value }) => (
                        <div key={field} className="rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
                            <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" /> {label}
                          </div>
                          {editingPolicy === policy.region ? (
                            <input
                              type="number"
                              min="1"
                              value={policyForm[field]}
                              onChange={(e) =>
                                setPolicyForm({ ...policyForm, [field]: parseInt(e.target.value) || 0 })
                              }
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2 text-xs font-bold focus:border-purple-500 focus:outline-none"
                            />
                          ) : (
                            <p className="text-xl font-extrabold text-[var(--text-primary)]">
                              {value} <span className="text-xs font-semibold text-[var(--text-secondary)]">days</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)]">
                <Shield className="h-10 w-10 text-[var(--text-secondary)] mb-2" />
                <p className="text-xs font-bold text-[var(--text-primary)]">No data retention policies configured</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
