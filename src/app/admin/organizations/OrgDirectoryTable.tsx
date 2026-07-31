"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";
import { authFetch } from "@/lib/clientFetch";
import { EditOrgDialog } from "./EditOrgDialog";
import { type OrgRow } from "./types";

function QuotaCell({ org }: { org: OrgRow }) {
  const isUnlimited =
    org.maxInterviews == null && org.maxCandidates == null && org.maxClients == null;
  if (isUnlimited)
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">Unlimited</span>;
  return (
    <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5">
      <div>{org.maxInterviews} interviews</div>
      <div>{org.maxCandidates} candidates</div>
      <div>{org.maxClients} clients</div>
    </div>
  );
}

function DeleteOrgButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete organization "${name}"? This cannot be undone.`)) return;
    setPending(true);
    await authFetch(`/api/admin/organizations/${id}`, { method: "DELETE" });
    router.refresh();
    setPending(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function OrgDirectoryTable({ orgs }: { orgs: OrgRow[] }) {
  const columns = useMemo<ColumnDef<OrgRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Organization",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.original.name}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">{row.original.code}</p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Mode",
        cell: ({ row }) => {
          const t = row.original.type;
          return (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                t === "LIVE"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {t === "LIVE" ? "Live" : "Demo"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                s === "ACTIVE"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {s === "ACTIVE" ? "Active" : "Suspended"}
            </span>
          );
        },
      },
      {
        id: "quotas",
        header: "Quotas",
        enableSorting: false,
        cell: ({ row }) => <QuotaCell org={row.original} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <EditOrgDialog org={row.original} />
            <DeleteOrgButton id={row.original.id} name={row.original.name} />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <EnhancedDataTable<OrgRow>
      tableId="org-directory"
      data={orgs}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No organizations yet — create one to get started."
    />
  );
}
