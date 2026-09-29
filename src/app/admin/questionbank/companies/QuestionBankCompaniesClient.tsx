"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Building2, Sparkles, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { MasterDataEmptyState, MasterDataLoading } from "@/components/admin/master-data/MasterDataUi";

interface Company {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  createdAt: string;
}

export default function QuestionBankCompaniesClient() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchCompanies = () => {
    fetch("/api/questionbank/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCompanies(data.data);
        else toast(data.message || "Failed to load companies", "error");
      })
      .catch(() => toast("Failed to load companies", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async () => {
    if (!newCompany.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/questionbank/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompany }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCompany("");
        fetchCompanies();
        toast("Company created", "success");
      } else {
        toast(data.message || "Failed to create company", "error");
      }
    } catch {
      toast("Failed to create company", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditName(company.name);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchCompanies();
        toast("Company updated", "success");
      } else {
        toast(data.message || "Failed to update company", "error");
      }
    } catch {
      toast("Failed to update company", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: Company) => {
    const ok = await confirm({
      title: "Delete Company",
      message: `Delete "${company.name}"?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/questionbank/companies/${company.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCompanies();
        toast("Company deleted", "success");
      } else {
        toast(data.message || "Failed to delete company", "error");
      }
    } catch {
      toast("Failed to delete company", "error");
    }
  };

  if (loading) {
    return <MasterDataLoading label="Loading companies..." />;
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
            Targeted interview sessions
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company name (e.g., Google)"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all duration-200 hover:border-indigo-500/30 hover:shadow-xs group"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === company.id ? (
                          <Input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs font-semibold rounded-lg border-[var(--border)] bg-[var(--surface)]"
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(company.id)}
                          />
                        ) : (
                          <div>
                            <span className="font-bold text-sm text-[var(--text-primary)] truncate block">
                              {company.name}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
                              <Hash className="h-2.5 w-2.5 text-indigo-500" />
                              {company.slug}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {company.questionCount} {company.questionCount === 1 ? 'question' : 'questions'}
                    </span>

                    <div className="flex items-center gap-1">
                      {editingId === company.id ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleUpdate(company.id)}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 rounded-lg text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 hover:scale-105 transition-all"
                            onClick={() => startEdit(company)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                            onClick={() => handleDelete(company)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
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
