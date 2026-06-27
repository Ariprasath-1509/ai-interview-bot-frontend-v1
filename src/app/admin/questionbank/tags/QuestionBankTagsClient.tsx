"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Tag, X, Pencil, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";

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
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
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

  const handleRename = async (id: string) => {
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
        toast("Tag renamed", "success");
      } else {
        toast(data.message || "Failed to rename tag", "error");
      }
    } catch {
      toast("Failed to rename tag", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string, questionCount?: number) => {
    const ok = await confirm({
      title: `Delete tag "${name}"?`,
      message: questionCount
        ? `This tag is used on ${questionCount} question${questionCount !== 1 ? "s" : ""}. Removing it will not delete those questions. This action cannot be undone.`
        : "This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questionbank/tags/${id}`, { method: "DELETE" });
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
            Add New Tag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tag name"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newTag.trim()}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tags Grid */}
      {tags.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tags found</p>
            <p className="text-sm text-muted-foreground">Create your first tag above</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tags.length} Tag{tags.length !== 1 ? "s" : ""}
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Filter tags..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const filtered = tagSearch.trim()
                ? tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                : tags;
              return filtered.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">No tags match &ldquo;{tagSearch}&rdquo;</p>
                : null;
            })()}
            <div className="flex flex-wrap gap-2">
              {(tagSearch.trim() ? tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())) : tags).map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  {editingId === tag.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-6 w-28 text-xs px-1 py-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(tag.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRename(tag.id)}
                        disabled={saving}
                        className="h-5 w-5 p-0 text-green-600"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="h-5 w-5 p-0 text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{tag.name}</span>
                      {tag.questionCount !== undefined && (
                        <span className="text-xs text-muted-foreground">({tag.questionCount})</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                        className="text-muted-foreground hover:text-foreground h-5 w-5 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(tag.id, tag.name, tag.questionCount)}
                        className="text-muted-foreground hover:text-red-500 h-5 w-5 p-0 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
