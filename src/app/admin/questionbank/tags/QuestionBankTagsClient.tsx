"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Tag, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Tag {
  id: string;
  name: string;
  questionCount?: number;
}

export default function QuestionBankTagsClient() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = () => {
    fetch("/api/questionbank/tags")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTags(data.data);
      })
      .catch(console.error)
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
        body: JSON.stringify({ name: newTag }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTag("");
        fetchTags();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    try {
      const res = await fetch(`/api/questionbank/tags/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchTags();
    } catch (e) {
      console.error(e);
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tags.length} Tag{tags.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{tag.name}</span>
                  {tag.questionCount !== undefined && (
                    <span className="text-xs text-muted-foreground">({tag.questionCount})</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(tag.id)}
                    className="text-muted-foreground hover:text-red-500 h-5 w-5 p-0 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}