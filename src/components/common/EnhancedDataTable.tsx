"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, X } from "lucide-react";

export function includesStringFilter<TData extends object>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  const q = String(filterValue ?? "").trim().toLowerCase();
  if (!q) return true;
  const v = row.getValue(columnId);
  return String(v ?? "").toLowerCase().includes(q);
}

export type RowOverlayConfig<TData extends object> = {
  isActive: (row: TData) => boolean;
  render: (row: TData) => React.ReactNode;
};

export type EnhancedDataTableProps<TData extends object> = {
  /** Used for column visibility persistence in localStorage */
  tableId: string;
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (originalRow: TData, index: number) => string;
  emptyMessage?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  /** When set, replaces the normal row with a single full-width cell row */
  rowOverlay?: RowOverlayConfig<TData>;
  /** Client-side page size; omit to show all rows after sort/filter */
  pageSize?: number;
  /** Optional custom toolbar slot to integrate search and columns button inline */
  toolbar?: (props: { columnsButton: React.ReactNode }) => React.ReactNode;
};

function loadVisibility(tableId: string): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`dt-vis-${tableId}`);
    if (!raw) return {};
    return JSON.parse(raw) as VisibilityState;
  } catch {
    return {};
  }
}

function saveVisibility(tableId: string, v: VisibilityState) {
  try {
    localStorage.setItem(`dt-vis-${tableId}`, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function EnhancedDataTable<TData extends object>({
  tableId,
  data,
  columns,
  getRowId,
  emptyMessage = "No rows to display.",
  className = "",
  tableClassName = "w-full text-sm",
  rowOverlay,
  pageSize,
  toolbar,
}: EnhancedDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    loadVisibility(tableId)
  );
  const [pagination, setPagination] = React.useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: pageSize ?? 10,
  }));
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (pageSize) {
      setPagination({ pageIndex: 0, pageSize });
    }
  }, [pageSize]);

  React.useEffect(() => {
    if (!pageSize) return;
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [pageSize, columnFilters, sorting, data.length]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!columnsOpen) return;
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setColumnsOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [columnsOpen]);

  React.useEffect(() => {
    if (!columnsOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setColumnsOpen(false);
      e.preventDefault();
      e.stopPropagation();
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [columnsOpen]);

  const table = useReactTable({
    data,
    columns,
    state: pageSize
      ? { sorting, columnFilters, columnVisibility, pagination }
      : { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    ...(pageSize ? { onPaginationChange: setPagination } : {}),
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveVisibility(tableId, next);
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pageSize ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    autoResetPageIndex: false,
    getRowId,
    defaultColumn: {
      enableSorting: true,
      enableHiding: true,
      enableColumnFilter: true,
      filterFn: includesStringFilter,
    },
  });

  const displayRows = pageSize ? table.getPaginationRowModel().rows : table.getRowModel().rows;
  const hideableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const visibleLeafCount = table.getVisibleLeafColumns().length;

  const selectAllHideableColumns = () => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const col of hideableColumns) {
        next[col.id] = true;
      }
      saveVisibility(tableId, next);
      return next;
    });
  };

  const deselectAllHideableColumns = () => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const col of hideableColumns) {
        next[col.id] = false;
      }
      saveVisibility(tableId, next);
      return next;
    });
  };

  const columnsButton = hideableColumns.length > 0 ? (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setColumnsOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:border-[#6D28D9] transition-all duration-150 active:scale-[0.98] cursor-pointer"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>
      {columnsOpen && (
        <div
          className="absolute right-0 z-30 mt-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
          role="dialog"
          aria-label="Column visibility"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Visible columns
            </p>
            <button
              type="button"
              onClick={() => setColumnsOpen(false)}
              className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
              aria-label="Close column picker"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--border)] px-1 pb-1.5">
            <button
              type="button"
              onClick={selectAllHideableColumns}
              className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
            >
              Select all
            </button>
            <span className="text-[var(--text-secondary)]" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={deselectAllHideableColumns}
              className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
            >
              Deselect all
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {hideableColumns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                <input
                  type="checkbox"
                  className="rounded border-[var(--border)]"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                <span className="truncate">
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {toolbar
        ? toolbar({ columnsButton })
        : columnsButton
        ? <div className="flex justify-end">{columnsButton}</div>
        : null}

      <div className="overflow-x-auto w-full min-w-0 max-w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <table className={`w-full text-left text-sm ${tableClassName}`}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <tr className="h-11 border-b border-[var(--border)] bg-[#F1F5F9] dark:bg-zinc-800">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as { stickyLeft?: number; isLastSticky?: boolean } | undefined;
                    const isSticky = typeof meta?.stickyLeft === "number";
                    return (
                      <th
                        key={header.id}
                        style={isSticky ? { position: "sticky", left: `${meta.stickyLeft}px`, zIndex: 20 } : undefined}
                        className={`px-4 py-2.5 font-bold text-[var(--text-primary)] uppercase text-xs tracking-wider whitespace-nowrap bg-[#F1F5F9] dark:bg-zinc-800 ${
                          meta?.isLastSticky ? "border-r border-[var(--border)] shadow-xs" : ""
                        }`}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-[#6D28D9] transition-colors cursor-pointer"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            ) : header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
                <tr className="border-b border-[var(--border)] bg-[#F8FAFC] dark:bg-zinc-900">
                  {headerGroup.headers.map((header) => {
                    const col = header.column;
                    const meta = col.columnDef.meta as { stickyLeft?: number; isLastSticky?: boolean } | undefined;
                    const isSticky = typeof meta?.stickyLeft === "number";
                    if (!col.getCanFilter()) {
                      return (
                        <th
                          key={header.id}
                          style={isSticky ? { position: "sticky", left: `${meta.stickyLeft}px`, zIndex: 20 } : undefined}
                          className={`px-3 py-1.5 bg-[#F8FAFC] dark:bg-zinc-900 ${
                            meta?.isLastSticky ? "border-r border-[var(--border)] shadow-xs" : ""
                          }`}
                        />
                      );
                    }
                    return (
                      <th
                        key={header.id}
                        style={isSticky ? { position: "sticky", left: `${meta.stickyLeft}px`, zIndex: 20 } : undefined}
                        className={`px-3 py-1.5 align-top bg-[#F8FAFC] dark:bg-zinc-900 ${
                          meta?.isLastSticky ? "border-r border-[var(--border)] shadow-xs" : ""
                        }`}
                      >
                        <input
                          type="text"
                          value={(col.getFilterValue() as string) ?? ""}
                          onChange={(e) => col.setFilterValue(e.target.value)}
                          placeholder="Filter..."
                          className="h-8 w-full rounded-full border border-[var(--border)] bg-white dark:bg-zinc-900 px-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] shadow-2xs focus:border-[#6D28D9] focus:outline-none"
                          aria-label={`Filter ${String(col.columnDef.header)}`}
                        />
                      </th>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, visibleLeafCount)} className="p-0">
                  <div className="p-8 text-center text-sm text-[var(--text-secondary)]">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                const orig = row.original;
                if (rowOverlay?.isActive(orig)) {
                  return (
                    <tr key={row.id + "-overlay"} className="bg-[var(--surface-subtle)]/50">
                      <td colSpan={Math.max(1, visibleLeafCount)} className="p-3">
                        {rowOverlay.render(orig)}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={row.id} className="h-13 transition-all duration-150 group">
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { stickyLeft?: number; isLastSticky?: boolean } | undefined;
                      const isSticky = typeof meta?.stickyLeft === "number";
                      return (
                        <td
                          key={cell.id}
                          style={isSticky ? { position: "sticky", left: `${meta.stickyLeft}px`, zIndex: 10 } : undefined}
                          className={`px-4 py-3 align-middle text-[var(--text-primary)] bg-[var(--surface)] group-hover:bg-[#F5F3FF] dark:group-hover:bg-[#1C1827] transition-colors duration-150 ${
                            meta?.isLastSticky ? "border-r border-[var(--border)] shadow-xs" : ""
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageSize && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 text-xs text-[var(--text-secondary)]">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

