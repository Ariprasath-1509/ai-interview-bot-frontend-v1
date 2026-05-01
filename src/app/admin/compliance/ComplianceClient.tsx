'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock, FileText, User, Calendar, Search, Filter } from 'lucide-react';

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

export default function ComplianceClient() {
  const [activeTab, setActiveTab] = useState<'logs' | 'retention'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState({ transcriptDays: 365, audioDays: 90 });

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAuditLogs();
    } else {
      fetchRetentionPolicies();
    }
  }, [activeTab, page]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      console.log('[ComplianceClient] Fetching audit logs, page:', page);
      const res = await fetch(`/api/compliance/audit-logs?page=${page}&size=50`);
      console.log('[ComplianceClient] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[ComplianceClient] Received data:', data);
        setLogs(data.content || []);
        setTotalPages(data.totalPages || 0);
      } else {
        console.error('[ComplianceClient] Failed response:', await res.text());
      }
    } catch (error) {
      console.error('[ComplianceClient] Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetentionPolicies = async () => {
    try {
      setLoading(true);
      console.log('[ComplianceClient] Fetching retention policies');
      const res = await fetch('/api/compliance/retention-policies');
      console.log('[ComplianceClient] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[ComplianceClient] Received policies:', data);
        setPolicies(data);
      } else {
        console.error('[ComplianceClient] Failed response:', await res.text());
      }
    } catch (error) {
      console.error('[ComplianceClient] Failed to fetch retention policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async (region: string) => {
    try {
      const res = await fetch(`/api/compliance/retention-policies/${region}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyForm)
      });
      if (res.ok) {
        setEditingPolicy(null);
        fetchRetentionPolicies();
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.actorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesResource = !filterResource || log.resource === filterResource;
    return matchesSearch && matchesAction && matchesResource;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueResources = [...new Set(logs.map(l => l.resource))];

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('VIEW') || action.includes('ACCESS')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Audit & Privacy
        </h1>
        <p className="text-gray-600 mt-1">Access logs and retention policies</p>
      </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Access Logs
            </button>
            <button
              onClick={() => setActiveTab('retention')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'retention'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Retention Policies
            </button>
          </div>
        </div>

        {/* Access Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by actor, action, or resource..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
                <select
                  value={filterResource}
                  onChange={(e) => setFilterResource(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  {uniqueResources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Timestamp</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Resource</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Details</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{log.actorId}</div>
                                <div className="text-xs text-gray-500">{log.actorRole}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{log.resource}</div>
                            {log.resourceId && (
                              <div className="text-xs text-gray-500 font-mono">{log.resourceId.substring(0, 8)}...</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {log.detail || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                            {log.ipAddress || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No audit logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Retention Policies Tab */}
        {activeTab === 'retention' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Retention policies define how long interview transcripts and audio recordings are kept before automatic deletion.
              </p>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                  Loading policies...
                </div>
              ) : policies.length > 0 ? (
                policies.map((policy) => (
                  <div key={policy.id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{policy.region}</h3>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {editingPolicy === policy.region ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdatePolicy(policy.region)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPolicy(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPolicy(policy.region);
                            setPolicyForm({
                              transcriptDays: policy.transcriptDays,
                              audioDays: policy.audioDays
                            });
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Transcript Retention</span>
                        </div>
                        {editingPolicy === policy.region ? (
                          <input
                            type="number"
                            min="1"
                            value={policyForm.transcriptDays}
                            onChange={(e) => setPolicyForm({ ...policyForm, transcriptDays: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{policy.transcriptDays} days</p>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Audio Retention</span>
                        </div>
                        {editingPolicy === policy.region ? (
                          <input
                            type="number"
                            min="1"
                            value={policyForm.audioDays}
                            onChange={(e) => setPolicyForm({ ...policyForm, audioDays: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{policy.audioDays} days</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                  No retention policies configured yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
