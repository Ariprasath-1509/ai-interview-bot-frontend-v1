"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Tag, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { MasterDataEmptyState, MasterDataLoading } from "@/components/admin/master-data/MasterDataUi";

interface TagItem {
  id: string;
  name: string;
  questionCount?: number;
}

export default function QuestionBankTagsClient() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const fetchTags = () => {
    fetch("/api/questionbank/tags")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTags(data.data);
        else toast(data.message || "Failed to load tags", "error");
      })
      .catch(() => toast("Failed to load tags", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/questionbank/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTag("");
        fetchTags();
        toast("Tag created", "success");
      } else {
        toast(data.message || "Failed to create tag", "error");
      }
    } catch {
      toast("Failed to create tag", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchTags();
        toast("Tag updated", "success");
      } else {
        toast(data.message || "Failed to update tag", "error");
      }
    } catch {
      toast("Failed to update tag", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: TagItem) => {
    const ok = await confirm({
      title: "Delete Tag",
      message: `Delete tag "${tag.name}"? Questions with this tag will retain other tags.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/questionbank/tags/${tag.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTags();
        toast("Tag deleted", "success");
      } else {
        toast(data.message || "Failed to delete tag", "error");
      }
    } catch {
      toast("Failed to delete tag", "error");
    }
  };

  const filteredTags = tagSearch.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  if (loading) {
    return <MasterDataLoading label="Loading tags..." />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Form Panel Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-blue-300/30">
        <div className="panel-header panel-header-accent-blue flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Add New Tag
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Create question bank tag
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tag name (e.g. system-design)"
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
        <div className="panel-header panel-header-accent-indigo flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Tags Repository
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              {filteredTags.length} tags
            </span>
          </div>

          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <Input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Filter tags..."
              className="pl-9 h-8 text-xs rounded-full border-[var(--border)] bg-[var(--surface)]"
            />
          </div>
        </div>

        <div className="p-5">
          {filteredTags.length === 0 ? (
            <MasterDataEmptyState
              icon={Tag}
              title="No tags found"
              description={
                tagSearch.trim()
                  ? `No tags match "${tagSearch}"`
                  : "Create your first tag using the form above."
              }
            />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs transition-all duration-200 hover:border-indigo-500/50 hover:scale-105"
                >
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 w-28 text-xs font-semibold rounded-lg border-[var(--border)] bg-[var(--surface)]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(tag.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
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
                      {tag.questionCount !== undefined && (
                        <span className="text-[10px] opacity-70 font-semibold">({tag.questionCount})</span>
                      )}
                      <div className="flex items-center gap-1 ml-1 border-l border-indigo-500/20 pl-1.5">
                        <button
                          type="button"
                          className="rounded p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                          onClick={() => startEdit(tag)}
                          aria-label="Edit tag"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          onClick={() => handleDelete(tag)}
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
