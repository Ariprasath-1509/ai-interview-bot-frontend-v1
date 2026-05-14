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

  return (
    <div className={`space-y-2 ${className}`}>
      {hideableColumns.length > 0 && (
        <div className="flex justify-end" ref={wrapRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </button>
            {columnsOpen && (
              <div
                className="absolute right-0 z-30 mt-1 min-w-[200px] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
                role="dialog"
                aria-label="Column visibility"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Visible columns
                  </p>
                  <button
                    type="button"
                    onClick={() => setColumnsOpen(false)}
                    className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Close column picker"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </button>
                </div>
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-100 px-1 pb-1.5 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={selectAllHideableColumns}
                    className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                    |
                  </span>
                  <button
                    type="button"
                    onClick={deselectAllHideableColumns}
                    className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {hideableColumns.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300"
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
        </div>
      )}

      <div className="overflow-x-auto w-full min-w-0 max-w-full rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className={tableClassName}>
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <tr>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
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
                  ))}
                </tr>
                <tr className="border-b border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/80">
                  {headerGroup.headers.map((header) => {
                    const col = header.column;
                    if (!col.getCanFilter()) {
                      return <th key={header.id} className="px-2 py-1.5" />;
                    }
                    return (
                      <th key={header.id} className="px-2 py-1.5 align-top">
                        <input
                          type="text"
                          value={(col.getFilterValue() as string) ?? ""}
                          onChange={(e) => col.setFilterValue(e.target.value)}
                          placeholder="Filter…"
                          className="input-base w-full min-w-[4rem] py-1 text-xs"
                          aria-label={`Filter ${String(col.columnDef.header)}`}
                        />
                      </th>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, visibleLeafCount)} className="px-4 py-10 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                const orig = row.original;
                if (rowOverlay?.isActive(orig)) {
                  return (
                    <tr key={row.id + "-overlay"} className="bg-zinc-50/50 dark:bg-zinc-900/30">
                      <td colSpan={Math.max(1, visibleLeafCount)} className="p-3">
                        {rowOverlay.render(orig)}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 align-top text-zinc-700 dark:text-zinc-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageSize && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-200 px-2 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border border-zinc-200 px-2 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
