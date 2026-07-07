'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Batch {
  id: string;
  language: string;
  deadline: string;
  status: string;
  assignerEmail: string;
  createdAt: string;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CandidateRow {
  name: string;
  email: string;
  contactNumber?: string;
  institute?: string;
  branch?: string;
  yop?: number;
  experience?: number;
  rowError?: string;
}

const TEMPLATE_HEADERS = ['Name', 'Email', 'Contact Number', 'Institute', 'Branch', 'YOP', 'Experience'];

const HEADER_ALIASES: Record<string, keyof CandidateRow> = {
  name: 'name',
  fullname: 'name',
  email: 'email',
  emailaddress: 'email',
  contact: 'contactNumber',
  contactnumber: 'contactNumber',
  phone: 'contactNumber',
  phonenumber: 'contactNumber',
  mobile: 'contactNumber',
  institute: 'institute',
  institution: 'institute',
  branch: 'branch',
  location: 'branch',
  city: 'branch',
  yop: 'yop',
  yearofpassing: 'yop',
  experience: 'experience',
  yoe: 'experience',
  yearsofexperience: 'experience',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function parseCandidateFile(file: File): Promise<CandidateRow[]> {
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map((row) => {
    const mapped: CandidateRow = { name: '', email: '' };
    for (const [rawHeader, value] of Object.entries(row)) {
      const key = HEADER_ALIASES[normalizeHeader(rawHeader)];
      if (!key) continue;
      const str = String(value).trim();
      if (key === 'yop') mapped.yop = str ? Number(str) : undefined;
      else if (key === 'experience') mapped.experience = str ? Number(str) : undefined;
      else mapped[key] = str;
    }
    if (!mapped.name || !mapped.email) {
      mapped.rowError = 'Missing name or email';
    } else if (mapped.institute && !/^(j|q)spiders$/i.test(mapped.institute)) {
      mapped.rowError = `Unrecognized institute "${mapped.institute}" (expected JSpiders or QSpiders)`;
    }
    return mapped;
  });
}

function downloadTemplate() {
  const example = ['Jane Doe', 'jane@example.com', '9876543210', 'JSpiders', 'Bangalore', '2024', '0'];
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
  XLSX.writeFile(wb, 'screening_candidates_template.xlsx');
}

export function ScreeningHomeClient({ isManager }: { isManager: boolean }) {
  const [languages, setLanguages] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fileName, setFileName] = useState('');
  const [candidateRows, setCandidateRows] = useState<CandidateRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editDeadlineValue, setEditDeadlineValue] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState('');

  const load = () => {
    Promise.all([
      fetch('/api/screening/admin/languages').then((r) => r.json()),
      fetch('/api/screening/admin/batches').then((r) => r.json()),
    ])
      .then(([langData, batchData]) => {
        setLanguages(langData.languages || []);
        if (langData.languages?.length && !language) setLanguage(langData.languages[0]);
        setBatches(batchData.batches || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setSuccess('');
    setFileName(file.name);
    try {
      const rows = await parseCandidateFile(file);
      if (rows.length === 0) {
        setParseError('No rows found in this file.');
        setCandidateRows([]);
        return;
      }
      setCandidateRows(rows);
    } catch {
      setParseError('Could not read this file — please upload a valid .xlsx or .csv file.');
      setCandidateRows([]);
    }
  };

  const validRows = candidateRows.filter((r) => !r.rowError);

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    if (!language || !deadline || validRows.length === 0) {
      setError('Language, deadline, and at least one valid candidate row are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/screening/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          deadline: new Date(deadline).toISOString(),
          candidates: validRows.map(({ rowError: _rowError, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || 'Failed to create batch');
        return;
      }
      setSuccess(`Batch created with ${validRows.length} candidate(s) — invites are being emailed out.`);
      setCandidateRows([]);
      setFileName('');
      load();
    } catch {
      setError('Network error — please try again');
    } finally {
      setCreating(false);
    }
  };

  const startEditDeadline = (b: Batch) => {
    setBatchError('');
    setEditingDeadlineId(b.id);
    setEditDeadlineValue(toLocalInputValue(b.deadline));
  };

  const cancelEditDeadline = () => {
    setEditingDeadlineId(null);
    setEditDeadlineValue('');
  };

  const saveDeadline = async (batchId: string) => {
    if (!editDeadlineValue) return;
    setBatchError('');
    setSavingDeadline(true);
    try {
      const res = await fetch(`/api/screening/admin/batches/${batchId}/deadline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: new Date(editDeadlineValue).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setBatchError(data.error || 'Failed to update deadline');
        return;
      }
      cancelEditDeadline();
      load();
    } catch {
      setBatchError('Network error — please try again');
    } finally {
      setSavingDeadline(false);
    }
  };

  const removeBatch = async (batchId: string) => {
    if (!window.confirm('Delete this batch? This removes all its candidates and questions and cannot be undone.')) return;
    setBatchError('');
    setDeletingId(batchId);
    try {
      const res = await fetch(`/api/screening/admin/batches/${batchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setBatchError(data.error || 'Failed to delete batch');
        return;
      }
      load();
    } catch {
      setBatchError('Network error — please try again');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Link href="/admin/screening/round2"><Button variant="outline">Round 2 queue</Button></Link>
        {isManager && (
          <Link href="/admin/screening/round3"><Button variant="outline">Round 3 queue</Button></Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a written-round batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Language</Label>
              <select
                className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">Questions are scoped to core basics only (fundamentals through exception handling).</p>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Candidates — upload a .xlsx or .csv file</Label>
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                Download template
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-1 mb-2">
              Columns: <code>Name</code>, <code>Email</code>, <code>Contact Number</code>, <code>Institute</code> (JSpiders or QSpiders), <code>Branch</code> (location), <code>YOP</code>, <code>Experience</code> (years). Header names are case-insensitive.
            </p>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="cursor-pointer" />
            {fileName && <p className="text-xs text-zinc-500 mt-1">{fileName}</p>}
            {parseError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{parseError}</p>}
          </div>

          {candidateRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Contact</th>
                    <th className="py-2 px-3">Institute</th>
                    <th className="py-2 px-3">Branch</th>
                    <th className="py-2 px-3">YOP</th>
                    <th className="py-2 px-3">Experience</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateRows.map((r, idx) => (
                    <tr key={idx} className={`border-b border-zinc-100 dark:border-zinc-900 ${r.rowError ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <td className="py-2 px-3">{r.name || '—'}</td>
                      <td className="py-2 px-3">{r.email || '—'}</td>
                      <td className="py-2 px-3">{r.contactNumber || '—'}</td>
                      <td className="py-2 px-3">{r.institute || '—'}</td>
                      <td className="py-2 px-3">{r.branch || '—'}</td>
                      <td className="py-2 px-3">{r.yop ?? '—'}</td>
                      <td className="py-2 px-3">{r.experience ?? '—'}</td>
                      <td className="py-2 px-3">
                        {r.rowError ? (
                          <span className="text-red-600 dark:text-red-400 text-xs">{r.rowError}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-zinc-500 p-3">
                {validRows.length} of {candidateRows.length} rows valid.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
          <Button onClick={handleCreate} disabled={creating || validRows.length === 0}>
            {creating ? 'Generating questions…' : `Create batch & send invites (${validRows.length})`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batchError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{batchError}</p>}
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-zinc-500">No batches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-4">Language</th>
                    <th className="py-2 pr-4">Deadline</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Assigner</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">{b.language}</td>
                      <td className="py-2 pr-4">
                        {editingDeadlineId === b.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              value={editDeadlineValue}
                              onChange={(e) => setEditDeadlineValue(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={() => saveDeadline(b.id)} disabled={savingDeadline}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditDeadline} disabled={savingDeadline}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{new Date(b.deadline).toLocaleString()}</span>
                            {b.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => startEditDeadline(b)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">{b.status}</td>
                      <td className="py-2 pr-4">{b.assignerEmail}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-3">
                          <Link href={`/admin/screening/round1/${b.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Review
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeBatch(b.id)}
                            disabled={deletingId === b.id}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            {deletingId === b.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
