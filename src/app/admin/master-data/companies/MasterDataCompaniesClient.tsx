"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MasterDataEmptyState,
  MasterDataFormCard,
  MasterDataListCard,
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
  };

  const handleUpdate = async (slug: string) => {
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
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this company?")) return;
    const res = await fetch(`/api/admin/master-data/companies/${slug}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchCompanies();
  };

  if (loading) {
    return <MasterDataLoading label="Loading companies..." />;
  }

  return (
    <div className="space-y-6 animate-in">
      <MasterDataFormCard title="Add company" icon={Plus}>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Company name"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleCreate}>Add company</Button>
        </div>
      </MasterDataFormCard>

      <MasterDataListCard
        title="Companies"
        icon={Building2}
        count={companies.length}
        empty={
          <MasterDataEmptyState
            icon={Building2}
            title="No companies yet"
            description="Add your first company using the form above."
          />
        }
      >
        {companies.length === 0 ? null : (
          <div className="space-y-2">
            {companies.map((company) => (
              <div key={company.id} className="master-data-row">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    {editingSlug === company.slug ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 max-w-xs"
                      />
                    ) : (
                      <>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {company.name}
                        </div>
                        <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {company.slug}
                        </div>
                      </>
                    )}
                    {company.questionCount != null && editingSlug !== company.slug && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {company.questionCount} questions
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {editingSlug === company.slug ? (
                    <Button size="sm" onClick={() => handleUpdate(company.slug)}>
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSlug(company.slug);
                          setEditName(company.name);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-red-700"
                        onClick={() => handleDelete(company.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </MasterDataListCard>
    </div>
  );
}
