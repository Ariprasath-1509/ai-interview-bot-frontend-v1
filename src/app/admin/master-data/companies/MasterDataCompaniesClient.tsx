"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Building2, Sparkles, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MasterDataEmptyState,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface Company {
  id: string;
  name: string;
  slug: string;
  questionCount?: number;
}

export default function MasterDataCompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchCompanies = () => {
    fetch("/api/admin/master-data/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCompanies(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async () => {
    if (!newCompany.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompany }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCompany("");
        fetchCompanies();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (slug: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-data/companies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSlug(null);
        fetchCompanies();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this company?")) return;
    const res = await fetch(`/api/admin/master-data/companies/${slug}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchCompanies();
  };

  if (loading) {
    return <MasterDataLoading label="Loading QB companies..." />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Form Panel Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Add Company Directory Entry
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Enterprise interview targeting
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Company name (e.g., Google)"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="max-w-xs rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 text-xs font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newCompany.trim()}
              className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Add Company
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* List Panel Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Companies Repository
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
            {companies.length} companies
          </span>
        </div>
        <div className="p-5">
          {companies.length === 0 ? (
            <MasterDataEmptyState
              icon={Building2}
              title="No companies yet"
              description="Add your first company using the form above."
            />
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all duration-200 hover:border-indigo-500/30 hover:bg-[#F5F3FF] dark:hover:bg-[#1C1827]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      {editingSlug === company.slug ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 max-w-xs rounded-lg border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {company.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
                            <Hash className="h-3 w-3 text-indigo-500" />
                            {company.slug}
                          </span>
                        </div>
                      )}
                    </div>

                    {company.questionCount != null && editingSlug !== company.slug && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        {company.questionCount} questions
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {editingSlug === company.slug ? (
                      <Button
                        size="sm"
                        className="h-8 px-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleUpdate(company.slug)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 rounded-lg border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 hover:scale-105 transition-all"
                          onClick={() => {
                            setEditingSlug(company.slug);
                            setEditName(company.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                          onClick={() => handleDelete(company.slug)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
