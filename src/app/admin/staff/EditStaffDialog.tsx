"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStaffAction } from "./actions";
import { StaffBranchSelect } from "./StaffBranchSelect";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  adminSource?: string;
};

const EDITABLE_ROLES = [
  { value: "RECRUITER", label: "Recruiter" },
  { value: "TESTING_RECRUITER", label: "Testing Recruiter" },
  { value: "ADMIN", label: "Admin" },
  { value: "TESTING_ADMIN", label: "Testing Admin" },
] as const;

export function EditStaffDialog({ staff }: { staff: StaffRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSuperAdmin = staff.role === "SUPER_ADMIN";
  const [role, setRole] = useState(staff.role);
  const showAdminSource = role === "ADMIN" || role === "TESTING_ADMIN";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const result = await updateStaffAction(staff.id, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      role: isSuperAdmin ? "SUPER_ADMIN" : String(form.get("role") ?? staff.role),
      adminSource: showAdminSource ? String(form.get("adminSource") ?? "") : undefined,
      branch: isSuperAdmin ? undefined : String(form.get("branch") ?? ""),
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
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit staff member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${staff.id}`}>Name</Label>
            <Input
              id={`edit-name-${staff.id}`}
              name="name"
              defaultValue={staff.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-email-${staff.id}`}>Email</Label>
            <Input
              id={`edit-email-${staff.id}`}
              name="email"
              type="email"
              defaultValue={staff.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-password-${staff.id}`}>New password (optional)</Label>
            <Input
              id={`edit-password-${staff.id}`}
              name="password"
              type="password"
              minLength={6}
              placeholder="Leave blank to keep current password"
            />
          </div>
          {isSuperAdmin ? (
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value="Super Admin" disabled />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor={`edit-role-${staff.id}`}>Role</Label>
                <select
                  id={`edit-role-${staff.id}`}
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EDITABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-branch-${staff.id}`}>Branch</Label>
                <StaffBranchSelect
                  id={`edit-branch-${staff.id}`}
                  name="branch"
                  defaultValue={staff.branch ?? "DEVELOPMENT"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          {showAdminSource && (
            <div className="space-y-2">
              <Label htmlFor={`edit-adminSource-${staff.id}`}>Admin source</Label>
              <select
                id={`edit-adminSource-${staff.id}`}
                name="adminSource"
                defaultValue={staff.adminSource ?? ""}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="BENCH">Bench (manages Bench candidates)</option>
                <option value="BD">BD (manages B2B candidates)</option>
                <option value="RECRUITMENT">Recruitment (manages Market candidates)</option>
              </select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
