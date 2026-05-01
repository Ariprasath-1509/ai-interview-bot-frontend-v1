'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Briefcase, Users, Target, Edit2, Trash2, X, TrendingUp } from 'lucide-react';

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

export default function ClientsClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: '',
    jdRole: '',
    jdDescription: '',
    positionsVacant: 0,
    marketCandidatesNeeded: 0,
    benchB2bCandidatesNeeded: 0,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruiter/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchClients();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const res = await fetch(`/api/recruiter/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchClients();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update client:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    try {
      const res = await fetch(`/api/recruiter/clients/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setFormData({
      clientName: client.clientName,
      jdRole: client.jdRole,
      jdDescription: client.jdDescription,
      positionsVacant: client.positionsVacant,
      marketCandidatesNeeded: client.marketCandidatesNeeded,
      benchB2bCandidatesNeeded: client.benchB2bCandidatesNeeded,
      status: client.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData({
      clientName: '',
      jdRole: '',
      jdDescription: '',
      positionsVacant: 0,
      marketCandidatesNeeded: 0,
      benchB2bCandidatesNeeded: 0,
      status: 'ACTIVE'
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-600 mt-1">Manage client requirements and job descriptions</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/admin/clients/matching')} 
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <TrendingUp className="w-5 h-5" />AI Matching
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />Add Client
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-6 h-6 text-blue-600" /></div>
              <div><p className="text-sm text-gray-600">Total Clients</p><p className="text-2xl font-bold">{clients.length}</p></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Users className="w-6 h-6 text-green-600" /></div>
              <div><p className="text-sm text-gray-600">Bench/B2B Needed</p><p className="text-2xl font-bold">{clients.reduce((s, c) => s + c.benchB2bCandidatesNeeded, 0)}</p></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Target className="w-6 h-6 text-purple-600" /></div>
              <div><p className="text-sm text-gray-600">Market Needed</p><p className="text-2xl font-bold">{clients.reduce((s, c) => s + c.marketCandidatesNeeded, 0)}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" />{client.clientName}</h3>
                  <p className="text-gray-600 flex items-center gap-2 mt-1"><Briefcase className="w-4 h-4" />{client.jdRole}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{client.status}</span>
                  <button onClick={() => openEditForm(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2"><Target className="w-4 h-4" />Positions: {client.positionsVacant}</div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4" />Bench/B2B: {client.benchB2bCandidatesNeeded} | Market: {client.marketCandidatesNeeded}</div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Job Description:</p>
                <p className="text-sm text-gray-600 line-clamp-3">{client.jdDescription}</p>
              </div>
            </div>
          ))}
        </div>

        {clients.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No clients yet</h3>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" />Add Client</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingClient ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input 
                  required 
                  placeholder="Enter client name" 
                  value={formData.clientName} 
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Role *</label>
                <input 
                  required 
                  placeholder="e.g., Senior Java Developer" 
                  value={formData.jdRole} 
                  onChange={(e) => setFormData({...formData, jdRole: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Description *</label>
                <textarea 
                  required 
                  placeholder="Enter detailed job description" 
                  value={formData.jdDescription} 
                  onChange={(e) => setFormData({...formData, jdDescription: e.target.value})} 
                  rows={6} 
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Positions Vacant *</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    placeholder="0" 
                    value={formData.positionsVacant} 
                    onChange={(e) => setFormData({...formData, positionsVacant: parseInt(e.target.value) || 0})} 
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bench/B2B Needed *</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    placeholder="0" 
                    value={formData.benchB2bCandidatesNeeded} 
                    onChange={(e) => setFormData({...formData, benchB2bCandidatesNeeded: parseInt(e.target.value) || 0})} 
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Market Needed *</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    placeholder="0" 
                    value={formData.marketCandidatesNeeded} 
                    onChange={(e) => setFormData({...formData, marketCandidatesNeeded: parseInt(e.target.value) || 0})} 
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                  {editingClient ? 'Update Client' : 'Create Client'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">
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
