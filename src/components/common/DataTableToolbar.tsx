"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

export interface FilterChip {
  id: string;
  label: string;
  onRemove?: () => void;
}

export interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterChip[] | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DataTableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  children,
  className,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left Section */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative w-full max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />

            <Input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 pr-8 text-xs rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs focus:border-[#6D28D9] focus:ring-0 focus:outline-none"
            />

            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {filters && (
          <div className="flex flex-wrap items-center gap-2">
            {Array.isArray(filters)
              ? filters.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <span>{chip.label}</span>

                    {chip.onRemove && (
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="rounded-full p-0.5 hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label={`Remove filter ${chip.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))
              : filters}
          </div>
        )}
      </div>

      {/* Right Section */}
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}