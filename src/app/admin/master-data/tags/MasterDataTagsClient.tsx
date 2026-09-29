"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Tag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MasterDataEmptyState,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface TagItem {
  id: string;
  name: string;
}

export default function MasterDataTagsClient() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchTags = () => {
    fetch("/api/admin/master-data/tags")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTags(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTag("");
        fetchTags();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-data/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchTags();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    const res = await fetch(`/api/admin/master-data/tags/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchTags();
  };

  if (loading) {
    return <MasterDataLoading label="Loading QB tags..." />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Form Panel Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-blue-300/30">
        <div className="panel-header panel-header-accent-blue flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Add Question Bank Tag
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Create topic tag
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Tag name (e.g., react-hooks)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="max-w-xs rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-500 focus:ring-blue-500/20 text-xs font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newTag.trim()}
              className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Add Tag
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tags List Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-indigo flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Tags Repository
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
            {tags.length} tags
          </span>
        </div>
        <div className="p-5">
          {tags.length === 0 ? (
            <MasterDataEmptyState
              icon={Tag}
              title="No tags yet"
              description="Create your first tag using the form above."
            />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs transition-all duration-200 hover:border-indigo-500/50 hover:scale-105"
                >
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 w-28 text-xs rounded-lg border-[var(--border)] bg-[var(--surface)] font-semibold"
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleUpdate(tag.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Tag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{tag.name}</span>
                      <div className="flex items-center gap-1 ml-1 border-l border-indigo-500/20 pl-1.5">
                        <button
                          type="button"
                          className="rounded p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditName(tag.name);
                          }}
                          aria-label="Edit tag"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          onClick={() => handleDelete(tag.id)}
                          aria-label="Delete tag"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
