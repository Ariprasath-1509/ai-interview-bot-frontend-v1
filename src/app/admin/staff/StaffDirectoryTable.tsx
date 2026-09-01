'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { EnhancedDataTable } from '@/components/common/EnhancedDataTable';
import { staffBranchBadgeClass, staffBranchLabel } from '@/lib/staffRoles';
import { DeleteButton } from './DeleteButton';
import { EditStaffDialog } from './EditStaffDialog';

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  adminSource?: string;
};

export function StaffDirectoryTable({
  staff,
  customToolbar,
}: {
  staff: StaffRow[];
  customToolbar?: (props: { columnsButton: React.ReactNode }) => React.ReactNode;
}) {
  const columns = useMemo<ColumnDef<StaffRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              {row.original.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">{row.original.name}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-[var(--text-secondary)]">{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const displayRole = row.original.role.replace(/^TESTING_/, '').replace(/_/g, ' ');
          const isAdmin = row.original.role.includes('ADMIN');
          return (
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide border uppercase ${
                isAdmin
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {displayRole}
            </span>
          );
        },
      },
      {
        id: 'branch',
        header: 'Branch',
        accessorFn: (r) => staffBranchLabel(r.branch, r.role),
        cell: ({ row }) => (
          <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${staffBranchBadgeClass(row.original.branch, row.original.role)}`}>
            {staffBranchLabel(row.original.branch, row.original.role)}
          </span>
        ),
      },
      {
        id: 'adminSource',
        header: 'Admin Source',
        accessorFn: (r) => r.adminSource ?? '',
        cell: ({ row }) => {
          const s = row.original.adminSource;
          if (!s) return <span className="text-[var(--text-secondary)] text-xs">—</span>;
          return (
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                s === 'BENCH'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  : s === 'BD'
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              {s}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
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
      emptyMessage="No staff accounts found"
      toolbar={customToolbar}
    />
  );
}
