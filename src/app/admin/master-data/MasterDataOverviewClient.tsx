"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ListTree,
  Layers,
  Tag,
  Building2,
  Loader2,
} from "lucide-react";
import { LOOKUP_CATEGORIES } from "@/config/masterDataConfig";
import {
  MasterDataHero,
  MasterDataQuickLink,
  MasterDataSectionTitle,
  MasterDataStatCard,
} from "@/components/admin/master-data/MasterDataUi";

interface OverviewData {
  lookups: Record<string, unknown[]>;
  categories: unknown[];
  tags: unknown[];
  companies: unknown[];
}

const quickLinks = [
  {
    href: "/admin/master-data/lookups",
    label: "Lookup Values",
    icon: ListTree,
    desc: "Skill sets, statuses, sources, rounds, and other enums.",
    accent: "indigo" as const,
  },
  {
    href: "/admin/master-data/categories",
    label: "QB Categories",
    icon: Layers,
    desc: "Question bank classification categories.",
    accent: "purple" as const,
  },
  {
    href: "/admin/master-data/tags",
    label: "QB Tags",
    icon: Tag,
    desc: "Question tags used in digest and search.",
    accent: "teal" as const,
  },
  {
    href: "/admin/master-data/companies",
    label: "QB Companies",
    icon: Building2,
    desc: "Company directory for interview sessions.",
    accent: "amber" as const,
  },
];

export default function MasterDataOverviewClient() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/master-data")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-zinc-500">Loading master data...</p>
      </div>
    );
  }

  const lookupCount = data?.lookups
    ? Object.values(data.lookups).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      )
    : 0;

  return (
    <div className="space-y-8 animate-in">
      <MasterDataHero />

      <div>
        <MasterDataSectionTitle
          title="At a glance"
          description="Total records across all master data types"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MasterDataStatCard label="Lookup values" value={lookupCount} accent="indigo" />
          <MasterDataStatCard
            label="Categories"
            value={data?.categories?.length ?? 0}
            accent="purple"
          />
          <MasterDataStatCard label="Tags" value={data?.tags?.length ?? 0} accent="teal" />
          <MasterDataStatCard
            label="Companies"
            value={data?.companies?.length ?? 0}
            accent="amber"
          />
        </div>
      </div>

      <div>
        <MasterDataSectionTitle
          title="Manage master data"
          description="Jump to a section to add, edit, or deactivate values"
        />
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

      <div>
        <MasterDataSectionTitle
          title="Lookup categories"
          description="Quick access to individual lookup types"
        />
        <div className="flex flex-wrap gap-2">
          {LOOKUP_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={`/admin/master-data/lookups?category=${cat.key}`}
              className="master-data-category-chip"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
