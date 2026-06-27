"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";

interface Company {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  sessionCount: number;
  createdAt: string;
}

export default function QuestionBankCompaniesClient() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCompany, setNewCompany] = useState("");
  const [saving, setSaving] = useState(false);
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
        toast("Company added", "success");
      } else {
        toast(data.message || "Failed to create company", "error");
      }
    } catch {
      toast("Failed to create company", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (slug: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/companies/${slug}`, {
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
    const parts: string[] = [];
    if (company.questionCount > 0) parts.push(`${company.questionCount} question${company.questionCount !== 1 ? "s" : ""}`);
    if ((company.sessionCount ?? 0) > 0) parts.push(`${company.sessionCount} session${company.sessionCount !== 1 ? "s" : ""}`);

    const ok = await confirm({
      title: `Delete "${company.name}"?`,
      message: parts.length > 0
        ? `This company has ${parts.join(" and ")} linked to it. This action cannot be undone.`
        : "This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questionbank/companies/${company.slug}`, { method: "DELETE" });
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
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company name"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newCompany.trim()}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No companies found</p>
            <p className="text-sm text-muted-foreground">Add your first company above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Card key={company.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                {editingId === company.id ? (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="font-medium"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(company.slug);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(company.slug)} disabled={saving} className="flex-1">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-lg">{company.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{company.slug}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.questionCount} question{company.questionCount !== 1 ? "s" : ""}
                        {" · "}
                        {(company.sessionCount ?? 0)} session{(company.sessionCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingId(company.id); setEditName(company.name); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(company)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
