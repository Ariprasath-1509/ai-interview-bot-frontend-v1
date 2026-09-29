'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/formatDate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Sparkles, Layers, Calendar, Clock, Upload, FileText, FileSpreadsheet, FileUp, Loader2 } from 'lucide-react';

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

function formatReadableDateTime(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getPresetDateTime(type: 'today_6pm' | 'tomorrow_9am' | 'in_2days' | 'next_week'): string {
  const d = new Date();
  if (type === 'today_6pm') {
    d.setHours(18, 0, 0, 0);
  } else if (type === 'tomorrow_9am') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (type === 'in_2days') {
    d.setDate(d.getDate() + 2);
    d.setHours(18, 0, 0, 0);
  } else if (type === 'next_week') {
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function DateTimePicker({
  value,
  onChange,
  showPresets = true,
  placeholder = "Select deadline date & time",
}: {
  value: string;
  onChange: (val: string) => void;
  showPresets?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    const el = inputRef.current;
    if (!el) return;
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {}
    }
    el.focus();
  };

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        className="relative flex h-10 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] shadow-sm hover:shadow-md shadow-purple-950/5 dark:shadow-none transition-all duration-150 hover:border-[#6D28D9] cursor-pointer group focus-within:border-[#6D28D9]"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] dark:text-purple-400 group-hover:bg-[#6D28D9] group-hover:text-white transition-colors">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col truncate">
            {value ? (
              <span className="font-extrabold text-[var(--text-primary)] truncate">
                {formatReadableDateTime(value)}
              </span>
            ) : (
              <span className="text-[var(--text-secondary)] font-medium truncate">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Clock className="h-4 w-4 text-[#6D28D9] opacity-80" />
          <input
            ref={inputRef}
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute left-3.5 top-full h-0 w-7 opacity-0 pointer-events-none"
          />
        </div>
      </div>

      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">Quick presets:</span>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('today_6pm'))}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[#6D28D9] hover:text-[#6D28D9] transition-all cursor-pointer"
          >
            Today 6 PM
          </button>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('tomorrow_9am'))}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[#6D28D9] hover:text-[#6D28D9] transition-all cursor-pointer"
          >
            Tomorrow 9 AM
          </button>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('in_2days'))}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[#6D28D9] hover:text-[#6D28D9] transition-all cursor-pointer"
          >
            In 2 Days
          </button>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('next_week'))}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[#6D28D9] hover:text-[#6D28D9] transition-all cursor-pointer"
          >
            Next Week
          </button>
        </div>
      )}
    </div>
  );
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

const emptyDirectCandidate = { name: '', email: '', contactNumber: '', institute: '', branch: '', yop: '', experience: '' };

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
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [directCandidate, setDirectCandidate] = useState(emptyDirectCandidate);
  const [directError, setDirectError] = useState('');
  const [directSuccess, setDirectSuccess] = useState('');
  const [addingDirect, setAddingDirect] = useState(false);
  const [createMode, setCreateMode] = useState<'preset' | 'jd' | 'paper'>('preset');
  const [docLabel, setDocLabel] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docText, setDocText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [candidateMode, setCandidateMode] = useState<'single' | 'batch'>('batch');
  const [singleCandidate, setSingleCandidate] = useState(emptyDirectCandidate);

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

  const singleCandidateError = (() => {
    if (candidateMode !== 'single') return '';
    if (!singleCandidate.name.trim() || !singleCandidate.email.trim()) return 'Name and email are required.';
    if (singleCandidate.institute && !/^(j|q)spiders$/i.test(singleCandidate.institute)) {
      return `Unrecognized institute "${singleCandidate.institute}" (expected JSpiders or QSpiders)`;
    }
    return '';
  })();

  const candidateCount = candidateMode === 'batch' ? validRows.length : singleCandidateError ? 0 : 1;

  const candidatesPayload = () =>
    candidateMode === 'batch'
      ? validRows.map(({ rowError: _rowError, ...rest }) => rest)
      : [
          {
            name: singleCandidate.name,
            email: singleCandidate.email,
            contactNumber: singleCandidate.contactNumber || undefined,
            institute: singleCandidate.institute || undefined,
            branch: singleCandidate.branch || undefined,
            yop: singleCandidate.yop ? Number(singleCandidate.yop) : undefined,
            experience: singleCandidate.experience ? Number(singleCandidate.experience) : undefined,
          },
        ];

  const handleDocFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractError('');
    setDocFileName(file.name);
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/screening/admin/extract-document-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setExtractError(data.error || 'Failed to extract text from this document');
        return;
      }
      setDocText(data.text || '');
    } catch {
      setExtractError('Network error — please try again');
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    if (createMode === 'preset') {
      if (!language || !deadline) {
        setError('Language and deadline are required.');
        return;
      }
    } else if (!docLabel.trim() || !docText.trim() || !deadline) {
      setError(
        `A batch label, ${createMode === 'jd' ? 'job description' : 'question paper'} text, and deadline are required.`
      );
      return;
    }
    if (candidateMode === 'batch' && validRows.length === 0) {
      setError('At least one valid candidate row is required.');
      return;
    }
    if (candidateMode === 'single' && singleCandidateError) {
      setError(singleCandidateError);
      return;
    }
    setCreating(true);
    try {
      const endpoint = createMode === 'preset' ? '/api/screening/admin/batches' : '/api/screening/admin/batches/from-document';
      const candidates = candidatesPayload();
      const payload =
        createMode === 'preset'
          ? {
              language,
              deadline: new Date(deadline).toISOString(),
              candidates,
            }
          : {
              mode: createMode === 'jd' ? 'JD' : 'QUESTION_PAPER',
              documentText: docText,
              language: docLabel,
              deadline: new Date(deadline).toISOString(),
              candidates,
            };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || 'Failed to create batch');
        return;
      }
      setSuccess(`Batch created with ${candidates.length} candidate(s) — invites are being emailed out.`);
      setCandidateRows([]);
      setFileName('');
      setSingleCandidate(emptyDirectCandidate);
      setDocText('');
      setDocFileName('');
      setDocLabel('');
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

  const addDirectToRound2 = async () => {
    setDirectError('');
    setDirectSuccess('');
    if (!directCandidate.name.trim() || !directCandidate.email.trim()) {
      setDirectError('Name and email are required.');
      return;
    }
    setAddingDirect(true);
    try {
      const res = await fetch('/api/screening/admin/candidates/direct-to-round2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: directCandidate.name,
          email: directCandidate.email,
          contactNumber: directCandidate.contactNumber || undefined,
          institute: directCandidate.institute || undefined,
          branch: directCandidate.branch || undefined,
          yop: directCandidate.yop ? Number(directCandidate.yop) : undefined,
          experience: directCandidate.experience ? Number(directCandidate.experience) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setDirectError(data.error || 'Failed to add candidate');
        return;
      }
      setDirectSuccess(`${directCandidate.name} added to the Round 2 queue.`);
      setDirectCandidate(emptyDirectCandidate);
    } catch {
      setDirectError('Network error — please try again');
    } finally {
      setAddingDirect(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/screening/round2"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--surface-subtle)] hover:border-[#6D28D9] transition-all cursor-pointer"
        >
          <Users className="h-4 w-4 text-[#6D28D9]" />
          Round 2 Queue
        </Link>
        {isManager && (
          <Link
            href="/admin/screening/round3"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--surface-subtle)] hover:border-[#6D28D9] transition-all cursor-pointer"
          >
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Round 3 Queue
          </Link>
        )}
      </div>

      {/* ── Card 1: Direct to Round 2 ── */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
        <div className="panel-header panel-header-accent-amber rounded-t-2xl flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Candidate missed Round 1?
          </h2>
          <button
            type="button"
            onClick={() => setShowDirectForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
          >
            {showDirectForm ? 'Cancel' : 'Add directly to Round 2'}
          </button>
        </div>
        {showDirectForm && (
          <div className="p-5 space-y-4 border-t border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Skips the written test entirely — the candidate goes straight into the Round 2 queue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Name</Label>
                <Input
                  value={directCandidate.name}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, name: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Email</Label>
                <Input
                  type="email"
                  value={directCandidate.email}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, email: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Contact Number</Label>
                <Input
                  value={directCandidate.contactNumber}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, contactNumber: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Institute</Label>
                <Input
                  value={directCandidate.institute}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, institute: e.target.value })}
                  placeholder="JSpiders or QSpiders"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Branch</Label>
                <Input
                  value={directCandidate.branch}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, branch: e.target.value })}
                  placeholder="e.g. Bangalore"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">YOP</Label>
                <Input
                  type="number"
                  value={directCandidate.yop}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, yop: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Experience (years)</Label>
                <Input
                  type="number"
                  value={directCandidate.experience}
                  onChange={(e) => setDirectCandidate({ ...directCandidate, experience: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
              </div>
            </div>
            {directError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{directError}</p>}
            {directSuccess && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{directSuccess}</p>}
            <button
              type="button"
              onClick={addDirectToRound2}
              disabled={addingDirect}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {addingDirect ? 'Adding…' : 'Add to Round 2'}
            </button>
          </div>
        )}
      </div>

      {/* ── Card 2: Create a written-round batch ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
        <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Create a written-round batch
          </h2>
          <span className="text-xs font-medium text-[var(--text-secondary)]">AI-powered question generation</span>
        </div>

        <div className="p-5 space-y-5">
          {/* Mode Tabs */}
          <div className="flex gap-2 border-b border-[var(--border)] pb-3">
            {(['preset', 'jd', 'paper'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCreateMode(m)}
                className={`text-xs px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  createMode === m
                    ? 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-extrabold shadow-xs'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m === 'preset' ? 'Basics preset' : m === 'jd' ? 'From a JD' : 'From a question paper'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createMode === 'preset' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Language</Label>
                <Select
                  value={language}
                  onValueChange={(val) => setLanguage(val)}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-44">
                    {languages.map((l) => (
                      <SelectItem key={l} value={l} className="text-xs font-semibold">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[var(--text-secondary)]">Questions are scoped to core basics only (fundamentals through exception handling).</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-primary)]">Batch label</Label>
                <Input
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  placeholder="e.g. Python (from JD)"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">Shown in the batches list — free text, not validated against the preset language list.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[var(--text-primary)]">Deadline</Label>
              <DateTimePicker
                value={deadline}
                onChange={(val) => setDeadline(val)}
              />
            </div>
          </div>

          {createMode !== 'preset' && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--text-primary)]">{createMode === 'jd' ? 'Job description' : 'Question paper'}</Label>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {createMode === 'jd'
                  ? "Upload a .docx or paste the JD text below. The AI identifies its core/foundational skills and writes a fresh question set for those basics only."
                  : 'Upload a .docx or paste the question paper text below. The AI extracts the questions as-is (no new ones invented) and infers grading answers, since the source has no answer key.'}
              </p>
              <div className="relative">
                <input
                  type="file"
                  id="screening-doc-upload"
                  accept=".docx"
                  onChange={handleDocFileSelect}
                  className="hidden"
                  disabled={extracting}
                />
                <label
                  htmlFor="screening-doc-upload"
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 cursor-pointer ${
                    extracting
                      ? 'border-purple-300/40 bg-purple-500/5 cursor-wait'
                      : 'border-purple-300/60 dark:border-purple-800/60 bg-purple-500/5 hover:border-[#6D28D9] hover:bg-purple-500/10'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-[#6D28D9]/30 text-[#6D28D9] dark:text-purple-300 shadow-2xs group-hover:scale-105 transition-transform">
                    {extracting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileUp className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {extracting ? (
                        <span className="text-[#6D28D9]">Extracting document content...</span>
                      ) : (
                        <>
                          <span className="text-[#6D28D9] underline decoration-purple-400">Click to upload</span> or drag and drop .docx
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium">Microsoft Word (.docx) documents supported</p>
                  </div>
                </label>
              </div>

              {docFileName && !extracting && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-[var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{docFileName}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Loaded</span>
                </div>
              )}
              {extractError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{extractError}</p>}
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Paste the text here, or upload a .docx file above to extract it automatically. You can review and edit it before generating."
                rows={8}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-primary)] font-mono focus:border-[#6D28D9] focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[var(--text-primary)]">Candidates</Label>
              <div className="flex gap-2">
                {(['single', 'batch'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCandidateMode(m)}
                    className={`text-xs px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer ${
                      candidateMode === m
                        ? 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold shadow-xs'
                        : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    {m === 'single' ? 'Single candidate' : 'Upload a batch'}
                  </button>
                ))}
              </div>
            </div>

            {candidateMode === 'single' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Name</Label>
                  <Input
                    value={singleCandidate.name}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, name: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Email</Label>
                  <Input
                    type="email"
                    value={singleCandidate.email}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, email: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Contact Number</Label>
                  <Input
                    value={singleCandidate.contactNumber}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, contactNumber: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Institute</Label>
                  <Input
                    value={singleCandidate.institute}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, institute: e.target.value })}
                    placeholder="JSpiders or QSpiders"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Branch</Label>
                  <Input
                    value={singleCandidate.branch}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, branch: e.target.value })}
                    placeholder="e.g. Bangalore"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">YOP</Label>
                  <Input
                    type="number"
                    value={singleCandidate.yop}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, yop: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Experience (years)</Label>
                  <Input
                    type="number"
                    value={singleCandidate.experience}
                    onChange={(e) => setSingleCandidate({ ...singleCandidate, experience: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs h-10 font-medium focus:border-[#6D28D9]"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">Upload a .xlsx or .csv file</p>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[#6D28D9] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
                  >
                    Download template
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Columns: <code>Name</code>, <code>Email</code>, <code>Contact Number</code>, <code>Institute</code> (JSpiders or QSpiders), <code>Branch</code> (location), <code>YOP</code>, <code>Experience</code> (years). Header names are case-insensitive.
                </p>
                <div className="relative">
                  <input
                    type="file"
                    id="screening-batch-upload"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="screening-batch-upload"
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-300/60 dark:border-purple-800/60 bg-purple-500/5 hover:border-[#6D28D9] hover:bg-purple-500/10 p-4 text-center transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-[#6D28D9]/30 text-[#6D28D9] dark:text-purple-300 shadow-2xs group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        <span className="text-[#6D28D9] underline decoration-purple-400">Click to upload spreadsheet</span> or drag and drop
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">Excel (.xlsx, .xls) or CSV files supported</p>
                    </div>
                  </label>
                </div>

                {fileName && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{fileName}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {candidateRows.length} Candidates Parsed
                    </span>
                  </div>
                )}
                {parseError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{parseError}</p>}

                {candidateRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs mt-3">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Institute</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3">YOP</th>
                          <th className="py-2.5 px-3">Experience</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {candidateRows.map((r, idx) => (
                          <tr key={idx} className={`hover:bg-[var(--surface-subtle)] transition-colors ${r.rowError ? 'bg-rose-500/10 dark:bg-rose-950/30' : ''}`}>
                            <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{r.name || '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.email || '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.contactNumber || '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.institute || '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.branch || '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.yop ?? '—'}</td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-secondary)]">{r.experience ?? '—'}</td>
                            <td className="py-2.5 px-3">
                              {r.rowError ? (
                                <span className="inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">{r.rowError}</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs font-semibold text-[var(--text-secondary)] p-3 bg-[var(--surface-subtle)] border-t border-[var(--border)]">
                      {validRows.length} of {candidateRows.length} rows valid.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
          {success && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{success}</p>}
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || candidateCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-5 py-3 text-xs font-extrabold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {creating
              ? createMode === 'paper'
                ? 'Extracting questions from paper…'
                : 'Generating questions…'
              : `Create batch & send invites (${candidateCount})`}
          </button>
        </div>
      </div>

      {/* ── Card 3: Batches Directory ── */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200">
        <div className="panel-header panel-header-accent-blue rounded-t-2xl flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Batches
          </h2>
          <span className="text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-500/20">
            {batches.length} Total
          </span>
        </div>

        <div className="p-5">
          {batchError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-3">{batchError}</p>}
          {loading ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">No batches yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigner</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">{b.language}</td>
                      <td className="py-3 px-4 font-medium text-[var(--text-secondary)]">
                        {editingDeadlineId === b.id ? (
                          <div className="flex items-center gap-2">
                            <DateTimePicker
                              value={editDeadlineValue}
                              onChange={(val) => setEditDeadlineValue(val)}
                              showPresets={false}
                            />
                            <button
                              type="button"
                              onClick={() => saveDeadline(b.id)}
                              disabled={savingDeadline}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditDeadline}
                              disabled={savingDeadline}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{formatDateTime(b.deadline)}</span>
                            {b.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => startEditDeadline(b)}
                                className="text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full border ${
                          b.status === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-secondary)]">{b.assignerEmail}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/screening/round1/${b.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] text-white font-bold text-xs shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            Review
                          </Link>
                          <Link
                            href={`/admin/screening/summary/${b.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-bold text-xs hover:bg-[var(--surface-subtle)] transition-all"
                          >
                            Summary
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeBatch(b.id)}
                            disabled={deletingId === b.id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 font-bold text-xs hover:bg-rose-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        </div>
      </div>
    </div>
  );
}
