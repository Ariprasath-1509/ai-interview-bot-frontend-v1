'use client';

import { useState } from 'react';
import { Edit2, Shield, User, Mail, Lock, Building2, Layers, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateStaffAction } from './actions';
import { StaffBranchSelect } from './StaffBranchSelect';

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  adminSource?: string;
};

const EDITABLE_ROLES = [
  { value: 'RECRUITER', label: 'Recruiter' },
  { value: 'ADMIN', label: 'Admin' },
] as const;

/** Maps stored role → display role (strips TESTING_ prefix) */
function toBaseRole(role: string): string {
  if (role === 'TESTING_ADMIN') return 'ADMIN';
  if (role === 'TESTING_RECRUITER') return 'RECRUITER';
  return role;
}

/** Maps display role + branch → actual stored role */
function toActualRole(baseRole: string, branch: string): string {
  const isTesting = branch.toUpperCase() === 'TESTING';
  if (baseRole === 'ADMIN') return isTesting ? 'TESTING_ADMIN' : 'ADMIN';
  return isTesting ? 'TESTING_RECRUITER' : 'RECRUITER';
}

export function EditStaffDialog({ staff }: { staff: StaffRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSuperAdmin = staff.role === 'SUPER_ADMIN';
  const [role, setRole] = useState(toBaseRole(staff.role));
  const [branch, setBranch] = useState(staff.branch ?? (staff.role.startsWith('TESTING') ? 'TESTING' : 'DEVELOPMENT'));
  const [adminSource, setAdminSource] = useState(staff.adminSource ?? 'BENCH');
  const showAdminSource = role === 'ADMIN';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const result = await updateStaffAction(staff.id, {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      role: isSuperAdmin ? 'SUPER_ADMIN' : toActualRole(role, branch),
      adminSource: showAdminSource ? String(form.get('adminSource') ?? '') : undefined,
      branch: isSuperAdmin ? undefined : branch,
    });

    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] transition-all hover:border-purple-500 hover:bg-purple-500/10 cursor-pointer"
          title="Edit Staff Member"
        >
          <Edit2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="panel-header panel-header-accent-purple p-6 text-[var(--text-primary)] border-b border-[var(--border)]">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Edit Staff Member Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-80px)] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-name-${staff.id}`}>
              <User className="h-3.5 w-3.5 text-purple-500" /> Full Name
            </label>
            <input
              id={`edit-name-${staff.id}`}
              name="name"
              defaultValue={staff.name}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-email-${staff.id}`}>
              <Mail className="h-3.5 w-3.5 text-purple-500" /> Email Address
            </label>
            <input
              id={`edit-email-${staff.id}`}
              name="email"
              type="email"
              defaultValue={staff.email}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-password-${staff.id}`}>
              <Lock className="h-3.5 w-3.5 text-purple-500" /> New Password (optional)
            </label>
            <input
              id={`edit-password-${staff.id}`}
              name="password"
              type="password"
              minLength={6}
              placeholder="Leave blank to keep current password"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] p-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {isSuperAdmin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-500" /> Role
              </label>
              <input
                value="Super Admin"
                disabled
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] p-2.5 text-sm font-bold opacity-70"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-role-${staff.id}`}>
                  <Shield className="h-3.5 w-3.5 text-purple-500" /> Role
                </label>
                <input type="hidden" name="role" value={role} />
                <Select value={role} onValueChange={(val) => setRole(val)}>
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2.5 text-xs font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs cursor-pointer h-10">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl rounded-xl p-1 max-h-60 overflow-y-auto">
                    {EDITABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-branch-${staff.id}`}>
                  <Building2 className="h-3.5 w-3.5 text-purple-500" /> Branch
                </label>
                <StaffBranchSelect
                  id={`edit-branch-${staff.id}`}
                  name="branch"
                  defaultValue={branch}
                  value={branch}
                  onChange={setBranch}
                />
              </div>
            </div>
          )}

          {showAdminSource && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5" htmlFor={`edit-adminSource-${staff.id}`}>
                <Layers className="h-3.5 w-3.5 text-purple-500" /> Admin Candidate Source *
              </label>
              <input type="hidden" name="adminSource" value={adminSource} />
              <Select value={adminSource} onValueChange={(val) => setAdminSource(val)}>
                <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2.5 text-xs font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs cursor-pointer h-10">
                  <SelectValue placeholder="Select candidate source" />
                </SelectTrigger>
                <SelectContent className="z-[100] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl rounded-xl p-1 max-h-60 overflow-y-auto">
                  <SelectItem value="BENCH" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                    Bench (manages Bench candidates)
                  </SelectItem>
                  <SelectItem value="BD" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                    BD (manages B2B candidates)
                  </SelectItem>
                  <SelectItem value="RECRUITMENT" className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg">
                    Recruitment (manages Market candidates)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
