'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Building2,
  Search,
  Filter,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Lock,
  User,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHero, StatCard } from '@/components/common/AppUi';
import { StaffDirectoryTable, type StaffRow } from './StaffDirectoryTable';
import { createStaffAction } from './actions';
import { StaffBranchSelect } from './StaffBranchSelect';

export function StaffClient({
  staff,
  serverError
}: {
  staff: StaffRow[];
  serverError?: string;
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'RECRUITER'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<'RECRUITER' | 'ADMIN'>('RECRUITER');
  const [formBranch, setFormBranch] = useState('DEVELOPMENT');
  const [formAdminSource, setFormAdminSource] = useState('BENCH');

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  // Stats calculation
  const totalStaffCount = staff.length;
  const adminCount = staff.filter((s) => s.role.includes('ADMIN')).length;
  const recruiterCount = staff.filter((s) => s.role.includes('RECRUITER')).length;
  const branchCount = new Set(staff.map((s) => s.branch).filter(Boolean)).size;

  // Filtered staff list
  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' ? s.role.includes('ADMIN') : s.role.includes('RECRUITER'));
    return matchesSearch && matchesRole;
  });

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const role = formRole;
    const branch = formBranch;
    const adminSource = formRole === 'ADMIN' ? String(formData.get('adminSource') ?? '') : undefined;

    const result = await createStaffAction({
      name,
      email,
      password,
      role,
      branch,
      adminSource,
    });

    setSubmitting(false);

    if (result?.error) {
      setFormError(result.error);
      return;
    }

    // Success -> close modal & reset
    setShowAddModal(false);
    setFormError(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Global Server Error Notification */}
      {serverError && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Header Banner - Create Interview Purple Theme */}
      <PageHero
        icon={Users}
        title="Staff Directory & Permissions"
        description="Manage organization staff accounts, assign administrative privileges, and set branch-level candidate access controls."
        variant="purple"
      />

      {/* Modern Glowing Stat Cards */}
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Staff" value={totalStaffCount} accent="purple" icon={Users} />
        <StatCard title="Administrators" value={adminCount} accent="indigo" icon={Shield} />
        <StatCard title="Recruiters" value={recruiterCount} accent="emerald" icon={UserCheck} />
        <StatCard title="Active Branches" value={branchCount || 1} accent="amber" icon={Building2} />
      </div>

      {/* Main Staff Directory Table Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
        <StaffDirectoryTable
          staff={filteredStaff}
          customToolbar={({ columnsButton }) => (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              {/* Search Bar shifted towards left */}
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Search staff by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Right controls: Role Filter, Add Staff Member, Columns */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Role Filters */}
                <div className="inline-flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border)]">
                  {(['ALL', 'ADMIN', 'RECRUITER'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                        roleFilter === r
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {r === 'ALL' ? 'All' : r === 'ADMIN' ? 'Admins' : 'Recruiters'}
                    </button>
                  ))}
                </div>

                {/* Add Staff Button */}
                <button
                  onClick={() => {
                    setFormError(null);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4 stroke-[2.5]" /> Add Staff Member
                </button>

                {/* Columns Button next to Add staff member */}
                {columnsButton}
              </div>
            </div>
          )}
        />
      </div>

      {/* ADD STAFF MEMBER CENTERED MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="panel-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="panel-header panel-header-accent-purple p-6 text-[var(--text-primary)] shrink-0 relative flex items-center justify-between rounded-t-2xl border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">Add Staff Member</h2>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Register new staff account credentials and assign role permissions.</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 max-h-[calc(85vh-80px)] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-500" /> Full Name *
                </label>
                <input
                  required
                  name="name"
                  placeholder="e.g. Jane Smith"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-purple-500" /> Email Address *
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="jane@company.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-purple-500" /> Password *
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  name="password"
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-500" /> Role *
                  </label>
                  <input type="hidden" name="role" value={formRole} />
                  <Select
                    value={formRole}
                    onValueChange={(val) => setFormRole(val as 'RECRUITER' | 'ADMIN')}
                  >
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2.5 text-xs font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs cursor-pointer h-10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl rounded-xl p-1 max-h-60 overflow-y-auto">
                      <SelectItem value="RECRUITER" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        Recruiter
                      </SelectItem>
                      <SelectItem value="ADMIN" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-purple-500" /> Branch *
                  </label>
                  <StaffBranchSelect
                    name="branch"
                    value={formBranch}
                    onChange={setFormBranch}
                  />
                </div>
              </div>

              {formRole === 'ADMIN' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-purple-500" /> Admin Candidate Source *
                  </label>
                  <input type="hidden" name="adminSource" value={formAdminSource} />
                  <Select
                    value={formAdminSource}
                    onValueChange={(val) => setFormAdminSource(val)}
                  >
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2.5 text-xs font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs cursor-pointer h-10">
                      <SelectValue placeholder="Select candidate source" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl rounded-xl p-1 max-h-60 overflow-y-auto">
                      <SelectItem value="BENCH" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        Bench (Manages Bench Candidates)
                      </SelectItem>
                      <SelectItem value="BD" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        BD (Manages B2B Candidates)
                      </SelectItem>
                      <SelectItem value="RECRUITMENT" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        Recruitment (Manages Market Candidates)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-200" />}
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
