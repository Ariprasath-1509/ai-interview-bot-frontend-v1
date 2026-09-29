"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Layers, Sparkles, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MasterDataEmptyState,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface Category {
  id: string;
  name: string;
  interviewType?: string;
  questionCount?: number;
}

const TYPE_BADGE: Record<string, string> = {
  backend: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  frontend: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  shared: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
};

export default function MasterDataCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newInterviewType, setNewInterviewType] = useState("shared");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchCategories = () => {
    fetch("/api/admin/master-data/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory, interviewType: newInterviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategory("");
        fetchCategories();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-data/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchCategories();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/admin/master-data/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchCategories();
  };

  if (loading) {
    return <MasterDataLoading label="Loading QB categories..." />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Form Panel Card */}
      <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Add Question Bank Category
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Create domain classification
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Category name (e.g. System Design)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="max-w-xs rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 text-xs font-medium"
            />
            <Select value={newInterviewType} onValueChange={setNewInterviewType}>
              <SelectTrigger className="w-[140px] rounded-xl border-[var(--border)] bg-[var(--surface)] text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[var(--border)]">
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreate}
              disabled={saving || !newCategory.trim()}
              className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Add Category
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
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Categories Repository
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
            {categories.length} categories
          </span>
        </div>
        <div className="p-5">
          {categories.length === 0 ? (
            <MasterDataEmptyState
              icon={Layers}
              title="No categories yet"
              description="Create your first question bank category using the form above."
            />
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all duration-200 hover:border-indigo-500/30 hover:bg-[#F5F3FF] dark:hover:bg-[#1C1827]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <FolderTree className="h-4 w-4" />
                    </div>
                    {editingId === cat.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 max-w-xs rounded-lg border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
                      />
                    ) : (
                      <span className="font-bold text-sm text-[var(--text-primary)]">{cat.name}</span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border uppercase tracking-wider ${
                        TYPE_BADGE[cat.interviewType ?? "shared"] ?? TYPE_BADGE.shared
                      }`}
                    >
                      {cat.interviewType ?? "shared"}
                    </span>
                    {cat.questionCount != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                        {cat.questionCount} questions
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {editingId === cat.id ? (
                      <Button
                        size="sm"
                        className="h-8 px-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleUpdate(cat.id)}
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
                            setEditingId(cat.id);
                            setEditName(cat.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {cat.name !== "General" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
