'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Briefcase, Users, Target, Edit2, Trash2, X, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
}

interface ClientFormData {
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
}

const emptyForm: ClientFormData = {
  clientName: '', jdRole: '', jdDescription: '',
  positionsVacant: 0, marketCandidatesNeeded: 0, benchB2bCandidatesNeeded: 0, status: 'ACTIVE',
};

export default function ClientsClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) setClients(await res.json());
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingClient ? `/api/recruiter/clients/${editingClient.id}` : '/api/recruiter/clients';
    const method = editingClient ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) { await fetchClients(); resetForm(); }
    } catch (e) { console.error('Failed to save client:', e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    try {
      const res = await fetch(`/api/recruiter/clients/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchClients();
    } catch (e) { console.error('Failed to delete client:', e); }
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setFormData({
      clientName: client.clientName, jdRole: client.jdRole, jdDescription: client.jdDescription,
      positionsVacant: client.positionsVacant, marketCandidatesNeeded: client.marketCandidatesNeeded,
      benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded, status: client.status,
    });
    setShowForm(true);
  };

  const resetForm = () => { setShowForm(false); setEditingClient(null); setFormData(emptyForm); };

  if (loading) return <LoadingSpinner message="Loading clients..." />;

  const totalBench = clients.reduce((s, c) => s + c.benchB2bCandidatesNeeded, 0);
  const totalMarket = clients.reduce((s, c) => s + c.marketCandidatesNeeded, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/clients/matching')}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-purple-700"
          >
            <TrendingUp className="h-4 w-4" /> AI Matching
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Client Cards */}
      {clients.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                    {client.clientName}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    {client.jdRole}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                    {client.status}
                  </span>
                  <button onClick={() => openEditForm(client)} className="rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> {client.positionsVacant} positions</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {client.benchB2bCandidatesNeeded} bench</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {client.marketCandidatesNeeded} market</span>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{client.jdDescription}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">No clients yet</h3>
          <p className="mb-4 text-sm text-zinc-500">Add your first client to start matching candidates.</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Client
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
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
                    value={(formData as any)[field]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
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
                      value={(formData as any)[field]}
                      onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })}
                      className="input-base"
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Status
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-base">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
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
