"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Layers } from "lucide-react";
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
  MasterDataFormCard,
  MasterDataListCard,
  MasterDataLoading,
  TYPE_BADGE,
} from "@/components/admin/master-data/MasterDataUi";

interface Category {
  id: string;
  name: string;
  interviewType?: string;
  questionCount?: number;
}

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
    return <MasterDataLoading label="Loading categories..." />;
  }

  return (
    <div className="space-y-6 animate-in">
      <MasterDataFormCard title="Add category" icon={Plus}>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="max-w-xs"
          />
          <Select value={newInterviewType} onValueChange={setNewInterviewType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add category"}
          </Button>
        </div>
      </MasterDataFormCard>

      <MasterDataListCard
        title="Categories"
        icon={Layers}
        count={categories.length}
        empty={
          <MasterDataEmptyState
            icon={Layers}
            title="No categories yet"
            description="Create your first question bank category above."
          />
        }
      >
        {categories.length === 0 ? null : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="master-data-row">
                <div className="flex flex-wrap items-center gap-3">
                  {editingId === cat.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 max-w-xs"
                    />
                  ) : (
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{cat.name}</span>
                  )}
                  <span
                    className={`badge-pill ${
                      TYPE_BADGE[cat.interviewType ?? "shared"] ?? TYPE_BADGE.shared
                    }`}
                  >
                    {cat.interviewType ?? "shared"}
                  </span>
                  {cat.questionCount != null && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {cat.questionCount} questions
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingId === cat.id ? (
                    <Button size="sm" onClick={() => handleUpdate(cat.id)} disabled={saving}>
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      {cat.name !== "General" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-red-700"
                          onClick={() => handleDelete(cat.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
