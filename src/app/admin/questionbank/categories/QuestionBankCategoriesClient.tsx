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
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { MasterDataEmptyState, MasterDataLoading } from "@/components/admin/master-data/MasterDataUi";

interface Category {
  id: string;
  name: string;
  interviewType?: string;
  questionCount: number;
  createdAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  backend: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  frontend: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  shared: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
};

export default function QuestionBankCategoriesClient() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newInterviewType, setNewInterviewType] = useState("shared");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInterviewType, setEditInterviewType] = useState("shared");

  const fetchCategories = () => {
    fetch("/api/questionbank/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
        else toast(data.message || "Failed to load categories", "error");
      })
      .catch(() => toast("Failed to load categories", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/questionbank/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory, interviewType: newInterviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategory("");
        fetchCategories();
        toast("Category created", "success");
      } else {
        toast(data.message || "Failed to create category", "error");
      }
    } catch {
      toast("Failed to create category", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditInterviewType(cat.interviewType || "shared");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, interviewType: editInterviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchCategories();
        toast("Category updated", "success");
      } else {
        toast(data.message || "Failed to update category", "error");
      }
    } catch {
      toast("Failed to update category", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const ok = await confirm({
      title: "Delete Category",
      message: `Delete "${cat.name}"? Questions in this category will move to General.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/questionbank/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        toast("Category deleted", "success");
      } else {
        toast(data.message || "Failed to delete category", "error");
      }
    } catch {
      toast("Failed to delete category", "error");
    }
  };

  if (loading) {
    return <MasterDataLoading label="Loading classification categories..." />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Form Panel Card */}
      <div className="panel-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
        <div className="panel-header panel-header-accent-purple flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Add Classification Category
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            AI Digest category constraint
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name (e.g., System Design)"
              className="max-w-xs rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 text-xs font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
              description="Create your first classification category using the form above."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all duration-200 hover:border-indigo-500/30 hover:shadow-xs group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <FolderTree className="h-4 w-4" />
                        </div>
                        {editingId === cat.id ? (
                          <Input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 font-semibold text-xs rounded-lg border-[var(--border)] bg-[var(--surface)]"
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                          />
                        ) : (
                          <span className="font-bold text-sm text-[var(--text-primary)]">{cat.name}</span>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                          TYPE_BADGE[cat.interviewType ?? "shared"] ?? TYPE_BADGE.shared
                        }`}
                      >
                        {cat.interviewType ?? "shared"}
                      </span>
                    </div>

                    {editingId === cat.id && (
                      <div className="mt-3">
                        <Select value={editInterviewType} onValueChange={setEditInterviewType}>
                          <SelectTrigger className="h-8 text-xs font-semibold rounded-lg border-[var(--border)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[var(--border)]">
                            <SelectItem value="backend">Backend</SelectItem>
                            <SelectItem value="frontend">Frontend</SelectItem>
                            <SelectItem value="shared">Shared</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                      {cat.questionCount} {cat.questionCount === 1 ? 'question' : 'questions'}
                    </span>

                    <div className="flex items-center gap-1">
                      {editingId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleUpdate(cat.id)}
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
                            onClick={() => startEdit(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {cat.name !== "General" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                              onClick={() => handleDelete(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
