"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";
import { entityBranchBadgeClass, entityBranchLabel, staffBranchBadgeClass, staffBranchLabel, resolveStaffBranchFromRole } from "@/lib/staffRoles";
import { DeleteButton } from "./DeleteButton";
import { EditStaffDialog } from "./EditStaffDialog";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  adminSource?: string;
};

export function StaffDirectoryTable({ staff }: { staff: StaffRow[] }) {
  const columns = useMemo<ColumnDef<StaffRow, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {row.original.role.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        id: "branch",
        header: "Branch",
        accessorFn: (r) => resolveStaffBranchFromRole(r.role),
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${staffBranchBadgeClass(row.original.branch, row.original.role)}`}>
            {staffBranchLabel(row.original.branch, row.original.role)}
          </span>
        ),
      },
      {
        id: "adminSource",
        header: "Source",
        accessorFn: (r) => r.adminSource ?? "",
        cell: ({ row }) => {
          const s = row.original.adminSource;
          if (!s) return <span className="text-zinc-500 dark:text-zinc-400 text-xs">—</span>;
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                s === "BENCH"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              }`}
            >
              {s}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <EditStaffDialog staff={row.original} />
            <DeleteButton id={row.original.id} />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <EnhancedDataTable<StaffRow>
      tableId="staff-directory"
      data={staff}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No staff found"
    />
  );
}
