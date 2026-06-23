"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Filter } from "lucide-react";

interface SearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  className?: string;
}

export function SearchWithFilters({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  filters = [], 
  className = "" 
}: SearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters = filters.some(f => f.value !== "");

  function clearSearch() {
    onChange("");
    inputRef.current?.focus();
  }

  function clearAllFilters() {
    filters.forEach(f => f.onChange(""));
    onChange("");
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={16} className="text-zinc-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <div className="flex items-center gap-1">
            {value && (
              <button
                onClick={clearSearch}
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
            {filters.length > 0 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-md p-1 transition-colors ${
                  hasActiveFilters || showFilters
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <Filter size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && filters.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Filters</h4>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {filter.label}
                </label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All {filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters
            .filter(f => f.value !== "")
            .map((filter) => {
              const option = filter.options.find(o => o.value === filter.value);
              return (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {filter.label}: {option?.label}
                  <button
                    onClick={() => filter.onChange("")}
                    className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}