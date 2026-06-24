"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { FileText, Upload, Download, Sparkles, Eye, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";
import { entityBranchBadgeClass, entityBranchLabel, isStaffAdminRole } from "@/lib/staffRoles";
import type { Candidate } from "./CandidatesClient";

const SKILL_LABEL: Record<string, string> = { JAVA_SB: "Java + SB", JFSR: "JFSR", REACT_JS: "React JS", ANGULAR: "Angular", PYTHON: "Python", QA_ENGINEER: "QA Engineer", PLAYWRIGHT_AUTOMATION: "Playwright" };
const SOURCE_LABEL: Record<string, string> = { B2B: "B2B", BENCH: "Bench", MARKET: "Market" };

const RATING_BADGE: Record<string, string> = {
  ASSET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
  LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50",
};

const STATUS_BADGE: Record<string, string> = {
  RFD: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
  WFD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
  DOB: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
  TRAINING: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  DEPLOYED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50",
};

function getEffectiveInterviewCount(candidate: Candidate): number {
  return Math.max(candidate.noOfInterviews ?? 0, candidate.systemInterviewCount ?? 0);
}

function getEffectiveInterviewBadgeClass(count: number): string {
  if (count >= 7) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50";
  if (count >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
  if (count >= 3) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
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
      <span className="cursor-not-allowed text-xs text-zinc-400" title="Candidate must be RFD with 1+ interviews">
        View Matches
      </span>
    );
  }
  return (
    <Link
      href={`/admin/candidates/${candidateId}/matches`}
      className="inline-flex transform items-center gap-1 rounded-md bg-gradient-to-r from-purple-500 to-blue-500 px-2 py-1 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-blue-600 hover:shadow-md"
    >
      <Sparkles className="h-3 w-3" />
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
  yoeActual: string;
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
};

function CandidateEditRow({
  role,
  editForm,
  setEditForm,
  saving,
  onSave,
  onCancel,
  selectSmCls,
}: {
  role: string;
  editForm: CandidateEditForm;
  setEditForm: Dispatch<SetStateAction<CandidateEditForm>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  selectSmCls: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Name</span>
        <input
          className={selectSmCls}
          value={editForm.name}
          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Name"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Contact</span>
        <input
          className={selectSmCls}
          value={editForm.contactNumber}
          onChange={(e) => setEditForm((p) => ({ ...p, contactNumber: e.target.value }))}
          placeholder="Contact"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Official Email</span>
        <input
          className={selectSmCls}
          value={editForm.officialEmail}
          onChange={(e) => setEditForm((p) => ({ ...p, officialEmail: e.target.value }))}
          placeholder="Official Email"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Personal Email</span>
        <input
          className={selectSmCls}
          value={editForm.personalEmail}
          onChange={(e) => setEditForm((p) => ({ ...p, personalEmail: e.target.value }))}
          placeholder="Personal Email"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Batch (DOH)</span>
        <input
          className={selectSmCls}
          value={editForm.batch}
          onChange={(e) => setEditForm((p) => ({ ...p, batch: e.target.value }))}
          placeholder="Batch"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Batch Mentor</span>
        <input
          className={selectSmCls}
          value={editForm.batchMentor}
          onChange={(e) => setEditForm((p) => ({ ...p, batchMentor: e.target.value }))}
          placeholder="Batch Mentor"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">
          Source {role !== "SUPER_ADMIN" && <span className="text-zinc-300">(locked)</span>}
        </span>
        <select
          className={selectSmCls}
          value={editForm.source}
          disabled={role !== "SUPER_ADMIN"}
          onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))}
        >
          <option value="">—</option>
          <option value="B2B">B2B</option>
          <option value="BENCH">Bench</option>
          <option value="MARKET">Market</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Status</span>
        <select
          className={selectSmCls}
          value={editForm.candidateStatus}
          onChange={(e) => setEditForm((p) => ({ ...p, candidateStatus: e.target.value }))}
        >
          <option value="">—</option>
          <option value="RFD">RFD</option>
          <option value="WFD">WFD</option>
          <option value="DOB">DOB</option>
          <option value="TRAINING">Training</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Rating</span>
        <select
          className={selectSmCls}
          value={editForm.rating}
          onChange={(e) => setEditForm((p) => ({ ...p, rating: e.target.value }))}
        >
          <option value="">—</option>
          <option value="ASSET">Asset</option>
          <option value="MEDIUM">Medium</option>
          <option value="LIABILITY">Liability</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Skill Set</span>
        <select
          className={selectSmCls}
          value={editForm.skillSet}
          onChange={(e) => setEditForm((p) => ({ ...p, skillSet: e.target.value }))}
        >
          <option value="">—</option>
          <option value="JAVA_SB">Java + SB</option>
          <option value="JFSR">JFSR</option>
          <option value="REACT_JS">React JS</option>
          <option value="ANGULAR">Angular</option>
          <option value="PYTHON">Python</option>
          <option value="QA_ENGINEER">QA Engineer</option>
          <option value="PLAYWRIGHT_AUTOMATION">Playwright</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">YOE Actual</span>
        <input
          type="number"
          step="0.1"
          className={selectSmCls}
          value={editForm.yoeActual}
          onChange={(e) => setEditForm((p) => ({ ...p, yoeActual: e.target.value }))}
          placeholder="0.0"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">YOE Portrayed</span>
        <input
          type="number"
          step="0.1"
          className={selectSmCls}
          value={editForm.yoePortrayed}
          onChange={(e) => setEditForm((p) => ({ ...p, yoePortrayed: e.target.value }))}
          placeholder="0.0"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">YOP</span>
        <input
          type="number"
          className={selectSmCls}
          value={editForm.yop}
          onChange={(e) => setEditForm((p) => ({ ...p, yop: e.target.value }))}
          placeholder="2023"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">No. of Interviews</span>
        <input
          type="number"
          min={0}
          className={selectSmCls}
          value={editForm.noOfInterviews}
          onChange={(e) => setEditForm((p) => ({ ...p, noOfInterviews: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Interview Mentor</span>
        <input
          className={selectSmCls}
          value={editForm.interviewMentorName}
          onChange={(e) => setEditForm((p) => ({ ...p, interviewMentorName: e.target.value }))}
          placeholder="Mentor"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-zinc-400">Client</span>
        <input
          className={selectSmCls}
          value={editForm.clientName}
          onChange={(e) => setEditForm((p) => ({ ...p, clientName: e.target.value }))}
          placeholder="Client"
        />
      </div>
      {role === "SUPER_ADMIN" && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400">Branch</span>
          <select
            className={selectSmCls}
            value={editForm.branch}
            onChange={(e) => setEditForm((p) => ({ ...p, branch: e.target.value }))}
          >
            <option value="DEVELOPMENT">Development</option>
            <option value="TESTING">Testing</option>
          </select>
        </div>
      )}
      {role === "SUPER_ADMIN" && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400">Login Email</span>
          <input
            className={selectSmCls}
            value={editForm.email}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Login email"
          />
        </div>
      )}
      <div className="col-span-full flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onSave()}
          disabled={saving}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
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
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.original.name || "—"}</div>
            <div className="text-[11px] text-zinc-400">{row.original.email}</div>
          </div>
        ),
      },
      ...(showBranchColumn
        ? [
            {
              id: "branch",
              header: "Branch",
              accessorFn: (r: Candidate) => r.branch ?? "DEVELOPMENT",
              cell: ({ row }: { row: { original: Candidate } }) => (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${entityBranchBadgeClass(row.original.branch)}`}>
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
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{(getValue() as string | null) || "—"}</span>
        ),
      },
      { accessorKey: "batch", header: "Batch (DOH)" },
      { accessorKey: "batchMentor", header: "Batch Mentor" },
      {
        accessorKey: "source",
        header: "Source",
        accessorFn: (r) => (r.source ? SOURCE_LABEL[r.source] ?? r.source : ""),
        cell: ({ row }) =>
          row.original.source ? (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {SOURCE_LABEL[row.original.source] ?? row.original.source}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "skillSet",
        header: "Skill",
        accessorFn: (r) => (r.skillSet ? SKILL_LABEL[r.skillSet] ?? r.skillSet : ""),
        cell: ({ row }) =>
          row.original.skillSet ? (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {SKILL_LABEL[row.original.skillSet] ?? row.original.skillSet}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "yoe",
        header: "YOE (A/P)",
        accessorFn: (r) =>
          r.yoeActual != null ? `${r.yoeActual} / ${r.yoePortrayed ?? "—"}` : "",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {row.original.yoeActual != null
              ? `${row.original.yoeActual} / ${row.original.yoePortrayed ?? "—"}`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "yop",
        header: "YOP",
        cell: ({ getValue }) => (getValue() as number | null) ?? "—",
      },
      {
        id: "resume",
        header: "Resume",
        accessorFn: (r) => r.resumeFilename ?? "",
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1">
              {c.resumeFilename ? (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
                  <FileText className="mr-1 h-3 w-3" />
                  Resume
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlersRef.current.onResumeUpload(c.id)}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                title={c.resumeFilename ? "Replace resume" : "Upload resume"}
              >
                <Upload className="mr-1 h-3 w-3" />
                {c.resumeFilename ? "Replace" : "Upload"}
              </Button>
              {c.resumeFilename ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlersRef.current.onDownloadResume(c.id, c.resumeFilename!)}
                  className="h-6 w-6 p-0"
                  title="Download resume"
                >
                  <Download className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "candidateStatus",
        header: "Status",
        accessorFn: (r) => r.candidateStatus ?? "",
        cell: ({ row }) =>
          row.original.candidateStatus ? (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                STATUS_BADGE[row.original.candidateStatus] ?? ""
              }`}
            >
              {row.original.candidateStatus}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          ),
      },
      {
        accessorKey: "rating",
        header: "Rating",
        accessorFn: (r) => r.rating ?? "",
        cell: ({ row }) =>
          row.original.rating ? (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                RATING_BADGE[row.original.rating] ?? ""
              }`}
            >
              {row.original.rating}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          ),
      },
      {
        accessorKey: "noOfInterviews",
        header: "Ext. Interviews",
        cell: ({ getValue }) => (
          <span className="text-center font-mono text-xs">{(getValue() as number | null) ?? 0}</span>
        ),
      },
      {
        accessorKey: "systemInterviewCount",
        header: "Sys. Interviews",
        cell: ({ getValue }) => (
          <span className="text-center font-mono text-xs text-zinc-400">
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
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getEffectiveInterviewBadgeClass(
                effectiveCount
              )}`}
            >
              {effectiveCount} · {getEffectiveInterviewLabel(effectiveCount)}
            </span>
          );
        },
      },
      {
        accessorKey: "interviewMentorName",
        header: "Interview Mentor",
        cell: ({ getValue }) => (getValue() as string | null) || "—",
      },
      { accessorKey: "clientName", header: "Client" },
      {
        id: "matching",
        header: "Matching",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <ViewMatchesButton
            candidateId={row.original.id}
            candidateStatus={row.original.candidateStatus}
            systemInterviewCount={row.original.systemInterviewCount ?? null}
          />
        ),
      },
      {
        id: "reviewHistory",
        header: "Review Summary",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const c = row.original;
          if ((c.systemInterviewCount ?? 0) < 1 || !handlersRef.current.onDownloadPdf) {
            return <span className="text-xs text-zinc-400">—</span>;
          }
          return (
            <button
              type="button"
              onClick={() => handlersRef.current.onDownloadPdf!(c.id, c.name || "Candidate")}
              className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-indigo-500 to-violet-500 px-2 py-1 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:from-indigo-600 hover:to-violet-600 hover:shadow-md hover:scale-105"
              title="Download last 5 interviews as PDF"
            >
              <FileDown className="h-3 w-3" />
              Download PDF
            </button>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex justify-end gap-1">
              {isStaffAdminRole(role) && (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onStartEdit(c)}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => handlersRef.current.onViewHistory(c.id)}
                className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
              >
                History
              </button>
              {c.resumeSummary && (
                <button
                  type="button"
                  onClick={() => handlersRef.current.onCreateInterview(c)}
                  className="flex items-center gap-1 text-xs font-medium text-green-600 hover:underline dark:text-green-400"
                >
                  <Sparkles className="h-3 w-3" />
                  Interview
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [showBranchColumn]
  );

  return (
    <EnhancedDataTable<Candidate>
      tableId="admin-candidates-main"
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={10}
      emptyMessage="No candidates found."
      rowOverlay={{
        isActive: (r) => r.id === editingId,
        render: (r) => (
          <CandidateEditRow
            role={role}
            editForm={editForm}
            setEditForm={setEditForm}
            saving={saving}
            onSave={() => onSaveEdit(r.id)}
            onCancel={onCancelEdit}
            selectSmCls={selectSmCls}
          />
        ),
      }}
    />
  );
}

export function DeployedCandidatesTable({
  data,
  endingDeploymentId,
  handlers,
}: {
  data: Candidate[];
  endingDeploymentId: string | null;
  handlers: {
    onViewHistory: (id: string) => void;
    onEndDeployment: (id: string, name: string) => void;
  };
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
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.original.name || "—"}</div>
            <div className="mt-0.5 text-[11px] text-zinc-400">{row.original.email}</div>
          </div>
        ),
      },
      { accessorKey: "contactNumber", header: "Contact" },
      { accessorKey: "officialEmail", header: "Official Email" },
      { accessorKey: "personalEmail", header: "Personal Email" },
      {
        accessorKey: "yoeActual",
        header: "YOE",
        cell: ({ getValue }) => (getValue() as number | null) ?? "—",
      },
      {
        accessorKey: "skillSet",
        header: "Technology",
        accessorFn: (r) => (r.skillSet ? SKILL_LABEL[r.skillSet] ?? r.skillSet : ""),
        cell: ({ row }) =>
          row.original.skillSet ? (
            <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {SKILL_LABEL[row.original.skillSet] ?? row.original.skillSet}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "deployedClientName",
        header: "Client Name",
        cell: ({ getValue }) => (
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{(getValue() as string | null) || "—"}</span>
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
          row.original.deployedDate
            ? new Date(row.original.deployedDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—",
      },
      { accessorKey: "mentor", header: "Mentor" },
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
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlersRef.current.onViewHistory(c.id)}
                className="h-8 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Eye className="mr-1 h-3 w-3" />
                History
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handlersRef.current.onEndDeployment(c.id, c.name || "Candidate")}
                disabled={busy}
                className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
              >
                {busy ? "Ending..." : "End Deployment"}
              </Button>
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
    />
  );
}
