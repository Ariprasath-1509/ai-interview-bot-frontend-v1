"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ListTree,
  Layers,
  Tag,
  Building2,
  FolderTree,
  ExternalLink,
  Sliders,
  Sparkles,
  BarChart3,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { LOOKUP_CATEGORIES } from "@/config/masterDataConfig";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";
import { EmptyState } from "@/components/common/EmptyState";
import {
  MasterDataHero,
  MasterDataQuickLink,
  MasterDataStatCard,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface OverviewData {
  lookups: Record<string, unknown[]>;
  categories: unknown[];
  tags: unknown[];
  companies: unknown[];
}

interface LookupCategoryRow {
  key: string;
  label: string;
  count: number;
}

export default function MasterDataOverviewClient({
  questionBankEnabled = true,
}: {
  questionBankEnabled?: boolean;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const quickLinks = [
    {
      href: "/admin/master-data/lookups",
      label: "Lookup Values",
      icon: ListTree,
      desc: "Skill sets, candidate statuses, interview rounds, and platform enums.",
      accent: "indigo" as const,
    },
    ...(questionBankEnabled
      ? [
          {
            href: "/admin/master-data/categories",
            label: "QB Categories",
            icon: Layers,
            desc: "Question bank domain classification categories and sub-types.",
            accent: "purple" as const,
          },
          {
            href: "/admin/master-data/tags",
            label: "QB Tags",
            icon: Tag,
            desc: "Question tags used in search digests, filtering, and session topics.",
            accent: "teal" as const,
          },
          {
            href: "/admin/master-data/companies",
            label: "QB Companies",
            icon: Building2,
            desc: "Company directory & targeted interview session mappings.",
            accent: "amber" as const,
          },
        ]
      : []),
  ];

  useEffect(() => {
    fetch("/api/admin/master-data")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const lookupCount = data?.lookups
    ? Object.values(data.lookups).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      )
    : 0;

  const categoryRows = useMemo<LookupCategoryRow[]>(() => {
    return LOOKUP_CATEGORIES.map((cat) => {
      const items = data?.lookups?.[cat.key];
      const count = Array.isArray(items) ? items.length : 0;
      return { key: cat.key, label: cat.label, count };
    });
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoryRows;
    const q = search.toLowerCase();
    return categoryRows.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
    );
  }, [categoryRows, search]);

  const columns = useMemo<ColumnDef<LookupCategoryRow, unknown>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Category Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FolderTree className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-[var(--text-primary)]">
              {row.original.label}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "key",
        header: "Category Key",
        cell: ({ row }) => (
          <span className="inline-block font-mono text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-1 rounded-md font-semibold">
            {row.original.key}
          </span>
        ),
      },
      {
        accessorKey: "count",
        header: "Entries Count",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {row.original.count} {row.original.count === 1 ? 'record' : 'records'}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Link
            href={`/admin/master-data/lookups?category=${row.original.key}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 transition-all hover:bg-indigo-500/20 hover:scale-[1.03] active:scale-[0.97]"
          >
            <span>Manage</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <MasterDataHero />
        <div className="panel-card p-12">
          <MasterDataLoading label="Synchronizing Master Data configuration..." />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Dynamic Hero Header Banner */}
      <MasterDataHero />

      {/* At a Glance Metrics Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-blue flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            At a Glance Metrics
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Live counts across configuration tables
          </span>
        </div>
        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MasterDataStatCard
              label="Lookup values"
              value={lookupCount}
              accent="indigo"
              icon={ListTree}
            />
            {questionBankEnabled && (
              <MasterDataStatCard
                label="Categories"
                value={data?.categories?.length ?? 0}
                accent="purple"
                icon={Layers}
              />
            )}
            {questionBankEnabled && (
              <MasterDataStatCard
                label="Tags"
                value={data?.tags?.length ?? 0}
                accent="teal"
                icon={Tag}
              />
            )}
            {questionBankEnabled && (
              <MasterDataStatCard
                label="Companies"
                value={data?.companies?.length ?? 0}
                accent="amber"
                icon={Building2}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Sliders className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Management Sections
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Select a module to edit dynamic configuration data
          </span>
        </div>
        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {quickLinks.map((item) => (
              <MasterDataQuickLink
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.desc}
                icon={item.icon}
                accent={item.accent}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <FolderTree className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Lookup Categories Repository
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
            <Sparkles className="h-3 w-3" />
            {filteredCategories.length} categories
          </span>
        </div>
        <div className="p-5 space-y-4">
          <EnhancedDataTable
            tableId="master-data-categories-table"
            data={filteredCategories}
            columns={columns}
            toolbar={({ columnsButton }) => (
              <DataTableToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Filter categories by name or key..."
              >
                {columnsButton}
              </DataTableToolbar>
            )}
            emptyMessage={
              <EmptyState
                title="No categories found"
                description="No lookup categories match your search filter."
                icon={FolderTree}
              />
            }
            pageSize={10}
          />
        </div>
      </div>
    </div>
  );
}