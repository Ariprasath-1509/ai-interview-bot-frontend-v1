'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Shield, Clock, FileText, User, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EnhancedDataTable } from '@/components/common/EnhancedDataTable';

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string;
  detail: string;
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

function getActionColor(action: string) {
  if (action.includes("CREATE")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (action.includes("UPDATE")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (action.includes("DELETE")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (action.includes("VIEW") || action.includes("ACCESS"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function ComplianceClient() {
  const [activeTab, setActiveTab] = useState<'logs' | 'retention'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
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
    } catch (e) { console.error('Failed to fetch audit logs:', e); }
    finally { setLoading(false); }
  }, [page]);

  const fetchRetentionPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compliance/retention-policies');
      if (res.ok) setPolicies(await res.json());
    } catch (e) { console.error('Failed to fetch retention policies:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Defer to avoid react-hooks/set-state-in-effect (fetchers set state).
    const t = window.setTimeout(() => {
      if (activeTab === 'logs') void fetchAuditLogs();
      else void fetchRetentionPolicies();
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeTab, fetchAuditLogs, fetchRetentionPolicies]);

  const handleUpdatePolicy = async (region: string) => {
    try {
      const res = await fetch(`/api/compliance/retention-policies/${region}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyForm),
      });
      if (res.ok) { setEditingPolicy(null); fetchRetentionPolicies(); }
    } catch (e) { console.error('Failed to update policy:', e); }
  };

  const tabCls = (active: boolean) =>
    `flex-1 px-6 py-3.5 text-sm font-medium transition-all duration-200 ${
      active ? 'border-b-2 border-blue-600 text-blue-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
    }`;

  const auditColumns = useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Timestamp",
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-zinc-500 text-xs whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        accessorFn: (r) => `${r.actorId} ${r.actorRole}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-400 shrink-0" />
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.original.actorId}</div>
              <div className="text-xs text-zinc-500">{row.original.actorRole}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(row.original.action)}`}>
            {row.original.action}
          </span>
        ),
      },
      {
        id: "resource",
        header: "Resource",
        accessorFn: (r) => `${r.resource} ${r.resourceId ?? ""}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.original.resource}</div>
            {row.original.resourceId && (
              <div className="text-xs text-zinc-400 font-mono">{row.original.resourceId.substring(0, 8)}…</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "detail",
        header: "Details",
        cell: ({ row }) => (
          <span className="text-zinc-500 max-w-xs truncate block">{row.original.detail || "—"}</span>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: "IP Address",
        cell: ({ row }) => (
          <span className="text-zinc-500 font-mono text-xs">{row.original.ipAddress || "—"}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button onClick={() => setActiveTab('logs')} className={tabCls(activeTab === 'logs')}>
            <FileText className="inline h-4 w-4 mr-2" />Access Logs
          </button>
          <button onClick={() => setActiveTab('retention')} className={tabCls(activeTab === 'retention')}>
            <Clock className="inline h-4 w-4 mr-2" />Retention Policies
          </button>
        </div>
      </div>

      {/* Access Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="card p-4">
            {loading ? (
              <LoadingSpinner message="Loading logs…" />
            ) : (
              <EnhancedDataTable<AuditLog>
                tableId="compliance-audit-logs"
                data={logs}
                columns={auditColumns}
                getRowId={(r) => r.id}
                emptyMessage="No audit logs on this page."
              />
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retention Policies */}
      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/20 dark:text-blue-300">
            <strong>Note:</strong> Retention policies define how long interview transcripts and audio recordings are kept before automatic deletion.
          </div>

          {loading ? <LoadingSpinner message="Loading policies…" /> : policies.length > 0 ? (
            <div className="grid gap-4">
              {policies.map((policy) => (
                <div key={policy.id} className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{policy.region}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {editingPolicy === policy.region ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdatePolicy(policy.region)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingPolicy(null)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingPolicy(policy.region); setPolicyForm({ transcriptDays: policy.transcriptDays, audioDays: policy.audioDays }); }}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(
                      [
                        { label: 'Transcript Retention', icon: FileText, field: 'transcriptDays', value: policy.transcriptDays },
                        { label: 'Audio Retention', icon: Calendar, field: 'audioDays', value: policy.audioDays },
                      ] as const
                    ).map(({ label, icon: Icon, field, value }) => (
                      <div key={field} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/50">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          <Icon className="h-4 w-4" /> {label}
                        </div>
                        {editingPolicy === policy.region ? (
                          <input
                            type="number" min="1"
                            value={policyForm[field]}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, [field]: parseInt(e.target.value) || 0 })
                            }
                            className="input-base"
                          />
                        ) : (
                          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value} <span className="text-sm font-normal text-zinc-500">days</span></p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Shield className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm text-zinc-500">No retention policies configured yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
