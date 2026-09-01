"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { FileText, Upload, Download, Sparkles, Eye, FileDown, Pencil, Trash2, UserCheck, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";
import { entityBranchBadgeClass, entityBranchLabel, isStaffAdminRole } from "@/lib/staffRoles";
import { useBranchOptions } from "@/hooks/useBranchOptions";
import { useSkillSetOptions } from "@/hooks/useSkillSetOptions";
import type { Candidate } from "./CandidatesClient";

const SKILL_LABEL: Record<string, string> = { JAVA_SB: "Java + SB", JFSR: "JFSR", REACT_JS: "React JS", ANGULAR: "Angular", PYTHON: "Python", QA_ENGINEER: "QA Engineer", PLAYWRIGHT_AUTOMATION: "Playwright" };
const SOURCE_LABEL: Record<string, string> = { B2B: "B2B", BENCH: "Bench", MARKET: "Market" };

const RATING_BADGE: Record<string, string> = {
  ASSET: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
  MEDIUM: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
  LIABILITY: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20",
};

const STATUS_BADGE: Record<string, string> = {
  RFD: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
  WFD: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
  DOB: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20",
  TRAINING: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20",
  DEPLOYED: "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
};

function getEffectiveInterviewCount(candidate: Candidate): number {
  return Math.max(candidate.noOfInterviews ?? 0, candidate.systemInterviewCount ?? 0);
}

function getEffectiveInterviewBadgeClass(count: number): string {
  if (count >= 7) return "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20";
  if (count >= 5) return "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
  if (count >= 3) return "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
  return "inline-flex whitespace-nowrap px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20";
}

function getEffectiveInterviewLabel(count: number): string {
  if (count >= 7) return "Review Needed";
  if (count >= 5) return "High Attempts";
  if (count >= 3) return "Eligible";
  return "Below Baseline";
}

function ViewMatchesButton({
  candidateId,
  candidateStatus,
  systemInterviewCount,
}: {
  candidateId: string;
  candidateStatus: string | null;
  systemInterviewCount: number | null;
}) {
  const isEligible = candidateStatus === "RFD" && (systemInterviewCount || 0) >= 1;
  if (!isEligible) {
    return (
      <span className="cursor-not-allowed text-xs font-medium text-[var(--text-secondary)] opacity-50 whitespace-nowrap" title="Candidate must be RFD with 1+ interviews">
        —
      </span>
    );
  }
  return (
    <Link
      href={`/admin/candidates/${candidateId}/matches`}
      className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all duration-150 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      View Matches
    </Link>
  );
}

export type CandidateEditForm = {
  name: string;
  email: string;
  officialEmail: string;
  personalEmail: string;
  contactNumber: string;
  batch: string;
  batchMentor: string;
  source: string;
  candidateStatus: string;
  rating: string;
  skillSet: string;
  yoePortrayed: string;
  yop: string;
  noOfInterviews: string;
  interviewMentorName: string;
  clientName: string;
  branch: string;
};

type RowHandlers = {
  onStartEdit: (c: Candidate) => void;
  onResumeUpload: (id: string) => void;
  onDownloadResume: (id: string, filename: string) => void;
  onCreateInterview: (c: Candidate) => void;
  onViewHistory: (id: string) => void;
  onDownloadPdf?: (id: string, name: string) => void;
  onToggleActive: (c: Candidate) => void;
};

export function CandidateEditDialog({
  isOpen,
  role,
  editForm,
  setEditForm,
  saving,
  onSave,
  onCancel,
  clientsEnabled = true,
}: {
  isOpen: boolean;
  role: string;
  editForm: CandidateEditForm;
  setEditForm: Dispatch<SetStateAction<CandidateEditForm>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  clientsEnabled?: boolean;
}) {
  const { options: branchOptions } = useBranchOptions();
  const { options: skillSetOptions } = useSkillSetOptions();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-lg">
        <DialogHeader className="border-b border-[var(--border)] pb-4">
          <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">Edit Candidate</DialogTitle>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Update candidate details and save changes.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Candidate full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-contact">Contact Number</Label>
              <Input
                id="edit-contact"
                value={editForm.contactNumber}
                onChange={(e) => setEditForm((p) => ({ ...p, contactNumber: e.target.value }))}
                placeholder="Contact number"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-officialEmail">Official Email</Label>
              <Input
                id="edit-officialEmail"
                type="email"
                value={editForm.officialEmail}
                onChange={(e) => setEditForm((p) => ({ ...p, officialEmail: e.target.value }))}
                placeholder="official@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-personalEmail">Personal Email</Label>
              <Input
                id="edit-personalEmail"
                type="email"
                value={editForm.personalEmail}
                onChange={(e) => setEditForm((p) => ({ ...p, personalEmail: e.target.value }))}
                placeholder="personal@email.com"
              />
            </div>

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-batch">Batch (DOH)</Label>
                <Input
                  id="edit-batch"
                  value={editForm.batch}
                  onChange={(e) => setEditForm((p) => ({ ...p, batch: e.target.value }))}
                  placeholder="Batch identifier"
                />
              </div>
            )}

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-batchMentor">Batch Mentor</Label>
                <Input
                  id="edit-batchMentor"
                  value={editForm.batchMentor}
                  onChange={(e) => setEditForm((p) => ({ ...p, batchMentor: e.target.value }))}
                  placeholder="Mentor name"
                />
              </div>
            )}

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-source">
                  Source {role !== "SUPER_ADMIN" && <span className="text-[var(--text-secondary)] font-normal">(locked)</span>}
                </Label>
                <Select
                  value={editForm.source}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, source: val }))}
                >
                  <SelectTrigger disabled={role !== "SUPER_ADMIN"}>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="BENCH">Bench</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-candidateStatus">Status</Label>
                <Select
                  value={editForm.candidateStatus}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, candidateStatus: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RFD">RFD</SelectItem>
                    <SelectItem value="WFD">WFD</SelectItem>
                    <SelectItem value="DOB">DOB</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-rating">Rating</Label>
                <Select
                  value={editForm.rating}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, rating: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-skillSet">Skill Set</Label>
              <Select
                value={editForm.skillSet}
                onValueChange={(val) => setEditForm((p) => ({ ...p, skillSet: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select skill set..." />
                </SelectTrigger>
                <SelectContent>
                  {skillSetOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-yoePortrayed">YOE (Years of Exp)</Label>
              <Input
                id="edit-yoePortrayed"
                type="number"
                step="0.1"
                value={editForm.yoePortrayed}
                onChange={(e) => setEditForm((p) => ({ ...p, yoePortrayed: e.target.value }))}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-yop">YOP (Year of Passing)</Label>
              <Input
                id="edit-yop"
                type="number"
                value={editForm.yop}
                onChange={(e) => setEditForm((p) => ({ ...p, yop: e.target.value }))}
                placeholder="2023"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-noOfInterviews">No. of Interviews</Label>
              <Input
                id="edit-noOfInterviews"
                type="number"
                min={0}
                value={editForm.noOfInterviews}
                onChange={(e) => setEditForm((p) => ({ ...p, noOfInterviews: e.target.value }))}
              />
            </div>

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-interviewMentorName">Interview Mentor</Label>
                <Input
                  id="edit-interviewMentorName"
                  value={editForm.interviewMentorName}
                  onChange={(e) => setEditForm((p) => ({ ...p, interviewMentorName: e.target.value }))}
                  placeholder="Mentor name"
                />
              </div>
            )}

            {clientsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-clientName">Client</Label>
                <Input
                  id="edit-clientName"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm((p) => ({ ...p, clientName: e.target.value }))}
                  placeholder="Client name"
                />
              </div>
            )}

            {role === "SUPER_ADMIN" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch">Branch</Label>
                <Select
                  value={editForm.branch}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, branch: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "SUPER_ADMIN" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Login Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Login email"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="bg-[var(--surface-subtle)] active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#6D28D9] to-[#4C1D95] text-white active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CandidatesMainTable({
  data,
  role,
  editingId,
  editForm,
  setEditForm,
  saving,
  onSaveEdit,
  onCancelEdit,
  handlers,
  selectSmCls,
  showBranchColumn = false,
  clientsEnabled = true,
  recordsCount,
  headerTitle,
}: {
  data: Candidate[];
  role: string;
  editingId: string | null;
  editForm: CandidateEditForm;
  setEditForm: Dispatch<SetStateAction<CandidateEditForm>>;
  saving: boolean;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  handlers: RowHandlers;
  selectSmCls: string;
  showBranchColumn?: boolean;
  clientsEnabled?: boolean;
  recordsCount?: number;
  headerTitle?: string;
}) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const columns = useMemo<ColumnDef<Candidate, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        meta: { stickyLeft: 0, isLastSticky: !showBranchColumn },
        cell: ({ row }) => (
          <div className="w-[180px] truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[var(--text-primary)] text-sm truncate">{row.original.name || "—"}</span>
              {row.original.active === false && (
                <span className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-600">
                  Inactive
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)] truncate mt-0.5">{row.original.email}</div>
          </div>
        ),
      },
      ...(showBranchColumn
        ? [
            {
              id: "branch",
              header: "Branch",
              meta: { stickyLeft: 212, isLastSticky: true },
              accessorFn: (r: Candidate) => r.branch ?? "DEVELOPMENT",
              cell: ({ row }: { row: { original: Candidate } }) => (
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${entityBranchBadgeClass(row.original.branch)}`}>
                  {entityBranchLabel(row.original.branch)}
                </span>
              ),
            } satisfies ColumnDef<Candidate, unknown>,
          ]
        : []),
      {
        accessorKey: "contactNumber",
        header: "Contact",
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      ...(clientsEnabled ? [
        {
          accessorKey: "batch",
          header: "Batch (DOH)",
          cell: ({ getValue }: { getValue: () => unknown }) => (
            <span className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
          ),
        } satisfies ColumnDef<Candidate, unknown>,
        {
          accessorKey: "batchMentor",
          header: "Batch Mentor",
          cell: ({ getValue }: { getValue: () => unknown }) => (
            <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
          ),
        } satisfies ColumnDef<Candidate, unknown>,
      ] : []),
      ...(clientsEnabled ? [{
        accessorKey: "source",
        header: "Source",
        accessorFn: (r) => (r.source ? SOURCE_LABEL[r.source] ?? r.source : ""),
        cell: ({ row }) =>
          row.original.source ? (
            <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {SOURCE_LABEL[row.original.source] ?? row.original.source}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      } satisfies ColumnDef<Candidate, unknown>] : []),
      {
        accessorKey: "skillSet",
        header: "Skill",
        accessorFn: (r) => (r.skillSet ? SKILL_LABEL[r.skillSet] ?? r.skillSet : ""),
        cell: ({ row }) =>
          row.original.skillSet ? (
            <span className="font-bold text-[var(--text-primary)] text-sm whitespace-nowrap">
              {SKILL_LABEL[row.original.skillSet] ?? row.original.skillSet}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      },
      {
        id: "yoe",
        header: "YOE",
        accessorFn: (r) => r.yoePortrayed ?? "",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
            {row.original.yoePortrayed ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "yop",
        header: "YOP",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">{(getValue() as number | null) ?? "—"}</span>
        ),
      },
      {
        id: "resume",
        header: "Resume",
        accessorFn: (r) => r.resumeFilename ?? "",
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {c.resumeFilename ? (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onDownloadResume(c.id, c.resumeFilename!)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-2xs"
                  title="Download resume"
                >
                  <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Resume
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handlersRef.current.onResumeUpload(c.id)}
                className={c.resumeFilename 
                  ? "inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-[#6D28D9] dark:text-purple-300 hover:bg-purple-500/20 transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-2xs"
                  : "inline-flex items-center gap-1.5 rounded-full border border-[#6D28D9]/20 bg-[#6D28D9]/10 px-3 py-1 text-xs font-bold text-[#6D28D9] dark:text-purple-300 hover:bg-[#6D28D9] hover:text-white transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-2xs"}
                title={c.resumeFilename ? "Replace candidate resume" : "Upload candidate resume"}
              >
                <Upload className="h-3 w-3 shrink-0" />
                {c.resumeFilename ? "Replace" : "Upload"}
              </button>
              {c.resumeFilename ? (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onDownloadResume(c.id, c.resumeFilename!)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[#6D28D9] hover:border-[#6D28D9] shadow-2xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  title="Download resume PDF"
                >
                  <FileDown className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        },
      },
      ...(clientsEnabled ? [{
        accessorKey: "candidateStatus",
        header: "Status",
        accessorFn: (r: Candidate) => r.candidateStatus ?? "",
        cell: ({ row }: { row: { original: Candidate } }) =>
          row.original.candidateStatus ? (
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                STATUS_BADGE[row.original.candidateStatus] ?? ""
              }`}
            >
              {row.original.candidateStatus}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      } satisfies ColumnDef<Candidate, unknown>] : []),
      ...(clientsEnabled ? [{
        accessorKey: "rating",
        header: "Rating",
        accessorFn: (r: Candidate) => r.rating ?? "",
        cell: ({ row }: { row: { original: Candidate } }) =>
          row.original.rating ? (
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                RATING_BADGE[row.original.rating] ?? ""
              }`}
            >
              {row.original.rating}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      } satisfies ColumnDef<Candidate, unknown>] : []),
      {
        accessorKey: "noOfInterviews",
        header: "Ext. Interviews",
        cell: ({ getValue }) => (
          <span className="text-center font-mono text-xs font-medium text-[var(--text-secondary)]">{(getValue() as number | null) ?? 0}</span>
        ),
      },
      {
        accessorKey: "systemInterviewCount",
        header: "Sys. Interviews",
        cell: ({ getValue }) => (
          <span className="text-center font-mono text-xs font-medium text-[var(--text-secondary)]">
            {(getValue() as number | null) ?? 0}
          </span>
        ),
      },
      {
        id: "effective",
        header: "Effective Interviews",
        accessorFn: (r) => String(getEffectiveInterviewCount(r)),
        sortingFn: (a, b) => getEffectiveInterviewCount(a.original) - getEffectiveInterviewCount(b.original),
        cell: ({ row }) => {
          const c = row.original;
          const effectiveCount = getEffectiveInterviewCount(c);
          const ext = c.noOfInterviews ?? 0;
          const sys = c.systemInterviewCount ?? 0;
          return (
            <span
              title={`Effective = max(External ${ext}, System ${sys})`}
              className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${getEffectiveInterviewBadgeClass(
                effectiveCount
              )}`}
            >
              {effectiveCount} · {getEffectiveInterviewLabel(effectiveCount)}
            </span>
          );
        },
      },
      ...(clientsEnabled ? [
        {
          accessorKey: "interviewMentorName",
          header: "Interview Mentor",
          cell: ({ getValue }: { getValue: () => unknown }) => (
            <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
          ),
        } satisfies ColumnDef<Candidate, unknown>,
        {
          accessorKey: "clientName",
          header: "Client",
          cell: ({ getValue }: { getValue: () => unknown }) => (
            <span className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
          ),
        } satisfies ColumnDef<Candidate, unknown>,
        {
          id: "matching",
          header: "Matching",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ row }: { row: { original: Candidate } }) => (
            <ViewMatchesButton
              candidateId={row.original.id}
              candidateStatus={row.original.candidateStatus}
              systemInterviewCount={row.original.systemInterviewCount ?? null}
            />
          ),
        } satisfies ColumnDef<Candidate, unknown>,
        {
          id: "reviewHistory",
          header: "Review Summary",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ row }: { row: { original: Candidate } }) => {
            const c = row.original;
            if ((c.systemInterviewCount ?? 0) < 1 || !handlersRef.current.onDownloadPdf) {
              return <span className="text-xs text-[var(--text-secondary)]">—</span>;
            }
            return (
              <button
                type="button"
                onClick={() => handlersRef.current.onDownloadPdf!(c.id, c.name || "Candidate")}
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all duration-150 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                title="Download last 5 interviews as PDF"
              >
                <FileDown className="h-3.5 w-3.5 shrink-0" />
                Download PDF
              </button>
            );
          },
        } satisfies ColumnDef<Candidate, unknown>,
      ] : []),
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              {isStaffAdminRole(role) && (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onStartEdit(c)}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-[#6D28D9] dark:text-purple-300 hover:bg-purple-500/20 transition-all active:scale-[0.98] cursor-pointer"
                  title="Edit candidate"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => handlersRef.current.onViewHistory(c.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:border-[#6D28D9] transition-all active:scale-[0.98] cursor-pointer"
                title="View deployment history"
              >
                <Eye className="h-3 w-3 text-[#6D28D9]" />
                History
              </button>
              {c.resumeSummary && (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onCreateInterview(c)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
                  title="Schedule interview"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Interview
                </button>
              )}
              {isStaffAdminRole(role) && (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onToggleActive(c)}
                  className={c.active === false
                    ? "inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
                    : "inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-all active:scale-[0.98] cursor-pointer"}
                  title={c.active === false ? "Reactivate candidate" : "Delete candidate"}
                >
                  {c.active === false ? (
                    <>
                      <UserCheck className="h-3 w-3" />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </>
                  )}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [showBranchColumn, clientsEnabled]
  );

  return (
    <EnhancedDataTable<Candidate>
      tableId="admin-candidates-main"
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={10}
      emptyMessage="No candidates found."
      toolbar={({ columnsButton }) => (
        <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-center justify-between -mx-4 -mt-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[var(--text-primary)]">
            <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {headerTitle ?? "Candidate Directory"}
          </h2>
          <div className="flex items-center gap-2">
            {typeof recordsCount === "number" && (
              <span className="text-xs font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3.5 py-1 rounded-full border border-purple-500/20">
                {recordsCount} Records
              </span>
            )}
            {columnsButton}
          </div>
        </div>
      )}
    />
  );
}

export function DeployedCandidatesTable({
  data,
  endingDeploymentId,
  handlers,
  recordsCount,
  headerTitle,
}: {
  data: Candidate[];
  endingDeploymentId: string | null;
  handlers: {
    onViewHistory: (id: string) => void;
    onEndDeployment: (id: string, name: string) => void;
  };
  recordsCount?: number;
  headerTitle?: string;
}) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const columns = useMemo<ColumnDef<Candidate, unknown>[]>(
    () => [
      {
        id: "rowNum",
        header: "No.",
        enableSorting: false,
        enableColumnFilter: false,
        accessorFn: (_r, i) => String(i + 1),
        cell: ({ row }) => <span className="font-medium text-zinc-600 dark:text-zinc-400">{row.index + 1}</span>,
      },
      {
        accessorKey: "empId",
        header: "Emp ID",
        cell: ({ getValue }) => {
          const v = getValue() as string | null | undefined;
          return v ? (
            <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-800">{v}</span>
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="w-[180px] truncate">
            <div className="font-bold text-[var(--text-primary)] text-sm truncate">{row.original.name || "—"}</div>
            <div className="text-xs font-medium text-[var(--text-secondary)] truncate mt-0.5">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: "contactNumber",
        header: "Contact",
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      {
        accessorKey: "officialEmail",
        header: "Official Email",
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      {
        accessorKey: "personalEmail",
        header: "Personal Email",
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      {
        accessorKey: "yoePortrayed",
        header: "YOE",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">{(getValue() as number | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "skillSet",
        header: "Technology",
        accessorFn: (r) => (r.skillSet ? SKILL_LABEL[r.skillSet] ?? r.skillSet : ""),
        cell: ({ row }) =>
          row.original.skillSet ? (
            <span className="font-bold text-[var(--text-primary)] text-sm whitespace-nowrap">
              {SKILL_LABEL[row.original.skillSet] ?? row.original.skillSet}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      },
      {
        accessorKey: "deployedClientName",
        header: "Client Name",
        cell: ({ getValue }) => (
          <span className="font-bold text-[var(--text-primary)] text-sm whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      {
        accessorKey: "deployedDate",
        header: "Deployed Date",
        accessorFn: (r) =>
          r.deployedDate
            ? new Date(r.deployedDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "",
        cell: ({ row }) =>
          row.original.deployedDate ? (
            <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
              {new Date(row.original.deployedDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">—</span>
          ),
      },
      {
        accessorKey: "mentor",
        header: "Mentor",
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{(getValue() as string | null) || "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
          const busy = endingDeploymentId === c.id;
          return (
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={() => handlersRef.current.onViewHistory(c.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:border-[#6D28D9] transition-all cursor-pointer"
              >
                <Eye className="h-3 w-3 text-[#6D28D9]" />
                History
              </button>
              <button
                type="button"
                onClick={() => handlersRef.current.onEndDeployment(c.id, c.name || "Candidate")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {busy ? "Ending..." : "End Deployment"}
              </button>
            </div>
          );
        },
      },
    ],
    [endingDeploymentId]
  );

  return (
    <EnhancedDataTable<Candidate>
      tableId="admin-candidates-deployed"
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={10}
      emptyMessage="No deployed candidates found."
      toolbar={({ columnsButton }) => (
        <div className="panel-header panel-header-accent-purple rounded-t-2xl flex items-center justify-between -mx-4 -mt-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[var(--text-primary)]">
            <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {headerTitle ?? "Deployed Candidates Directory"}
          </h2>
          <div className="flex items-center gap-2">
            {typeof recordsCount === "number" && (
              <span className="text-xs font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3.5 py-1 rounded-full border border-purple-500/20">
                {recordsCount} Records
              </span>
            )}
            {columnsButton}
          </div>
        </div>
      )}
    />
  );
}
